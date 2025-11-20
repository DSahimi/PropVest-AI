export interface Property {
  id: string;
  address: string;
  price: number;
  images: string[]; // Changed from imageUrl to images array
  // Physical Specs
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  // Financials
  downPaymentPercent: number;
  interestRate: number;
  loanTermYears: number;
  // Short Term Rental Specifics
  nightlyRate: number;
  occupancyRate: number; // 0-100
  // Expenses (Monthly unless specified)
  propertyTax: number; // annual
  insurance: number; // annual
  managementFeePercent: number; // % of gross revenue
  snowRemoval: number;
  hotTubMaintenance: number;
  utilities: number;
  maintenance: number;
  hoa: number;
  otherExpenses: number;
  // AI Data
  aiDescription?: string;
  fairOfferRecommendation?: string;
  // User Data
  isFavorite?: boolean;
}

export interface CalculationResult {
  monthlyMortgage: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  cashFlow: number;
  cashOnCashReturn: number;
  capRate: number;
  totalInvestment: number;
}

export enum AIStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  sources?: { title: string; uri: string }[];
}