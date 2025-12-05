-- Create a security definer function to set user role (bypasses RLS)
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, app_role) TO anon;

-- Update handle_new_user trigger to only create profile, not role
-- Role will be set by the app based on signup context
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Only set staff role if signing up via normal auth (not client portal)
  -- Client portal will set role to 'client' explicitly
  IF NOT (NEW.raw_user_meta_data ->> 'is_client')::boolean THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'staff');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix existing client user to have correct role
UPDATE public.user_roles 
SET role = 'client' 
WHERE user_id IN (
  SELECT user_id FROM public.client_auth
);