-- Fix RLS policies for client_documents table to allow Staff INSERT and robust SELECT

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Staff can upload documents" ON public.client_documents;
DROP POLICY IF EXISTS "Client documents access policy" ON public.client_documents;
DROP POLICY IF EXISTS "Staff can view all documents" ON public.client_documents;
DROP POLICY IF EXISTS "Admin can delete documents" ON public.client_documents;

-- 1. INSERT Policy
CREATE POLICY "Users can upload documents" ON public.client_documents
FOR INSERT WITH CHECK (
  -- Staff/Admin can upload for anyone
  (SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text IN ('admin', 'staff')
  ))
  OR
  -- Clients can upload for themselves
  (
    EXISTS (
      SELECT 1 FROM public.client_auth 
      WHERE user_id = auth.uid() 
      AND client_id = public.client_documents.client_id
    )
  )
);

-- 2. SELECT Policy (Robust version)
CREATE POLICY "Users can view documents" ON public.client_documents
FOR SELECT USING (
  -- Staff/Admin can view ALL documents
  (SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text IN ('admin', 'staff')
  ))
  OR 
  -- Clients can view ONLY their own documents
  (
    EXISTS (
      SELECT 1 FROM public.client_auth 
      WHERE user_id = auth.uid() 
      AND client_id = public.client_documents.client_id
    )
  )
);

-- 3. DELETE Policy (Allow Admin and Staff)
CREATE POLICY "Staff can delete documents" ON public.client_documents
FOR DELETE USING (
  (SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text IN ('admin', 'staff')
  ))
);
