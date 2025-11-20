import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, X, Activity, Volume2 } from 'lucide-react';
import { decodeAudioData, createPCMBlob, b64ToUint8Array } from '../services/audioUtils';

interface LiveAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveAssistant: React.FC<LiveAssistantProps> = ({ isOpen, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Refs for cleanup
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    if (!isOpen) {
      cleanup();
    } else {
      startSession();
    }
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const cleanup = () => {
    if (sessionRef.current) {
      sessionRef.current.close(); // Try close if method exists
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outputContextRef.current) {
      outputContextRef.current.close();
      outputContextRef.current = null;
    }
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    setIsConnected(false);
    setIsTalking(false);
  };

  const startSession = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Audio Setup
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      audioContextRef.current = inputCtx;
      outputContextRef.current = outputCtx;
      
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are an expert real estate investment advisor. Help the user analyze properties, discuss rental strategies, and explain financial metrics like Cap Rate and Cash on Cash Return. Be concise and professional.",
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
          },
        },
        callbacks: {
          onopen: () => {
            console.log("Live Session Connected");
            setIsConnected(true);
            
            // Setup Microphone Streaming
            const source = inputCtx.createMediaStreamSource(stream);
            sourceRef.current = source;
            
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPCMBlob(inputData);
              sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              setIsTalking(true);
              const buffer = await decodeAudioData(
                b64ToUint8Array(audioData),
                outputCtx,
                24000
              );
              
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputNode);
              
              // Gapless playback logic
              const currentTime = outputCtx.currentTime;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              
              sourcesRef.current.add(source);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsTalking(false);
              };
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsTalking(false);
            }
          },
          onclose: () => {
            console.log("Session closed");
            setIsConnected(false);
          },
          onerror: (err) => {
            console.error("Session error", err);
          }
        }
      });

      sessionRef.current = sessionPromise;

    } catch (e) {
      console.error("Failed to start live session", e);
      setIsConnected(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end animate-fade-in-up">
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-2xl w-80 border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
            <h3 className="font-semibold text-lg">AI Advisor</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex flex-col items-center justify-center h-32 bg-slate-800 rounded-xl mb-4 relative overflow-hidden">
           {/* Visualizer Animation */}
           <div className="flex gap-1 items-center h-full">
             {[1,2,3,4,5].map(i => (
               <div key={i} 
                    className={`w-2 bg-indigo-500 rounded-full transition-all duration-100 ${isTalking ? 'animate-bounce' : 'h-2'}`}
                    style={{ animationDelay: `${i * 0.1}s`, height: isTalking ? '40px' : '4px' }}
               />
             ))}
           </div>
           <p className="absolute bottom-2 text-xs text-slate-400">
             {isConnected ? (isTalking ? "Speaking..." : "Listening...") : "Connecting..."}
           </p>
        </div>

        <div className="text-sm text-slate-300 mb-4 text-center">
          Ask about market trends, cap rates, or rental strategies.
        </div>
      </div>
    </div>
  );
};