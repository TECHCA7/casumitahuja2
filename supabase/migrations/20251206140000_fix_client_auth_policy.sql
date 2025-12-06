-- Fix client_auth RLS to allow clients to view their own link
-- This is required for the clients RLS policy to work correctly (as it subqueries client_auth)

CREATE POLICY "Users can view own client_auth" ON public.client_auth
FOR SELECT USING (user_id = auth.uid());

-- Allow users to link themselves (needed for Client Portal signup)
CREATE POLICY "Users can link themselves" ON public.client_auth
FOR INSERT WITH CHECK (user_id = auth.uid());
