import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getConversations, createConversation } from '@/lib/db/voice';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const conversations = await getConversations(supabase, user.id);
  return NextResponse.json(conversations);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const conv = await createConversation(supabase, user.id, body);
  return NextResponse.json(conv, { status: 201 });
}
