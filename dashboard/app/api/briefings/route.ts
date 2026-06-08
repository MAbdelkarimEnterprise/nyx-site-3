import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBriefings, createBriefing, getLatestBriefing } from '@/lib/db/briefings';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const latest = searchParams.get('latest');

  try {
    if (latest) {
      const briefing = await getLatestBriefing(supabase, user.id);
      return NextResponse.json(briefing);
    }
    const briefings = await getBriefings(supabase, user.id);
    return NextResponse.json(briefings);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  try {
    const briefing = await createBriefing(supabase, user.id, body);
    return NextResponse.json(briefing, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
