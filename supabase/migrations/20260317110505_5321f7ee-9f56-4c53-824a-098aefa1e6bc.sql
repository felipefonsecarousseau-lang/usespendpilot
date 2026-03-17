
-- Add trial columns to user_plans
ALTER TABLE public.user_plans 
  ADD COLUMN IF NOT EXISTS is_trial BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP WITH TIME ZONE;

-- Create function to auto-create trial plan on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_trial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create trial if user doesn't already have a plan
  IF NOT EXISTS (SELECT 1 FROM public.user_plans WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_plans (user_id, plan_type, status, is_trial, trial_started_at, trial_expires_at, started_at)
    VALUES (
      NEW.id,
      'premium',
      'active',
      true,
      now(),
      now() + interval '15 days',
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for new signups
CREATE TRIGGER on_auth_user_created_trial
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_trial();
