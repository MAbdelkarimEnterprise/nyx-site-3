import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getIntegration } from '@/lib/db/integrations';
import { fetchNotionPages } from '@/lib/integrations/notion';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const integration = await getIntegration(supabase, user.id, 'notion');
  if (!integration) return NextResponse.json({ error: 'not_connected' }, { status: 404 });

  try {
    const pages = await fetchNotionPages(integration.access_token);
    return NextResponse.json(pages);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
