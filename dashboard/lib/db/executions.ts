import type { SupabaseClient } from '@supabase/supabase-js';
import { type DbExecution, type Execution, mapExecution } from '@/lib/types';

export async function getExecutions(supabase: SupabaseClient, userId: string): Promise<Execution[]> {
  const { data, error } = await supabase
    .from('executions')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false });

  if (error) throw error;
  return (data as DbExecution[]).map(mapExecution);
}

export async function getExecution(supabase: SupabaseClient, id: string, userId: string): Promise<Execution | null> {
  const { data, error } = await supabase
    .from('executions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return mapExecution(data as DbExecution);
}

export async function createExecution(
  supabase: SupabaseClient,
  userId: string,
  payload: Partial<DbExecution>
): Promise<Execution> {
  const { data, error } = await supabase
    .from('executions')
    .insert({ ...payload, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return mapExecution(data as DbExecution);
}

export async function updateExecution(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  payload: Partial<DbExecution>
): Promise<Execution> {
  const { data, error } = await supabase
    .from('executions')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return mapExecution(data as DbExecution);
}
