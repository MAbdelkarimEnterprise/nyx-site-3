-- ── PHASE 11: MEMORY SYSTEM ──────────────────────────────────────────────────

-- User memory profile
CREATE TABLE IF NOT EXISTS public.memory_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT,
  company TEXT,
  role TEXT,
  timezone TEXT DEFAULT 'UTC',
  communication_style TEXT CHECK (communication_style IN ('direct', 'detailed', 'concise', 'narrative')),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Core knowledge base memories
CREATE TABLE IF NOT EXISTS public.memories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('note', 'document', 'research', 'meeting', 'sop', 'knowledge')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  pinned BOOLEAN DEFAULT false,
  related_ids UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Goals
CREATE TABLE IF NOT EXISTS public.memory_goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'quarterly', 'longterm')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Projects
CREATE TABLE IF NOT EXISTS public.memory_projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'planning', 'completed', 'archived')),
  milestones JSONB DEFAULT '[]',
  deliverables JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Decisions log
CREATE TABLE IF NOT EXISTS public.memory_decisions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  what TEXT NOT NULL,
  why TEXT,
  impact TEXT DEFAULT 'medium' CHECK (impact IN ('low', 'medium', 'high', 'critical')),
  related_project_ids UUID[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  decided_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Relationships / Contacts
CREATE TABLE IF NOT EXISTS public.memory_relationships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  role TEXT,
  type TEXT NOT NULL CHECK (type IN ('team', 'client', 'investor', 'partner', 'contact')),
  company TEXT,
  email TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  last_interaction TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Founder timeline
CREATE TABLE IF NOT EXISTS public.memory_timeline (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('milestone', 'decision', 'achievement', 'project_start', 'project_end', 'note')),
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  related_ids UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.memory_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memory_profiles_owner" ON public.memory_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "memories_owner" ON public.memories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "memory_goals_owner" ON public.memory_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "memory_projects_owner" ON public.memory_projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "memory_decisions_owner" ON public.memory_decisions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "memory_relationships_owner" ON public.memory_relationships FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "memory_timeline_owner" ON public.memory_timeline FOR ALL USING (auth.uid() = user_id);

-- ── TRIGGERS ─────────────────────────────────────────────────────────────────

CREATE TRIGGER handle_updated_at_memory_profiles
  BEFORE UPDATE ON public.memory_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_memories
  BEFORE UPDATE ON public.memories
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_memory_goals
  BEFORE UPDATE ON public.memory_goals
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_memory_projects
  BEFORE UPDATE ON public.memory_projects
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_memory_decisions
  BEFORE UPDATE ON public.memory_decisions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_memory_relationships
  BEFORE UPDATE ON public.memory_relationships
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ── INDEXES ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS memories_user_id_idx ON public.memories(user_id);
CREATE INDEX IF NOT EXISTS memories_category_idx ON public.memories(category);
CREATE INDEX IF NOT EXISTS memories_pinned_idx ON public.memories(user_id, pinned) WHERE pinned = true;
CREATE INDEX IF NOT EXISTS memory_goals_user_type_idx ON public.memory_goals(user_id, type);
CREATE INDEX IF NOT EXISTS memory_goals_status_idx ON public.memory_goals(user_id, status);
CREATE INDEX IF NOT EXISTS memory_projects_user_status_idx ON public.memory_projects(user_id, status);
CREATE INDEX IF NOT EXISTS memory_decisions_user_idx ON public.memory_decisions(user_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS memory_timeline_user_date_idx ON public.memory_timeline(user_id, event_date DESC);
CREATE INDEX IF NOT EXISTS memory_relationships_user_type_idx ON public.memory_relationships(user_id, type);

-- Full-text search index on memories
CREATE INDEX IF NOT EXISTS memories_fts_idx ON public.memories
  USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));
