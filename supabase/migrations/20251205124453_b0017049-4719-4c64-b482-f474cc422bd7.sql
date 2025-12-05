-- Create a function for client login that bypasses RLS (SECURITY DEFINER)
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

-- Grant execute permission to anonymous users (for login)
GRANT EXECUTE ON FUNCTION public.verify_client_login(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_client_login(text, text) TO authenticated;

-- Update is_staff function to return true for authenticated users without explicit role
-- (They default to staff if no role is set)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = _user_id AND role IN ('admin', 'staff')
      ) THEN true
      WHEN NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = _user_id
      ) THEN true -- Default to staff if no role exists
      ELSE false
    END
$$;