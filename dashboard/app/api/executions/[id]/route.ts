import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getExecution, updateExecution } from '@/lib/db/executions';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const execution = await getExecution(supabase, params.id, user.id);
  if (!execution) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(execution);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  try {
    const execution = await updateExecution(supabase, params.id, user.id, body);
    return NextResponse.json(execution);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
