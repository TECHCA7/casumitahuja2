import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Download, FileText, Receipt, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useInvoices, InvoiceItem } from "@/hooks/useInvoices";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { useToast } from "@/hooks/use-toast";

interface FormItem {
  id: string;
  description: string;
  hsn: string;
  rate: number;
  quantity: number;
  tax: number;
}

const services = [
  { name: "ITR Filing - Individual", hsn: "998231", rate: 2500 },
  { name: "ITR Filing - Business", hsn: "998231", rate: 5000 },
  { name: "GST Return Filing", hsn: "998231", rate: 1500 },
  { name: "Tax Audit", hsn: "998231", rate: 25000 },
  { name: "Company Audit", hsn: "998231", rate: 50000 },
  { name: "Consultancy", hsn: "998311", rate: 3000 },
];

export default function Billing() {
  const { clients, loading: clientsLoading } = useClients();
  const { invoices, loading: invoicesLoading, createInvoice, updateStatus, deleteInvoice } = useInvoices();
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<FormItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("unpaid");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteInvoice = async (invoiceId: string) => {
    setDeletingId(invoiceId);
    await deleteInvoice(invoiceId);
    setDeletingId(null);
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: "", hsn: "", rate: 0, quantity: 1, tax: 18 }]);
  };

  const removeItem = (id: string) => setItems(items.filter((item) => item.id !== id));

  const updateItem = (id: string, field: keyof FormItem, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const selectService = (id: string, serviceName: string) => {
    const service = services.find((s) => s.name === serviceName);
    if (service) {
      setItems(items.map((item) => item.id === id ? { ...item, description: service.name, hsn: service.hsn, rate: service.rate } : item));
    }
  };

  const calculateSubtotal = () => items.reduce((sum, item) => sum + item.rate * item.quantity, 0);
  const calculateTax = () => items.reduce((sum, item) => sum + (item.rate * item.quantity * item.tax) / 100, 0);
  const calculateTotal = () => calculateSubtotal() + calculateTax();

  const generateInvoice = async () => {
    if (!selectedClient || items.length === 0) return;
    
    setIsGenerating(true);
    const invoiceItems: Omit<InvoiceItem, "id" | "invoice_id">[] = items.map(item => ({
      description: item.description,
      hsn_sac: item.hsn,
      quantity: item.quantity,
      rate: item.rate,
      tax_rate: item.tax,
      amount: item.rate * item.quantity,
    }));

    const createdInvoice = await createInvoice(selectedClient, invoiceItems);
    
    // Auto-download PDF after creating invoice
    if (createdInvoice) {
      await generatePDF(createdInvoice);
    }
    
    setItems([]);
    setSelectedClient("");
    setIsGenerating(false);
  };

  const toggleInvoiceStatus = async (invoiceId: string, currentStatus: string) => {
    const newStatus = currentStatus === "paid" ? "unpaid" : "paid";
    await updateStatus(invoiceId, newStatus);
  };

  const generatePDF = async (invoice: typeof invoices[0]) => {
    try {
      const client = clients.find(c => c.id === invoice.client_id);
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const { height } = page.getSize();
      let y = height - 50;

      // Header
      page.drawText("TAX INVOICE", { x: 230, y, size: 20, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
      y -= 40;

      // Invoice details
      page.drawText(`Invoice No: ${invoice.invoice_number}`, { x: 50, y, size: 11, font: boldFont });
      page.drawText(`Date: ${invoice.invoice_date}`, { x: 400, y, size: 11, font });
      y -= 20;
      page.drawText(`Status: ${invoice.status.toUpperCase()}`, { x: 400, y, size: 11, font });
      y -= 30;

      // Client details
      if (client) {
        page.drawText("Bill To:", { x: 50, y, size: 11, font: boldFont });
        y -= 18;
        // Sanitize text to remove unsupported characters
        const cleanName = client.name.replace(/[^\x00-\x7F]/g, "");
        page.drawText(cleanName, { x: 50, y, size: 11, font });
        y -= 15;
        if (client.pan) {
          page.drawText(`PAN: ${client.pan}`, { x: 50, y, size: 10, font });
          y -= 15;
        }
        if (client.address) {
          const cleanAddress = client.address.replace(/[^\x00-\x7F]/g, "");
          page.drawText(cleanAddress, { x: 50, y, size: 10, font });
          y -= 15;
        }
      }
      y -= 30;

      // Table header
      page.drawRectangle({ x: 50, y: y - 5, width: 495, height: 25, color: rgb(0.95, 0.95, 0.95) });
      page.drawText("Description", { x: 55, y, size: 10, font: boldFont });
      page.drawText("HSN", { x: 250, y, size: 10, font: boldFont });
      page.drawText("Qty", { x: 310, y, size: 10, font: boldFont });
      page.drawText("Rate", { x: 360, y, size: 10, font: boldFont });
      page.drawText("Tax", { x: 420, y, size: 10, font: boldFont });
      page.drawText("Amount", { x: 475, y, size: 10, font: boldFont });
      y -= 30;

      // Since we don't have items in the invoice object, show summary
      page.drawText("Service Charges", { x: 55, y, size: 10, font });
      page.drawText("-", { x: 250, y, size: 10, font });
      page.drawText("1", { x: 310, y, size: 10, font });
      page.drawText(`Rs. ${Number(invoice.subtotal).toLocaleString("en-IN")}`, { x: 360, y, size: 10, font });
      page.drawText(`Rs. ${Number(invoice.tax_amount).toLocaleString("en-IN")}`, { x: 420, y, size: 10, font });
      page.drawText(`Rs. ${Number(invoice.total).toLocaleString("en-IN")}`, { x: 475, y, size: 10, font });
      y -= 50;

      // Totals
      page.drawLine({ start: { x: 350, y: y + 20 }, end: { x: 545, y: y + 20 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
      page.drawText("Subtotal:", { x: 360, y, size: 10, font });
      page.drawText(`Rs. ${Number(invoice.subtotal).toLocaleString("en-IN")}`, { x: 475, y, size: 10, font });
      y -= 18;
      page.drawText("Tax:", { x: 360, y, size: 10, font });
      page.drawText(`Rs. ${Number(invoice.tax_amount).toLocaleString("en-IN")}`, { x: 475, y, size: 10, font });
      y -= 18;
      page.drawText("Total:", { x: 360, y, size: 12, font: boldFont });
      page.drawText(`Rs. ${Number(invoice.total).toLocaleString("en-IN")}`, { x: 475, y, size: 12, font: boldFont });

      // Footer
      page.drawText("Thank you for your business!", { x: 220, y: 50, size: 10, font, color: rgb(0.5, 0.5, 0.5) });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({ title: "Downloaded", description: `${invoice.invoice_number}.pdf saved` });
    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast({ 
        title: "PDF Generation Failed", 
        description: "Could not generate PDF. Please check console for details.", 
        variant: "destructive" 
      });
    }
  };

  const loading = clientsLoading || invoicesLoading;
  const paidInvoices = invoices.filter(i => i.status === "paid");
  const unpaidInvoices = invoices.filter(i => i.status === "unpaid");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const nextInvoiceNumber = `INV-${new Date().getFullYear()}-${(invoices.length + 1).toString().padStart(3, "0")}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Billing & Invoicing</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Generate tax invoices</p>
        </div>
        <Badge variant="outline" className="text-sm sm:text-lg px-3 sm:px-4 py-1 sm:py-2 w-fit">Invoice #: {nextInvoiceNumber}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Invoice Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Select Client</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger><SelectValue placeholder="Choose a client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>{client.name} ({client.pan || "No PAN"})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Invoice Date</Label>
                  <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Line Items</CardTitle>
                <Button onClick={addItem} size="sm"><Plus className="w-4 h-4 mr-2" />Add Item</Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length > 0 ? (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={item.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Item #{index + 1}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="sm:col-span-2 space-y-2">
                          <Label>Service (Select or Type)</Label>
                          <div className="space-y-2">
                            <Select value={services.find(s => s.name === item.description)?.name || ""} onValueChange={(value) => selectService(item.id, value)}>
                              <SelectTrigger><SelectValue placeholder="Select preset service" /></SelectTrigger>
                              <SelectContent>
                                {services.map((service) => (
                                  <SelectItem key={service.name} value={service.name}>{service.name} - ₹{service.rate}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input 
                              placeholder="Or type custom description" 
                              value={item.description} 
                              onChange={(e) => updateItem(item.id, "description", e.target.value)} 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>HSN/SAC</Label>
                          <Input 
                            placeholder="998231" 
                            value={item.hsn} 
                            onChange={(e) => updateItem(item.id, "hsn", e.target.value)} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Rate (₹)</Label>
                          <Input 
                            type="number" 
                            min="0" 
                            value={item.rate || ""} 
                            onChange={(e) => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)} 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Tax %</Label>
                          <Select value={item.tax.toString()} onValueChange={(value) => updateItem(item.id, "tax", parseInt(value))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="5">5%</SelectItem>
                              <SelectItem value="12">12%</SelectItem>
                              <SelectItem value="18">18%</SelectItem>
                              <SelectItem value="28">28%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end text-sm">
                        <span className="text-muted-foreground">Amount: ₹{(item.rate * item.quantity).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No items added yet</p>
                  <p className="text-sm">Click "Add Item" to add services</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Invoice Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">₹{calculateSubtotal().toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">₹{calculateTax().toLocaleString("en-IN")}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span className="text-primary">₹{calculateTotal().toLocaleString("en-IN")}</span>
                </div>
              </div>
              <div className="space-y-2 pt-4">
                <Button onClick={generateInvoice} className="w-full" disabled={!selectedClient || items.length === 0 || isGenerating}>
                  {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                  Generate Invoice
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="unpaid" className="text-xs">
                    Unpaid ({unpaidInvoices.length})
                  </TabsTrigger>
                  <TabsTrigger value="paid" className="text-xs">
                    Paid ({paidInvoices.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="unpaid" className="mt-0">
                  {unpaidInvoices.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {unpaidInvoices.map((invoice) => (
                        <div key={invoice.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{invoice.invoice_number}</p>
                            <p className="text-xs text-muted-foreground">{invoice.invoice_date}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="text-right mr-1">
                              <p className="font-medium text-xs">₹{Number(invoice.total).toLocaleString("en-IN")}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => toggleInvoiceStatus(invoice.id, invoice.status)}
                              title="Mark as Paid"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => generatePDF(invoice)}
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Delete Invoice"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete invoice {invoice.invoice_number}. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteInvoice(invoice.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {deletingId === invoice.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No unpaid invoices</p>
                  )}
                </TabsContent>
                
                <TabsContent value="paid" className="mt-0">
                  {paidInvoices.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {paidInvoices.map((invoice) => (
                        <div key={invoice.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{invoice.invoice_number}</p>
                            <p className="text-xs text-muted-foreground">{invoice.invoice_date}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="text-right mr-1">
                              <p className="font-medium text-xs">₹{Number(invoice.total).toLocaleString("en-IN")}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              onClick={() => toggleInvoiceStatus(invoice.id, invoice.status)}
                              title="Mark as Unpaid"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => generatePDF(invoice)}
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Delete Invoice"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete invoice {invoice.invoice_number}. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteInvoice(invoice.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {deletingId === invoice.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No paid invoices</p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

