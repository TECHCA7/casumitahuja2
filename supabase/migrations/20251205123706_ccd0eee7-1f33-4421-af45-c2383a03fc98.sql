-- Update attendance RLS: Admin can view all, staff can only view own
DROP POLICY IF EXISTS "Users can view own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can create attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can update own attendance" ON public.attendance;

CREATE POLICY "Admin can view all attendance" ON public.attendance
FOR SELECT USING (
  public.is_admin(auth.uid()) OR auth.uid() = user_id
);

CREATE POLICY "Staff can create own attendance" ON public.attendance
FOR INSERT WITH CHECK (
  public.is_staff(auth.uid()) AND auth.uid() = user_id
);

CREATE POLICY "Staff can update own attendance" ON public.attendance
FOR UPDATE USING (
  auth.uid() = user_id
);