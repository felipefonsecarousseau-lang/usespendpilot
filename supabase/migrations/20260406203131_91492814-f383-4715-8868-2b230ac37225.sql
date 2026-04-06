-- Drop the overly permissive policy that uses public role
DROP POLICY IF EXISTS "Users can manage their own variable income" ON public.variable_income;

-- Recreate with authenticated role (matching all other tables)
CREATE POLICY "Users can manage their own variable income"
ON public.variable_income
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);