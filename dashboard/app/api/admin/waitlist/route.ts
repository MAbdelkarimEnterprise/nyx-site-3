import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Admin allowlist. Set ADMIN_EMAILS (comma-separated) to restrict who can read
  // the full waitlist. Without it, any authenticated user could enumerate signups.
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  if (adminEmails.length > 0 && !adminEmails.includes((user.email ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200);

  // waitlist_signups is service-role-only (RLS denies anon/auth reads), so use a
  // service client here — access is already gated by auth + ADMIN_EMAILS above.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 503 });
  }
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  try {
    const { data, error, count } = await admin
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
