-- Secure function to get user details bypassing RLS
CREATE OR REPLACE FUNCTION get_user_details_secure(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_roles text[];
  v_client_id uuid;
  v_final_role text;
BEGIN
  -- Get roles
  SELECT array_agg(role) INTO v_roles FROM public.user_roles WHERE user_id = p_user_id;
  
  -- Get client_id
  SELECT client_id INTO v_client_id FROM public.client_auth WHERE user_id = p_user_id LIMIT 1;

  -- Determine primary role
  IF 'admin' = ANY(v_roles) THEN
    v_final_role := 'admin';
  ELSIF 'staff' = ANY(v_roles) THEN
    v_final_role := 'staff';
  ELSIF v_client_id IS NOT NULL OR 'client' = ANY(v_roles) THEN
    v_final_role := 'client';
  ELSE
    v_final_role := 'staff'; -- Default
  END IF;

  RETURN json_build_object(
    'role', v_final_role,
    'client_id', v_client_id,
    'roles', v_roles
  );
END;
$$;
