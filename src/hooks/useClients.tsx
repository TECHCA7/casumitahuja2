import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface Client {
  id: string;
  name: string;
  pan: string | null;
  email: string | null;
  mobile: string | null;
  client_type: string;
  assessment_year: string | null;
  address: string | null;
  client_code: string | null;
  created_at: string;
}

export interface ClientDocument {
  id: string;
  client_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  created_at: string;
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchClients = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching clients:", error);
      toast({ title: "Error fetching clients", description: error.message, variant: "destructive" });
    } else {
      console.log("Clients fetched:", data?.length);
      setClients(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, [user]);

  const addClient = async (client: Omit<Client, "id" | "created_at">) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("clients")
      .insert({ ...client, user_id: user.id })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return null;
    }

    setClients([data, ...clients]);
    toast({ title: "Success", description: "Client added successfully" });
    return data;
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const { error } = await supabase
      .from("clients")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }

    setClients(clients.map(c => c.id === id ? { ...c, ...updates } : c));
    toast({ title: "Success", description: "Client updated" });
    return true;
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from("clients").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }

    setClients(clients.filter(c => c.id !== id));
    toast({ title: "Success", description: "Client deleted" });
    return true;
  };

  const bulkAddClients = async (clientsData: Omit<Client, "id" | "created_at">[]) => {
    if (!user) return { success: 0, failed: 0 };

    let success = 0;
    let failed = 0;

    for (const client of clientsData) {
      const { error } = await supabase
        .from("clients")
        .insert({ ...client, user_id: user.id });

      if (error) {
        failed++;
      } else {
        success++;
      }
    }

    await fetchClients();
    return { success, failed };
  };

  return { clients, loading, addClient, updateClient, deleteClient, bulkAddClients, refetch: fetchClients };
}
