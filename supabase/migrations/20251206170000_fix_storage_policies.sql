-- Fix storage policies to allow clients to view documents uploaded by staff
-- The path structure is: uploader_user_id/client_id/filename

DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;

-- View Policy
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-documents' 
  AND (
    -- Staff can view everything
    public.is_staff(auth.uid()) 
    OR
    -- Users can view files they uploaded (first segment is their user_id)
    (auth.uid()::text = (storage.foldername(name))[1])
    OR
    -- Clients can view files uploaded for them (second segment is their client_id)
    (public.get_user_client_id(auth.uid())::text = (storage.foldername(name))[2])
  )
);

-- Upload Policy (unchanged logic, but good to refresh)
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'client-documents' 
  AND (
    -- Staff can upload anywhere (but usually follow the convention)
    public.is_staff(auth.uid()) 
    OR
    -- Users can only upload to their own folder
    (auth.uid()::text = (storage.foldername(name))[1])
  )
);

-- Delete Policy
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'client-documents' 
  AND (
    -- Staff can delete everything
    public.is_staff(auth.uid()) 
    OR
    -- Users can delete files they uploaded
    (auth.uid()::text = (storage.foldername(name))[1])
  )
);
