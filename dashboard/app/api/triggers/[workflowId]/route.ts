import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getWorkflow } from '@/lib/db/workflows';
import { MORNING_BRIEFING_STEPS } from '@/lib/workflow/steps';
import { runWorkflow } from '@/lib/workflow/engine';

export const maxDuration = 300;

// Webhook endpoint — POST /api/triggers/[workflowId]
// Accepts: { secret?, payload? }
// Triggers workflow execution as 'webhook' triggered_by
export async function POST(req: Request, { params }: { params: { workflowId: string } }) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({})) as { userId?: string; secret?: string; payload?: Record<string, unknown> };

  if (!body.userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const supabase = createClient(supabaseUrl, serviceKey);
  const workflow = await getWorkflow(supabase, params.workflowId, body.userId);
  if (!workflow) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });

  if (workflow.trigger !== 'webhook' && workflow.trigger !== 'event') {
    return NextResponse.json({ error: 'Workflow not configured for webhook triggering' }, { status: 400 });
  }

  if (workflow.status === 'paused') {
    return NextResponse.json({ error: 'Workflow is paused' }, { status: 409 });
  }

  const steps = MORNING_BRIEFING_STEPS;
  const agentNames = steps.map(s => s.agentRole);

  const executionPromise = (async () => {
    for await (const _event of runWorkflow({
      supabase, userId: body.userId!,
      workflowId: workflow.id, workflowName: workflow.name,
      steps, agentNames,
    })) { /* fire and forget */ }
  })();

  executionPromise.catch(console.error);

  return NextResponse.json({
    triggered: true,
    workflowId: workflow.id,
    workflowName: workflow.name,
    timestamp: new Date().toISOString(),
  });
}
