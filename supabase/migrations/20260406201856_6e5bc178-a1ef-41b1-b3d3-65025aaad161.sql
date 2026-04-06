-- Add stripe_customer_id column to user_plans
ALTER TABLE public.user_plans
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Index for fast lookup by stripe_customer_id
CREATE INDEX IF NOT EXISTS idx_user_plans_stripe_customer_id
ON public.user_plans (stripe_customer_id);

-- Function to look up user_id by email (used by stripe webhook fallback)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = p_email LIMIT 1;
$$;