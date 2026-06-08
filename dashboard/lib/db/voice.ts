import type { SupabaseClient } from '@supabase/supabase-js';
import type { VoiceConversation, VoiceTurn, DbVoiceConversation, DbVoiceTurn } from '@/lib/types';

function mapConversation(db: DbVoiceConversation): VoiceConversation {
  return {
    id: db.id, userId: db.user_id, title: db.title,
    linkedProjectId: db.linked_project_id, linkedGoalId: db.linked_goal_id,
    linkedDecisionId: db.linked_decision_id ?? null,
    turnCount: db.turn_count, summary: db.summary,
    metadata: db.metadata ?? {}, createdAt: db.created_at, updatedAt: db.updated_at,
  };
}

function mapTurn(db: DbVoiceTurn): VoiceTurn {
  return {
    id: db.id, conversationId: db.conversation_id, userId: db.user_id,
    role: db.role, text: db.text, intent: db.intent, agentRole: db.agent_role,
    tokensUsed: db.tokens_used ?? 0, durationMs: db.duration_ms,
    metadata: db.metadata ?? {}, createdAt: db.created_at,
  };
}

export async function getConversations(supabase: SupabaseClient, userId: string, limit = 30): Promise<VoiceConversation[]> {
  const { data } = await supabase
    .from('voice_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapConversation);
}

export async function getConversation(supabase: SupabaseClient, id: string, userId: string): Promise<VoiceConversation | null> {
  const { data } = await supabase.from('voice_conversations').select('*').eq('id', id).eq('user_id', userId).single();
  return data ? mapConversation(data) : null;
}

export async function getConversationTurns(supabase: SupabaseClient, conversationId: string, userId: string): Promise<VoiceTurn[]> {
  const { data } = await supabase
    .from('voice_turns')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  return (data ?? []).map(mapTurn);
}

export async function createConversation(
  supabase: SupabaseClient, userId: string,
  payload: { title?: string; linked_project_id?: string; linked_goal_id?: string; linked_decision_id?: string; metadata?: Record<string, unknown> }
): Promise<VoiceConversation> {
  const { data, error } = await supabase
    .from('voice_conversations')
    .insert({ user_id: userId, turn_count: 0, linked_decision_id: null, ...payload })
    .select().single();
  if (error) throw error;
  return mapConversation(data);
}

export async function addTurn(
  supabase: SupabaseClient, userId: string,
  payload: {
    conversationId: string; role: 'user' | 'nyx'; text: string;
    intent?: string; agentRole?: string; tokensUsed?: number; durationMs?: number;
  }
): Promise<VoiceTurn> {
  const { data, error } = await supabase
    .from('voice_turns')
    .insert({
      conversation_id: payload.conversationId, user_id: userId,
      role: payload.role, text: payload.text,
      intent: payload.intent ?? null, agent_role: payload.agentRole ?? null,
      tokens_used: payload.tokensUsed ?? 0, duration_ms: payload.durationMs ?? null,
    })
    .select().single();
  if (error) throw error;

  const { data: conv } = await supabase
    .from('voice_conversations')
    .select('turn_count')
    .eq('id', payload.conversationId)
    .single();
  await supabase
    .from('voice_conversations')
    .update({ turn_count: (conv?.turn_count ?? 0) + 1, updated_at: new Date().toISOString() })
    .eq('id', payload.conversationId);

  return mapTurn(data);
}

export async function updateConversationTitle(
  supabase: SupabaseClient, id: string, userId: string, title: string
): Promise<void> {
  await supabase.from('voice_conversations')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', userId);
}

export async function deleteConversation(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const { error } = await supabase.from('voice_conversations').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}
