
CREATE TABLE public.fixed_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outros',
  valor NUMERIC NOT NULL DEFAULT 0,
  dia_vencimento INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pendente',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own fixed expenses"
  ON public.fixed_expenses
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
