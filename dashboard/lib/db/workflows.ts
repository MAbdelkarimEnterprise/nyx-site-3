import type { SupabaseClient } from '@supabase/supabase-js';
import { type DbWorkflow, type Workflow, mapWorkflow } from '@/lib/types';

export async function getWorkflows(supabase: SupabaseClient, userId: string): Promise<Workflow[]> {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as DbWorkflow[]).map(mapWorkflow);
}

export async function getWorkflow(supabase: SupabaseClient, id: string, userId: string): Promise<Workflow | null> {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return mapWorkflow(data as DbWorkflow);
}

export async function createWorkflow(
  supabase: SupabaseClient,
  userId: string,
  payload: Partial<DbWorkflow>
): Promise<Workflow> {
  const { data, error } = await supabase
    .from('workflows')
    .insert({ ...payload, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return mapWorkflow(data as DbWorkflow);
}

export async function updateWorkflow(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  payload: Partial<DbWorkflow>
): Promise<Workflow> {
  const { data, error } = await supabase
    .from('workflows')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return mapWorkflow(data as DbWorkflow);
}

export async function deleteWorkflow(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('workflows')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}
