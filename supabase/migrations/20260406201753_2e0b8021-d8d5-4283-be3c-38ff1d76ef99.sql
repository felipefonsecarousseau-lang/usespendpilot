-- Remove INSERT policy (plan creation should only happen via trigger/edge function)
DROP POLICY IF EXISTS "Users insert own plan" ON public.user_plans;

-- Remove UPDATE policy (plan updates should only happen via edge function with service role)
DROP POLICY IF EXISTS "Users update own plan" ON public.user_plans;

-- Add DELETE policy so users can only delete their own plan (not others')
CREATE POLICY "Users delete own plan"
ON public.user_plans
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);