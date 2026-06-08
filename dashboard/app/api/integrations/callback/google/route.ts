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
    return NextResponse.redirect(`${appUrl}/integrations?error=google_denied`);
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

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${appUrl}/api/integrations/callback/google`,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = await tokenRes.json();

  if (tokens.error) {
    return NextResponse.redirect(`${appUrl}/integrations?error=token_exchange_failed`);
  }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await profileRes.json();

  await upsertIntegration(supabase, user.id, {
    provider: 'google',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    token_expiry: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null,
    scope: tokens.scope ?? null,
    account_email: profile.email ?? null,
    account_name: profile.name ?? null,
  });

  const response = NextResponse.redirect(`${appUrl}/integrations?connected=google`);
  response.cookies.delete('oauth_state');
  return response;
}
