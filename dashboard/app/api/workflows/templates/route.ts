import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WORKFLOW_TEMPLATES } from '@/lib/types';
import { createWorkflow } from '@/lib/db/workflows';

export async function GET() {
  return NextResponse.json(WORKFLOW_TEMPLATES);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { templateId } = await req.json() as { templateId: string };
  const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  const workflow = await createWorkflow(supabase, user.id, {
    name: template.name,
    description: template.description,
    trigger: template.trigger,
    schedule: template.schedule,
    status: 'active',
    agent_ids: template.agentRoles,
    tags: template.tags,
    run_count: 0,
    success_rate: 0,
    avg_duration: 0,
  });

  return NextResponse.json(workflow, { status: 201 });
}
