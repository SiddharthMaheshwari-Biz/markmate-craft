-- Security hardening: Prevent direct user_credits manipulation
-- Credits should only be modified through backend functions with SECURITY DEFINER

-- Add explicit policy that blocks direct INSERT by users
-- Only backend functions with service role can create credit records
CREATE POLICY "Block direct user credit creation"
ON public.user_credits
FOR INSERT
TO authenticated
WITH CHECK (false);

-- This ensures credits can only be created via:
-- 1. initialize_user_credits() trigger (uses SECURITY DEFINER)
-- 2. Backend processes with service role access