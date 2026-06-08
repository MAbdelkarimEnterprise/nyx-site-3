import { createClient } from '@/lib/supabase/server';
import { getAgent, updateAgent } from '@/lib/db/agents';
import { createExecution, updateExecution } from '@/lib/db/executions';
import { streamAgent } from '@/lib/claude';
import { assembleMemoryContext } from '@/lib/db/memory';
import type { AgentRole, ExecutionLog } from '@/lib/types';

export const maxDuration = 300;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: 'ANTHROPIC_API_KEY is not configured in .env.local' })}\n\n`,
      { status: 200, headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } }
    );
  }

  const agent = await getAgent(supabase, params.id, user.id);
  if (!agent) return new Response('Not found', { status: 404 });

  const { task, context } = await request.json() as { task: string; context?: string };
  if (!task?.trim()) return new Response('task is required', { status: 400 });

  const memoryContext = await assembleMemoryContext(supabase, user.id).catch(() => undefined);

  const execution = await createExecution(supabase, user.id, {
    workflow_id: null,
    workflow_name: `${agent.name} — Manual Task`,
    agent_names: [agent.name],
    status: 'running',
    triggered_by: 'manual',
    start_time: new Date().toISOString(),
    tokens_used: 0,
    logs: [],
  });

  await updateAgent(supabase, params.id, user.id, {
    status: 'busy',
    current_task: task.slice(0, 120),
  });

  const enc = new TextEncoder();
  const emit = (data: object) => enc.encode(`data: ${JSON.stringify(data)}\n\n`);

  const body = new ReadableStream({
    async start(controller) {
      const logs: ExecutionLog[] = [];
      let fullOutput = '';
      let tokensUsed = 0;
      const startTime = Date.now();

      logs.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Task received: ${task.slice(0, 80)}${task.length > 80 ? '…' : ''}`,
        agentName: agent.name,
      });

      try {
        for await (const event of streamAgent({
          role: agent.role as AgentRole,
          task,
          context,
          memoryContext,
        })) {
          if (event.type === 'token') {
            fullOutput += event.text ?? '';
            controller.enqueue(emit({ type: 'token', text: event.text }));
          }
          if (event.type === 'complete') {
            tokensUsed = event.tokensUsed ?? 0;
          }
          if (event.type === 'error') throw new Error(event.message);
        }

        const duration = Math.floor((Date.now() - startTime) / 1000);
        logs.push({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          level: 'success',
          message: `Task completed in ${duration}s — ${tokensUsed.toLocaleString()} tokens`,
          agentName: agent.name,
        });

        await updateExecution(supabase, execution.id, user.id, {
          status: 'success',
          end_time: new Date().toISOString(),
          duration,
          tokens_used: tokensUsed,
          output_summary: fullOutput.slice(0, 500),
          result: 'Task completed successfully',
          logs,
        });

        const now = new Date().toISOString();
        const updatedActivity = [
          {
            id: crypto.randomUUID(),
            timestamp: now,
            action: task.slice(0, 60),
            result: fullOutput.slice(0, 120),
            status: 'success' as const,
          },
          ...(agent.recentActivity ?? []).slice(0, 9),
        ];

        await updateAgent(supabase, params.id, user.id, {
          status: 'active',
          current_task: null,
          last_active: now,
          recent_activity: updatedActivity,
          metrics: {
            ...agent.metrics,
            tasksCompleted: (agent.metrics.tasksCompleted ?? 0) + 1,
            tokensUsed: (agent.metrics.tokensUsed ?? 0) + tokensUsed,
            avgResponseTime: Math.round(((agent.metrics.avgResponseTime ?? 0) + duration) / 2),
          },
        });

        controller.enqueue(emit({ type: 'complete', executionId: execution.id, tokensUsed, duration }));
      } catch (e: unknown) {
        const msg = (e as Error).message;
        logs.push({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          level: 'error',
          message: msg,
          agentName: agent.name,
        });

        await updateExecution(supabase, execution.id, user.id, {
          status: 'failed',
          end_time: new Date().toISOString(),
          duration: Math.floor((Date.now() - startTime) / 1000),
          logs,
          result: msg,
        });

        await updateAgent(supabase, params.id, user.id, {
          status: 'active',
          current_task: null,
        });

        controller.enqueue(emit({ type: 'error', message: msg }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
