import type { SupabaseClient } from '@supabase/supabase-js';
import { runAgent } from '@/lib/claude';
import { createExecution, updateExecution } from '@/lib/db/executions';
import { type WorkflowStep, substituteTemplateVars } from '@/lib/workflow/steps';
import type { AgentRole, ExecutionLog } from '@/lib/types';

export interface WorkflowStepResult {
  stepId: string;
  outputKey: string;
  output: string;
  tokensUsed: number;
  durationMs: number;
}

export interface WorkflowEngineEvent {
  type: 'step_start' | 'token' | 'step_complete' | 'workflow_complete' | 'error';
  stepIndex?: number;
  stepId?: string;
  stepLabel?: string;
  agentRole?: AgentRole;
  text?: string;
  outputKey?: string;
  tokensUsed?: number;
  executionId?: string;
  totalTokens?: number;
  message?: string;
}

export async function* runWorkflow({
  supabase,
  userId,
  workflowId,
  workflowName,
  steps,
  agentNames,
}: {
  supabase: SupabaseClient;
  userId: string;
  workflowId: string;
  workflowName: string;
  steps: WorkflowStep[];
  agentNames: string[];
}): AsyncGenerator<WorkflowEngineEvent> {
  const logs: ExecutionLog[] = [];
  const outputs: Record<string, string> = {};
  let totalTokens = 0;
  const startTime = Date.now();

  const execution = await createExecution(supabase, userId, {
    workflow_id: workflowId,
    workflow_name: workflowName,
    agent_names: agentNames,
    status: 'running',
    triggered_by: 'manual',
    start_time: new Date().toISOString(),
    tokens_used: 0,
    logs: [],
  });

  const executionId = execution.id;

  const addLog = (level: ExecutionLog['level'], message: string, agentName?: string) => {
    logs.push({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      message,
      agentName,
    });
  };

  try {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepStart = Date.now();

      yield {
        type: 'step_start',
        stepIndex: i,
        stepId: step.id,
        stepLabel: step.label,
        agentRole: step.agentRole,
      };

      addLog('info', `Starting: ${step.label}`, step.agentRole);

      const prompt = substituteTemplateVars(step.promptTemplate, outputs);
      let stepOutput = '';

      const { streamAgent } = await import('@/lib/claude');
      for await (const event of streamAgent({
        role: step.agentRole,
        task: prompt,
        maxTokens: 4096,
      })) {
        if (event.type === 'token') {
          stepOutput += event.text ?? '';
          yield { type: 'token', stepIndex: i, stepId: step.id, text: event.text };
        }
        if (event.type === 'complete') {
          totalTokens += event.tokensUsed ?? 0;
          yield {
            type: 'step_complete',
            stepIndex: i,
            stepId: step.id,
            outputKey: step.outputKey,
            tokensUsed: event.tokensUsed,
          };
        }
        if (event.type === 'error') throw new Error(event.message);
      }

      outputs[step.outputKey] = stepOutput;
      addLog('success', `Completed: ${step.label} (${((Date.now() - stepStart) / 1000).toFixed(1)}s)`, step.agentRole);

      await updateExecution(supabase, executionId, userId, {
        tokens_used: totalTokens,
        logs,
        steps_output: outputs,
      } as Parameters<typeof updateExecution>[3]);
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);
    addLog('success', `Workflow complete in ${duration}s — ${totalTokens.toLocaleString()} tokens used`);

    await updateExecution(supabase, executionId, userId, {
      status: 'success',
      end_time: new Date().toISOString(),
      duration,
      tokens_used: totalTokens,
      logs,
      output_summary: outputs[steps[steps.length - 1]?.outputKey ?? ''] ?? '',
      steps_output: outputs,
    } as Parameters<typeof updateExecution>[3]);

    yield { type: 'workflow_complete', executionId, totalTokens };
  } catch (e: unknown) {
    const msg = (e as Error).message;
    addLog('error', `Workflow failed: ${msg}`);

    await updateExecution(supabase, executionId, userId, {
      status: 'failed',
      end_time: new Date().toISOString(),
      duration: Math.floor((Date.now() - startTime) / 1000),
      logs,
      result: msg,
      steps_output: outputs,
    } as Parameters<typeof updateExecution>[3]);

    yield { type: 'error', message: msg };
  }
}
