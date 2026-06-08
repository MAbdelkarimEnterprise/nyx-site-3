import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { upsertIntegration } from '@/lib/db/integrations';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

  if (error) {
    return NextResponse.redirect(`${appUrl}/integrations?error=notion_denied`);
  }

  const storedState = request.cookies.get('oauth_state')?.value;
  if (!state || state !== storedState) {
    return NextResponse.redirect(`${appUrl}/integrations?error=state_mismatch`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/integrations?error=no_code`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  const credentials = Buffer.from(
    `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
  ).toString('base64');

  const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${appUrl}/api/integrations/callback/notion`,
    }),
  });
  const tokens = await tokenRes.json();

  if (tokens.error || !tokens.access_token) {
    return NextResponse.redirect(`${appUrl}/integrations?error=notion_token_failed`);
  }

  const ownerEmail = tokens.owner?.user?.person?.email ?? null;
  const ownerName = tokens.owner?.user?.name ?? null;

  await upsertIntegration(supabase, user.id, {
    provider: 'notion',
    access_token: tokens.access_token,
    refresh_token: null,
    token_expiry: null,
    scope: null,
    account_email: ownerEmail,
    account_name: ownerName,
    metadata: {
      workspace_name: tokens.workspace_name ?? null,
      workspace_id: tokens.workspace_id ?? null,
      bot_id: tokens.bot_id ?? null,
    },
  });

  const response = NextResponse.redirect(`${appUrl}/integrations?connected=notion`);
  response.cookies.delete('oauth_state');
  return response;
}
