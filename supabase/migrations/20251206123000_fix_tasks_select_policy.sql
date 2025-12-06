-- Improve the SELECT policy for office_tasks
-- Instead of relying on is_staff() which checks the user_roles table,
-- we explicitly allow users to see tasks assigned to them or created by them.
-- This ensures that even if the user_roles table is missing an entry,
-- the user can still see their own tasks.

DROP POLICY IF EXISTS "Staff can view all tasks" ON public.office_tasks;

CREATE POLICY "Users can view relevant tasks" ON public.office_tasks
FOR SELECT USING (
  public.is_admin(auth.uid()) OR 
  assigned_to = auth.uid() OR 
  created_by = auth.uid()
);
