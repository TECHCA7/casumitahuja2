-- Fix attendance RLS policy to allow any authenticated user to mark attendance
-- Previously it required is_staff() which might fail if user_roles is missing the user.

DROP POLICY IF EXISTS "Staff can create own attendance" ON public.attendance;

CREATE POLICY "Users can create own attendance" ON public.attendance
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
