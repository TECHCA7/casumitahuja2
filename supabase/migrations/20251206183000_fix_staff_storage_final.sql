-- Fix Staff Access to Storage using a dedicated PLPGSQL function
-- This avoids potential issues with SQL function context and Enum casting

-- 1. Create a robust function to check staff status
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

-- 2. Update the storage policy to use this function
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-documents' 
  AND (
    -- Check for Staff/Admin using the secure function
    public.check_is_staff() = true
    OR
    -- Check for Client Access
    EXISTS (
      SELECT 1 FROM public.client_auth 
      WHERE user_id = auth.uid() 
      AND client_id::text = (storage.foldername(name))[2]
    )
    OR
    -- Check for Uploader Access
    (auth.uid()::text = (storage.foldername(name))[1])
  )
);
