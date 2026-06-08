import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkflows, createWorkflow } from '@/lib/db/workflows';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const workflows = await getWorkflows(supabase, user.id);
    return NextResponse.json(workflows);
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
    const workflow = await createWorkflow(supabase, user.id, body);
    return NextResponse.json(workflow, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
