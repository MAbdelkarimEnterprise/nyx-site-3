import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { runAgent } from '@/lib/claude';
import { createBriefing } from '@/lib/db/briefings';
import { MORNING_BRIEFING_STEPS, substituteTemplateVars } from '@/lib/workflow/steps';
import { createExecution, updateExecution } from '@/lib/db/executions';
import type { BriefingSection, ExecutionLog } from '@/lib/types';

export const maxDuration = 300;

export async function GET(request: Request) {
  // Fail-closed: if CRON_SECRET is not configured, refuse rather than run
  // paid agent workloads for every user from an unauthenticated request.
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: profiles } = await supabase.from('profiles').select('id');
  if (!profiles?.length) return NextResponse.json({ message: 'No users found' });

  const results: { userId: string; status: string; briefingId?: string }[] = [];

  for (const profile of profiles) {
    const userId = profile.id;
    const logs: ExecutionLog[] = [];
    const outputs: Record<string, string> = {};
    let totalTokens = 0;

    const execution = await createExecution(supabase, userId, {
      workflow_id: null,
      workflow_name: 'Morning Intelligence Briefing',
      agent_names: MORNING_BRIEFING_STEPS.map(s => `${s.agentRole} agent`),
      status: 'running',
      triggered_by: 'schedule',
      start_time: new Date().toISOString(),
      tokens_used: 0,
      logs: [],
    });

    try {
      for (const step of MORNING_BRIEFING_STEPS) {
        const prompt = substituteTemplateVars(step.promptTemplate, outputs);
        logs.push({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Starting: ${step.label}`,
          agentName: step.agentRole,
        });

        const { output, tokensUsed } = await runAgent({
          role: step.agentRole,
          task: prompt,
          maxTokens: 4096,
        });

        outputs[step.outputKey] = output;
        totalTokens += tokensUsed;

        logs.push({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          level: 'success',
          message: `Completed: ${step.label} — ${tokensUsed.toLocaleString()} tokens`,
          agentName: step.agentRole,
        });
      }

      const sections: BriefingSection[] = [
        {
          id: crypto.randomUUID(),
          title: 'Competitive Intelligence',
          type: 'recommendations',
          summary: 'Morning competitive scan and market analysis',
          items: [{ id: crypto.randomUUID(), content: outputs.research_output, priority: 'high' }],
        },
        {
          id: crypto.randomUUID(),
          title: 'Content & Growth Strategy',
          type: 'opportunities',
          summary: 'Marketing recommendations based on intelligence',
          items: [{ id: crypto.randomUUID(), content: outputs.marketing_output, priority: 'medium' }],
        },
        {
          id: crypto.randomUUID(),
          title: 'Executive Priorities',
          type: 'priorities',
          summary: 'Strategic synthesis and action directives',
          items: [{ id: crypto.randomUUID(), content: outputs.ceo_summary, priority: 'critical' }],
        },
      ];

      const briefing = await createBriefing(supabase, userId, {
        date: new Date().toISOString().split('T')[0],
        classification: 'CONFIDENTIAL — OPERATOR LEVEL',
        executive_summary: outputs.ceo_summary?.slice(0, 400) ?? '',
        system_score: 91,
        generated_by: 'NYX Autonomous Workflow Engine — Scheduled',
        generated_at: new Date().toISOString(),
        sections,
      });

      await updateExecution(supabase, execution.id, userId, {
        status: 'success',
        end_time: new Date().toISOString(),
        tokens_used: totalTokens,
        output_summary: outputs.ceo_summary?.slice(0, 500),
        logs,
      });

      results.push({ userId, status: 'ok', briefingId: briefing.id });
    } catch (e: unknown) {
      await updateExecution(supabase, execution.id, userId, {
        status: 'failed',
        end_time: new Date().toISOString(),
        logs,
        result: (e as Error).message,
      });
      results.push({ userId, status: 'error' });
    }
  }

  return NextResponse.json({ results, ran: new Date().toISOString() });
}
