import React, { useState } from 'react';
import { editPropertyImage, generatePropertyVideo } from '../services/geminiService';
import { Wand2, Video, Loader2, AlertCircle, Play, Download } from 'lucide-react';

interface MediaStudioProps {
  imageUrl: string;
}

export const MediaStudio: React.FC<MediaStudioProps> = ({ imageUrl }) => {
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  
  // Image State
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Video State
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Helper to get base64 from URL (simplified for demo)
  const getBase64FromUrl = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]); // Remove data URL prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleImageEdit = async () => {
    if (!prompt) return;
    setImageLoading(true);
    try {
      const base64 = await getBase64FromUrl(imageUrl);
      const result = await editPropertyImage(base64, prompt);
      setGeneratedImage(result);
    } catch (e) {
      alert('Failed to edit image. Try again.');
    } finally {
      setImageLoading(false);
    }
  };

  const handleVideoGen = async () => {
    setVideoLoading(true);
    setVideoError(null);
    try {
        // Check for API key selection for Veo
        const aiStudio = (window as any).aistudio;
        if (aiStudio && aiStudio.hasSelectedApiKey) {
            const hasKey = await aiStudio.hasSelectedApiKey();
            if (!hasKey) {
                 const success = await aiStudio.openSelectKey();
                 if (!success) throw new Error("API Key not selected");
            }
        }

        const base64 = await getBase64FromUrl(imageUrl);
        const resultUrl = await generatePropertyVideo(base64);
        setVideoUrl(resultUrl);
    } catch (e: any) {
        const aiStudio = (window as any).aistudio;
        if (e.message?.includes("Requested entity was not found") && aiStudio) {
             await aiStudio.openSelectKey(); // Retry key selection
             setVideoError("Key refreshed. Please try again.");
        } else {
             setVideoError("Video generation failed. " + e.message);
        }
    } finally {
        setVideoLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('image')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'image' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2"><Wand2 size={16}/> AI Image Editor</span>
        </button>
        <button
          onClick={() => setActiveTab('video')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'video' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2"><Video size={16}/> Veo Animator</span>
        </button>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'image' && (
          <div className="space-y-4">
            <div className="bg-amber-50 p-3 rounded border border-amber-100 text-amber-800 text-sm">
              Powered by <strong>Gemini 2.5 Flash Image (Nano Banana)</strong>. Try prompts like "Add a pool", "Make it sunset", or "Modernize the exterior".
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase">Original</p>
                <img src={imageUrl} alt="Original" className="w-full h-64 object-cover rounded-lg shadow-sm" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase">AI Result</p>
                {imageLoading ? (
                  <div className="w-full h-64 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                  </div>
                ) : generatedImage ? (
                  <img src={generatedImage} alt="Generated" className="w-full h-64 object-cover rounded-lg shadow-sm" />
                ) : (
                  <div className="w-full h-64 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                    Result will appear here
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your edit (e.g., 'Add a modern fence')"
                className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                onClick={handleImageEdit}
                disabled={imageLoading || !prompt}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium transition-colors"
              >
                {imageLoading ? 'Editing...' : 'Generate'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'video' && (
          <div className="space-y-4">
            <div className="bg-purple-50 p-3 rounded border border-purple-100 text-purple-800 text-sm">
               Powered by <strong>Veo 3.1</strong>. Turn this static image into a cinematic video tour teaser.
            </div>
             
            {videoError && (
                <div className="bg-red-50 text-red-600 p-3 rounded text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    {videoError}
                </div>
            )}

            <div className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-lg group">
               {videoUrl ? (
                   <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
               ) : (
                   <>
                     <img src={imageUrl} className="w-full h-full object-cover opacity-50 group-hover:opacity-40 transition-opacity" />
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                         {videoLoading ? (
                             <div className="text-center">
                                 <Loader2 className="animate-spin text-white mb-2 mx-auto" size={48} />
                                 <p className="text-white font-medium">Generating Video...</p>
                                 <p className="text-white/60 text-xs">This may take up to a minute.</p>
                             </div>
                         ) : (
                             <button 
                               onClick={handleVideoGen}
                               className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-full hover:bg-white/20 transition-all transform hover:scale-105 group"
                             >
                                 <Play size={48} className="text-white fill-white ml-1" />
                             </button>
                         )}
                     </div>
                   </>
               )}
            </div>
            
            <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">Note: 720p resolution, 16:9 aspect ratio.</p>
                 {videoUrl && (
                  <a href={videoUrl} download="property-tour.mp4" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1">
                      <Download size={16} /> Download Video
                  </a>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};