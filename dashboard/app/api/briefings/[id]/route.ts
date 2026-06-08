import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBriefing } from '@/lib/db/briefings';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const briefing = await getBriefing(supabase, params.id, user.id);
  if (!briefing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(briefing);
}
