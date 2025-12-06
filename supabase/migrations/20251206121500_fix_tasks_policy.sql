-- Allow staff to update tasks assigned to them (e.g. to change status)
-- The previous policy only allowed admins to update tasks.

DROP POLICY IF EXISTS "Admin can update tasks" ON public.office_tasks;

CREATE POLICY "Staff can update own tasks" ON public.office_tasks
FOR UPDATE USING (
  public.is_admin(auth.uid()) OR 
  assigned_to = auth.uid() OR
  created_by = auth.uid()
);

-- Ensure staff can view tasks (this was already there but let's be sure)
-- The existing policy "Staff can view all tasks" uses is_staff() which checks for 'admin' or 'staff' role.
-- If the user has the 'staff' role, they should see ALL tasks.
-- The frontend then filters them.
