import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidGoogleToken, fetchCalendarEvents } from '@/lib/integrations/google';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const token = await getValidGoogleToken(supabase, user.id);
    const events = await fetchCalendarEvents(token);
    return NextResponse.json(events);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.includes('not connected')) {
      return NextResponse.json({ error: 'not_connected' }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
