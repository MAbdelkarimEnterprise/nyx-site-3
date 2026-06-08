import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getConversation, getConversationTurns, deleteConversation } from '@/lib/db/voice';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [conversation, turns] = await Promise.all([
    getConversation(supabase, params.id, user.id),
    getConversationTurns(supabase, params.id, user.id),
  ]);
  if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ conversation, turns });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await deleteConversation(supabase, params.id, user.id);
  return NextResponse.json({ ok: true });
}
