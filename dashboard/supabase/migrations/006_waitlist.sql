-- ── WAITLIST SIGNUPS ─────────────────────────────────────────────────────────
-- Captures every access request from the marketing site. Writes come from the
-- serverless function using the service-role key (bypasses RLS). Reads are
-- locked down to authenticated admins via the API layer (ADMIN_EMAILS allowlist).

CREATE TABLE IF NOT EXISTS public.waitlist_signups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  source      TEXT DEFAULT 'landing',
  ip          TEXT,
  user_agent  TEXT,
  referrer    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per email (idempotent re-signups).
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_signups_email_key
  ON public.waitlist_signups (lower(email));

CREATE INDEX IF NOT EXISTS waitlist_signups_created_at_idx
  ON public.waitlist_signups (created_at DESC);

-- RLS on. No public policies — only the service-role key (server-side) may read
-- or write. The anon/auth clients get nothing, which is exactly what we want.
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;
