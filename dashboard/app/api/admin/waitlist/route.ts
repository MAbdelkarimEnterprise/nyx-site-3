import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200);

  try {
    const { data, error, count } = await supabase
      .from('waitlist_signups')
      .select('id, email, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // table may not exist yet — return empty rather than crashing
      if (error.code === '42P01') {
        return NextResponse.json({ entries: [], total: 0, tableExists: false });
      }
      throw error;
    }

    return NextResponse.json({ entries: data ?? [], total: count ?? 0, tableExists: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
