import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/memory/related?id=<memoryId>&limit=5
// Returns memories sharing at least one tag with the given memory
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const limit = parseInt(url.searchParams.get('limit') ?? '6', 10);

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data: source } = await supabase
    .from('memories')
    .select('tags, category')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!source) return NextResponse.json([]);

  const tags: string[] = source.tags ?? [];
  if (tags.length === 0) {
    const { data } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', source.category)
      .neq('id', id)
      .order('updated_at', { ascending: false })
      .limit(limit);
    return NextResponse.json(data ?? []);
  }

  const { data } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', user.id)
    .neq('id', id)
    .overlaps('tags', tags)
    .order('updated_at', { ascending: false })
    .limit(limit);

  return NextResponse.json(data ?? []);
}
