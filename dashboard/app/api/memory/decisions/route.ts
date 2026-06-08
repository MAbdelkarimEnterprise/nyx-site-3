import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDecisions, createDecision } from '@/lib/db/memory';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const decisions = await getDecisions(supabase, user.id);
  return NextResponse.json(decisions);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const decision = await createDecision(supabase, user.id, body);
  return NextResponse.json(decision, { status: 201 });
}
