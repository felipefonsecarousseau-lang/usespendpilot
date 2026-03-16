-- Create private storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public) VALUES ('receipt-images', 'receipt-images', false);

-- Only the owner can upload receipt images
CREATE POLICY "Users upload own receipt images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipt-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Only the owner can view their receipt images
CREATE POLICY "Users view own receipt images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipt-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Only the owner can delete their receipt images
CREATE POLICY "Users delete own receipt images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipt-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create audit_logs table for security events
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own audit logs
CREATE POLICY "Users read own audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only service role can insert (via edge functions)
-- No insert policy for authenticated users - edge functions use service role
