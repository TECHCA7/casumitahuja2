-- Create office tasks table
CREATE TABLE public.office_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date DATE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.office_tasks ENABLE ROW LEVEL SECURITY;

-- Create client_auth table for client portal login
CREATE TABLE public.client_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.client_auth ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'staff')
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.client_auth WHERE user_id = _user_id
$$;

-- RLS for office_tasks
CREATE POLICY "Staff can view all tasks" ON public.office_tasks
FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can create tasks" ON public.office_tasks
FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Admin can update tasks" ON public.office_tasks
FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin can delete tasks" ON public.office_tasks
FOR DELETE USING (public.is_admin(auth.uid()));

-- Update clients RLS
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;

CREATE POLICY "Staff can view all clients" ON public.clients
FOR SELECT USING (
  public.is_staff(auth.uid()) OR 
  (public.has_role(auth.uid(), 'client') AND id = public.get_user_client_id(auth.uid()))
);

CREATE POLICY "Staff can create clients" ON public.clients
FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Admin can update clients" ON public.clients
FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin can delete clients" ON public.clients
FOR DELETE USING (public.is_admin(auth.uid()));

-- Update client_documents RLS
DROP POLICY IF EXISTS "Users can view own documents" ON public.client_documents;
DROP POLICY IF EXISTS "Users can create documents" ON public.client_documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.client_documents;

CREATE POLICY "Staff can view all documents" ON public.client_documents
FOR SELECT USING (
  public.is_staff(auth.uid()) OR 
  (public.has_role(auth.uid(), 'client') AND client_id = public.get_user_client_id(auth.uid()))
);

CREATE POLICY "Staff and clients can create documents" ON public.client_documents
FOR INSERT WITH CHECK (
  public.is_staff(auth.uid()) OR 
  (public.has_role(auth.uid(), 'client') AND client_id = public.get_user_client_id(auth.uid()))
);

CREATE POLICY "Admin can delete documents" ON public.client_documents
FOR DELETE USING (public.is_admin(auth.uid()));

-- client_auth policies
CREATE POLICY "Staff can view client_auth" ON public.client_auth
FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Admin can manage client_auth" ON public.client_auth
FOR ALL USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_office_tasks_updated_at
BEFORE UPDATE ON public.office_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();