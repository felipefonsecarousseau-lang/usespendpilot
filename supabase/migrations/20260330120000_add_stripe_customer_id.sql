
-- Add stripe_customer_id to user_plans for direct webhook lookup
ALTER TABLE public.user_plans
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Unique: one Stripe customer per Supabase user (NULLs are treated as distinct in PostgreSQL)
ALTER TABLE public.user_plans
  ADD CONSTRAINT user_plans_stripe_customer_id_key UNIQUE (stripe_customer_id);

-- Index for O(1) lookup in webhook handler
CREATE INDEX IF NOT EXISTS idx_user_plans_stripe_customer_id
  ON public.user_plans (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
