import React, { useState } from 'react';
import { Property } from '../types';
import { calculateMetrics, formatCurrency, formatPercent } from '../utils/calculations';
import { TrendingUp, Home, DollarSign, Image as ImageIcon, ImageOff, Heart } from 'lucide-react';

interface PropertyCardProps {
  property: Property;
  onClick: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  isSelected: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, onClick, onToggleFavorite, isSelected }) => {
  const metrics = calculateMetrics(property);
  const [imgError, setImgError] = useState(false);
  
  const hasImage = property.images && property.images.length > 0 && !imgError;

  return (
    <div 
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border transition-all cursor-pointer hover:shadow-md group ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-lg bg-indigo-50/30' : 'border-slate-200 bg-white'}`}
    >
      <div className="relative h-40 w-full bg-slate-100 flex items-center justify-center overflow-hidden">
        {hasImage ? (
             <img 
                src={property.images[0]} 
                alt={property.address} 
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={() => setImgError(true)}
            />
        ) : (
            <div className="flex flex-col items-center text-slate-300">
                <ImageOff size={32} />
                <span className="text-xs mt-1">No Image Available</span>
            </div>
        )}
        
        {/* Favorite Button */}
        <button
            onClick={onToggleFavorite}
            className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all"
        >
             <Heart 
                size={16} 
                className={`transition-colors ${property.isFavorite ? 'fill-red-500 text-red-500' : 'text-white hover:text-red-200'}`} 
             />
        </button>
        
        {/* Image Count Badge - Moved to left to avoid heart */}
        {hasImage && property.images.length > 1 && (
           <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
              <ImageIcon size={10} /> {property.images.length}
           </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <h3 className="text-white font-semibold truncate">{property.address}</h3>
            <p className="text-white/80 text-sm">{formatCurrency(property.price)}</p>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-emerald-50 p-2 rounded border border-emerald-100">
                <span className="text-emerald-600 text-xs font-bold block">Cash Flow</span>
                <span className={`font-mono font-semibold ${metrics.cashFlow > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatCurrency(metrics.cashFlow)}/mo
                </span>
            </div>
            <div className="bg-blue-50 p-2 rounded border border-blue-100">
                <span className="text-blue-600 text-xs font-bold block">ROI</span>
                <span className="font-mono font-semibold text-blue-700">
                    {formatPercent(metrics.cashOnCashReturn)}
                </span>
            </div>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-slate-500">
             <div className="flex items-center gap-1">
                 <TrendingUp size={14} /> Cap: {formatPercent(metrics.capRate)}
             </div>
             <div className="flex items-center gap-1">
                 <Home size={14} /> Occ: {property.occupancyRate}%
             </div>
        </div>
      </div>
    </div>
  );
};