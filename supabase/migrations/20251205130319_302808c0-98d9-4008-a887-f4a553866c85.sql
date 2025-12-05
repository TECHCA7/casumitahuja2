-- Fix is_staff() function to return FALSE for NULL user_id
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

-- Fix is_admin() function to return FALSE for NULL user_id
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

-- Fix has_role() function to return FALSE for NULL user_id
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