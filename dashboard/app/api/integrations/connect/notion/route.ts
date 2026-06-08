import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const state = crypto.randomUUID();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

  const params = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID!,
    response_type: 'code',
    owner: 'user',
    redirect_uri: `${appUrl}/api/integrations/callback/notion`,
    state,
  });

  const url = `https://api.notion.com/v1/oauth/authorize?${params}`;
  const response = NextResponse.redirect(url);
  response.cookies.set('oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 600 });
  return response;
}
