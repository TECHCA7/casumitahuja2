import * as XLSX from 'xlsx';
import { CMAData, YearlyProjection, FixedAsset } from './cmaTypes';
import { formatIndianNumber, formatLakhs } from './cmaCalculations';

// Color definitions for xlsx-style-utils
const COLORS = {
  HEADER_BG: "1F4E79",      // Dark blue
  HEADER_FG: "FFFFFF",      // White text
  SECTION_BG: "2E75B6",     // Medium blue
  SECTION_FG: "FFFFFF",     // White text
  SUBSECTION_BG: "BDD7EE",  // Light blue
  TOTAL_BG: "FFC000",       // Orange/Yellow for totals
  SUBTOTAL_BG: "E2EFDA",    // Light green
  INPUT_BG: "FFFF00",       // Yellow for input cells
  ALT_ROW_BG: "F2F2F2",     // Light gray for alternating rows
  RATIO_BG: "FCE4D6",       // Light orange for ratios
};

// CA Firm footer for official sheets - DO NOT MODIFY
const CA_FIRM_FOOTER: any[][] = [
  [],
  [],
  ['As per particulars and information provided by Proprietor'],
  [],
  ['For Sumit Ahuja & Associates'],
  ['Chartered Accountants'],
  ['Firm Regn. No. : 025395C'],
  [],
  [],
  ['CA Sumit Ahuja'],
  ['Partner'],
  ['M.No. 440143'],
  ['Place : Seoni'],
];

function fmt(num: number, decimals = 0): string {
  if (isNaN(num) || !isFinite(num) || num === 0) return '-';
  return formatIndianNumber(num, decimals);
}

function fmtL(num: number): string {
  if (isNaN(num) || !isFinite(num) || num === 0) return '-';
  return formatLakhs(num, 2);
}

function fmtLNum(num: number): number {
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round(num / 100000 * 100) / 100;
}

// Apply cell styling (xlsx doesn't support styling natively, we use cell comments for visual hints)
function setColumnWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}

function setRowHeights(ws: XLSX.WorkSheet, heights: { [row: number]: number }) {
  ws['!rows'] = [];
  Object.entries(heights).forEach(([row, height]) => {
    ws['!rows']![parseInt(row)] = { hpt: height };
  });
}

export function exportCMAToExcel(data: CMAData, projections: YearlyProjection[]) {
  const wb = XLSX.utils.book_new();
  const { basicData, fixedAssets, openingBalances } = data;
  const years = projections.map(p => p.yearLabel);
  const businessHeader = `${basicData.businessName}, ${basicData.businessAdd1}${basicData.businessAdd2 ? ', ' + basicData.businessAdd2 : ''}`;
  
  // ===== SHEET 1: Project At Glance =====
  createProjectGlanceSheet(wb, data, projections, businessHeader);
  
  // ===== SHEET 2: Trading CMA (Form I & II Combined) =====
  createTradingCMASheet(wb, data, projections, businessHeader, years);
  
  // ===== SHEET 3: Balance Sheet (Form III) =====
  createBalanceSheetAnalysis(wb, data, projections, businessHeader, years);
  
  // ===== SHEET 4: Fixed Assets Schedule =====
  createFixedAssetsSheet(wb, data, projections, businessHeader);
  
  // ===== SHEET 5: Working Capital Assessment (Form IV & V) =====
  createWorkingCapitalSheet(wb, data, projections, businessHeader, years);
  
  // ===== SHEET 6: Fund Flow (Form VI) =====
  createFundFlowSheet(wb, data, projections, businessHeader, years);
  
  // ===== SHEET 7: Ratios & DSCR =====
  createRatiosSheet(wb, data, projections, businessHeader, years);
  
  // Generate file
  const fileName = `CMA_${basicData.businessName.replace(/[^a-zA-Z0-9]/g, '_')}_${basicData.yearEnding}.xlsx`;
  XLSX.writeFile(wb, fileName);
  
  return fileName;
}

function createProjectGlanceSheet(wb: XLSX.WorkBook, data: CMAData, projections: YearlyProjection[], businessHeader: string) {
  const { basicData, fixedAssets, openingBalances } = data;
  
  const sheet: any[][] = [
    [businessHeader],
    [`PROPRIETOR/PARTNER : ${basicData.proprietor}`],
    [],
    ['PROJECT AT GLANCE'],
    [],
    ['S.No.', 'PARTICULARS', '', 'DETAILS'],
    [],
    ['1', 'Name of Proprietor/Partner', '', basicData.proprietor],
    ['', '', '', `S/o ${basicData.fatherName}`],
    ['', '', '', `DOB: ${basicData.dob}`],
    [],
    ['2', 'Address', '', ''],
    ['', '(a) Permanent Address', '', `${basicData.resAdd1}${basicData.resAdd2 ? ', ' + basicData.resAdd2 : ''}`],
    ['', '(b) Business Address', '', `${basicData.businessAdd1}${basicData.businessAdd2 ? ', ' + basicData.businessAdd2 : ''}`],
    [],
    ['3', 'Category', '', basicData.category],
    ['4', 'Constitution', '', 'Proprietorship'],
    ['5', 'Nature of Business', '', `${basicData.businessType} : ${basicData.activity}`],
    ['6', 'No. of Employees', '', basicData.employees],
    [],
    ['7', 'COST OF PROJECT', '', ''],
    ['', '(a) Fixed Assets (Machinery/Vehicle)', '', fmt(fixedAssets.reduce((sum, a) => sum + a.openingWdv, 0))],
    ['', '(b) Working Capital Requirement', '', fmt(basicData.ccAmount + basicData.margin)],
    ['', 'TOTAL COST OF PROJECT', '', fmt(basicData.ccAmount + basicData.margin + fixedAssets.reduce((sum, a) => sum + a.openingWdv, 0))],
    [],
    ['8', 'MEANS OF FINANCE', '', ''],
    ['', "(a) Promoter's Contribution/Margin", '', fmt(basicData.margin)],
    ['', '(b) Term Loan', '', fmt(basicData.tlAmount)],
    ['', '(c) Cash Credit/Working Capital Loan', '', fmt(basicData.ccAmount)],
    ['', 'TOTAL MEANS', '', fmt(basicData.margin + basicData.tlAmount + basicData.ccAmount)],
    [],
    ['9', 'Scheme Name', '', basicData.schemeName],
    ['10', 'Year Ending', '', `31st March ${basicData.yearEnding}`],
    ['11', 'Repayment Period', '', `${basicData.repaymentYears} Years`],
    [],
    ['12', 'KEY FINANCIAL INDICATORS', '', ''],
    ['', 'Average DSCR', '', (projections.reduce((sum, p) => sum + p.dscr, 0) / projections.length).toFixed(2)],
    ['', 'Average BEP %', '', `${(projections.reduce((sum, p) => sum + p.bep, 0) / projections.length).toFixed(1)}%`],
    ['', 'Average TOL/TNW', '', (projections.reduce((sum, p) => sum + p.tolTnw, 0) / projections.length).toFixed(2)],
    ['', 'Average Current Ratio', '', (projections.reduce((sum, p) => sum + p.currentRatio, 0) / projections.length).toFixed(2)],
    [],
    ['13', 'SECURITY OFFERED', '', ''],
    ['', '(a) Primary Security', '', 'Hypothecation of Stock & Debtors'],
    ['', '(b) Collateral Security', '', 'As per Bank Norms'],
    ['', '(c) Personal Guarantee', '', basicData.proprietor],
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(sheet);
  setColumnWidths(ws, [8, 35, 5, 45]);
  XLSX.utils.book_append_sheet(wb, ws, 'Project Glance');
}

function createTradingCMASheet(wb: XLSX.WorkBook, data: CMAData, projections: YearlyProjection[], businessHeader: string, years: string[]) {
  const { basicData } = data;
  
  const sheet: any[][] = [
    [businessHeader],
    [`PROPRIETOR/PARTNER : ${basicData.proprietor}`],
    [],
    ['FORM I & II : OPERATING STATEMENT - TRADING CMA'],
    ['(Amount in Rs.)'],
    [],
    ['', 'PARTICULARS', ...years],
    ['', '', 'Audited', 'Estimated', 'Projected', 'Projected', 'Projected'],
    [],
    // SECTION A: SALES
    ['A.', 'GROSS SALES'],
    ['1', 'Domestic Sales', ...projections.map(p => fmt(p.grossSales))],
    ['2', 'Export Sales', ...projections.map(() => '-')],
    ['3', 'TOTAL GROSS SALES', ...projections.map(p => fmt(p.grossSales))],
    [],
    ['4', 'Less: Excise Duty/GST', ...projections.map(() => '-')],
    ['5', 'NET SALES', ...projections.map(p => fmt(p.netSales))],
    [],
    // SECTION B: COST OF GOODS SOLD
    ['B.', 'COST OF GOODS SOLD'],
    ['6', 'Opening Stock', ...projections.map(p => fmt(p.openingStock))],
    ['7', 'Add: Purchases (Net of Returns)', ...projections.map(p => fmt(p.purchases))],
    ['8', 'Add: Direct Expenses', ...projections.map(() => '-')],
    ['9', 'Add: Manufacturing Expenses', ...projections.map(() => '-')],
    ['10', 'Total (6+7+8+9)', ...projections.map(p => fmt(p.openingStock + p.purchases))],
    ['11', 'Less: Closing Stock', ...projections.map(p => fmt(p.closingStock))],
    ['12', 'COST OF GOODS SOLD (10-11)', ...projections.map(p => fmt(p.openingStock + p.purchases - p.closingStock))],
    [],
    // SECTION C: GROSS PROFIT
    ['C.', 'GROSS PROFIT (5-12)', ...projections.map(p => fmt(p.grossProfit))],
    ['', 'Gross Profit %', ...projections.map(p => `${p.gpPercent.toFixed(1)}%`)],
    [],
    // SECTION D: OPERATING EXPENSES
    ['D.', 'OPERATING EXPENSES'],
    ['13', 'Salaries & Wages', ...projections.map(p => fmt(p.adminExpenses * 0.5))],
    ['14', 'Rent, Rates & Taxes', ...projections.map(p => fmt(p.adminExpenses * 0.15))],
    ['15', 'Selling & Distribution', ...projections.map(p => fmt(p.adminExpenses * 0.1))],
    ['16', 'Admin & General Expenses', ...projections.map(p => fmt(p.adminExpenses * 0.25))],
    ['17', 'Repairs & Maintenance', ...projections.map(() => '-')],
    ['18', 'Insurance', ...projections.map(() => '-')],
    ['19', 'Depreciation', ...projections.map(p => fmt(p.depreciation))],
    ['20', 'TOTAL OPERATING EXPENSES', ...projections.map(p => fmt(p.adminExpenses + p.depreciation))],
    [],
    // SECTION E: OPERATING PROFIT
    ['E.', 'OPERATING PROFIT (PBDIT) (C-D)', ...projections.map(p => fmt(p.operatingProfit + p.depreciation))],
    ['21', 'Less: Depreciation', ...projections.map(p => fmt(p.depreciation))],
    ['', 'OPERATING PROFIT (PBIT)', ...projections.map(p => fmt(p.operatingProfit))],
    [],
    // SECTION F: INTEREST
    ['F.', 'INTEREST & FINANCE CHARGES'],
    ['22', 'Interest on Cash Credit', ...projections.map(p => fmt(p.ccInterest))],
    ['23', 'Interest on Term Loan', ...projections.map(p => fmt(p.tlInterest))],
    ['24', 'Other Finance Charges', ...projections.map(() => '-')],
    ['25', 'TOTAL INTEREST', ...projections.map(p => fmt(p.ccInterest + p.tlInterest))],
    [],
    // SECTION G: NET OPERATING PROFIT
    ['G.', 'NET OPERATING PROFIT (E-F)', ...projections.map(p => fmt(p.netOperatingProfit))],
    [],
    // SECTION H: NON-OPERATING INCOME
    ['H.', 'NON-OPERATING INCOME'],
    ['26', 'Interest/Dividend Received', ...projections.map(p => fmt(p.interestIncome))],
    ['27', 'Other Income', ...projections.map(() => '-')],
    ['', 'TOTAL NON-OPERATING INCOME', ...projections.map(p => fmt(p.interestIncome))],
    [],
    // SECTION I: PROFIT BEFORE TAX
    ['I.', 'PROFIT BEFORE TAX (G+H)', ...projections.map(p => fmt(p.pbt))],
    ['28', 'Less: Provision for Tax', ...projections.map(p => fmt(p.tax))],
    [],
    // SECTION J: NET PROFIT AFTER TAX
    ['J.', 'NET PROFIT AFTER TAX', ...projections.map(p => fmt(p.pat))],
    ['', 'PAT % of Sales', ...projections.map(p => `${((p.pat / p.netSales) * 100).toFixed(1)}%`)],
    [],
    // CASH ACCRUALS
    ['K.', 'CASH ACCRUALS (PAT + Depreciation)', ...projections.map(p => fmt(p.pat + p.depreciation))],
    ...CA_FIRM_FOOTER,
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(sheet);
  setColumnWidths(ws, [5, 35, 14, 14, 14, 14, 14]);
  XLSX.utils.book_append_sheet(wb, ws, 'Trading CMA');
}

function createBalanceSheetAnalysis(wb: XLSX.WorkBook, data: CMAData, projections: YearlyProjection[], businessHeader: string, years: string[]) {
  const { basicData, openingBalances } = data;
  
  const sheet: any[][] = [
    [businessHeader],
    [`PROPRIETOR/PARTNER : ${basicData.proprietor}`],
    [],
    ['FORM III : ANALYSIS OF BALANCE SHEET'],
    ['(Amount in Rs.)'],
    [],
    ['', 'PARTICULARS', ...years],
    ['', '', 'Audited', 'Estimated', 'Projected', 'Projected', 'Projected'],
    [],
    // LIABILITIES SIDE
    ['', 'LIABILITIES'],
    [],
    ['A.', 'CURRENT LIABILITIES'],
    ['1', 'Short-term Borrowings from Banks', ...projections.map(p => fmt(p.ccAccount))],
    ['2', 'Sundry Creditors (Trade)', ...projections.map(p => fmt(p.creditors))],
    ['3', 'Advances from Customers', ...projections.map(p => fmt(p.advancesReceived))],
    ['4', 'Other Current Liabilities', ...projections.map(p => fmt(p.otherCurrentLiabilities))],
    ['5', 'Provisions', ...projections.map(() => '-')],
    ['', 'TOTAL CURRENT LIABILITIES (A)', ...projections.map(p => fmt(p.totalCurrentLiabilities))],
    [],
    ['B.', 'TERM LIABILITIES'],
    ['6', 'Term Loans from Banks/FI', ...projections.map(p => fmt(p.termLoanDue))],
    ['7', 'Unsecured Loans', ...projections.map(p => fmt(p.unsecuredLoan))],
    ['8', 'Deferred Payment Liabilities', ...projections.map(() => '-')],
    ['', 'TOTAL TERM LIABILITIES (B)', ...projections.map(p => fmt(p.termLoanDue + p.unsecuredLoan))],
    [],
    ['C.', 'NET WORTH'],
    ['9', 'Paid-up Capital/Capital Account', ...projections.map(p => fmt(p.capitalAccount))],
    ['10', 'Reserves & Surplus', ...projections.map(() => '-')],
    ['11', 'Less: Intangible Assets', ...projections.map(() => '-')],
    ['', 'TOTAL NET WORTH (C)', ...projections.map(p => fmt(p.capitalAccount))],
    [],
    ['', 'TOTAL LIABILITIES (A+B+C)', ...projections.map(p => fmt(p.totalLiabilities))],
    [],
    // ASSETS SIDE
    ['', 'ASSETS'],
    [],
    ['D.', 'CURRENT ASSETS'],
    ['12', 'Cash in Hand', ...projections.map(p => fmt(p.cashInHand))],
    ['13', 'Bank Balance', ...projections.map(p => fmt(p.bankBalance))],
    ['14', 'Inventory/Stock', ...projections.map(p => fmt(p.stock))],
    ['15', 'Sundry Debtors (Trade)', ...projections.map(p => fmt(p.debtors))],
    ['16', 'Advances to Suppliers', ...projections.map(() => '-')],
    ['17', 'Other Current Assets', ...projections.map(p => fmt(p.advancesDeposits))],
    ['', 'TOTAL CURRENT ASSETS (D)', ...projections.map(p => fmt(p.totalCurrentAssets))],
    [],
    ['E.', 'FIXED ASSETS'],
    ['18', 'Gross Block', ...projections.map(p => fmt(p.fixedAssetsWdv + p.depreciation))],
    ['19', 'Less: Depreciation', ...projections.map(p => fmt(p.depreciation))],
    ['20', 'Net Block (WDV)', ...projections.map(p => fmt(p.fixedAssetsWdv))],
    [],
    ['F.', 'NON-CURRENT ASSETS'],
    ['21', 'Investments', ...projections.map(p => fmt(p.investments))],
    ['22', 'Deposits & Advances', ...projections.map(() => '-')],
    ['', 'TOTAL NON-CURRENT ASSETS (F)', ...projections.map(p => fmt(p.investments))],
    [],
    ['', 'TOTAL ASSETS (D+E+F)', ...projections.map(p => fmt(p.totalAssets))],
    [],
    ['', 'BALANCING CHECK (Assets - Liabilities)', ...projections.map(p => fmt(Math.abs(p.totalAssets - p.totalLiabilities)))],
    ['', '(Note: Cash & Bank is used as balancing figure)', '', '', '', '', ''],
    ...CA_FIRM_FOOTER,
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(sheet);
  setColumnWidths(ws, [5, 35, 14, 14, 14, 14, 14]);
  XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');
}

function createFixedAssetsSheet(wb: XLSX.WorkBook, data: CMAData, projections: YearlyProjection[], businessHeader: string) {
  const { basicData, fixedAssets } = data;
  
  const sheet: any[][] = [
    [businessHeader],
    [`PROPRIETOR/PARTNER : ${basicData.proprietor}`],
    [],
    ['SCHEDULE OF FIXED ASSETS - DEPRECIATION STATEMENT'],
    ['(Amount in Rs.)'],
    [],
  ];
  
  // Add depreciation schedule for each year
  projections.forEach((proj, idx) => {
    sheet.push([]);
    sheet.push([`YEAR ENDING: ${proj.yearLabel}`]);
    sheet.push(['S.No.', 'ASSETS', 'Rate %', 'Opening WDV', 'Additions', 'Sales', 'Total', 'Depreciation', 'Closing WDV']);
    
    let totalOpWdv = 0;
    let totalAdditions = 0;
    let totalSales = 0;
    let totalDep = 0;
    let totalClWdv = 0;
    
    fixedAssets.forEach((asset, assetIdx) => {
      const growthFactor = Math.pow(1 - asset.rate / 100, idx);
      const opWdv = idx === 0 ? asset.openingWdv : asset.openingWdv * growthFactor;
      const additions = idx === 0 ? asset.additionsBeforeOct + asset.additionsAfterOct : 0;
      const sales = idx === 0 ? asset.sales : 0;
      const total = opWdv + additions - sales;
      const dep = total * asset.rate / 100;
      const clWdv = total - dep;
      
      totalOpWdv += opWdv;
      totalAdditions += additions;
      totalSales += sales;
      totalDep += dep;
      totalClWdv += clWdv;
      
      sheet.push([
        assetIdx + 1,
        asset.name,
        `${asset.rate}%`,
        fmt(opWdv),
        fmt(additions),
        fmt(sales),
        fmt(total),
        fmt(dep),
        fmt(clWdv),
      ]);
    });
    
    sheet.push([
      '',
      'TOTAL',
      '',
      fmt(totalOpWdv),
      fmt(totalAdditions),
      fmt(totalSales),
      fmt(totalOpWdv + totalAdditions - totalSales),
      fmt(totalDep),
      fmt(totalClWdv),
    ]);
  });
  
  const ws = XLSX.utils.aoa_to_sheet(sheet);
  setColumnWidths(ws, [6, 25, 8, 14, 12, 10, 14, 12, 14]);
  XLSX.utils.book_append_sheet(wb, ws, 'Fixed Assets');
}

function createWorkingCapitalSheet(wb: XLSX.WorkBook, data: CMAData, projections: YearlyProjection[], businessHeader: string, years: string[]) {
  const { basicData } = data;
  
  const sheet: any[][] = [
    [businessHeader],
    [`PROPRIETOR/PARTNER : ${basicData.proprietor}`],
    [],
    ['FORM IV : COMPARATIVE STATEMENT OF CURRENT ASSETS & CURRENT LIABILITIES'],
    ['(Amount in Rs. Lakhs)'],
    [],
    ['', 'PARTICULARS', ...years],
    ['', '', 'Audited', 'Estimated', 'Projected', 'Projected', 'Projected'],
    [],
    // CURRENT ASSETS
    ['A.', 'CURRENT ASSETS'],
    ['1', 'Raw Materials', ...projections.map(() => '-')],
    ['2', 'Stock-in-Process', ...projections.map(() => '-')],
    ['3', 'Finished Goods/Trading Stock', ...projections.map(p => fmtL(p.stock))],
    ['4', 'Receivables (Debtors)', ...projections.map(p => fmtL(p.debtors))],
    ['5', 'Advances to Suppliers', ...projections.map(() => '-')],
    ['6', 'Other Current Assets', ...projections.map(p => fmtL(p.advancesDeposits))],
    ['', 'TOTAL CURRENT ASSETS (A)', ...projections.map(p => fmtL(p.totalCurrentAssets - p.cashInHand - p.bankBalance))],
    [],
    // CURRENT LIABILITIES (OTHER THAN BANK)
    ['B.', 'CURRENT LIABILITIES (Excl. Bank Borrowings)'],
    ['7', 'Sundry Creditors', ...projections.map(p => fmtL(p.creditors))],
    ['8', 'Advances from Customers', ...projections.map(p => fmtL(p.advancesReceived))],
    ['9', 'Statutory Liabilities', ...projections.map(() => '-')],
    ['10', 'Other Current Liabilities', ...projections.map(p => fmtL(p.otherCurrentLiabilities))],
    ['', 'TOTAL CURRENT LIABILITIES (B)', ...projections.map(p => fmtL(p.totalCurrentLiabilities - p.ccAccount))],
    [],
    // WORKING CAPITAL GAP
    ['C.', 'WORKING CAPITAL GAP (A-B)', ...projections.map(p => fmtL(p.workingCapitalGap))],
    [],
    [],
    ['FORM V : COMPUTATION OF MAXIMUM PERMISSIBLE BANK FINANCE (MPBF)'],
    ['(Amount in Rs. Lakhs)'],
    [],
    ['', 'PARTICULARS', ...years],
    [],
    ['1', 'Total Current Assets (Excl. Cash & Bank)', ...projections.map(p => fmtL(p.totalCurrentAssets - p.cashInHand - p.bankBalance))],
    ['2', 'Other Current Liabilities (Excl. Bank)', ...projections.map(p => fmtL(p.totalCurrentLiabilities - p.ccAccount))],
    ['3', 'WORKING CAPITAL GAP (1-2)', ...projections.map(p => fmtL(p.workingCapitalGap))],
    [],
    ['4', 'Minimum Stipulated NWC (25% of TCA)', ...projections.map(p => fmtL((p.totalCurrentAssets - p.cashInHand - p.bankBalance) * 0.25))],
    [],
    ['', 'METHOD I (1st Method of Lending)'],
    ['5', 'MPBF = 75% of WC Gap', ...projections.map(p => fmtL(p.workingCapitalGap * 0.75))],
    [],
    ['', 'METHOD II (2nd Method of Lending)'],
    ['6', 'MPBF = WC Gap - 25% of TCA', ...projections.map(p => fmtL(p.workingCapitalGap - (p.totalCurrentAssets - p.cashInHand - p.bankBalance) * 0.25))],
    [],
    ['7', 'Actual/Proposed Bank Finance', ...projections.map(p => fmtL(p.ccAccount))],
    ['8', 'Surplus/Deficit', ...projections.map(p => fmtL(p.workingCapitalGap * 0.75 - p.ccAccount))],
    [],
    [],
    ['HOLDING PERIOD ANALYSIS'],
    [],
    ['', 'PARTICULARS', ...years],
    [],
    ['1', 'Stock Holding (Days)', ...projections.map(p => Math.round((p.stock / (p.purchases / 365))))],
    ['2', 'Debtors Collection (Days)', ...projections.map(p => Math.round((p.debtors / (p.netSales / 365))))],
    ['3', 'Creditors Payment (Days)', ...projections.map(p => Math.round((p.creditors / (p.purchases / 365))))],
    ['4', 'Operating Cycle (1+2-3)', ...projections.map(p => {
      const stockDays = Math.round((p.stock / (p.purchases / 365)));
      const debtorDays = Math.round((p.debtors / (p.netSales / 365)));
      const creditorDays = Math.round((p.creditors / (p.purchases / 365)));
      return stockDays + debtorDays - creditorDays;
    })],
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(sheet);
  setColumnWidths(ws, [5, 40, 12, 12, 12, 12, 12]);
  XLSX.utils.book_append_sheet(wb, ws, 'Working Capital');
}

function createFundFlowSheet(wb: XLSX.WorkBook, data: CMAData, projections: YearlyProjection[], businessHeader: string, years: string[]) {
  const { basicData, openingBalances } = data;
  
  const sheet: any[][] = [
    [businessHeader],
    [`PROPRIETOR/PARTNER : ${basicData.proprietor}`],
    [],
    ['FORM VI : FUND FLOW STATEMENT'],
    ['(Amount in Rs. Lakhs)'],
    [],
    ['', 'PARTICULARS', ...years],
    ['', '', 'Audited', 'Estimated', 'Projected', 'Projected', 'Projected'],
    [],
    ['', 'SOURCES OF FUNDS'],
    [],
    ['1', 'Net Profit after Tax', ...projections.map(p => fmtL(p.pat))],
    ['2', 'Add: Depreciation', ...projections.map(p => fmtL(p.depreciation))],
    ['', 'CASH ACCRUALS (1+2)', ...projections.map(p => fmtL(p.pat + p.depreciation))],
    [],
    ['3', 'Increase in Capital', ...projections.map((p, i) => i === 0 ? fmtL(Math.max(0, p.capitalAccount - openingBalances.capitalAccount)) : '-')],
    ['4', 'Increase in Term Loan', ...projections.map((p, i) => i === 0 ? fmtL(basicData.tlAmount) : '-')],
    ['5', 'Increase in Unsecured Loan', ...projections.map(() => '-')],
    ['6', 'Sale of Fixed Assets', ...projections.map(() => '-')],
    ['7', 'Decrease in Working Capital', ...projections.map(() => '-')],
    [],
    ['', 'TOTAL SOURCES (A)', ...projections.map((p, i) => {
      const cashAccruals = p.pat + p.depreciation;
      const increaseCapital = i === 0 ? Math.max(0, p.capitalAccount - openingBalances.capitalAccount) : 0;
      const increaseTL = i === 0 ? basicData.tlAmount : 0;
      return fmtL(cashAccruals + increaseCapital + increaseTL);
    })],
    [],
    ['', 'USES OF FUNDS'],
    [],
    ['8', 'Decrease in Term Loan (Repayment)', ...projections.map((p, i) => i === 0 ? '-' : fmtL(basicData.tlAmount / basicData.repaymentYears))],
    ['9', 'Addition to Fixed Assets', ...projections.map((p, i) => i === 0 ? fmtL(p.fixedAssetsWdv + p.depreciation) : '-')],
    ['10', 'Increase in Investments', ...projections.map(() => fmtL(150000))],
    ['11', 'Drawings/Dividend', ...projections.map((p, i) => fmtL(openingBalances.drawings + i * 60000))],
    ['12', 'Increase in Working Capital', ...projections.map(() => '-')],
    [],
    ['', 'TOTAL USES (B)', ...projections.map((p, i) => {
      const tlRepay = i === 0 ? 0 : basicData.tlAmount / basicData.repaymentYears;
      const faAddition = i === 0 ? p.fixedAssetsWdv + p.depreciation : 0;
      const invIncrease = 150000;
      const drawings = openingBalances.drawings + i * 60000;
      return fmtL(tlRepay + faAddition + invIncrease + drawings);
    })],
    [],
    ['', 'NET SURPLUS/(DEFICIT) (A-B)', ...projections.map((p, i) => {
      const sources = p.pat + p.depreciation + (i === 0 ? Math.max(0, p.capitalAccount - openingBalances.capitalAccount) + basicData.tlAmount : 0);
      const uses = (i === 0 ? 0 : basicData.tlAmount / basicData.repaymentYears) + 
                   (i === 0 ? p.fixedAssetsWdv + p.depreciation : 0) + 
                   150000 + openingBalances.drawings + i * 60000;
      return fmtL(sources - uses);
    })],
    [],
    ['', 'CUMULATIVE SURPLUS/(DEFICIT)', ...projections.map((p, i) => {
      let cumulative = 0;
      for (let j = 0; j <= i; j++) {
        const sources = projections[j].pat + projections[j].depreciation + 
                       (j === 0 ? Math.max(0, projections[j].capitalAccount - openingBalances.capitalAccount) + basicData.tlAmount : 0);
        const uses = (j === 0 ? 0 : basicData.tlAmount / basicData.repaymentYears) + 
                     (j === 0 ? projections[j].fixedAssetsWdv + projections[j].depreciation : 0) + 
                     150000 + openingBalances.drawings + j * 60000;
        cumulative += sources - uses;
      }
      return fmtL(cumulative);
    })],
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(sheet);
  setColumnWidths(ws, [5, 40, 12, 12, 12, 12, 12]);
  XLSX.utils.book_append_sheet(wb, ws, 'Fund Flow');
}

function createRatiosSheet(wb: XLSX.WorkBook, data: CMAData, projections: YearlyProjection[], businessHeader: string, years: string[]) {
  const { basicData } = data;
  
  const sheet: any[][] = [
    [businessHeader],
    [`PROPRIETOR/PARTNER : ${basicData.proprietor}`],
    [],
    ['FINANCIAL RATIOS & INDICATORS'],
    [],
    ['', 'PARTICULARS', ...years],
    ['', '', 'Audited', 'Estimated', 'Projected', 'Projected', 'Projected'],
    [],
    ['A.', 'PROFITABILITY RATIOS'],
    [],
    ['1', 'Gross Profit Ratio (%)', ...projections.map(p => `${p.gpPercent.toFixed(1)}%`)],
    ['2', 'Operating Profit Ratio (%)', ...projections.map(p => `${((p.operatingProfit / p.netSales) * 100).toFixed(1)}%`)],
    ['3', 'Net Profit Ratio (%)', ...projections.map(p => `${((p.pat / p.netSales) * 100).toFixed(1)}%`)],
    ['4', 'Return on Capital Employed (%)', ...projections.map(p => `${((p.pbt + p.ccInterest + p.tlInterest) / (p.capitalAccount + p.termLoanDue + p.ccAccount) * 100).toFixed(1)}%`)],
    ['5', 'Return on Net Worth (%)', ...projections.map(p => `${((p.pat / p.capitalAccount) * 100).toFixed(1)}%`)],
    [],
    ['B.', 'LIQUIDITY RATIOS'],
    [],
    ['6', 'Current Ratio', ...projections.map(p => p.currentRatio.toFixed(2))],
    ['7', 'Quick Ratio (Acid Test)', ...projections.map(p => ((p.totalCurrentAssets - p.stock) / p.totalCurrentLiabilities).toFixed(2))],
    ['8', 'Cash Ratio', ...projections.map(p => ((p.cashInHand + p.bankBalance) / p.totalCurrentLiabilities).toFixed(2))],
    [],
    ['C.', 'LEVERAGE RATIOS'],
    [],
    ['9', 'TOL / TNW', ...projections.map(p => p.tolTnw.toFixed(2))],
    ['10', 'Debt-Equity Ratio', ...projections.map(p => (p.termLoanDue / p.capitalAccount).toFixed(2))],
    ['11', 'Interest Coverage Ratio', ...projections.map(p => (p.operatingProfit / (p.ccInterest + p.tlInterest)).toFixed(2))],
    [],
    ['D.', 'TURNOVER RATIOS'],
    [],
    ['12', 'Stock Turnover Ratio', ...projections.map(p => ((p.netSales - p.grossProfit) / p.stock).toFixed(2))],
    ['13', 'Debtors Turnover Ratio', ...projections.map(p => (p.netSales / p.debtors).toFixed(2))],
    ['14', 'Fixed Assets Turnover', ...projections.map(p => (p.netSales / p.fixedAssetsWdv).toFixed(2))],
    ['15', 'Total Assets Turnover', ...projections.map(p => (p.netSales / p.totalAssets).toFixed(2))],
    [],
    [],
    ['DEBT SERVICE COVERAGE RATIO (DSCR)'],
    [],
    ['', 'PARTICULARS', ...years],
    [],
    ['(A)', 'CASH INFLOWS'],
    ['1', 'Net Profit After Tax (Rs. Lakhs)', ...projections.map(p => fmtL(p.pat))],
    ['2', 'Add: Depreciation (Rs. Lakhs)', ...projections.map(p => fmtL(p.depreciation))],
    ['3', 'Add: Interest on TL (Rs. Lakhs)', ...projections.map(p => fmtL(p.tlInterest))],
    ['', 'TOTAL INFLOWS (Rs. Lakhs)', ...projections.map(p => fmtL(p.pat + p.depreciation + p.tlInterest))],
    [],
    ['(B)', 'DEBT SERVICE OBLIGATIONS'],
    ['4', 'Interest on Term Loan (Rs. Lakhs)', ...projections.map(p => fmtL(p.tlInterest))],
    ['5', 'Principal Repayment (Rs. Lakhs)', ...projections.map(() => fmtL(basicData.tlAmount / basicData.repaymentYears))],
    ['', 'TOTAL OBLIGATIONS (Rs. Lakhs)', ...projections.map(p => fmtL(p.tlInterest + basicData.tlAmount / basicData.repaymentYears))],
    [],
    ['', 'DSCR (A/B)', ...projections.map(p => p.dscr.toFixed(2))],
    ['', 'Average DSCR', '', '', (projections.reduce((sum, p) => sum + p.dscr, 0) / projections.length).toFixed(2), '', ''],
    [],
    [],
    ['BREAK EVEN ANALYSIS'],
    [],
    ['', 'PARTICULARS', ...years],
    [],
    ['1', 'Sales (Rs. Lakhs)', ...projections.map(p => fmtL(p.netSales))],
    ['2', 'Variable Cost (Rs. Lakhs)', ...projections.map(p => fmtL(p.netSales - p.grossProfit))],
    ['3', 'Contribution (1-2) (Rs. Lakhs)', ...projections.map(p => fmtL(p.grossProfit))],
    ['4', 'Fixed Cost (Rs. Lakhs)', ...projections.map(p => fmtL(p.adminExpenses + p.depreciation + p.ccInterest + p.tlInterest))],
    ['5', 'BEP Sales = FC x Sales / Contribution', ...projections.map(p => {
      const fc = p.adminExpenses + p.depreciation + p.ccInterest + p.tlInterest;
      const contribution = p.grossProfit;
      return fmtL((fc * p.netSales) / contribution);
    })],
    ['6', 'Break Even Point %', ...projections.map(p => `${p.bep.toFixed(1)}%`)],
    ['', 'Margin of Safety %', ...projections.map(p => `${(100 - p.bep).toFixed(1)}%`)],
    [],
    ['', 'Average BEP %', '', '', `${(projections.reduce((sum, p) => sum + p.bep, 0) / projections.length).toFixed(1)}%`, '', ''],
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(sheet);
  setColumnWidths(ws, [5, 40, 12, 12, 12, 12, 12]);
  XLSX.utils.book_append_sheet(wb, ws, 'Ratios & DSCR');
}
