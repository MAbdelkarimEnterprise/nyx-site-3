import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoals, createGoal } from '@/lib/db/memory';
import type { GoalType, GoalStatus } from '@/lib/types';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as GoalType | null;
  const status = searchParams.get('status') as GoalStatus | null;
  const goals = await getGoals(supabase, user.id, {
    type: type ?? undefined,
    status: status ?? undefined,
  });
  return NextResponse.json(goals);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const goal = await createGoal(supabase, user.id, body);
  return NextResponse.json(goal, { status: 201 });
}
