import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMemoryProfile, upsertMemoryProfile } from '@/lib/db/memory';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await getMemoryProfile(supabase, user.id);
  return NextResponse.json(profile ?? {});
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const profile = await upsertMemoryProfile(supabase, user.id, body);
  return NextResponse.json(profile);
}
