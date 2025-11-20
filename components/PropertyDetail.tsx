import React, { useState, useRef } from 'react';
import { Property } from '../types';
import { calculateMetrics, formatCurrency, formatPercent } from '../utils/calculations';
import { searchMarketData, analyzeFairOffer } from '../services/geminiService';
import { MediaStudio } from './MediaStudio';
import { Calculator, Search, Info, DollarSign, Activity, ClipboardCheck, Loader2, RefreshCw, Camera, X, Wand2, ChevronLeft, ChevronRight, Bed, Bath, Square, ImageOff, Home } from 'lucide-react';

interface PropertyDetailProps {
  property: Property;
  onUpdate: (p: Property) => void;
}

export const PropertyDetail: React.FC<PropertyDetailProps> = ({ property, onUpdate }) => {
  const metrics = calculateMetrics(property);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{ text: string; sources: { title: string; uri: string }[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzingOffer, setIsAnalyzingOffer] = useState(false);
  
  // Gallery State
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [editModeImage, setEditModeImage] = useState<string | null>(null);
  const [imgError, setImgError] = useState<Record<number, boolean>>({});
  
  const mediaSectionRef = useRef<HTMLDivElement>(null);

  const updateField = (field: keyof Property, value: number) => {
    onUpdate({ ...property, [field]: value });
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const result = await searchMarketData(searchQuery);
      setSearchResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRefreshRecommendation = async () => {
    setIsAnalyzingOffer(true);
    try {
      const rec = await analyzeFairOffer(property, metrics);
      onUpdate({ ...property, fairOfferRecommendation: rec });
    } catch(e) {
      console.error(e);
    } finally {
      setIsAnalyzingOffer(false);
    }
  };

  const handleEditImage = (imageUrl: string) => {
      setIsGalleryOpen(false);
      setEditModeImage(imageUrl);
      // Scroll to media section
      setTimeout(() => {
          mediaSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
  };

  const nextImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (property.images.length === 0) return;
      setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
  };
  
  const prevImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (property.images.length === 0) return;
      setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  const handleImgError = (index: number) => {
      setImgError(prev => ({...prev, [index]: true}));
  };

  const hasImages = property.images && property.images.length > 0;
  const currentImage = hasImages ? property.images[currentImageIndex] : null;
  const isCurrentImgError = hasImages ? imgError[currentImageIndex] : true;

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto">
      {/* Header Image */}
      <div 
        className="relative h-72 shrink-0 cursor-pointer group bg-slate-800 flex items-center justify-center"
        onClick={() => hasImages && setIsGalleryOpen(true)}
      >
        {hasImages && !isCurrentImgError ? (
             <img 
                src={currentImage!} 
                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700 opacity-80 hover:opacity-100" 
                alt={property.address} 
                onError={() => handleImgError(currentImageIndex)}
            />
        ) : (
            <div className="flex flex-col items-center text-slate-500 z-0">
                <ImageOff size={48} />
                <span className="mt-2 text-sm">No Image Available</span>
            </div>
        )}

        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors pointer-events-none"></div>
        
        {/* Main Header Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent flex flex-col justify-end p-8 pointer-events-none">
          <h1 className="text-3xl font-bold text-white shadow-sm">{property.address}</h1>
          
          {/* Property Specs */}
          <div className="flex items-center gap-6 text-white/90 mt-2 font-medium">
             <div className="flex items-center gap-2">
                 <Bed size={18} className="text-indigo-300" /> 
                 {property.bedrooms} <span className="text-sm opacity-80 font-normal">Beds</span>
             </div>
             <div className="flex items-center gap-2">
                 <Bath size={18} className="text-indigo-300" /> 
                 {property.bathrooms} <span className="text-sm opacity-80 font-normal">Baths</span>
             </div>
             <div className="flex items-center gap-2">
                 <Square size={18} className="text-indigo-300" /> 
                 {property.sqft?.toLocaleString()} <span className="text-sm opacity-80 font-normal">SqFt</span>
             </div>
          </div>

          <div className="flex items-center gap-4 text-white/90 mt-4 pt-4 border-t border-white/20">
             <span className="text-2xl font-light">{formatCurrency(property.price)}</span>
             <span className={`px-3 py-1 rounded-full text-sm font-medium ${metrics.cashFlow > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' : 'bg-red-500/20 text-red-300'}`}>
                {metrics.cashFlow > 0 ? 'Positive Cash Flow' : 'Negative Cash Flow'}
             </span>
          </div>
        </div>
        
        {hasImages && (
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <Camera size={14} /> View {property.images.length} Photos
            </div>
        )}
      </div>

      <div className="p-6 space-y-8 pb-20">
        {/* Metrics Overview */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
                { label: "Net Monthly", value: formatCurrency(metrics.cashFlow), color: metrics.cashFlow > 0 ? "text-emerald-600" : "text-red-600" },
                { label: "Cash on Cash", value: formatPercent(metrics.cashOnCashReturn), color: "text-blue-600" },
                { label: "Cap Rate", value: formatPercent(metrics.capRate), color: "text-purple-600" },
                { label: "Initial Invest", value: formatCurrency(metrics.totalInvestment), color: "text-slate-600" },
            ].map((m, i) => (
                <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase font-bold">{m.label}</p>
                    <p className={`text-xl font-mono font-bold ${m.color}`}>{m.value}</p>
                </div>
            ))}
        </section>

        <hr className="border-slate-100" />

        {/* Interactive Sliders & Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {/* Purchase & Loan */}
             <section className="space-y-6">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <Calculator size={18} /> Purchase & Loan
                </h3>
                
                <SliderInput 
                    label="Purchase Price" 
                    value={property.price} 
                    onChange={(v) => updateField('price', v)} 
                    min={50000} max={2000000} step={5000} format={formatCurrency}
                />
                <SliderInput 
                    label="Down Payment (%)" 
                    value={property.downPaymentPercent} 
                    onChange={(v) => updateField('downPaymentPercent', v)} 
                    min={0} max={100} step={1} format={(v) => `${v}%`}
                />
                <SliderInput 
                    label="Interest Rate (%)" 
                    value={property.interestRate} 
                    onChange={(v) => updateField('interestRate', v)} 
                    min={0} max={15} step={0.1} format={(v) => `${v}%`}
                />
             </section>

             {/* Rental Income */}
             <section className="space-y-6">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <DollarSign size={18} /> Rental Potential
                </h3>

                <SliderInput 
                    label="Nightly Rate" 
                    value={property.nightlyRate} 
                    onChange={(v) => updateField('nightlyRate', v)} 
                    min={50} max={2000} step={10} format={formatCurrency}
                />
                <SliderInput 
                    label="Occupancy Rate (%)" 
                    value={property.occupancyRate} 
                    onChange={(v) => updateField('occupancyRate', v)} 
                    min={0} max={100} step={1} format={(v) => `${v}%`}
                />
             </section>
        </div>

        {/* Detailed Operating Expenses */}
        <section className="space-y-6">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <ClipboardCheck size={18} /> Operating Expenses & Profit
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <ExpenseInput label="Property Tax (Yr)" value={property.propertyTax} onChange={(v) => updateField('propertyTax', v)} />
                 <ExpenseInput label="Home Insurance (Yr)" value={property.insurance} onChange={(v) => updateField('insurance', v)} />
                 <ExpenseInput label="HOA Fees (Mo)" value={property.hoa} onChange={(v) => updateField('hoa', v)} />
                 <ExpenseInput label="Snow Removal (Mo)" value={property.snowRemoval} onChange={(v) => updateField('snowRemoval', v)} />
                 <ExpenseInput label="Hot Tub Maint (Mo)" value={property.hotTubMaintenance} onChange={(v) => updateField('hotTubMaintenance', v)} />
                 <ExpenseInput label="Utilities (Mo)" value={property.utilities} onChange={(v) => updateField('utilities', v)} />
                 <ExpenseInput label="General Maint (Mo)" value={property.maintenance} onChange={(v) => updateField('maintenance', v)} />
                 <ExpenseInput label="Mgmt Fee (%)" value={property.managementFeePercent} onChange={(v) => updateField('managementFeePercent', v)} suffix="%" />
                 <ExpenseInput label="Other (Mo)" value={property.otherExpenses} onChange={(v) => updateField('otherExpenses', v)} />
            </div>

            {/* New Financial Breakdown Box */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                <div className="p-4 flex flex-col justify-center items-center text-center">
                    <span className="text-xs font-bold text-slate-500 uppercase mb-1">Gross Monthly Income</span>
                    <span className="text-2xl font-bold text-emerald-600">{formatCurrency(metrics.monthlyIncome)}</span>
                </div>
                <div className="p-4 flex flex-col justify-center items-center text-center relative">
                    <span className="absolute top-1/2 -left-3 bg-slate-50 text-slate-400 p-1 rounded-full -translate-y-1/2 hidden md:block">-</span>
                    <span className="text-xs font-bold text-slate-500 uppercase mb-1">Total Monthly Expenses</span>
                    <span className="text-2xl font-bold text-red-600">{formatCurrency(metrics.monthlyExpenses + metrics.monthlyMortgage)}</span>
                    <span className="text-[10px] text-slate-400">(Inc. Mortgage)</span>
                </div>
                <div className="p-4 flex flex-col justify-center items-center text-center relative">
                    <span className="absolute top-1/2 -left-3 bg-slate-50 text-slate-400 p-1 rounded-full -translate-y-1/2 hidden md:block">=</span>
                    <span className="text-xs font-bold text-slate-500 uppercase mb-1">Est. Monthly Profit/Loss</span>
                    <span className={`text-2xl font-bold ${metrics.cashFlow > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(metrics.cashFlow)}
                    </span>
                </div>
            </div>
        </section>

        {/* AI Fair Offer Recommendation */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white relative overflow-hidden">
             <div className="relative z-10 space-y-4">
                 <div className="flex justify-between items-start">
                     <h3 className="font-bold text-lg flex items-center gap-2">
                        <Activity className="text-indigo-400" /> Gemini Fair Offer Recommendation
                     </h3>
                     <button 
                        onClick={handleRefreshRecommendation} 
                        disabled={isAnalyzingOffer}
                        className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors disabled:opacity-50"
                     >
                        {isAnalyzingOffer ? <Loader2 className="animate-spin" size={18}/> : <RefreshCw size={18} />}
                     </button>
                 </div>
                 
                 <div className="bg-white/5 rounded-lg p-4 border border-white/10 text-slate-200 text-sm leading-relaxed">
                     {property.fairOfferRecommendation || "Click refresh to generate a fair offer analysis based on current numbers."}
                 </div>
             </div>
             
             {/* Decorative background blur */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        </section>

        {/* Media Studio Section - Only show if images exist */}
        {(editModeImage || (hasImages && !isCurrentImgError)) && (
            <section ref={mediaSectionRef}>
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Activity className="text-indigo-600" size={20} /> Media Studio
                </h2>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <MediaStudio imageUrl={editModeImage || currentImage!} />
                </div>
            </section>
        )}

        {/* Search Grounding */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                 <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <Search size={18} /> Market Research
                </h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Gemini Search</span>
            </div>
            <div className="p-4 space-y-4">
                <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g., Average rental rates in downtown Austin"
                      className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button 
                      onClick={handleSearch}
                      disabled={isSearching || !searchQuery}
                      className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700 disabled:opacity-50 text-sm font-medium"
                    >
                        {isSearching ? 'Searching...' : 'Ask AI'}
                    </button>
                </div>
                
                {searchResult && (
                    <div className="space-y-3 animate-fade-in">
                        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {searchResult.text}
                        </div>
                        {searchResult.sources.length > 0 && (
                             <div className="flex flex-wrap gap-2 pt-2">
                                {searchResult.sources.map((s, i) => (
                                    <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-1 rounded flex items-center gap-1">
                                        <Info size={10} /> {s.title}
                                    </a>
                                ))}
                             </div>
                        )}
                    </div>
                )}
            </div>
        </section>
      </div>

      {/* Gallery Modal */}
      {isGalleryOpen && hasImages && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center animate-fade-in">
              <button 
                onClick={() => setIsGalleryOpen(false)}
                className="absolute top-6 right-6 text-white/70 hover:text-white p-2"
              >
                  <X size={32} />
              </button>

              <div className="relative w-full max-w-5xl aspect-video bg-black flex items-center justify-center">
                   {isCurrentImgError ? (
                        <div className="text-white flex flex-col items-center">
                             <ImageOff size={48} />
                             <span className="mt-2">Image not available</span>
                        </div>
                   ) : (
                       <img 
                            src={currentImage!} 
                            className="w-full h-full object-contain" 
                            onError={() => handleImgError(currentImageIndex)}
                       />
                   )}
                   
                   {/* Navigation */}
                   <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-all">
                       <ChevronLeft size={32} />
                   </button>
                   <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-all">
                       <ChevronRight size={32} />
                   </button>

                   {/* Edit Action - only if valid image */}
                   {!isCurrentImgError && (
                       <button 
                         onClick={() => handleEditImage(currentImage!)}
                         className="absolute bottom-8 right-8 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg flex items-center gap-2 transition-all transform hover:scale-105"
                       >
                           <Wand2 size={20} /> Edit this Photo with AI
                       </button>
                   )}
              </div>

              {/* Thumbnails */}
              <div className="mt-6 flex gap-2 overflow-x-auto max-w-4xl p-2">
                  {property.images.map((img, i) => (
                      <button 
                        key={i}
                        onClick={() => setCurrentImageIndex(i)}
                        className={`w-20 h-16 rounded-md overflow-hidden border-2 transition-all flex-shrink-0 ${currentImageIndex === i ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}
                      >
                          <img 
                            src={img} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2NDc0OGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48bGluZSB4MT0iMSIgeTE9IjEiIHgyPSIyMyIgeTI9IjIzIj48L2xpbmU+PHBhdGggZD0iTTIxIDE1djRhMiAyIDAgMCAxLTIgMmgtNWwtNSA1di01SDZhMiAyIDAgMCAxLTItMnYtNSI+PC9wYXRoPjwvc3ZnPg=='; // fallback icon
                            }}
                          />
                      </button>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

// Helper Components
const SliderInput: React.FC<{
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step: number;
    format: (v: number) => string;
}> = ({ label, value, onChange, min, max, step, format }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">{label}</span>
            <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{format(value)}</span>
        </div>
        <input 
            type="range" 
            min={min} max={max} step={step} 
            value={value} 
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
    </div>
);

const ExpenseInput: React.FC<{
    label: string;
    value: number;
    onChange: (v: number) => void;
    suffix?: string;
}> = ({ label, value, onChange, suffix }) => (
    <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500 uppercase">{label}</label>
        <div className="relative">
             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{suffix ? '' : '$'}</span>
             <input 
                type="number" 
                value={value} 
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded p-2 pl-6 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
             />
             {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{suffix}</span>}
        </div>
    </div>
);