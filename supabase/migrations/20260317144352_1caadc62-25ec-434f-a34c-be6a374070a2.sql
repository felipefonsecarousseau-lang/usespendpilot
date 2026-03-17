
CREATE TABLE public.monthly_budget (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mes date NOT NULL,
  valor_limite numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mes)
);

ALTER TABLE public.monthly_budget ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own monthly budget"
  ON public.monthly_budget
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
