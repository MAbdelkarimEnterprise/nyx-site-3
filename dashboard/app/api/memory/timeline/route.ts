import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTimeline, createTimelineEvent, deleteTimelineEvent } from '@/lib/db/memory';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const events = await getTimeline(supabase, user.id);
  return NextResponse.json(events);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const event = await createTimelineEvent(supabase, user.id, body);
  return NextResponse.json(event, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await request.json();
  await deleteTimelineEvent(supabase, id, user.id);
  return NextResponse.json({ ok: true });
}
