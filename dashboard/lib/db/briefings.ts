import type { SupabaseClient } from '@supabase/supabase-js';
import { type DbBriefing, type Briefing, mapBriefing } from '@/lib/types';

export async function getBriefings(supabase: SupabaseClient, userId: string): Promise<(Briefing & { id: string })[]> {
  const { data, error } = await supabase
    .from('briefings')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data as DbBriefing[]).map(mapBriefing);
}

export async function getBriefing(
  supabase: SupabaseClient,
  id: string,
  userId: string
): Promise<(Briefing & { id: string }) | null> {
  const { data, error } = await supabase
    .from('briefings')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return mapBriefing(data as DbBriefing);
}

export async function getLatestBriefing(
  supabase: SupabaseClient,
  userId: string
): Promise<(Briefing & { id: string }) | null> {
  const { data, error } = await supabase
    .from('briefings')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return mapBriefing(data as DbBriefing);
}

export async function createBriefing(
  supabase: SupabaseClient,
  userId: string,
  payload: Partial<DbBriefing>
): Promise<Briefing & { id: string }> {
  const { data, error } = await supabase
    .from('briefings')
    .insert({ ...payload, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return mapBriefing(data as DbBriefing);
}
