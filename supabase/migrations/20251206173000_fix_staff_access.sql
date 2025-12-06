-- Improve RLS policies for Documents and Storage to ensure Staff access
-- This replaces previous policies with more robust checks

-- 1. Update client_documents table policy
-- We drop the old name "Staff can view all documents" and use a unified name
DROP POLICY IF EXISTS "Staff can view all documents" ON public.client_documents;
DROP POLICY IF EXISTS "Client documents access policy" ON public.client_documents;

CREATE POLICY "Client documents access policy" ON public.client_documents
FOR SELECT USING (
  -- Allow Staff/Admin to view ALL documents
  public.is_staff(auth.uid()) 
  OR 
  -- Allow Clients to view ONLY their own documents
  (
    EXISTS (
      SELECT 1 FROM public.client_auth 
      WHERE user_id = auth.uid() 
      AND client_id = public.client_documents.client_id
    )
  )
);

-- 2. Update Storage policy
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-documents' 
  AND (
    -- Staff/Admin can view ALL files in this bucket
    public.is_staff(auth.uid()) 
    OR
    -- Clients can view files where the 2nd path segment matches their client_id
    EXISTS (
      SELECT 1 FROM public.client_auth 
      WHERE user_id = auth.uid() 
      AND client_id::text = (storage.foldername(name))[2]
    )
    OR
    -- Fallback: Users can view files they personally uploaded
    (auth.uid()::text = (storage.foldername(name))[1])
  )
);

-- 3. Ensure is_staff has correct permissions
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO anon;
