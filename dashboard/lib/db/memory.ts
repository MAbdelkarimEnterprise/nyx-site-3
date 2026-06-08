import type { SupabaseClient } from '@supabase/supabase-js';
import {
  mapMemoryProfile, mapMemory, mapMemoryGoal, mapMemoryProject,
  mapMemoryDecision, mapMemoryRelationship, mapMemoryTimelineEvent,
  type MemoryProfile, type Memory, type MemoryGoal, type MemoryProject,
  type MemoryDecision, type MemoryRelationship, type MemoryTimelineEvent,
  type MemoryCategory, type GoalType, type GoalStatus,
  type ProjectStatus, type DecisionImpact, type RelationshipType, type TimelineEventType,
  type ProjectMilestone, type ProjectDeliverable,
} from '@/lib/types';

// ── PROFILE ──────────────────────────────────────────────────────────────────

export async function getMemoryProfile(supabase: SupabaseClient, userId: string): Promise<MemoryProfile | null> {
  const { data } = await supabase
    .from('memory_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data ? mapMemoryProfile(data) : null;
}

export async function upsertMemoryProfile(
  supabase: SupabaseClient,
  userId: string,
  payload: Partial<{
    name: string; company: string; role: string; timezone: string;
    communication_style: string; preferences: Record<string, unknown>;
  }>
): Promise<MemoryProfile> {
  const { data, error } = await supabase
    .from('memory_profiles')
    .upsert({ user_id: userId, ...payload, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return mapMemoryProfile(data);
}

// ── MEMORIES (KNOWLEDGE BASE) ────────────────────────────────────────────────

export async function getMemories(
  supabase: SupabaseClient,
  userId: string,
  opts: { category?: MemoryCategory; pinned?: boolean; limit?: number } = {}
): Promise<Memory[]> {
  let q = supabase.from('memories').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
  if (opts.category) q = q.eq('category', opts.category);
  if (opts.pinned !== undefined) q = q.eq('pinned', opts.pinned);
  if (opts.limit) q = q.limit(opts.limit);
  const { data } = await q;
  return (data ?? []).map(mapMemory);
}

export async function getMemory(supabase: SupabaseClient, id: string, userId: string): Promise<Memory | null> {
  const { data } = await supabase.from('memories').select('*').eq('id', id).eq('user_id', userId).single();
  return data ? mapMemory(data) : null;
}

export async function createMemory(
  supabase: SupabaseClient,
  userId: string,
  payload: { category: MemoryCategory; title: string; content: string; tags?: string[]; pinned?: boolean; metadata?: Record<string, unknown> }
): Promise<Memory> {
  const { data, error } = await supabase.from('memories').insert({ user_id: userId, ...payload }).select().single();
  if (error) throw error;
  return mapMemory(data);
}

export async function updateMemory(
  supabase: SupabaseClient, id: string, userId: string,
  payload: Partial<{ title: string; content: string; category: MemoryCategory; tags: string[]; pinned: boolean; metadata: Record<string, unknown> }>
): Promise<Memory> {
  const { data, error } = await supabase.from('memories').update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', userId).select().single();
  if (error) throw error;
  return mapMemory(data);
}

export async function deleteMemory(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const { error } = await supabase.from('memories').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function searchMemories(supabase: SupabaseClient, userId: string, query: string): Promise<Memory[]> {
  const { data } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', userId)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order('updated_at', { ascending: false })
    .limit(30);
  return (data ?? []).map(mapMemory);
}

// ── GOALS ────────────────────────────────────────────────────────────────────

export async function getGoals(
  supabase: SupabaseClient, userId: string,
  opts: { type?: GoalType; status?: GoalStatus } = {}
): Promise<MemoryGoal[]> {
  let q = supabase.from('memory_goals').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (opts.type) q = q.eq('type', opts.type);
  if (opts.status) q = q.eq('status', opts.status);
  const { data } = await q;
  return (data ?? []).map(mapMemoryGoal);
}

export async function getGoal(supabase: SupabaseClient, id: string, userId: string): Promise<MemoryGoal | null> {
  const { data } = await supabase.from('memory_goals').select('*').eq('id', id).eq('user_id', userId).single();
  return data ? mapMemoryGoal(data) : null;
}

export async function createGoal(
  supabase: SupabaseClient, userId: string,
  payload: { title: string; description?: string; type: GoalType; due_date?: string; progress?: number; metadata?: Record<string, unknown> }
): Promise<MemoryGoal> {
  const { data, error } = await supabase.from('memory_goals').insert({ user_id: userId, status: 'active', ...payload }).select().single();
  if (error) throw error;
  return mapMemoryGoal(data);
}

export async function updateGoal(
  supabase: SupabaseClient, id: string, userId: string,
  payload: Partial<{ title: string; description: string; type: GoalType; status: GoalStatus; progress: number; due_date: string; completed_at: string; metadata: Record<string, unknown> }>
): Promise<MemoryGoal> {
  const { data, error } = await supabase.from('memory_goals')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', userId).select().single();
  if (error) throw error;
  return mapMemoryGoal(data);
}

export async function deleteGoal(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const { error } = await supabase.from('memory_goals').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

// ── PROJECTS ─────────────────────────────────────────────────────────────────

export async function getProjects(
  supabase: SupabaseClient, userId: string,
  opts: { status?: ProjectStatus } = {}
): Promise<MemoryProject[]> {
  let q = supabase.from('memory_projects').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (opts.status) q = q.eq('status', opts.status);
  const { data } = await q;
  return (data ?? []).map(mapMemoryProject);
}

export async function getProject(supabase: SupabaseClient, id: string, userId: string): Promise<MemoryProject | null> {
  const { data } = await supabase.from('memory_projects').select('*').eq('id', id).eq('user_id', userId).single();
  return data ? mapMemoryProject(data) : null;
}

export async function createProject(
  supabase: SupabaseClient, userId: string,
  payload: { name: string; description?: string; status?: ProjectStatus; tags?: string[]; start_date?: string; end_date?: string; milestones?: ProjectMilestone[]; deliverables?: ProjectDeliverable[]; metadata?: Record<string, unknown> }
): Promise<MemoryProject> {
  const { data, error } = await supabase.from('memory_projects').insert({ user_id: userId, status: 'active', milestones: [], deliverables: [], tags: [], ...payload }).select().single();
  if (error) throw error;
  return mapMemoryProject(data);
}

export async function updateProject(
  supabase: SupabaseClient, id: string, userId: string,
  payload: Partial<{ name: string; description: string; status: ProjectStatus; milestones: ProjectMilestone[]; deliverables: ProjectDeliverable[]; tags: string[]; start_date: string; end_date: string; metadata: Record<string, unknown> }>
): Promise<MemoryProject> {
  const { data, error } = await supabase.from('memory_projects')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', userId).select().single();
  if (error) throw error;
  return mapMemoryProject(data);
}

export async function deleteProject(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const { error } = await supabase.from('memory_projects').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

// ── DECISIONS ────────────────────────────────────────────────────────────────

export async function getDecisions(
  supabase: SupabaseClient, userId: string, limit = 50
): Promise<MemoryDecision[]> {
  const { data } = await supabase.from('memory_decisions').select('*').eq('user_id', userId)
    .order('decided_at', { ascending: false }).limit(limit);
  return (data ?? []).map(mapMemoryDecision);
}

export async function getDecision(supabase: SupabaseClient, id: string, userId: string): Promise<MemoryDecision | null> {
  const { data } = await supabase.from('memory_decisions').select('*').eq('id', id).eq('user_id', userId).single();
  return data ? mapMemoryDecision(data) : null;
}

export async function createDecision(
  supabase: SupabaseClient, userId: string,
  payload: { title: string; what: string; why?: string; impact?: DecisionImpact; related_project_ids?: string[]; tags?: string[]; decided_at?: string }
): Promise<MemoryDecision> {
  const { data, error } = await supabase.from('memory_decisions')
    .insert({ user_id: userId, impact: 'medium', tags: [], related_project_ids: [], ...payload }).select().single();
  if (error) throw error;
  return mapMemoryDecision(data);
}

export async function updateDecision(
  supabase: SupabaseClient, id: string, userId: string,
  payload: Partial<{ title: string; what: string; why: string; impact: DecisionImpact; related_project_ids: string[]; tags: string[]; decided_at: string }>
): Promise<MemoryDecision> {
  const { data, error } = await supabase.from('memory_decisions')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', userId).select().single();
  if (error) throw error;
  return mapMemoryDecision(data);
}

export async function deleteDecision(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const { error } = await supabase.from('memory_decisions').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

// ── RELATIONSHIPS ────────────────────────────────────────────────────────────

export async function getRelationships(
  supabase: SupabaseClient, userId: string,
  opts: { type?: RelationshipType } = {}
): Promise<MemoryRelationship[]> {
  let q = supabase.from('memory_relationships').select('*').eq('user_id', userId).order('name');
  if (opts.type) q = q.eq('type', opts.type);
  const { data } = await q;
  return (data ?? []).map(mapMemoryRelationship);
}

export async function getRelationship(supabase: SupabaseClient, id: string, userId: string): Promise<MemoryRelationship | null> {
  const { data } = await supabase.from('memory_relationships').select('*').eq('id', id).eq('user_id', userId).single();
  return data ? mapMemoryRelationship(data) : null;
}

export async function createRelationship(
  supabase: SupabaseClient, userId: string,
  payload: { name: string; type: RelationshipType; role?: string; company?: string; email?: string; notes?: string; tags?: string[]; last_interaction?: string; metadata?: Record<string, unknown> }
): Promise<MemoryRelationship> {
  const { data, error } = await supabase.from('memory_relationships')
    .insert({ user_id: userId, tags: [], ...payload }).select().single();
  if (error) throw error;
  return mapMemoryRelationship(data);
}

export async function updateRelationship(
  supabase: SupabaseClient, id: string, userId: string,
  payload: Partial<{ name: string; type: RelationshipType; role: string; company: string; email: string; notes: string; tags: string[]; last_interaction: string; metadata: Record<string, unknown> }>
): Promise<MemoryRelationship> {
  const { data, error } = await supabase.from('memory_relationships')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', userId).select().single();
  if (error) throw error;
  return mapMemoryRelationship(data);
}

export async function deleteRelationship(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const { error } = await supabase.from('memory_relationships').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

// ── TIMELINE ─────────────────────────────────────────────────────────────────

export async function getTimeline(
  supabase: SupabaseClient, userId: string, limit = 50
): Promise<MemoryTimelineEvent[]> {
  const { data } = await supabase.from('memory_timeline').select('*').eq('user_id', userId)
    .order('event_date', { ascending: false }).limit(limit);
  return (data ?? []).map(mapMemoryTimelineEvent);
}

export async function createTimelineEvent(
  supabase: SupabaseClient, userId: string,
  payload: { title: string; type: TimelineEventType; description?: string; event_date?: string; related_ids?: string[]; metadata?: Record<string, unknown> }
): Promise<MemoryTimelineEvent> {
  const { data, error } = await supabase.from('memory_timeline')
    .insert({ user_id: userId, related_ids: [], ...payload }).select().single();
  if (error) throw error;
  return mapMemoryTimelineEvent(data);
}

export async function deleteTimelineEvent(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const { error } = await supabase.from('memory_timeline').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

// ── CONTEXT ASSEMBLY ─────────────────────────────────────────────────────────

function scoreMemory(m: Memory): number {
  let score = 0;
  if (m.pinned) score += 10;
  const ageHours = (Date.now() - new Date(m.updatedAt).getTime()) / 3600000;
  score += Math.max(0, 5 - Math.floor(ageHours / 24));
  if (m.tags.length > 0) score += 2;
  if (m.category === 'sop' || m.category === 'knowledge') score += 3;
  return score;
}

export async function assembleMemoryContext(supabase: SupabaseClient, userId: string): Promise<string> {
  const [profile, goals, projects, decisions, allMemories, recentActivity] = await Promise.all([
    getMemoryProfile(supabase, userId),
    getGoals(supabase, userId, { status: 'active' }),
    getProjects(supabase, userId, { status: 'active' }),
    getDecisions(supabase, userId, 10),
    getMemories(supabase, userId, { limit: 30 }),
    supabase.from('executions')
      .select('workflow_name, status, start_time, output_summary')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      .limit(5)
      .then(r => r.data ?? []),
  ]);

  const rankedMemories = allMemories
    .sort((a, b) => scoreMemory(b) - scoreMemory(a))
    .slice(0, 8);

  const lines: string[] = ['── NYX OPERATOR MEMORY CONTEXT ──'];

  if (profile?.name || profile?.company || profile?.role) {
    lines.push(`\nOperator: ${[profile.name, profile.role, profile.company].filter(Boolean).join(' · ')}`);
    if (profile.communicationStyle) lines.push(`Communication style: ${profile.communicationStyle}`);
  }

  const criticalGoals = goals.filter(g => g.type === 'daily' || g.type === 'weekly');
  const longTermGoals = goals.filter(g => g.type === 'quarterly' || g.type === 'longterm');

  if (criticalGoals.length > 0) {
    lines.push('\nImmediate Goals (daily/weekly):');
    criticalGoals.slice(0, 5).forEach(g => lines.push(`  [${g.type.toUpperCase()}] ${g.title} — ${g.progress}% complete`));
  }

  if (longTermGoals.length > 0) {
    lines.push('\nStrategic Goals:');
    longTermGoals.slice(0, 3).forEach(g => lines.push(`  [${g.type.toUpperCase()}] ${g.title} — ${g.progress}% complete`));
  }

  if (projects.length > 0) {
    lines.push('\nActive Projects:');
    projects.slice(0, 6).forEach(p => lines.push(`  [${p.status.toUpperCase()}] ${p.name}${p.description ? ` — ${p.description.slice(0, 80)}` : ''}`));
  }

  if (decisions.length > 0) {
    const criticalDecisions = decisions.filter(d => d.impact === 'critical' || d.impact === 'high');
    const otherDecisions = decisions.filter(d => d.impact !== 'critical' && d.impact !== 'high');
    lines.push('\nRecent Decisions:');
    [...criticalDecisions.slice(0, 3), ...otherDecisions.slice(0, 2)].forEach(d =>
      lines.push(`  [${d.impact.toUpperCase()}] ${d.title}: ${d.what.slice(0, 100)}`));
  }

  if (rankedMemories.length > 0) {
    lines.push('\nRelevant Knowledge:');
    rankedMemories.forEach(m => lines.push(`  [${m.category.toUpperCase()}${m.pinned ? ' ★' : ''}] ${m.title}: ${m.content.slice(0, 120)}`));
  }

  if (recentActivity.length > 0) {
    lines.push('\nRecent Activity:');
    recentActivity.forEach((e: { workflow_name: string; status: string; start_time: string; output_summary: string | null }) => {
      const when = new Date(e.start_time).toLocaleDateString();
      const summary = e.output_summary ? ` — ${e.output_summary.slice(0, 80)}` : '';
      lines.push(`  [${e.status.toUpperCase()}] ${e.workflow_name} (${when})${summary}`);
    });
  }

  return lines.join('\n');
}
