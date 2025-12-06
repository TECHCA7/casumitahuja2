-- Final fix for client_documents RLS
-- We will use the SECURITY DEFINER function check_is_staff() to bypass any RLS issues on user_roles

-- 1. Ensure the helper function exists and is secure
CREATE OR REPLACE FUNCTION public.check_is_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text IN ('admin', 'staff')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_staff() TO anon;

-- 2. Drop ALL known policies on client_documents to ensure a clean slate
DROP POLICY IF EXISTS "Staff can view all documents" ON public.client_documents;
DROP POLICY IF EXISTS "Staff can upload documents" ON public.client_documents;
DROP POLICY IF EXISTS "Admin can delete documents" ON public.client_documents;
DROP POLICY IF EXISTS "Client documents access policy" ON public.client_documents;
DROP POLICY IF EXISTS "Users can upload documents" ON public.client_documents;
DROP POLICY IF EXISTS "Users can view documents" ON public.client_documents;
DROP POLICY IF EXISTS "Staff can delete documents" ON public.client_documents;

-- 3. Recreate Policies using the secure function

-- INSERT
CREATE POLICY "Users can upload documents" ON public.client_documents
FOR INSERT WITH CHECK (
  -- Staff/Admin check (Secure)
  public.check_is_staff() = true
  OR
  -- Client check (User must be linked to the client_id they are uploading for)
  EXISTS (
    SELECT 1 FROM public.client_auth 
    WHERE user_id = auth.uid() 
    AND client_id = public.client_documents.client_id
  )
);

-- SELECT
CREATE POLICY "Users can view documents" ON public.client_documents
FOR SELECT USING (
  -- Staff/Admin check (Secure)
  public.check_is_staff() = true
  OR 
  -- Client check
  EXISTS (
    SELECT 1 FROM public.client_auth 
    WHERE user_id = auth.uid() 
    AND client_id = public.client_documents.client_id
  )
);

-- DELETE
CREATE POLICY "Staff can delete documents" ON public.client_documents
FOR DELETE USING (
  public.check_is_staff() = true
);

-- UPDATE (Just in case, though not currently used in UI)
CREATE POLICY "Staff can update documents" ON public.client_documents
FOR UPDATE USING (
  public.check_is_staff() = true
);
