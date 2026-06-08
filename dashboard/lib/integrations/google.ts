import type { SupabaseClient } from '@supabase/supabase-js';
import { getIntegration, upsertIntegration } from '@/lib/db/integrations';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3';
const DRIVE_BASE = 'https://www.googleapis.com/drive/v3';

export async function getValidGoogleToken(supabase: SupabaseClient, userId: string): Promise<string> {
  const integration = await getIntegration(supabase, userId, 'google');
  if (!integration) throw new Error('Google not connected');

  const expiry = integration.token_expiry ? new Date(integration.token_expiry).getTime() : 0;
  const needsRefresh = expiry - Date.now() < 5 * 60 * 1000;

  if (needsRefresh && integration.refresh_token) {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: integration.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    const tokens = await res.json();
    if (tokens.error) throw new Error(`Token refresh failed: ${tokens.error}`);

    await upsertIntegration(supabase, userId, {
      provider: 'google',
      access_token: tokens.access_token,
      token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    });
    return tokens.access_token as string;
  }

  return integration.access_token;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  unread: boolean;
}

export async function fetchGmailMessages(accessToken: string, maxResults = 15): Promise<GmailMessage[]> {
  const listRes = await fetch(
    `${GMAIL_BASE}/messages?maxResults=${maxResults}&q=in:inbox`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const listData = await listRes.json();
  if (!listData.messages) return [];

  const messages = await Promise.all(
    listData.messages.map(async (m: { id: string; threadId: string }) => {
      const msgRes = await fetch(
        `${GMAIL_BASE}/messages/${m.id}?format=metadata&metadataHeaders=Subject,From,Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const msg = await msgRes.json();
      const headers: { name: string; value: string }[] = msg.payload?.headers ?? [];
      const get = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
      const labelIds: string[] = msg.labelIds ?? [];
      return {
        id: m.id,
        threadId: m.threadId,
        subject: get('Subject') || '(no subject)',
        from: get('From'),
        date: get('Date'),
        snippet: msg.snippet ?? '',
        unread: labelIds.includes('UNREAD'),
      };
    })
  );
  return messages;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location: string | null;
  description: string | null;
  isAllDay: boolean;
  organizer: string | null;
  attendeeCount: number;
  htmlLink: string;
}

export async function fetchCalendarEvents(accessToken: string, maxResults = 15): Promise<CalendarEvent[]> {
  const now = new Date().toISOString();
  const res = await fetch(
    `${CALENDAR_BASE}/calendars/primary/events?maxResults=${maxResults}&orderBy=startTime&singleEvents=true&timeMin=${encodeURIComponent(now)}&fields=items(id,summary,start,end,location,description,organizer,attendees,htmlLink)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  return (data.items ?? []).map((e: Record<string, unknown>) => {
    const start = e.start as Record<string, string>;
    const end = e.end as Record<string, string>;
    const organizer = e.organizer as Record<string, string> | null;
    const attendees = e.attendees as unknown[] | null;
    return {
      id: e.id as string,
      summary: (e.summary as string) || '(no title)',
      start: start?.dateTime ?? start?.date ?? '',
      end: end?.dateTime ?? end?.date ?? '',
      location: (e.location as string | null) ?? null,
      description: (e.description as string | null) ?? null,
      isAllDay: !!start?.date && !start?.dateTime,
      organizer: organizer?.email ?? null,
      attendeeCount: attendees?.length ?? 0,
      htmlLink: (e.htmlLink as string) ?? '',
    };
  });
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size: string | null;
  owners: string[];
  webViewLink: string;
  iconLink: string | null;
}

export async function fetchDriveFiles(accessToken: string, pageSize = 15): Promise<DriveFile[]> {
  const fields = 'files(id,name,mimeType,modifiedTime,size,owners,webViewLink,iconLink)';
  const res = await fetch(
    `${DRIVE_BASE}/files?pageSize=${pageSize}&orderBy=modifiedTime+desc&fields=${encodeURIComponent(fields)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  return (data.files ?? []).map((f: Record<string, unknown>) => ({
    id: f.id as string,
    name: f.name as string,
    mimeType: f.mimeType as string,
    modifiedTime: f.modifiedTime as string,
    size: (f.size as string | null) ?? null,
    owners: ((f.owners as { displayName: string }[]) ?? []).map(o => o.displayName),
    webViewLink: (f.webViewLink as string) ?? '',
    iconLink: (f.iconLink as string | null) ?? null,
  }));
}

export function mimeTypeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    'application/vnd.google-apps.document': 'Doc',
    'application/vnd.google-apps.spreadsheet': 'Sheet',
    'application/vnd.google-apps.presentation': 'Slides',
    'application/vnd.google-apps.folder': 'Folder',
    'application/vnd.google-apps.form': 'Form',
    'application/pdf': 'PDF',
    'image/jpeg': 'Image',
    'image/png': 'Image',
    'video/mp4': 'Video',
    'text/plain': 'Text',
  };
  return map[mimeType] ?? mimeType.split('/').pop()?.toUpperCase() ?? 'File';
}
