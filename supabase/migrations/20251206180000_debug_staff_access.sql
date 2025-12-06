-- Redefine is_staff to be more robust with type casting
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND (role::text = 'admin' OR role::text = 'staff')
  );
$$;

-- Grant execute permission to everyone
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO anon;

-- Update Storage Policy to use direct check as a fallback
-- This bypasses potential issues with the function call context
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-documents' 
  AND (
    -- 1. Staff/Admin Access (Direct Table Check)
    -- Since users can read their own role, this works without SECURITY DEFINER
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND (role::text = 'admin' OR role::text = 'staff')
    )
    OR
    -- 2. Client Access (Path Match)
    EXISTS (
      SELECT 1 FROM public.client_auth 
      WHERE user_id = auth.uid() 
      AND client_id::text = (storage.foldername(name))[2]
    )
    OR
    -- 3. Uploader Access (Path Match)
    (auth.uid()::text = (storage.foldername(name))[1])
  )
);
