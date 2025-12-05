-- Step 1: Add 'client' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';