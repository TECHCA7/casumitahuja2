import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface ClientDocument {
  id: string;
  client_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  created_at: string;
}

export function useClientDocuments(clientId?: string) {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchDocuments = async () => {
    if (!user || !clientId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("client_documents")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (clientId) fetchDocuments();
  }, [clientId, user]);

  const uploadDocument = async (file: File, documentType: string) => {
    if (!user || !clientId) return null;
    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${user.id}/${clientId}/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("client-documents")
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: "Upload Error", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("client-documents")
      .getPublicUrl(filePath);

    // Save to database
    const { data, error } = await supabase
      .from("client_documents")
      .insert({
        client_id: clientId,
        user_id: user.id,
        document_type: documentType,
        file_name: file.name,
        file_url: filePath,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setUploading(false);
      return null;
    }

    setDocuments([data, ...documents]);
    toast({ title: "Success", description: `${file.name} uploaded successfully` });
    setUploading(false);
    return data;
  };

  const deleteDocument = async (doc: ClientDocument) => {
    if (!user) return false;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("client-documents")
      .remove([doc.file_url]);

    if (storageError) {
      toast({ title: "Error", description: storageError.message, variant: "destructive" });
      return false;
    }

    // Delete from database
    const { error } = await supabase
      .from("client_documents")
      .delete()
      .eq("id", doc.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }

    setDocuments(documents.filter(d => d.id !== doc.id));
    toast({ title: "Deleted", description: "Document removed successfully" });
    return true;
  };

  const getSignedUrl = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("client-documents")
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) {
        console.error("Signed URL error:", error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return null;
      }
      return data.signedUrl;
    } catch (err) {
      console.error("getSignedUrl error:", err);
      toast({ title: "Error", description: "Failed to get file URL", variant: "destructive" });
      return null;
    }
  };

  const downloadDocument = async (doc: ClientDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("client-documents")
        .download(doc.file_url);

      if (error) {
        console.error("Download error:", error);
        toast({ title: "Download Error", description: error.message, variant: "destructive" });
        return;
      }

      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      toast({ title: "Error", description: "Failed to download file", variant: "destructive" });
    }
  };

  const viewDocument = async (doc: ClientDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("client-documents")
        .download(doc.file_url);

      if (error) {
        console.error("View error:", error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }

      const url = URL.createObjectURL(data);
      window.open(url, "_blank");
      // Note: URL will be revoked when tab is closed or after some time
    } catch (err) {
      console.error("View error:", err);
      toast({ title: "Error", description: "Failed to open file", variant: "destructive" });
    }
  };

  // Bulk upload documents for a specific client
  const bulkUploadForClient = async (
    targetClientId: string,
    files: { file: File; documentType: string; metadata?: string }[]
  ) => {
    if (!user) return { success: 0, failed: 0 };
    
    let success = 0;
    let failed = 0;
    
    for (const { file, documentType, metadata } of files) {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${user.id}/${targetClientId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("client-documents")
        .upload(filePath, file);

      if (uploadError) {
        failed++;
        continue;
      }

      const docName = metadata ? `${file.name} (${metadata})` : file.name;
      
      const { error } = await supabase
        .from("client_documents")
        .insert({
          client_id: targetClientId,
          user_id: user.id,
          document_type: documentType,
          file_name: docName,
          file_url: filePath,
        });

      if (error) {
        failed++;
      } else {
        success++;
      }
    }
    
    return { success, failed };
  };

  return {
    documents,
    loading,
    uploading,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    viewDocument,
    getSignedUrl,
    refetch: fetchDocuments,
    bulkUploadForClient,
  };
}
