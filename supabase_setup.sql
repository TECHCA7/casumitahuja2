-- 1. Create Enum Types
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'client');

-- 2. Create Tables

-- Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles Table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Clients Table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  pan TEXT,
  email TEXT,
  mobile TEXT,
  client_type TEXT DEFAULT 'Individual',
  assessment_year TEXT,
  address TEXT,
  client_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clients_client_code ON public.clients(client_code);

-- Client Documents Table
CREATE TABLE public.client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attendance Table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  method TEXT DEFAULT 'button',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices Table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'unpaid',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoice Items Table
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  hsn_sac TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 18,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0
);

-- Office Tasks Table
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

-- Client Auth Table (for client portal login)
CREATE TABLE public.client_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Staff Codes Table
CREATE TABLE public.staff_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  used_by uuid REFERENCES auth.users(id),
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_codes ENABLE ROW LEVEL SECURITY;

-- 4. Helper Functions

-- is_admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'admin'
    ) THEN true
    ELSE false
  END
$$;

-- is_staff
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id AND role IN ('admin', 'staff')
    ) THEN true
    ELSE false
  END
$$;

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    ) THEN true
    ELSE false
  END
$$;

-- get_user_client_id
CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.client_auth WHERE user_id = _user_id
$$;

-- verify_client_login
CREATE OR REPLACE FUNCTION public.verify_client_login(p_pan text, p_client_code text)
RETURNS TABLE (
  client_id uuid,
  client_name text,
  user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as client_id,
    c.name as client_name,
    ca.user_id
  FROM clients c
  LEFT JOIN client_auth ca ON ca.client_id = c.id
  WHERE UPPER(c.pan) = UPPER(p_pan)
    AND c.client_code = p_client_code;
END;
$$;
GRANT EXECUTE ON FUNCTION public.verify_client_login(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_client_login(text, text) TO authenticated;

-- set_user_role
CREATE OR REPLACE FUNCTION public.set_user_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing role if any
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  -- Insert new role
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role);
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, app_role) TO anon;

-- validate_staff_code
CREATE OR REPLACE FUNCTION public.validate_staff_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff_codes 
    WHERE code = p_code 
    AND is_active = true 
    AND used_by IS NULL
  );
END;
$$;

-- use_staff_code
CREATE OR REPLACE FUNCTION public.use_staff_code(p_code text, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.staff_codes 
  SET used_by = p_user_id, used_at = now(), is_active = false
  WHERE code = p_code AND is_active = true AND used_by IS NULL;
END;
$$;

-- 5. Triggers

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Special case: Automatically make techca7@gmail.com an admin
  IF NEW.email = 'techca7@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  -- Only set staff role if signing up via normal auth (not client portal)
  ELSIF NOT (NEW.raw_user_meta_data ->> 'is_client')::boolean THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'staff');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. RLS Policies

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- User Roles
CREATE POLICY "Users can view own role" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

-- Clients
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

-- Client Documents
CREATE POLICY "Staff can view all documents" ON public.client_documents
FOR SELECT USING (
  public.is_staff(auth.uid()) OR 
  (public.has_role(auth.uid(), 'client') AND client_id = public.get_user_client_id(auth.uid()))
);

CREATE POLICY "Staff can upload documents" ON public.client_documents
FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Admin can delete documents" ON public.client_documents
FOR DELETE USING (public.is_admin(auth.uid()));

-- Attendance
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

-- Invoices
CREATE POLICY "Staff can view all invoices" ON public.invoices
FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can create invoices" ON public.invoices
FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Admin can update invoices" ON public.invoices
FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin can delete invoices" ON public.invoices
FOR DELETE USING (public.is_admin(auth.uid()));

-- Invoice Items
CREATE POLICY "Staff can view all invoice items" ON public.invoice_items
FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can create invoice items" ON public.invoice_items
FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Admin can update invoice items" ON public.invoice_items
FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin can delete invoice items" ON public.invoice_items
FOR DELETE USING (public.is_admin(auth.uid()));

-- Office Tasks
CREATE POLICY "Staff can view all tasks" ON public.office_tasks
FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can create tasks" ON public.office_tasks
FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Admin can update tasks" ON public.office_tasks
FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin can delete tasks" ON public.office_tasks
FOR DELETE USING (public.is_admin(auth.uid()));

-- Staff Codes
CREATE POLICY "Admins can manage staff codes" ON public.staff_codes
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can check staff codes" ON public.staff_codes
FOR SELECT USING (true);

-- 7. Storage Setup
-- Note: You might need to create the bucket manually in the Supabase dashboard if this fails
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-documents' 
  AND (
    public.is_staff(auth.uid()) OR
    (auth.uid()::text = (storage.foldername(name))[1])
  )
);

CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'client-documents' 
  AND (
    public.is_staff(auth.uid()) OR
    (auth.uid()::text = (storage.foldername(name))[1])
  )
);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'client-documents' 
  AND (
    public.is_staff(auth.uid()) OR
    (auth.uid()::text = (storage.foldername(name))[1])
  )
);

-- 8. Initial Data
INSERT INTO public.staff_codes (code) VALUES ('STAFF2024') ON CONFLICT (code) DO NOTHING;
