-- Create storage bucket for client documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false);

-- Policy: Users can view their own documents
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can upload to their own folder
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'client-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'client-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);