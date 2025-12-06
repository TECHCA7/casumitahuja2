-- Allow users to update their own link (needed for upsert operations)
-- This complements the INSERT policy added previously

DROP POLICY IF EXISTS "Users can update own link" ON public.client_auth;

CREATE POLICY "Users can update own link" ON public.client_auth
FOR UPDATE USING (user_id = auth.uid());
