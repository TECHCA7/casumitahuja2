import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Download, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaxResult {
  grossIncome: number;
  totalDeductions: number;
  taxableIncome: number;
  slabwiseTax: { slab: string; rate: string; tax: number }[];
  totalTax: number;
  rebate: number;
  surcharge: number;
  cess: number;
  netTax: number;
}

const assessmentYears = [
  "2024-25",
  "2025-26",
];

// Old Regime Slabs (AY 2024-25)
const oldRegimeSlabs = [
  { min: 0, max: 250000, rate: 0 },
  { min: 250000, max: 500000, rate: 5 },
  { min: 500000, max: 1000000, rate: 20 },
  { min: 1000000, max: Infinity, rate: 30 },
];

// New Regime Slabs (AY 2024-25)
const newRegimeSlabs = [
  { min: 0, max: 300000, rate: 0 },
  { min: 300000, max: 600000, rate: 5 },
  { min: 600000, max: 900000, rate: 10 },
  { min: 900000, max: 1200000, rate: 15 },
  { min: 1200000, max: 1500000, rate: 20 },
  { min: 1500000, max: Infinity, rate: 30 },
];

export default function TaxCalculator() {
  const [regime, setRegime] = useState<"old" | "new">("new");
  const [assessmentYear, setAssessmentYear] = useState("2024-25");
  const [income, setIncome] = useState({
    salary: "",
    business: "",
    capitalGains: "",
    otherIncome: "",
  });
  const [deductions, setDeductions] = useState({
    section80C: "",
    section80D: "",
    section80G: "",
    hra: "",
    other: "",
  });
  const [result, setResult] = useState<TaxResult | null>(null);
  const { toast } = useToast();

  const calculateTax = () => {
    const totalIncome =
      parseFloat(income.salary || "0") +
      parseFloat(income.business || "0") +
      parseFloat(income.capitalGains || "0") +
      parseFloat(income.otherIncome || "0");

    let totalDeductions = 0;
    if (regime === "old") {
      totalDeductions =
        Math.min(parseFloat(deductions.section80C || "0"), 150000) +
        Math.min(parseFloat(deductions.section80D || "0"), 75000) +
        parseFloat(deductions.section80G || "0") +
        parseFloat(deductions.hra || "0") +
        parseFloat(deductions.other || "0");
    } else {
      // New regime has standard deduction of 50,000
      totalDeductions = 50000;
    }

    const taxableIncome = Math.max(0, totalIncome - totalDeductions);
    const slabs = regime === "old" ? oldRegimeSlabs : newRegimeSlabs;

    const slabwiseTax: { slab: string; rate: string; tax: number }[] = [];
    let remainingIncome = taxableIncome;
    let totalTax = 0;

    for (const slab of slabs) {
      if (remainingIncome <= 0) break;
      const taxableInSlab = Math.min(remainingIncome, slab.max - slab.min);
      const taxForSlab = (taxableInSlab * slab.rate) / 100;
      
      if (taxableInSlab > 0) {
        slabwiseTax.push({
          slab: slab.max === Infinity 
            ? `Above ₹${(slab.min / 100000).toFixed(1)}L`
            : `₹${(slab.min / 100000).toFixed(1)}L - ₹${(slab.max / 100000).toFixed(1)}L`,
          rate: `${slab.rate}%`,
          tax: taxForSlab,
        });
        totalTax += taxForSlab;
      }
      remainingIncome -= taxableInSlab;
    }

    // Rebate under Section 87A
    let rebate = 0;
    if (regime === "new" && taxableIncome <= 700000) {
      rebate = Math.min(totalTax, 25000);
    } else if (regime === "old" && taxableIncome <= 500000) {
      rebate = Math.min(totalTax, 12500);
    }

    const taxAfterRebate = totalTax - rebate;

    // Surcharge
    let surcharge = 0;
    if (taxableIncome > 5000000 && taxableIncome <= 10000000) {
      surcharge = taxAfterRebate * 0.1;
    } else if (taxableIncome > 10000000 && taxableIncome <= 20000000) {
      surcharge = taxAfterRebate * 0.15;
    } else if (taxableIncome > 20000000 && taxableIncome <= 50000000) {
      surcharge = taxAfterRebate * 0.25;
    } else if (taxableIncome > 50000000) {
      surcharge = taxAfterRebate * 0.37;
    }

    // Health & Education Cess (4%)
    const cess = (taxAfterRebate + surcharge) * 0.04;
    const netTax = taxAfterRebate + surcharge + cess;

    setResult({
      grossIncome: totalIncome,
      totalDeductions,
      taxableIncome,
      slabwiseTax,
      totalTax,
      rebate,
      surcharge,
      cess,
      netTax: Math.round(netTax),
    });

    toast({
      title: "Calculation Complete",
      description: `Net tax payable: ₹${Math.round(netTax).toLocaleString("en-IN")}`,
    });
  };

  const resetForm = () => {
    setIncome({ salary: "", business: "", capitalGains: "", otherIncome: "" });
    setDeductions({ section80C: "", section80D: "", section80G: "", hra: "", other: "" });
    setResult(null);
  };

  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString("en-IN")}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tax Calculator</h1>
          <p className="text-muted-foreground mt-1">
            Calculate income tax for Indian residents
          </p>
        </div>
        <Button variant="outline" onClick={resetForm}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assessment Year</Label>
                  <Select value={assessmentYear} onValueChange={setAssessmentYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assessmentYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          AY {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tax Regime</Label>
                  <Tabs value={regime} onValueChange={(v) => setRegime(v as "old" | "new")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="new">New Regime</TabsTrigger>
                      <TabsTrigger value="old">Old Regime</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Income Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Income Details</CardTitle>
              <CardDescription>Enter your income from various sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary">Salary Income</Label>
                  <Input
                    id="salary"
                    type="number"
                    placeholder="0"
                    value={income.salary}
                    onChange={(e) => setIncome({ ...income, salary: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business">Business / Profession</Label>
                  <Input
                    id="business"
                    type="number"
                    placeholder="0"
                    value={income.business}
                    onChange={(e) => setIncome({ ...income, business: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capitalGains">Capital Gains</Label>
                  <Input
                    id="capitalGains"
                    type="number"
                    placeholder="0"
                    value={income.capitalGains}
                    onChange={(e) => setIncome({ ...income, capitalGains: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherIncome">Other Income</Label>
                  <Input
                    id="otherIncome"
                    type="number"
                    placeholder="0"
                    value={income.otherIncome}
                    onChange={(e) => setIncome({ ...income, otherIncome: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deductions (Old Regime) */}
          {regime === "old" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Deductions</CardTitle>
                <CardDescription>Available under Old Tax Regime</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="section80C">Section 80C (Max ₹1.5L)</Label>
                    <Input
                      id="section80C"
                      type="number"
                      placeholder="0"
                      value={deductions.section80C}
                      onChange={(e) => setDeductions({ ...deductions, section80C: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="section80D">Section 80D (Max ₹75K)</Label>
                    <Input
                      id="section80D"
                      type="number"
                      placeholder="0"
                      value={deductions.section80D}
                      onChange={(e) => setDeductions({ ...deductions, section80D: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="section80G">Section 80G (Donations)</Label>
                    <Input
                      id="section80G"
                      type="number"
                      placeholder="0"
                      value={deductions.section80G}
                      onChange={(e) => setDeductions({ ...deductions, section80G: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hra">HRA Exemption</Label>
                    <Input
                      id="hra"
                      type="number"
                      placeholder="0"
                      value={deductions.hra}
                      onChange={(e) => setDeductions({ ...deductions, hra: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="otherDeductions">Other Deductions</Label>
                    <Input
                      id="otherDeductions"
                      type="number"
                      placeholder="0"
                      value={deductions.other}
                      onChange={(e) => setDeductions({ ...deductions, other: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button onClick={calculateTax} className="w-full" size="lg">
            <Calculator className="w-5 h-5 mr-2" />
            Calculate Tax
          </Button>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <Card className={result ? "border-primary/50" : ""}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Tax Computation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gross Income</span>
                      <span className="font-medium">{formatCurrency(result.grossIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deductions</span>
                      <span className="font-medium text-success">-{formatCurrency(result.totalDeductions)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-medium">
                      <span>Taxable Income</span>
                      <span>{formatCurrency(result.taxableIncome)}</span>
                    </div>
                  </div>

                  {/* Slabwise Tax */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Slab-wise Tax</p>
                    {result.slabwiseTax.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.slab} @ {item.rate}</span>
                        <span>{formatCurrency(item.tax)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Tax</span>
                      <span>{formatCurrency(result.totalTax)}</span>
                    </div>
                    {result.rebate > 0 && (
                      <div className="flex justify-between text-success">
                        <span>Rebate u/s 87A</span>
                        <span>-{formatCurrency(result.rebate)}</span>
                      </div>
                    )}
                    {result.surcharge > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Surcharge</span>
                        <span>{formatCurrency(result.surcharge)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Health & Education Cess (4%)</span>
                      <span>{formatCurrency(result.cess)}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Net Tax Payable</span>
                      <span className="text-2xl font-bold text-primary">{formatCurrency(result.netTax)}</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full mt-4">
                    <Download className="w-4 h-4 mr-2" />
                    Download as PDF
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Enter your income details and click Calculate to see the tax computation</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Tax Regime Comparison</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p><strong>New Regime:</strong> Lower tax rates but no deductions (except standard ₹50K)</p>
              <p><strong>Old Regime:</strong> Higher rates but allows 80C, 80D, HRA exemptions etc.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
