import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, Download, Plus, Trash2, Calculator, Eye, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  CMAData, CMABasicData, FixedAsset, OpeningBalances,
  defaultBasicData, defaultOpeningBalances, defaultFixedAssets 
} from "@/lib/cmaTypes";
import { calculateProjections, formatIndianNumber, formatLakhs } from "@/lib/cmaCalculations";
import { exportCMAToExcel } from "@/lib/cmaExcelExport";

export default function ProjectReport() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic");
  const [showPreview, setShowPreview] = useState(false);
  
  const [basicData, setBasicData] = useState<CMABasicData>(defaultBasicData);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>(defaultFixedAssets);
  const [openingBalances, setOpeningBalances] = useState<OpeningBalances>(defaultOpeningBalances);

  const updateBasicData = (field: keyof CMABasicData, value: any) => {
    setBasicData(prev => ({ ...prev, [field]: value }));
  };

  const updateFixedAsset = (id: string, field: keyof FixedAsset, value: any) => {
    setFixedAssets(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const addFixedAsset = () => {
    setFixedAssets(prev => [...prev, {
      id: Date.now().toString(),
      name: '',
      rate: 15,
      openingWdv: 0,
      additionsBeforeOct: 0,
      additionsAfterOct: 0,
      sales: 0,
    }]);
  };

  const removeFixedAsset = (id: string) => {
    setFixedAssets(prev => prev.filter(a => a.id !== id));
  };

  const updateOpeningBalance = (field: keyof OpeningBalances, value: number) => {
    setOpeningBalances(prev => ({ ...prev, [field]: value }));
  };

  const cmaData: CMAData = { basicData, fixedAssets, openingBalances };
  const projections = calculateProjections(cmaData);

  const handleExport = () => {
    if (!basicData.businessName) {
      toast({ title: "Error", description: "Please enter business name", variant: "destructive" });
      return;
    }
    const fileName = exportCMAToExcel(cmaData, projections);
    toast({ title: "Exported", description: `CMA report saved as ${fileName}` });
  };

  const fmt = (num: number) => formatIndianNumber(num);
  const fmtL = (num: number) => formatLakhs(num, 2);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">CMA Report Generator</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate 5-year CMA projections for bank loans</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{showPreview ? "Hide" : "Show"} Preview</span>
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Export Excel</span>
          </Button>
        </div>
      </div>

      <div className={`grid gap-4 ${showPreview ? 'lg:grid-cols-2' : ''}`}>
        {/* Input Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Input Data</CardTitle>
            <CardDescription>Enter data in 3 tabs to generate CMA report</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic Data</TabsTrigger>
                <TabsTrigger value="assets" className="text-xs sm:text-sm">Fixed Assets</TabsTrigger>
                <TabsTrigger value="balances" className="text-xs sm:text-sm">Balances</TabsTrigger>
              </TabsList>

              {/* TAB 1: Basic Data */}
              <TabsContent value="basic" className="mt-0">
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-sm mb-3 text-primary">Business Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Business Name *</Label>
                          <Input value={basicData.businessName} onChange={e => updateBasicData('businessName', e.target.value)} placeholder="Enter business name" />
                        </div>
                        <div>
                          <Label className="text-xs">Address Line 1</Label>
                          <Input value={basicData.businessAdd1} onChange={e => updateBasicData('businessAdd1', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Address Line 2</Label>
                          <Input value={basicData.businessAdd2} onChange={e => updateBasicData('businessAdd2', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Proprietor/Partner Name</Label>
                          <Input value={basicData.proprietor} onChange={e => updateBasicData('proprietor', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Father Name</Label>
                          <Input value={basicData.fatherName} onChange={e => updateBasicData('fatherName', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Date of Birth</Label>
                          <Input type="date" value={basicData.dob} onChange={e => updateBasicData('dob', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Category</Label>
                          <Select value={basicData.category} onValueChange={v => updateBasicData('category', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="General">General</SelectItem>
                              <SelectItem value="OBC">OBC</SelectItem>
                              <SelectItem value="SC">SC</SelectItem>
                              <SelectItem value="ST">ST</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Business Type</Label>
                          <Select value={basicData.businessType} onValueChange={v => updateBasicData('businessType', v as any)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Trading">Trading</SelectItem>
                              <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                              <SelectItem value="Service">Service</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Activity</Label>
                          <Input value={basicData.activity} onChange={e => updateBasicData('activity', e.target.value)} placeholder="e.g., Medical Store" />
                        </div>
                        <div>
                          <Label className="text-xs">No. of Employees</Label>
                          <Input type="number" value={basicData.employees || ''} onChange={e => updateBasicData('employees', parseInt(e.target.value) || 0)} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm mb-3 text-primary">Financial Data</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Gross Sales (₹)</Label>
                          <Input type="number" value={basicData.sales || ''} onChange={e => updateBasicData('sales', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">Year Ending</Label>
                          <Input type="number" value={basicData.yearEnding || ''} onChange={e => updateBasicData('yearEnding', parseInt(e.target.value) || 2025)} />
                        </div>
                        <div>
                          <Label className="text-xs">Opening Stock (₹)</Label>
                          <Input type="number" value={basicData.openingStock || ''} onChange={e => updateBasicData('openingStock', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">Closing Stock (₹)</Label>
                          <Input type="number" value={basicData.closingStock || ''} onChange={e => updateBasicData('closingStock', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">Gross Profit %</Label>
                          <Input type="number" step="0.01" value={basicData.gpPercent || ''} onChange={e => updateBasicData('gpPercent', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">Sales Increase % (YoY)</Label>
                          <Input type="number" step="0.01" value={basicData.salesIncreasePercent || ''} onChange={e => updateBasicData('salesIncreasePercent', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">Stock Increase % (YoY)</Label>
                          <Input type="number" step="0.01" value={basicData.stockIncreasePercent || ''} onChange={e => updateBasicData('stockIncreasePercent', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm mb-3 text-primary">Loan Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">CC Amount (₹)</Label>
                          <Input type="number" value={basicData.ccAmount || ''} onChange={e => updateBasicData('ccAmount', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">CC Interest Rate %</Label>
                          <Input type="number" step="0.01" value={basicData.ccRate || ''} onChange={e => updateBasicData('ccRate', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">Term Loan Amount (₹)</Label>
                          <Input type="number" value={basicData.tlAmount || ''} onChange={e => updateBasicData('tlAmount', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">TL Interest Rate %</Label>
                          <Input type="number" step="0.01" value={basicData.tlRate || ''} onChange={e => updateBasicData('tlRate', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">Margin (₹)</Label>
                          <Input type="number" value={basicData.margin || ''} onChange={e => updateBasicData('margin', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">Repayment Years</Label>
                          <Input type="number" value={basicData.repaymentYears || ''} onChange={e => updateBasicData('repaymentYears', parseInt(e.target.value) || 5)} />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Scheme Name</Label>
                          <Input value={basicData.schemeName} onChange={e => updateBasicData('schemeName', e.target.value)} placeholder="e.g., CM Udhyam Kranti Scheme" />
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* TAB 2: Fixed Assets */}
              <TabsContent value="assets" className="mt-0">
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-sm text-primary">Fixed Assets Schedule</h3>
                      <Button size="sm" variant="outline" onClick={addFixedAsset}>
                        <Plus className="w-4 h-4 mr-1" />Add Asset
                      </Button>
                    </div>
                    {fixedAssets.map((asset, idx) => (
                      <Card key={asset.id} className="p-3">
                        <div className="flex justify-between items-start mb-3">
                          <Badge variant="outline">Asset #{idx + 1}</Badge>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeFixedAsset(asset.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="col-span-2 sm:col-span-1">
                            <Label className="text-xs">Asset Name</Label>
                            <Input value={asset.name} onChange={e => updateFixedAsset(asset.id, 'name', e.target.value)} placeholder="e.g., Furniture" />
                          </div>
                          <div>
                            <Label className="text-xs">Dep. Rate %</Label>
                            <Input type="number" value={asset.rate || ''} onChange={e => updateFixedAsset(asset.id, 'rate', parseFloat(e.target.value) || 0)} />
                          </div>
                          <div>
                            <Label className="text-xs">Opening WDV (₹)</Label>
                            <Input type="number" value={asset.openingWdv || ''} onChange={e => updateFixedAsset(asset.id, 'openingWdv', parseFloat(e.target.value) || 0)} />
                          </div>
                          <div>
                            <Label className="text-xs">Add. Before Oct (₹)</Label>
                            <Input type="number" value={asset.additionsBeforeOct || ''} onChange={e => updateFixedAsset(asset.id, 'additionsBeforeOct', parseFloat(e.target.value) || 0)} />
                          </div>
                          <div>
                            <Label className="text-xs">Add. After Oct (₹)</Label>
                            <Input type="number" value={asset.additionsAfterOct || ''} onChange={e => updateFixedAsset(asset.id, 'additionsAfterOct', parseFloat(e.target.value) || 0)} />
                          </div>
                          <div>
                            <Label className="text-xs">Sales (₹)</Label>
                            <Input type="number" value={asset.sales || ''} onChange={e => updateFixedAsset(asset.id, 'sales', parseFloat(e.target.value) || 0)} />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* TAB 3: Opening Balances */}
              <TabsContent value="balances" className="mt-0">
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-sm mb-3 text-primary">Liabilities</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Capital Account (₹)</Label>
                          <Input type="number" value={openingBalances.capitalAccount || ''} onChange={e => updateOpeningBalance('capitalAccount', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">CC Account (₹)</Label>
                          <Input type="number" value={openingBalances.ccAccount || ''} onChange={e => updateOpeningBalance('ccAccount', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">Creditors (₹)</Label>
                          <Input type="number" value={openingBalances.creditors || ''} onChange={e => updateOpeningBalance('creditors', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">Other Current Liabilities (₹)</Label>
                          <Input type="number" value={openingBalances.otherCurrentLiabilities || ''} onChange={e => updateOpeningBalance('otherCurrentLiabilities', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm mb-3 text-primary">Assets</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Cash in Hand (₹)</Label>
                          <Input type="number" value={openingBalances.cashInHand || ''} onChange={e => updateOpeningBalance('cashInHand', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">Bank Balance (₹)</Label>
                          <Input type="number" value={openingBalances.bankBalance || ''} onChange={e => updateOpeningBalance('bankBalance', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">Investments (₹)</Label>
                          <Input type="number" value={openingBalances.investments || ''} onChange={e => updateOpeningBalance('investments', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">Debtors (₹)</Label>
                          <Input type="number" value={openingBalances.debtors || ''} onChange={e => updateOpeningBalance('debtors', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">Advances & Deposits (₹)</Label>
                          <Input type="number" value={openingBalances.advancesDeposits || ''} onChange={e => updateOpeningBalance('advancesDeposits', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm mb-3 text-primary">Other Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Annual Drawings (₹)</Label>
                          <Input type="number" value={openingBalances.drawings || ''} onChange={e => updateOpeningBalance('drawings', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">Interest Income (₹)</Label>
                          <Input type="number" value={openingBalances.interestIncome || ''} onChange={e => updateOpeningBalance('interestIncome', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">Admin Expenses (₹)</Label>
                          <Input type="number" value={openingBalances.adminExpenses || ''} onChange={e => updateOpeningBalance('adminExpenses', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                disabled={activeTab === 'basic'}
                onClick={() => setActiveTab(activeTab === 'balances' ? 'assets' : 'basic')}
              >
                Previous
              </Button>
              {activeTab !== 'balances' ? (
                <Button onClick={() => setActiveTab(activeTab === 'basic' ? 'assets' : 'balances')}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />Export CMA
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview Section */}
        {showPreview && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                5-Year Projections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[550px]">
                <div className="space-y-4">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-2">
                    {projections.map(p => (
                      <Card key={p.year} className="p-2">
                        <p className="text-xs text-muted-foreground">{p.yearLabel} {p.isActual ? '(Actual)' : ''}</p>
                        <p className="text-sm font-semibold">₹{fmtL(p.netSales)}L Sales</p>
                        <p className="text-xs text-muted-foreground">PAT: ₹{fmtL(p.pat)}L</p>
                      </Card>
                    ))}
                  </div>

                  {/* Ratios */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Key Ratios</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted">
                            <th className="p-2 text-left">Ratio</th>
                            {projections.map(p => (
                              <th key={p.year} className="p-2 text-right">{p.yearLabel}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="p-2">Current Ratio</td>
                            {projections.map(p => (
                              <td key={p.year} className="p-2 text-right">{p.currentRatio.toFixed(2)}</td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="p-2">TOL/TNW</td>
                            {projections.map(p => (
                              <td key={p.year} className="p-2 text-right">{p.tolTnw.toFixed(2)}</td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="p-2">DSCR</td>
                            {projections.map(p => (
                              <td key={p.year} className="p-2 text-right">{p.dscr.toFixed(2)}</td>
                            ))}
                          </tr>
                          <tr>
                            <td className="p-2">BEP %</td>
                            {projections.map(p => (
                              <td key={p.year} className="p-2 text-right">{p.bep.toFixed(1)}%</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* P&L Summary */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">P&L Summary (Lakhs)</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted">
                            <th className="p-2 text-left">Item</th>
                            {projections.map(p => (
                              <th key={p.year} className="p-2 text-right">{p.yearLabel}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="p-2">Net Sales</td>
                            {projections.map(p => (
                              <td key={p.year} className="p-2 text-right">{fmtL(p.netSales)}</td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="p-2">Gross Profit</td>
                            {projections.map(p => (
                              <td key={p.year} className="p-2 text-right">{fmtL(p.grossProfit)}</td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="p-2">Operating Profit</td>
                            {projections.map(p => (
                              <td key={p.year} className="p-2 text-right">{fmtL(p.operatingProfit)}</td>
                            ))}
                          </tr>
                          <tr className="border-b bg-muted/50">
                            <td className="p-2 font-medium">Net Profit (PAT)</td>
                            {projections.map(p => (
                              <td key={p.year} className="p-2 text-right font-medium">{fmtL(p.pat)}</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Balance Sheet Summary */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Balance Sheet Summary (Lakhs)</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted">
                            <th className="p-2 text-left">Item</th>
                            {projections.map(p => (
                              <th key={p.year} className="p-2 text-right">{p.yearLabel}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="p-2">Capital Account</td>
                            {projections.map(p => (
                              <td key={p.year} className="p-2 text-right">{fmtL(p.capitalAccount)}</td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="p-2">Total Current Assets</td>
                            {projections.map(p => (
                              <td key={p.year} className="p-2 text-right">{fmtL(p.totalCurrentAssets)}</td>
                            ))}
                          </tr>
                          <tr className="border-b bg-muted/50">
                            <td className="p-2 font-medium">Total Assets</td>
                            {projections.map(p => (
                              <td key={p.year} className="p-2 text-right font-medium">{fmtL(p.totalAssets)}</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
