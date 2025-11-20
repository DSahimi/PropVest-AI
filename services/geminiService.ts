import { GoogleGenAI, Modality, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Search Grounding ---
export const searchMarketData = async (query: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    
    const text = response.text;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(
      (chunk: any) => ({
        title: chunk.web?.title || 'Source',
        uri: chunk.web?.uri || '#',
      })
    ) || [];

    return { text, sources };
  } catch (error) {
    console.error("Search error:", error);
    throw error;
  }
};

export interface SearchFilters {
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  minBaths?: number;
  minSqft?: number;
}

// --- City Listing Search ---
export const fetchListingsByCity = async (city: string, filters?: SearchFilters) => {
  const ai = getAI();
  try {
    let filterText = "";
    if (filters) {
        if (filters.minPrice) filterText += `Minimum Price: $${filters.minPrice}. `;
        if (filters.maxPrice) filterText += `Maximum Price: $${filters.maxPrice}. `;
        if (filters.minBeds) filterText += `Minimum Bedrooms: ${filters.minBeds}. `;
        if (filters.minBaths) filterText += `Minimum Bathrooms: ${filters.minBaths}. `;
        if (filters.minSqft) filterText += `Minimum SqFt: ${filters.minSqft}. `;
    }

    const prompt = `
      USER SEARCH: "Real estate listings in ${city}"
      FILTERS: ${filterText}
      
      Role: Real Estate Aggregator.
      Task: Find 4 distinct, currently active real estate listings for sale in ${city} that match the filters.
      
      For EACH listing found via Google Search, extract:
      - Address
      - List Price
      - Bedrooms, Bathrooms, SqFt
      - **IMAGE URL**: You MUST find a direct image URL for the property. 
        * Look for URLs ending in .jpg, .jpeg, .png, .webp.
        * Look for 'og:image' meta tags in search results.
        * Prioritize URLs from domains like zillowstatic.com, cdn-redfin.com, rdcpix.com.
      
      OUTPUT: A JSON Array of objects.
      
      Example JSON Format:
      [
        {
          "address": "123 Main St, City, ST",
          "price": 500000,
          "bedrooms": 3,
          "bathrooms": 2,
          "sqft": 2000,
          "image": "https://photos.zillowstatic.com/fp/..."
        }
      ]
      
      CONSTRAINTS:
      - Ensure valid JSON.
      - Do not include markdown formatting.
      - If an image cannot be found, try to find a generic neighborhood image or leave empty string.
      - Make realistic estimates for sqft if missing.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    let text = response.text || "[]";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']');
    if (jsonStart !== -1 && jsonEnd !== -1) {
        text = text.substring(jsonStart, jsonEnd + 1);
    }

    return JSON.parse(text);
  } catch (error) {
    console.error("City search error:", error);
    return [];
  }
};

// --- Property Data Fetching (Enhanced for Real Photos) ---
export const fetchPropertyListing = async (query: string) => {
  const ai = getAI();
  try {
    // Detect if input is a URL or Address
    const isUrl = query.toLowerCase().startsWith('http');
    
    const prompt = `
      USER INPUT: "${query}"
      
      Role: Expert Real Estate Data Scraper & Analyst.
      
      TASK:
      1. SEARCH: Use Google Search to find the specific property listing on major platforms (Zillow, Redfin, Realtor.com, Trulia, Compass).
      
      2. EXTRACT IMAGES (CRITICAL PRIORITY):
         - Find the **Main Listing Photo**.
         - **STRATEGY**: 
            a. Look for direct image links in the search result snippets (often hidden in meta tags).
            b. Look for 'og:image' content.
            c. If a direct URL is provided in user input, parse that page's metadata if possible or infer the image structure.
            d. **FALLBACK**: If no listing photo is found, search for "Street view of ${query}" and return that image URL.
         - Collect up to 5 high-quality image URLs.
         - Ensure URLs are valid absolute links (http/https) and look like image files (jpg/png/webp).
      
      3. EXTRACT DATA:
         - Price, Bedrooms, Bathrooms, SqFt.
         - Expenses: Property Tax (Annual), HOA (Monthly).
         - Market Data: Estimate Nightly Rate and Occupancy based on the location if not explicitly stated in a short-term rental listing.
      
      OUTPUT JSON ONLY (No Markdown):
      {
        "address": "Full Standardized Address",
        "price": Number (List Price),
        "bedrooms": Number,
        "bathrooms": Number,
        "sqft": Number,
        "propertyTax": Number (Annual),
        "hoa": Number (Monthly),
        "insurance": Number (Annual Estimate ~0.5% of price if missing),
        "snowRemoval": Number (Monthly Estimate, 0 if warm climate),
        "hotTubMaintenance": Number (Monthly Estimate ~150 if likely),
        "utilities": Number (Monthly Estimate),
        "nightlyRate": Number (Conservative Estimate),
        "occupancyRate": Number (Conservative Estimate 0-100),
        "fairOfferRecommendation": "2-3 sentences analyzing value vs price",
        "images": ["url1", "url2", "url3"]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    let text = response.text || "{}";
    // Clean up markdown if present
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
        text = text.substring(jsonStart, jsonEnd + 1);
    }

    return JSON.parse(text);
  } catch (error) {
    console.error("Property fetch error:", error);
    // Return minimal fallback
    return {
      address: query.startsWith('http') ? 'New Property Listing' : query,
      price: 0,
      bedrooms: 0,
      bathrooms: 0,
      sqft: 0,
      propertyTax: 0,
      hoa: 0,
      nightlyRate: 0,
      occupancyRate: 0,
      insurance: 0,
      snowRemoval: 0,
      hotTubMaintenance: 0,
      utilities: 0,
      fairOfferRecommendation: "Could not automatically fetch details. Please verify the address or link.",
      images: []
    };
  }
};

// --- Fair Offer Analysis ---
export const analyzeFairOffer = async (property: any, metrics: any) => {
  const ai = getAI();
  try {
    const prompt = `
      Act as a senior real estate investment analyst.
      Analyze this property based on the user's adjusted numbers:
      
      Property: ${property.address}
      Specs: ${property.bedrooms} Bed / ${property.bathrooms} Bath / ${property.sqft} SqFt
      List Price: $${property.price}
      
      Projected Financials:
      - Cash Flow: $${metrics.cashFlow.toFixed(2)} / month
      - Cash on Cash Return: ${metrics.cashOnCashReturn.toFixed(2)}%
      - Cap Rate: ${metrics.capRate.toFixed(2)}%
      - Total Monthly Expenses: $${metrics.monthlyExpenses.toFixed(2)}
      
      Specific Expenses (Monthly/Annual):
      - HOA: $${property.hoa}/mo
      - Snow Removal: $${property.snowRemoval}/mo
      - Hot Tub: $${property.hotTubMaintenance}/mo
      - Taxes: $${property.propertyTax}/yr
      
      Based on these metrics and general market conditions for this area (use Google Search if needed for recent comps):
      1. Is this a good investment at the current price?
      2. What would be a "fair offer" to make the numbers work better if they are tight?
      3. Are the expense estimates realistic?
      
      Keep the response concise, practical, and actionable (max 4 sentences).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    return response.text;
  } catch (error) {
    console.error("Analysis error:", error);
    return "Unable to generate recommendation at this time.";
  }
};

// --- Image Editing (Flash Image) ---
export const editPropertyImage = async (base64Image: string, prompt: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE],
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Image edit error:", error);
    throw error;
  }
};

// --- Video Generation (Veo) ---
export const generatePropertyVideo = async (base64Image: string) => {
  const ai = getAI(); 
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: 'Cinematic slow motion pan of this beautiful property, high quality, architectural digest style, photorealistic 4k',
      image: {
        imageBytes: base64Image,
        mimeType: 'image/jpeg',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5s poll
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed");
    
    // Fetch the actual bytes
    const videoRes = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const videoBlob = await videoRes.blob();
    return URL.createObjectURL(videoBlob);

  } catch (error) {
    console.error("Video gen error:", error);
    throw error;
  }
};

// --- Description Generation ---
export const generatePropertyDescription = async (property: any) => {
  const ai = getAI();
  try {
    const prompt = `
      Role: Real Estate Copywriter.
      Task: Write a compelling, attractive listing description for this investment property.
      
      Details:
      Address: ${property.address}
      Price: $${property.price}
      Specs: ${property.bedrooms} Beds, ${property.bathrooms} Baths, ${property.sqft} SqFt.
      
      Focus on:
      1. The investment potential (cash flow, rental appeal).
      2. The lifestyle/features based on typical homes in this area (infer from address if needed).
      
      Format: Professional, engaging, roughly 100-150 words. No markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Description gen error:", error);
    throw error;
  }
};