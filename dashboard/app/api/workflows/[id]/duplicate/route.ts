import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getWorkflow, createWorkflow } from '@/lib/db/workflows';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const original = await getWorkflow(supabase, params.id, user.id);
  if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const copy = await createWorkflow(supabase, user.id, {
    name: `${original.name} (Copy)`,
    description: original.description,
    trigger: original.trigger,
    schedule: original.schedule,
    status: 'active',
    agent_ids: original.agentIds,
    tags: original.tags,
    run_count: 0,
    success_rate: 0,
    avg_duration: 0,
  });

  return NextResponse.json(copy);
}
