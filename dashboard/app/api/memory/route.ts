import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMemories, searchMemories, createMemory } from '@/lib/db/memory';
import type { MemoryCategory } from '@/lib/types';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const category = searchParams.get('category') as MemoryCategory | null;
  const pinned = searchParams.get('pinned');

  if (q) {
    const results = await searchMemories(supabase, user.id, q);
    return NextResponse.json(results);
  }

  const memories = await getMemories(supabase, user.id, {
    category: category ?? undefined,
    pinned: pinned === 'true' ? true : pinned === 'false' ? false : undefined,
  });
  return NextResponse.json(memories);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const memory = await createMemory(supabase, user.id, {
    category: body.category ?? 'note',
    title: body.title,
    content: body.content,
    tags: body.tags ?? [],
    pinned: body.pinned ?? false,
    metadata: body.metadata ?? {},
  });
  return NextResponse.json(memory, { status: 201 });
}
