import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgents, createAgent } from '@/lib/db/agents';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const agents = await getAgents(supabase, user.id);
    return NextResponse.json(agents);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  try {
    const agent = await createAgent(supabase, user.id, body);
    return NextResponse.json(agent, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
