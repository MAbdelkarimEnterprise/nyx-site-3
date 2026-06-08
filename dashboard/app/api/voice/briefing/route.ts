import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runAgent } from '@/lib/claude';
import { assembleMemoryContext, getGoals, getProjects, getDecisions } from '@/lib/db/memory';

export const maxDuration = 120;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
  }

  const [memoryContext, goals, projects, decisions] = await Promise.all([
    assembleMemoryContext(supabase, user.id),
    getGoals(supabase, user.id, { status: 'active' }),
    getProjects(supabase, user.id, { status: 'active' }),
    getDecisions(supabase, user.id, 5),
  ]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const prompt = `Today is ${today}. Generate a spoken executive morning briefing for the operator.

Active Goals: ${goals.map(g => `${g.title} (${g.progress}%)`).join(', ') || 'None set'}
Active Projects: ${projects.map(p => p.name).join(', ') || 'None set'}
Recent Decisions: ${decisions.map(d => d.title).join(', ') || 'None'}

Write a natural spoken briefing — no markdown, no headers, plain speech. Under 200 words. Be concise, decisive, and motivating. Start with "Good morning." End with one clear priority for today.`;

  try {
    const { output } = await runAgent({ role: 'ceo', task: prompt, memoryContext });
    return NextResponse.json({ briefing: output, date: today });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
