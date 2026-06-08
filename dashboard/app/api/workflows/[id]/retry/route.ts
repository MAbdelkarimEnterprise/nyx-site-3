import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getWorkflow } from '@/lib/db/workflows';
import { MORNING_BRIEFING_STEPS } from '@/lib/workflow/steps';
import { runWorkflow } from '@/lib/workflow/engine';

export const maxDuration = 300;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workflow = await getWorkflow(supabase, params.id, user.id);
  if (!workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const emit = (obj: Record<string, unknown>) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        const steps = MORNING_BRIEFING_STEPS;
        const agentNames = steps.map(s => s.agentRole);

        for await (const event of runWorkflow({
          supabase, userId: user.id,
          workflowId: workflow.id,
          workflowName: workflow.name,
          steps,
          agentNames,
        })) {
          emit(event as unknown as Record<string, unknown>);
        }
      } catch (e: unknown) {
        emit({ type: 'error', message: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
