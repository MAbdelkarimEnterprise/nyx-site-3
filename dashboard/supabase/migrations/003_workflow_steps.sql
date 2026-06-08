-- ── WORKFLOW STEPS + EXECUTION OUTPUTS ───────────────────────────────────────
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS steps      JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS config     JSONB DEFAULT '{}';

ALTER TABLE public.executions
  ADD COLUMN IF NOT EXISTS steps_output JSONB DEFAULT '{}';
