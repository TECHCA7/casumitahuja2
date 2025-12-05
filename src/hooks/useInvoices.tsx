import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  client_id: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  hsn_sac: string | null;
  quantity: number;
  rate: number;
  tax_rate: number;
  amount: number;
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchInvoices = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setInvoices(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [user]);

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const count = invoices.filter(i => i.invoice_number.includes(year.toString())).length + 1;
    return `INV-${year}-${count.toString().padStart(3, "0")}`;
  };

  const createInvoice = async (
    clientId: string | null,
    items: Omit<InvoiceItem, "id" | "invoice_id">[],
    notes?: string
  ) => {
    if (!user) return null;

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = items.reduce((sum, item) => sum + (item.amount * item.tax_rate / 100), 0);
    const total = subtotal + taxAmount;

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        user_id: user.id,
        client_id: clientId,
        invoice_number: generateInvoiceNumber(),
        invoice_date: new Date().toISOString().split("T")[0],
        subtotal,
        tax_amount: taxAmount,
        total,
        status: "unpaid",
        notes,
      })
      .select()
      .single();

    if (invoiceError) {
      toast({ title: "Error", description: invoiceError.message, variant: "destructive" });
      return null;
    }

    // Insert items
    const itemsWithInvoiceId = items.map(item => ({ ...item, invoice_id: invoice.id }));
    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(itemsWithInvoiceId);

    if (itemsError) {
      toast({ title: "Error", description: itemsError.message, variant: "destructive" });
      return null;
    }

    setInvoices([invoice, ...invoices]);
    toast({ title: "Invoice Created", description: `Invoice ${invoice.invoice_number} generated` });
    return invoice;
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("invoices")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }

    setInvoices(invoices.map(i => i.id === id ? { ...i, status } : i));
    toast({ title: "Success", description: "Invoice status updated" });
    return true;
  };

  const deleteInvoice = async (id: string) => {
    // First delete invoice items
    const { error: itemsError } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", id);

    if (itemsError) {
      toast({ title: "Error", description: itemsError.message, variant: "destructive" });
      return false;
    }

    // Then delete the invoice
    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }

    setInvoices(invoices.filter(i => i.id !== id));
    toast({ title: "Success", description: "Invoice deleted" });
    return true;
  };

  const getPendingCount = () => invoices.filter(i => i.status === "unpaid").length;
  const getMonthlyRevenue = () => {
    const thisMonth = new Date().getMonth();
    return invoices
      .filter(i => new Date(i.invoice_date).getMonth() === thisMonth && i.status === "paid")
      .reduce((sum, i) => sum + Number(i.total), 0);
  };

  return { invoices, loading, createInvoice, updateStatus, deleteInvoice, getPendingCount, getMonthlyRevenue, refetch: fetchInvoices };
}
