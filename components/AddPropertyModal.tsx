import React, { useState } from 'react';
import { X, Search, Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { fetchPropertyListing } from '../services/geminiService';
import { Property } from '../types';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (property: Property) => void;
}

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setError('');

    try {
      const data = await fetchPropertyListing(query);
      
      // Filter out bad URLs from AI
      let images = data.images || [];
      if (Array.isArray(images)) {
          // Allow http/https and data urls, basic length check
          images = images.filter(url => url && url.length > 10 && (url.startsWith('http') || url.startsWith('data:')));
      } else {
          images = [];
      }

      const newProperty: Property = {
        id: Date.now().toString(),
        address: data.address || query, // Prefer AI extracted address
        price: data.price || 450000,
        images: images,
        bedrooms: data.bedrooms || 3,
        bathrooms: data.bathrooms || 2,
        sqft: data.sqft || 1500,
        
        downPaymentPercent: 20,
        interestRate: 6.8,
        loanTermYears: 30,
        nightlyRate: data.nightlyRate || 200,
        occupancyRate: data.occupancyRate || 60,
        
        // Mapped Expenses
        propertyTax: data.propertyTax || 5000,
        insurance: data.insurance || 1500,
        managementFeePercent: 25, // Default 25%
        snowRemoval: data.snowRemoval || 0,
        hotTubMaintenance: data.hotTubMaintenance || 0,
        utilities: data.utilities || 300,
        maintenance: 250, // Default estimate
        hoa: data.hoa || 0,
        otherExpenses: 0,
        
        fairOfferRecommendation: data.fairOfferRecommendation
      };

      onAdd(newProperty);
      onClose();
      setQuery('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch property details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-800">Add New Property</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Property Address or Listing URL</label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Paste Zillow/Redfin Link or Address"
                className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                autoFocus
              />
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            </div>
            <div className="flex gap-2 items-start mt-2 text-xs text-slate-500 bg-blue-50 p-2 rounded border border-blue-100">
               <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5"/>
               <p>
                  <strong>Tip:</strong> For the best photos, paste a full link from Zillow, Redfin, or Realtor.com.
                  If using an address, we will try to find the listing automatically.
               </p>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <button
            onClick={handleSearch}
            disabled={loading || !query}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Scraping Listing Details...
              </>
            ) : (
              <>
                <Search size={20} />
                Fetch Property
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};