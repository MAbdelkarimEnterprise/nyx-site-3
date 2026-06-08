-- ── INTEGRATIONS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.integrations (
  id            UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  provider      TEXT        NOT NULL CHECK (provider IN ('google', 'notion')),
  access_token  TEXT        NOT NULL,
  refresh_token TEXT,
  token_expiry  TIMESTAMPTZ,
  scope         TEXT,
  account_email TEXT,
  account_name  TEXT,
  metadata      JSONB       DEFAULT '{}',
  connected_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON public.integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON public.integrations(provider);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integrations_own" ON public.integrations
  FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE TRIGGER set_updated_at_integrations
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
