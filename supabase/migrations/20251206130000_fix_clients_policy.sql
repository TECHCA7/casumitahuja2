-- Fix clients RLS policy to be more robust
-- Instead of relying on user_roles (is_staff), we check if the user is a client or not.
-- If NOT a client (not in client_auth), we assume they are staff/admin and can see all clients.
-- If they ARE a client, they can only see their own record.

DROP POLICY IF EXISTS "Staff can view all clients" ON public.clients;

CREATE POLICY "Staff and Clients view policy" ON public.clients
FOR SELECT USING (
  -- User is NOT a client (so they are staff/admin)
  NOT EXISTS (SELECT 1 FROM public.client_auth WHERE user_id = auth.uid())
  OR 
  -- User IS a client, can only see their own record
  id IN (SELECT client_id FROM public.client_auth WHERE user_id = auth.uid())
);

-- INSERT Policy
DROP POLICY IF EXISTS "Staff can create clients" ON public.clients;

CREATE POLICY "Staff can create clients" ON public.clients
FOR INSERT WITH CHECK (
  -- User is NOT a client
  NOT EXISTS (SELECT 1 FROM public.client_auth WHERE user_id = auth.uid())
);
