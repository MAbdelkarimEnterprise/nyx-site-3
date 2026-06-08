-- ── NYX INITIAL SCHEMA ───────────────────────────────────────────────────────
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── PROFILES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email       TEXT        NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── AGENTS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agents (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name         TEXT        NOT NULL,
  role         TEXT        NOT NULL CHECK (role IN ('ceo','research','marketing','sales','finance','developer')),
  purpose      TEXT,
  status       TEXT        DEFAULT 'idle' CHECK (status IN ('active','idle','busy','offline')),
  model        TEXT        NOT NULL DEFAULT 'claude-sonnet-4-6',
  capabilities TEXT[]      DEFAULT '{}',
  current_task TEXT,
  last_active  TIMESTAMPTZ,
  metrics      JSONB       DEFAULT '{"tasksCompleted":0,"successRate":100,"avgResponseTime":0,"tokensUsed":0,"uptime":100}',
  recent_activity JSONB    DEFAULT '[]',
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── WORKFLOWS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workflows (
  id            UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name          TEXT        NOT NULL,
  description   TEXT,
  trigger       TEXT        NOT NULL DEFAULT 'manual' CHECK (trigger IN ('manual','scheduled','webhook','event')),
  schedule      TEXT,
  status        TEXT        DEFAULT 'active' CHECK (status IN ('active','paused','running','error','completed')),
  agent_ids     UUID[]      DEFAULT '{}',
  run_count     INTEGER     DEFAULT 0,
  success_rate  NUMERIC(5,2) DEFAULT 100.00,
  avg_duration  INTEGER     DEFAULT 0,
  tags          TEXT[]      DEFAULT '{}',
  last_run      TIMESTAMPTZ,
  next_run      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── TASKS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  workflow_id UUID        REFERENCES public.workflows(id) ON DELETE SET NULL,
  agent_id    UUID        REFERENCES public.agents(id) ON DELETE SET NULL,
  agent_name  TEXT,
  title       TEXT        NOT NULL,
  description TEXT,
  priority    TEXT        DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  status      TEXT        DEFAULT 'backlog' CHECK (status IN ('backlog','in_progress','review','completed')),
  due_date    DATE,
  tags        TEXT[]      DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── EXECUTIONS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.executions (
  id             UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  workflow_id    UUID        REFERENCES public.workflows(id) ON DELETE SET NULL,
  workflow_name  TEXT        NOT NULL,
  agent_names    TEXT[]      DEFAULT '{}',
  status         TEXT        DEFAULT 'running' CHECK (status IN ('running','success','failed','cancelled')),
  triggered_by   TEXT        DEFAULT 'manual' CHECK (triggered_by IN ('schedule','manual','webhook')),
  start_time     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  end_time       TIMESTAMPTZ,
  duration       INTEGER,
  result         TEXT,
  output_summary TEXT,
  tokens_used    INTEGER     DEFAULT 0,
  logs           JSONB       DEFAULT '[]',
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── BRIEFINGS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.briefings (
  id                UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date              DATE        NOT NULL DEFAULT CURRENT_DATE,
  classification    TEXT        DEFAULT 'CONFIDENTIAL — OPERATOR LEVEL',
  executive_summary TEXT,
  system_score      INTEGER     DEFAULT 0 CHECK (system_score BETWEEN 0 AND 100),
  sections          JSONB       DEFAULT '[]',
  generated_by      TEXT,
  generated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── INDEXES ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_agents_user_id       ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_user_id    ON public.workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status     ON public.workflows(status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id        ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status         ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_workflow_id    ON public.tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_user_id   ON public.executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON public.executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_status    ON public.executions(status);
CREATE INDEX IF NOT EXISTS idx_briefings_user_id    ON public.briefings(user_id);
CREATE INDEX IF NOT EXISTS idx_briefings_date       ON public.briefings(date DESC);

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER set_updated_at_agents
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_workflows
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_tasks
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── AUTO-CREATE PROFILE ON SIGNUP ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefings       ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update their own profile
CREATE POLICY "profiles_own" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Agents: full access to own records
CREATE POLICY "agents_own" ON public.agents
  FOR ALL USING (auth.uid() = user_id);

-- Workflows: full access to own records
CREATE POLICY "workflows_own" ON public.workflows
  FOR ALL USING (auth.uid() = user_id);

-- Tasks: full access to own records
CREATE POLICY "tasks_own" ON public.tasks
  FOR ALL USING (auth.uid() = user_id);

-- Executions: full access to own records
CREATE POLICY "executions_own" ON public.executions
  FOR ALL USING (auth.uid() = user_id);

-- Briefings: full access to own records
CREATE POLICY "briefings_own" ON public.briefings
  FOR ALL USING (auth.uid() = user_id);
