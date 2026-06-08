import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteIntegration } from '@/lib/db/integrations';

export async function DELETE(_req: Request, { params }: { params: { provider: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await deleteIntegration(supabase, user.id, params.provider);
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
