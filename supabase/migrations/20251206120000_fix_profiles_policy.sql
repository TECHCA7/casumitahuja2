-- Allow all authenticated users to view all profiles
-- This is necessary for the "Assign To" dropdown to work for admins,
-- and for staff to see who assigned tasks to them.

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);
