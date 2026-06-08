import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    { data: agents },
    { data: workflows },
    { data: recentExecutions },
    { data: todayExecutions },
    { data: profile },
  ] = await Promise.all([
    supabase.from('agents').select('id, name, role, status, current_task, last_active').eq('user_id', user.id),
    supabase.from('workflows').select('id, name, status, trigger, last_run, next_run, run_count, success_rate').eq('user_id', user.id).order('updated_at', { ascending: false }),
    supabase.from('executions').select('id, workflow_name, status, start_time, end_time, duration, tokens_used, triggered_by').eq('user_id', user.id).order('start_time', { ascending: false }).limit(10),
    supabase.from('executions').select('id, status, tokens_used, duration').eq('user_id', user.id).gte('start_time', today.toISOString()),
    supabase.from('memory_profiles').select('preferences').eq('user_id', user.id).single(),
  ]);

  const allAgents = agents ?? [];
  const allWorkflows = workflows ?? [];
  const execList = recentExecutions ?? [];
  const todayExecs = todayExecutions ?? [];

  const activeAgents = allAgents.filter((a: { status: string }) => a.status === 'busy' || a.status === 'active').length;
  const runningWorkflows = allWorkflows.filter((w: { status: string }) => w.status === 'running').length;

  const successCount = todayExecs.filter((e: { status: string }) => e.status === 'success').length;
  const successRate = todayExecs.length > 0 ? Math.round((successCount / todayExecs.length) * 100) : 100;

  const tokensUsedToday = todayExecs.reduce((sum: number, e: { tokens_used: number | null }) => sum + (e.tokens_used ?? 0), 0);
  const avgDuration = todayExecs.length > 0
    ? Math.round(todayExecs.reduce((sum: number, e: { duration: number | null }) => sum + (e.duration ?? 0), 0) / todayExecs.length)
    : 0;

  const alerts = [];

  const failedToday = todayExecs.filter((e: { status: string }) => e.status === 'failed');
  if (failedToday.length > 0) {
    alerts.push({
      id: 'failed-executions',
      level: 'warn',
      message: `${failedToday.length} execution${failedToday.length > 1 ? 's' : ''} failed today`,
      source: 'execution-engine',
      timestamp: new Date().toISOString(),
      resolved: false,
    });
  }

  const errorWorkflows = allWorkflows.filter((w: { status: string }) => w.status === 'error');
  if (errorWorkflows.length > 0) {
    alerts.push({
      id: 'error-workflows',
      level: 'error',
      message: `${errorWorkflows.length} workflow${errorWorkflows.length > 1 ? 's' : ''} in error state`,
      source: 'workflow-engine',
      timestamp: new Date().toISOString(),
      resolved: false,
    });
  }

  const prefs = (profile?.preferences as Record<string, unknown>) ?? {};
  const autonomyMode = (prefs.autonomyMode as string) ?? 'approval';

  return NextResponse.json({
    agentCount: allAgents.length,
    activeAgents,
    workflowCount: allWorkflows.length,
    runningWorkflows,
    totalExecutions: todayExecs.length,
    successRate,
    avgDuration,
    tokensUsedToday,
    alerts,
    autonomyMode,
    agents: allAgents,
    workflows: allWorkflows,
    recentExecutions: execList,
  });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { autonomyMode } = await req.json() as { autonomyMode: string };

  const { data: existing } = await supabase.from('memory_profiles').select('preferences').eq('user_id', user.id).single();
  const prefs = (existing?.preferences as Record<string, unknown>) ?? {};

  await supabase.from('memory_profiles').upsert({
    user_id: user.id,
    preferences: { ...prefs, autonomyMode },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  return NextResponse.json({ autonomyMode });
}
