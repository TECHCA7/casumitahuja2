import { CMAData, YearlyProjection, FixedAsset } from './cmaTypes';

// Calculate depreciation for an asset
function calculateDepreciation(asset: FixedAsset): { depreciation: number; closingWdv: number } {
  const total = asset.openingWdv + asset.additionsBeforeOct + asset.additionsAfterOct - asset.sales;
  const depOnOpening = (asset.openingWdv - asset.sales) * (asset.rate / 100);
  const depBeforeOct = asset.additionsBeforeOct * (asset.rate / 100);
  const depAfterOct = asset.additionsAfterOct * (asset.rate / 100) * 0.5; // Half year for after Oct
  const depreciation = Math.max(0, depOnOpening + depBeforeOct + depAfterOct);
  const closingWdv = Math.max(0, total - depreciation);
  return { depreciation, closingWdv };
}

// Calculate 5 years of projections
export function calculateProjections(data: CMAData): YearlyProjection[] {
  const { basicData, fixedAssets, openingBalances } = data;
  const projections: YearlyProjection[] = [];
  
  // Calculate total fixed assets
  let currentAssets = fixedAssets.map(a => ({ ...a }));
  let prevYearData: Partial<YearlyProjection> = {};
  
  for (let i = 0; i < 5; i++) {
    const year = basicData.yearEnding + i;
    const isActual = i === 0;
    const yearLabel = `31.3.${year.toString().slice(-2)}`;
    
    // Sales projections
    const salesGrowth = i === 0 ? 1 : Math.pow(1 + basicData.salesIncreasePercent / 100, i);
    const grossSales = basicData.sales * salesGrowth;
    const netSales = grossSales;
    
    // Stock projections
    const stockGrowth = i === 0 ? 1 : Math.pow(1 + basicData.stockIncreasePercent / 100, i);
    const openingStock = i === 0 ? basicData.openingStock : prevYearData.closingStock || basicData.closingStock;
    const closingStock = basicData.closingStock * stockGrowth;
    
    // Gross profit calculation
    const grossProfit = netSales * (basicData.gpPercent / 100);
    const purchases = netSales - grossProfit + closingStock - openingStock;
    
    // Depreciation calculation
    let totalDepreciation = 0;
    let totalWdv = 0;
    
    if (i === 0) {
      // First year - use input assets
      currentAssets.forEach(asset => {
        const { depreciation, closingWdv } = calculateDepreciation(asset);
        totalDepreciation += depreciation;
        totalWdv += closingWdv;
        asset.openingWdv = closingWdv;
        asset.additionsBeforeOct = 0;
        asset.additionsAfterOct = 0;
        asset.sales = 0;
      });
    } else {
      // Subsequent years - depreciate on previous WDV
      currentAssets.forEach(asset => {
        const depreciation = asset.openingWdv * (asset.rate / 100);
        asset.openingWdv = Math.max(0, asset.openingWdv - depreciation);
        totalDepreciation += depreciation;
        totalWdv += asset.openingWdv;
      });
    }
    
    // Admin expenses (grow by 10% each year)
    const adminExpenses = i === 0 
      ? openingBalances.adminExpenses 
      : (prevYearData.adminExpenses || openingBalances.adminExpenses) * 1.10;
    
    // Operating calculations
    const operatingProfit = grossProfit - adminExpenses - totalDepreciation;
    
    // Interest calculations - CC interest proportional to usage in first year
    const ccInterest = i === 0 
      ? (basicData.ccAmount * basicData.ccRate / 100) * (7/12) // 7 months proportional
      : basicData.ccAmount * basicData.ccRate / 100;
    const tlInterest = basicData.tlAmount * basicData.tlRate / 100;
    const netOperatingProfit = operatingProfit - ccInterest - tlInterest;
    
    // Interest income (grow by 15% each year)
    const interestIncome = i === 0 
      ? openingBalances.interestIncome 
      : (prevYearData.interestIncome || openingBalances.interestIncome) * 1.15;
    
    const pbt = netOperatingProfit + interestIncome;
    const tax = 0; // Assuming no tax for proprietorship
    const pat = pbt - tax;
    
    // Drawings (increase each year)
    const drawingsBase = openingBalances.drawings || 240000;
    const drawings = drawingsBase + (i * 60000);
    
    // Capital account
    const prevCapital = i === 0 ? openingBalances.capitalAccount : prevYearData.capitalAccount || 0;
    const capitalAccount = prevCapital + pat - drawings;
    
    // Balance Sheet - Liabilities
    const ccAccount = basicData.ccAmount;
    const termLoanDue = Math.max(0, basicData.tlAmount - (i * basicData.tlAmount / basicData.repaymentYears));
    const unsecuredLoan = openingBalances.unsecuredLoan;
    
    // Creditors (grow with purchases)
    const creditors = i === 0 
      ? openingBalances.creditors 
      : openingBalances.creditors * (1 + basicData.salesIncreasePercent / 100 * i * 0.1);
    
    const advancesReceived = openingBalances.advancesReceived;
    const otherCurrentLiabilities = i === 0 
      ? openingBalances.otherCurrentLiabilities 
      : openingBalances.otherCurrentLiabilities * 1.09;
    
    // Balance Sheet - Assets
    const fixedAssetsWdv = totalWdv;
    
    // Investments (increase by 150000 each year)
    const investments = openingBalances.investments + (i * 150000);
    
    // Debtors (based on sales - approx 17 days)
    const debtors = netSales * (17 / 365);
    
    // Advances & deposits
    const advancesDeposits = i === 0 ? openingBalances.advancesDeposits : openingBalances.advancesDeposits * 1.08;
    
    // Cash & Bank - balancing figure
    const totalLiabilitiesWithoutCash = capitalAccount + ccAccount + termLoanDue + unsecuredLoan + creditors + advancesReceived + otherCurrentLiabilities;
    const totalAssetsWithoutCash = fixedAssetsWdv + investments + closingStock + debtors + advancesDeposits;
    const cashBankTotal = totalLiabilitiesWithoutCash - totalAssetsWithoutCash;
    const cashInHand = Math.max(0, cashBankTotal * 0.3);
    const bankBalance = Math.max(0, cashBankTotal * 0.7);
    
    const totalLiabilities = totalLiabilitiesWithoutCash;
    const totalAssets = totalAssetsWithoutCash + cashInHand + bankBalance;
    
    // Working Capital
    const totalCurrentAssets = cashInHand + bankBalance + closingStock + debtors + advancesDeposits;
    const totalCurrentLiabilities = ccAccount + creditors + advancesReceived + otherCurrentLiabilities;
    const workingCapitalGap = totalCurrentAssets - (totalCurrentLiabilities - ccAccount);
    const netWorkingCapital = capitalAccount + termLoanDue + unsecuredLoan - fixedAssetsWdv - investments;
    const assessedBankFinance = ccAccount;
    
    // Ratios
    const currentRatio = totalCurrentAssets / (totalCurrentLiabilities || 1);
    const tangibleNetWorth = capitalAccount;
    const totalOutsideLiabilities = totalCurrentLiabilities + termLoanDue;
    const tolTnw = totalOutsideLiabilities / (tangibleNetWorth || 1);
    
    // DSCR
    const cashAccruals = pat + totalDepreciation;
    const debtService = ccInterest + tlInterest + (basicData.tlAmount / basicData.repaymentYears);
    const dscr = cashAccruals / (debtService || 1);
    
    // BEP
    const fixedCosts = ccInterest + tlInterest + totalDepreciation + adminExpenses;
    const bep = (fixedCosts / (pat + fixedCosts)) * 100;
    
    const projection: YearlyProjection = {
      year,
      yearLabel,
      isActual,
      grossSales,
      otherOperatingRevenue: 0,
      netSales,
      openingStock,
      closingStock,
      purchases,
      grossProfit,
      gpPercent: basicData.gpPercent,
      adminExpenses,
      depreciation: totalDepreciation,
      operatingProfit,
      ccInterest,
      tlInterest,
      netOperatingProfit,
      interestIncome,
      pbt,
      tax,
      pat,
      capitalAccount,
      ccAccount,
      termLoanDue,
      unsecuredLoan,
      creditors,
      advancesReceived,
      otherCurrentLiabilities,
      totalLiabilities,
      fixedAssetsWdv,
      investments,
      cashInHand,
      bankBalance,
      stock: closingStock,
      debtors,
      advancesDeposits,
      totalAssets,
      totalCurrentAssets,
      totalCurrentLiabilities,
      workingCapitalGap,
      netWorkingCapital,
      assessedBankFinance,
      currentRatio,
      tolTnw,
      dscr,
      bep,
    };
    
    projections.push(projection);
    prevYearData = projection;
  }
  
  return projections;
}

// Format number for display
export function formatIndianNumber(num: number, decimals = 0): string {
  if (isNaN(num) || !isFinite(num)) return '-';
  const fixed = num.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const lastThree = intPart.slice(-3);
  const otherNumbers = intPart.slice(0, -3);
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + (otherNumbers ? ',' : '') + lastThree;
  return decPart ? `${formatted}.${decPart}` : formatted;
}

// Format as lakhs
export function formatLakhs(num: number, decimals = 2): string {
  return formatIndianNumber(num / 100000, decimals);
}
