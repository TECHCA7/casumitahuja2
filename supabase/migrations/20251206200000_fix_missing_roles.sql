-- Fix missing User Roles
-- It appears the Staff user might be missing their 'staff' role entry in the user_roles table.
-- This script finds all users who are NOT clients (not in client_auth) and have NO role,
-- and assigns them the 'staff' role.

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'staff'
FROM auth.users
WHERE 
  -- User is not in client_auth (so not a client)
  NOT EXISTS (SELECT 1 FROM public.client_auth WHERE user_id = auth.users.id)
  -- User has no role yet
  AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.users.id);

-- Re-run the policy setup just to be absolutely sure (idempotent)
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

-- 2. Drop policies
DROP POLICY IF EXISTS "Users can upload documents" ON public.client_documents;
DROP POLICY IF EXISTS "Users can view documents" ON public.client_documents;
DROP POLICY IF EXISTS "Staff can delete documents" ON public.client_documents;

-- 3. Recreate Policies
CREATE POLICY "Users can upload documents" ON public.client_documents
FOR INSERT WITH CHECK (
  public.check_is_staff() = true
  OR
  EXISTS (
    SELECT 1 FROM public.client_auth 
    WHERE user_id = auth.uid() 
    AND client_id = public.client_documents.client_id
  )
);

CREATE POLICY "Users can view documents" ON public.client_documents
FOR SELECT USING (
  public.check_is_staff() = true
  OR 
  EXISTS (
    SELECT 1 FROM public.client_auth 
    WHERE user_id = auth.uid() 
    AND client_id = public.client_documents.client_id
  )
);

CREATE POLICY "Staff can delete documents" ON public.client_documents
FOR DELETE USING (
  public.check_is_staff() = true
);
