import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assembleMemoryContext, getGoals, getProjects, getDecisions, getMemoryProfile } from '@/lib/db/memory';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [contextString, profile, goals, projects, decisions] = await Promise.all([
    assembleMemoryContext(supabase, user.id),
    getMemoryProfile(supabase, user.id),
    getGoals(supabase, user.id, { status: 'active' }),
    getProjects(supabase, user.id, { status: 'active' }),
    getDecisions(supabase, user.id, 5),
  ]);

  return NextResponse.json({
    context: contextString,
    profile,
    activeGoals: goals,
    activeProjects: projects,
    recentDecisions: decisions,
  });
}
