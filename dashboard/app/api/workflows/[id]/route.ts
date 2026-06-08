import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkflow, updateWorkflow, deleteWorkflow } from '@/lib/db/workflows';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workflow = await getWorkflow(supabase, params.id, user.id);
  if (!workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(workflow);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  try {
    const workflow = await updateWorkflow(supabase, params.id, user.id, body);
    return NextResponse.json(workflow);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await deleteWorkflow(supabase, params.id, user.id);
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
