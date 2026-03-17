
CREATE TABLE public.manual_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL DEFAULT '',
  valor numeric NOT NULL DEFAULT 0,
  categoria text NOT NULL DEFAULT 'outros',
  data date NOT NULL DEFAULT CURRENT_DATE,
  tipo_pagamento text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own manual expenses"
  ON public.manual_expenses
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
