// CMA Data Types

export interface CMABasicData {
  businessName: string;
  businessAdd1: string;
  businessAdd2: string;
  proprietor: string;
  fatherName: string;
  dob: string;
  resAdd1: string;
  resAdd2: string;
  businessType: 'Trading' | 'Manufacturing' | 'Service';
  activity: string;
  category: string;
  sales: number;
  openingStock: number;
  closingStock: number;
  gpPercent: number;
  salesIncreasePercent: number;
  stockIncreasePercent: number;
  ccAmount: number;
  ccRate: number;
  tlAmount: number;
  tlRate: number;
  margin: number;
  yearEnding: number;
  employees: number;
  schemeName: string;
  repaymentYears: number;
}

export interface FixedAsset {
  id: string;
  name: string;
  rate: number;
  openingWdv: number;
  additionsBeforeOct: number;
  additionsAfterOct: number;
  sales: number;
}

export interface OpeningBalances {
  // Capital & Liabilities
  capitalAccount: number;
  ccAccount: number;
  termLoan: number;
  unsecuredLoan: number;
  creditors: number;
  advancesReceived: number;
  otherCurrentLiabilities: number;
  
  // Assets
  cashInHand: number;
  bankBalance: number;
  investments: number;
  debtors: number;
  advancesToSuppliers: number;
  advancesDeposits: number;
  
  // Additional
  drawings: number;
  interestIncome: number;
  adminExpenses: number;
}

export interface CMAData {
  basicData: CMABasicData;
  fixedAssets: FixedAsset[];
  openingBalances: OpeningBalances;
}

export interface YearlyProjection {
  year: number;
  yearLabel: string;
  isActual: boolean;
  
  // P&L
  grossSales: number;
  otherOperatingRevenue: number;
  netSales: number;
  openingStock: number;
  closingStock: number;
  purchases: number;
  grossProfit: number;
  gpPercent: number;
  adminExpenses: number;
  depreciation: number;
  operatingProfit: number;
  ccInterest: number;
  tlInterest: number;
  netOperatingProfit: number;
  interestIncome: number;
  pbt: number;
  tax: number;
  pat: number;
  
  // Balance Sheet - Liabilities
  capitalAccount: number;
  ccAccount: number;
  termLoanDue: number;
  unsecuredLoan: number;
  creditors: number;
  advancesReceived: number;
  otherCurrentLiabilities: number;
  totalLiabilities: number;
  
  // Balance Sheet - Assets
  fixedAssetsWdv: number;
  investments: number;
  cashInHand: number;
  bankBalance: number;
  stock: number;
  debtors: number;
  advancesDeposits: number;
  totalAssets: number;
  
  // Working Capital
  totalCurrentAssets: number;
  totalCurrentLiabilities: number;
  workingCapitalGap: number;
  netWorkingCapital: number;
  assessedBankFinance: number;
  
  // Ratios
  currentRatio: number;
  tolTnw: number;
  dscr: number;
  bep: number;
}

export const defaultBasicData: CMABasicData = {
  businessName: '',
  businessAdd1: '',
  businessAdd2: '',
  proprietor: '',
  fatherName: '',
  dob: '',
  resAdd1: '',
  resAdd2: '',
  businessType: 'Trading',
  activity: '',
  category: 'General',
  sales: 0,
  openingStock: 0,
  closingStock: 0,
  gpPercent: 25,
  salesIncreasePercent: 15,
  stockIncreasePercent: 25,
  ccAmount: 0,
  ccRate: 10,
  tlAmount: 0,
  tlRate: 12,
  margin: 0,
  yearEnding: new Date().getFullYear(),
  employees: 1,
  schemeName: '',
  repaymentYears: 5,
};

export const defaultOpeningBalances: OpeningBalances = {
  capitalAccount: 0,
  ccAccount: 0,
  termLoan: 0,
  unsecuredLoan: 0,
  creditors: 0,
  advancesReceived: 0,
  otherCurrentLiabilities: 0,
  cashInHand: 0,
  bankBalance: 0,
  investments: 0,
  debtors: 0,
  advancesToSuppliers: 0,
  advancesDeposits: 0,
  drawings: 0,
  interestIncome: 0,
  adminExpenses: 0,
};

export const defaultFixedAssets: FixedAsset[] = [
  { id: '1', name: 'Furniture & Fixtures', rate: 10, openingWdv: 0, additionsBeforeOct: 0, additionsAfterOct: 0, sales: 0 },
  { id: '2', name: 'Plant & Machinery', rate: 15, openingWdv: 0, additionsBeforeOct: 0, additionsAfterOct: 0, sales: 0 },
  { id: '3', name: 'Computers', rate: 40, openingWdv: 0, additionsBeforeOct: 0, additionsAfterOct: 0, sales: 0 },
  { id: '4', name: 'Vehicles', rate: 15, openingWdv: 0, additionsBeforeOct: 0, additionsAfterOct: 0, sales: 0 },
];
