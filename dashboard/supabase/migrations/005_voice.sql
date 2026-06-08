-- ── PHASE 12: VOICE OPERATING SYSTEM ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.voice_conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  linked_project_id UUID REFERENCES public.memory_projects(id) ON DELETE SET NULL,
  linked_goal_id UUID REFERENCES public.memory_goals(id) ON DELETE SET NULL,
  turn_count INTEGER DEFAULT 0,
  summary TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.voice_turns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.voice_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'nyx')),
  text TEXT NOT NULL,
  intent TEXT,
  agent_role TEXT,
  tokens_used INTEGER DEFAULT 0,
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.voice_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_turns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_conversations_owner" ON public.voice_conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "voice_turns_owner" ON public.voice_turns FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER handle_updated_at_voice_conversations
  BEFORE UPDATE ON public.voice_conversations
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE INDEX IF NOT EXISTS voice_conversations_user_idx ON public.voice_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS voice_turns_conversation_idx ON public.voice_turns(conversation_id, created_at ASC);
