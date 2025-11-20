import { Property, CalculationResult } from '../types';

export const calculateMetrics = (p: Property): CalculationResult => {
  // 1. Mortgage Calculation
  const downPayment = p.price * (p.downPaymentPercent / 100);
  const loanAmount = p.price - downPayment;
  const monthlyRate = p.interestRate / 100 / 12;
  const numberOfPayments = p.loanTermYears * 12;

  let monthlyMortgage = 0;
  if (monthlyRate > 0) {
    monthlyMortgage =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  } else {
    monthlyMortgage = loanAmount / numberOfPayments;
  }

  // 2. Income Calculation
  const monthlyIncome = (p.nightlyRate * 365 * (p.occupancyRate / 100)) / 12;

  // 3. Expense Calculation
  const managementFee = monthlyIncome * (p.managementFeePercent / 100);
  const monthlyTax = p.propertyTax / 12;
  const monthlyInsurance = p.insurance / 12;
  
  const monthlyExpenses = 
    managementFee + 
    monthlyTax + 
    monthlyInsurance + 
    p.snowRemoval + 
    (p.hotTubMaintenance || 0) +
    p.utilities + 
    p.maintenance + 
    p.hoa + 
    p.otherExpenses;

  // 4. Profitability
  const cashFlow = monthlyIncome - monthlyExpenses - monthlyMortgage;
  const annualCashFlow = cashFlow * 12;
  
  // Closing costs estimate (approx 3% of price - simplified)
  const closingCosts = p.price * 0.03; 
  const totalInvestment = downPayment + closingCosts; // Simplified initial investment

  const cashOnCashReturn = totalInvestment > 0 ? (annualCashFlow / totalInvestment) * 100 : 0;

  // Cap Rate = (Net Operating Income / Current Market Value) * 100
  // NOI = Income - Operating Expenses (Exclude Mortgage)
  const annualNOI = (monthlyIncome - monthlyExpenses) * 12;
  const capRate = (annualNOI / p.price) * 100;

  return {
    monthlyMortgage,
    monthlyIncome,
    monthlyExpenses,
    cashFlow,
    cashOnCashReturn,
    capRate,
    totalInvestment
  };
};

export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
};

export const formatPercent = (val: number) => {
  return `${val.toFixed(2)}%`;
};