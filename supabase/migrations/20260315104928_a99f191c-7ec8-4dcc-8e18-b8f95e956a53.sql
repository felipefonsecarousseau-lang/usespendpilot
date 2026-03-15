
-- 1. Enum de categorias de produto
CREATE TYPE public.product_category AS ENUM (
  'mercado', 'higiene', 'limpeza', 'bebidas', 'padaria', 'hortifruti', 'outros'
);

-- 2. Tabela stores
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cnpj TEXT,
  endereco TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own stores" ON public.stores
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_stores_user_id ON public.stores (user_id);

-- 3. Tabela receipts
CREATE TABLE public.receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID NOT NULL REFERENCES public.stores (id) ON DELETE CASCADE,
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  imagem_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own receipts" ON public.receipts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_receipts_user_id ON public.receipts (user_id);

-- 4. Tabela receipt_items
CREATE TABLE public.receipt_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID NOT NULL REFERENCES public.receipts (id) ON DELETE CASCADE,
  nome_produto TEXT NOT NULL,
  nome_normalizado TEXT NOT NULL,
  categoria public.product_category NOT NULL DEFAULT 'outros',
  quantidade NUMERIC NOT NULL DEFAULT 1,
  preco_unitario NUMERIC NOT NULL DEFAULT 0,
  preco_total NUMERIC NOT NULL DEFAULT 0
);

ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;

-- RLS para receipt_items via join com receipts
CREATE POLICY "Users manage own receipt items" ON public.receipt_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.receipts r
      WHERE r.id = receipt_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.receipts r
      WHERE r.id = receipt_id AND r.user_id = auth.uid()
    )
  );

CREATE INDEX idx_receipt_items_nome_normalizado ON public.receipt_items (nome_normalizado);
