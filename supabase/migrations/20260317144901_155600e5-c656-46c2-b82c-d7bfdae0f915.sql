
CREATE TYPE public.occurrence_status AS ENUM ('pending', 'paid');

CREATE TABLE public.fixed_expense_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fixed_expense_id uuid NOT NULL REFERENCES public.fixed_expenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  mes date NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  status occurrence_status NOT NULL DEFAULT 'pending',
  data_pagamento timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fixed_expense_id, mes)
);

ALTER TABLE public.fixed_expense_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own occurrences"
  ON public.fixed_expense_occurrences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
