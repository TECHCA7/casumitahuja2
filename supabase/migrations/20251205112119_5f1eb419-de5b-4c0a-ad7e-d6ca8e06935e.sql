-- Add client_code column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_code TEXT UNIQUE;

-- Create index for faster lookups by client_code
CREATE INDEX IF NOT EXISTS idx_clients_client_code ON public.clients(client_code);