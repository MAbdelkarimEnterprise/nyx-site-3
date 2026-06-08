import type { SupabaseClient } from '@supabase/supabase-js';
import { type DbTask, type Task, mapTask } from '@/lib/types';

export async function getTasks(supabase: SupabaseClient, userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as DbTask[]).map(mapTask);
}

export async function getTask(supabase: SupabaseClient, id: string, userId: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return mapTask(data as DbTask);
}

export async function createTask(
  supabase: SupabaseClient,
  userId: string,
  payload: Partial<DbTask>
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...payload, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return mapTask(data as DbTask);
}

export async function updateTask(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  payload: Partial<DbTask>
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return mapTask(data as DbTask);
}

export async function deleteTask(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}
