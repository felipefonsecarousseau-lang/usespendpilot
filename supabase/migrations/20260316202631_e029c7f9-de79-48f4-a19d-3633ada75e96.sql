
-- Create enums
CREATE TYPE public.plan_type AS ENUM ('free', 'premium');
CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'yearly');
CREATE TYPE public.plan_status AS ENUM ('active', 'cancelled', 'expired');

-- Create user_plans table
CREATE TABLE public.user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type plan_type NOT NULL DEFAULT 'free',
  billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',
  status plan_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

-- Users can read their own plan
CREATE POLICY "Users read own plan" ON public.user_plans
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own plan
CREATE POLICY "Users insert own plan" ON public.user_plans
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own plan
CREATE POLICY "Users update own plan" ON public.user_plans
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
