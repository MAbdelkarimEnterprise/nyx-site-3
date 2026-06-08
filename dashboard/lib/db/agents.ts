import type { SupabaseClient } from '@supabase/supabase-js';
import { type DbAgent, type Agent, mapAgent } from '@/lib/types';

export async function getAgents(supabase: SupabaseClient, userId: string): Promise<Agent[]> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as DbAgent[]).map(mapAgent);
}

export async function getAgent(supabase: SupabaseClient, id: string, userId: string): Promise<Agent | null> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return mapAgent(data as DbAgent);
}

export async function createAgent(
  supabase: SupabaseClient,
  userId: string,
  payload: Partial<DbAgent>
): Promise<Agent> {
  const { data, error } = await supabase
    .from('agents')
    .insert({ ...payload, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return mapAgent(data as DbAgent);
}

export async function updateAgent(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  payload: Partial<DbAgent>
): Promise<Agent> {
  const { data, error } = await supabase
    .from('agents')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return mapAgent(data as DbAgent);
}

export async function deleteAgent(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}
