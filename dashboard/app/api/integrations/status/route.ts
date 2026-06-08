import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getIntegrations } from '@/lib/db/integrations';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const integrations = await getIntegrations(supabase, user.id);
    const status = integrations.map(i => ({
      provider: i.provider,
      connected: true,
      account_email: i.account_email,
      account_name: i.account_name,
      connected_at: i.connected_at,
      metadata: i.metadata,
    }));
    return NextResponse.json(status);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
