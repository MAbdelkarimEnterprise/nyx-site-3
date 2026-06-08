import type { SupabaseClient } from '@supabase/supabase-js';

export interface Integration {
  id: string;
  user_id: string;
  provider: 'google' | 'notion';
  access_token: string;
  refresh_token: string | null;
  token_expiry: string | null;
  scope: string | null;
  account_email: string | null;
  account_name: string | null;
  metadata: Record<string, unknown>;
  connected_at: string;
  updated_at: string;
}

export interface IntegrationStatus {
  provider: 'google' | 'notion';
  connected: boolean;
  account_email: string | null;
  account_name: string | null;
  connected_at: string | null;
}

export async function getIntegrations(supabase: SupabaseClient, userId: string): Promise<Integration[]> {
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as Integration[];
}

export async function getIntegration(
  supabase: SupabaseClient,
  userId: string,
  provider: string
): Promise<Integration | null> {
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();
  if (error) return null;
  return data as Integration;
}

export async function upsertIntegration(
  supabase: SupabaseClient,
  userId: string,
  payload: Partial<Integration> & { provider: string }
): Promise<Integration> {
  const { data, error } = await supabase
    .from('integrations')
    .upsert({ ...payload, user_id: userId }, { onConflict: 'user_id,provider' })
    .select()
    .single();
  if (error) throw error;
  return data as Integration;
}

export async function deleteIntegration(
  supabase: SupabaseClient,
  userId: string,
  provider: string
): Promise<void> {
  const { error } = await supabase
    .from('integrations')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider);
  if (error) throw error;
}
