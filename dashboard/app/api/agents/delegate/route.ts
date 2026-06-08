import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { runAgent } from '@/lib/claude';
import { assembleMemoryContext } from '@/lib/db/memory';
import type { AgentRole } from '@/lib/types';

export const maxDuration = 120;

// Agent-to-agent delegation — one agent passes a task to another
// POST /api/agents/delegate
// Body: { fromRole, toRole, task, context?, parentExecutionId? }
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    fromRole: AgentRole;
    toRole: AgentRole;
    task: string;
    context?: string;
    parentExecutionId?: string;
  };

  const { fromRole, toRole, task, context, parentExecutionId } = body;

  if (!fromRole || !toRole || !task) {
    return NextResponse.json({ error: 'fromRole, toRole, and task are required' }, { status: 400 });
  }

  const startTime = Date.now();

  const memoryContext = await assembleMemoryContext(supabase, user.id).catch(() => undefined);

  const delegationContext = [
    `This task was delegated by ${fromRole.toUpperCase()} agent.`,
    context ? `Delegation context:\n${context}` : '',
  ].filter(Boolean).join('\n\n');

  try {
    const { output, tokensUsed } = await runAgent({
      role: toRole,
      task,
      context: delegationContext,
      memoryContext,
      maxTokens: 4096,
    });

    const delegation = {
      id: crypto.randomUUID(),
      fromRole,
      toRole,
      task,
      context: context ?? null,
      output,
      tokensUsed,
      durationMs: Date.now() - startTime,
      parentExecutionId: parentExecutionId ?? null,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(delegation);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
