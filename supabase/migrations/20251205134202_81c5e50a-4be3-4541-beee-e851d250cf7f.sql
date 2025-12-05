-- Create staff_codes table
CREATE TABLE public.staff_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  used_by uuid REFERENCES auth.users(id),
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage staff codes
CREATE POLICY "Admins can manage staff codes"
ON public.staff_codes
FOR ALL
USING (is_admin(auth.uid()));

-- Anyone can check if a code exists (for signup validation)
CREATE POLICY "Anyone can check staff codes"
ON public.staff_codes
FOR SELECT
USING (true);

-- Create a function to validate and use a staff code
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

-- Create a function to mark a code as used
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

-- Insert a default staff code for testing
INSERT INTO public.staff_codes (code) VALUES ('STAFF2024');