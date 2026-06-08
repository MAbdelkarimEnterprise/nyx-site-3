'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GmailMessage, CalendarEvent, DriveFile } from '@/lib/integrations/google';
import type { NotionPage } from '@/lib/integrations/notion';

interface IntegrationStatus {
  provider: 'google' | 'notion';
  connected: boolean;
  account_email: string | null;
  account_name: string | null;
  connected_at: string | null;
  metadata?: Record<string, unknown>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatEventTime(iso: string, isAllDay: boolean) {
  if (isAllDay) return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatFileSize(bytes: string | null) {
  if (!bytes) return '—';
  const n = parseInt(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function mimeLabel(mime: string) {
  const map: Record<string, string> = {
    'application/vnd.google-apps.document': 'Doc',
    'application/vnd.google-apps.spreadsheet': 'Sheet',
    'application/vnd.google-apps.presentation': 'Slides',
    'application/vnd.google-apps.folder': 'Folder',
    'application/vnd.google-apps.form': 'Form',
    'application/pdf': 'PDF',
  };
  return map[mime] ?? mime.split('/').pop()?.toUpperCase() ?? '—';
}

function parseSender(from: string) {
  const match = from.match(/^(.+?)\s*<(.+)>$/);
  if (match) return { name: match[1].replace(/"/g, ''), email: match[2] };
  return { name: from, email: from };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, count, loading }: { icon: string; label: string; count?: number; loading?: boolean }) {
  return (
    <div className="int-section-header">
      <div className="int-section-title">
        <span className="int-section-icon">{icon}</span>
        {label}
        {!loading && count !== undefined && (
          <span className="int-section-count">{count}</span>
        )}
      </div>
    </div>
  );
}

function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="skeleton-row-group">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row" style={{ height: 40 }} />
      ))}
    </div>
  );
}

function NotConnectedBanner({ service }: { service: string }) {
  return (
    <div className="int-not-connected">
      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--t4)' }}>
        Connect {service} to see data
      </span>
    </div>
  );
}

// ── Connection cards ──────────────────────────────────────────────────────────

function ServiceCard({
  name,
  desc,
  provider,
  connectUrl,
  status,
  onDisconnect,
  disconnecting,
}: {
  name: string;
  desc: string;
  provider: 'google' | 'notion';
  connectUrl: string;
  status: IntegrationStatus | null;
  onDisconnect: (provider: string) => void;
  disconnecting: string | null;
}) {
  const connected = !!status;
  return (
    <div className={`service-card${connected ? ' service-card-connected' : ''}`}>
      <div className="service-card-header">
        <div>
          <div className="service-card-name">{name}</div>
          <div className="service-card-desc">{desc}</div>
        </div>
        <div className={`service-status-dot${connected ? ' connected' : ''}`} />
      </div>

      {connected ? (
        <div className="service-card-body">
          <div className="service-account">
            <span className="service-account-email">{status.account_email ?? status.account_name ?? 'Connected'}</span>
            {provider === 'notion' && typeof status.metadata?.workspace_name === 'string' && (
              <span className="service-workspace">
                {status.metadata.workspace_name}
              </span>
            )}
          </div>
          {status.connected_at && (
            <div className="service-connected-at">
              Connected {formatRelTime(status.connected_at)}
            </div>
          )}
          <button
            className="service-disconnect-btn"
            onClick={() => onDisconnect(provider)}
            disabled={disconnecting === provider}
          >
            {disconnecting === provider ? '...' : 'Disconnect'}
          </button>
        </div>
      ) : (
        <div className="service-card-body">
          <div className="service-desc-detail">
            {provider === 'google'
              ? 'Read access to Gmail, Calendar, and Drive'
              : 'Read access to Pages and Databases'}
          </div>
          <a href={connectUrl} className="service-connect-btn">
            Connect →
          </a>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [statuses, setStatuses] = useState<IntegrationStatus[]>([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const [gmailMessages, setGmailMessages] = useState<GmailMessage[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [notionPages, setNotionPages] = useState<NotionPage[]>([]);

  const [gmailLoading, setGmailLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [driveLoading, setDriveLoading] = useState(false);
  const [notionLoading, setNotionLoading] = useState(false);

  const googleStatus = statuses.find(s => s.provider === 'google') ?? null;
  const notionStatus = statuses.find(s => s.provider === 'notion') ?? null;

  const loadStatus = useCallback(() => {
    fetch('/api/integrations/status')
      .then(r => r.json())
      .then(data => {
        setStatuses(Array.isArray(data) ? data : []);
        setStatusLoading(false);
      })
      .catch(() => setStatusLoading(false));
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!googleStatus) return;

    setGmailLoading(true);
    setCalendarLoading(true);
    setDriveLoading(true);

    fetch('/api/integrations/gmail')
      .then(r => r.json())
      .then(data => { setGmailMessages(Array.isArray(data) ? data : []); setGmailLoading(false); })
      .catch(() => setGmailLoading(false));

    fetch('/api/integrations/calendar')
      .then(r => r.json())
      .then(data => { setCalendarEvents(Array.isArray(data) ? data : []); setCalendarLoading(false); })
      .catch(() => setCalendarLoading(false));

    fetch('/api/integrations/drive')
      .then(r => r.json())
      .then(data => { setDriveFiles(Array.isArray(data) ? data : []); setDriveLoading(false); })
      .catch(() => setDriveLoading(false));
  }, [googleStatus?.provider]);

  useEffect(() => {
    if (!notionStatus) return;
    setNotionLoading(true);
    fetch('/api/integrations/notion')
      .then(r => r.json())
      .then(data => { setNotionPages(Array.isArray(data) ? data : []); setNotionLoading(false); })
      .catch(() => setNotionLoading(false));
  }, [notionStatus?.provider]);

  async function handleDisconnect(provider: string) {
    setDisconnecting(provider);
    await fetch(`/api/integrations/disconnect/${provider}`, { method: 'DELETE' });
    setStatuses(prev => prev.filter(s => s.provider !== provider));
    if (provider === 'google') {
      setGmailMessages([]);
      setCalendarEvents([]);
      setDriveFiles([]);
    }
    if (provider === 'notion') setNotionPages([]);
    setDisconnecting(null);
  }

  const connectedCount = statuses.length;

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <div className="topbar-breadcrumb">
            <span>NYX</span>
            <span className="topbar-breadcrumb-sep">/</span>
            <span className="topbar-page-title">Integrations</span>
          </div>
        </div>
        <div className="topbar-right">
          <div className="topbar-status">
            <span className={`sdot ${connectedCount > 0 ? 'sdot-active' : ''}`} style={{ background: connectedCount > 0 ? 'var(--green)' : 'rgba(255,255,255,0.1)' }} />
            <span className="topbar-status-text">
              {connectedCount} service{connectedCount !== 1 ? 's' : ''} connected
            </span>
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Intelligence Sources</h1>
            <p className="page-subtitle">Connect external data sources. NYX agents read from these services to operate with full context.</p>
          </div>
        </div>

        {/* Service cards */}
        <div className="service-cards-row">
          {statusLoading ? (
            <>
              <div className="service-card" style={{ minHeight: 140 }}><div className="skeleton-row" style={{ height: '100%' }} /></div>
              <div className="service-card" style={{ minHeight: 140 }}><div className="skeleton-row" style={{ height: '100%' }} /></div>
            </>
          ) : (
            <>
              <ServiceCard
                name="Google Workspace"
                desc="Gmail · Calendar · Drive"
                provider="google"
                connectUrl="/api/integrations/connect/google"
                status={googleStatus}
                onDisconnect={handleDisconnect}
                disconnecting={disconnecting}
              />
              <ServiceCard
                name="Notion"
                desc="Pages · Databases · Docs"
                provider="notion"
                connectUrl="/api/integrations/connect/notion"
                status={notionStatus}
                onDisconnect={handleDisconnect}
                disconnecting={disconnecting}
              />
            </>
          )}
        </div>

        {/* ── GMAIL ─────────────────────────────────────────────────────── */}
        <div className="int-section">
          <SectionHeader icon="◻" label="Gmail" count={gmailMessages.length} loading={gmailLoading} />
          {!googleStatus ? (
            <NotConnectedBanner service="Google" />
          ) : gmailLoading ? (
            <TableSkeleton rows={8} />
          ) : gmailMessages.length === 0 ? (
            <div className="int-empty">No messages in inbox.</div>
          ) : (
            <table className="nyx-table int-table">
              <thead>
                <tr>
                  <th style={{ width: 14 }} />
                  <th>From</th>
                  <th>Subject</th>
                  <th>Preview</th>
                  <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Received</th>
                </tr>
              </thead>
              <tbody>
                {gmailMessages.map(msg => {
                  const sender = parseSender(msg.from);
                  return (
                    <tr key={msg.id} className={msg.unread ? 'int-row-unread' : ''}>
                      <td>
                        {msg.unread && <span className="int-unread-dot" />}
                      </td>
                      <td>
                        <div style={{ fontSize: 12, color: msg.unread ? 'var(--t1)' : 'var(--t2)', fontWeight: msg.unread ? 400 : 300 }}>
                          {sender.name}
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t4)', letterSpacing: '0.04em', marginTop: 1 }}>
                          {sender.email}
                        </div>
                      </td>
                      <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 12.5, color: msg.unread ? 'var(--t1)' : 'var(--t2)', fontWeight: msg.unread ? 400 : 300 }}>
                          {msg.subject}
                        </span>
                      </td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--t3)', fontSize: 11.5 }}>
                        {msg.snippet}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                        {msg.date ? new Date(msg.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── CALENDAR ──────────────────────────────────────────────────── */}
        <div className="int-section">
          <SectionHeader icon="◈" label="Calendar" count={calendarEvents.length} loading={calendarLoading} />
          {!googleStatus ? (
            <NotConnectedBanner service="Google" />
          ) : calendarLoading ? (
            <TableSkeleton rows={6} />
          ) : calendarEvents.length === 0 ? (
            <div className="int-empty">No upcoming events.</div>
          ) : (
            <table className="nyx-table int-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>When</th>
                  <th>Location</th>
                  <th style={{ textAlign: 'right' }}>Attendees</th>
                </tr>
              </thead>
              <tbody>
                {calendarEvents.map(ev => (
                  <tr key={ev.id}>
                    <td>
                      <div style={{ fontSize: 12.5, color: 'var(--t1)', marginBottom: 2 }}>{ev.summary}</div>
                      {ev.organizer && (
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t4)', letterSpacing: '0.04em' }}>
                          {ev.organizer}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t2)', letterSpacing: '0.04em' }}>
                        {formatEventTime(ev.start, ev.isAllDay)}
                      </div>
                      {!ev.isAllDay && (
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t4)', letterSpacing: '0.04em', marginTop: 2 }}>
                          → {formatEventTime(ev.end, false)}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 11.5, color: 'var(--t3)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.location ?? '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)', letterSpacing: '0.04em' }}>
                      {ev.attendeeCount > 0 ? `${ev.attendeeCount}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── DRIVE ─────────────────────────────────────────────────────── */}
        <div className="int-section">
          <SectionHeader icon="◑" label="Google Drive" count={driveFiles.length} loading={driveLoading} />
          {!googleStatus ? (
            <NotConnectedBanner service="Google" />
          ) : driveLoading ? (
            <TableSkeleton rows={6} />
          ) : driveFiles.length === 0 ? (
            <div className="int-empty">No files found.</div>
          ) : (
            <table className="nyx-table int-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Owner</th>
                  <th style={{ textAlign: 'right' }}>Size</th>
                  <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Modified</th>
                </tr>
              </thead>
              <tbody>
                {driveFiles.map(f => (
                  <tr key={f.id}>
                    <td>
                      <a
                        href={f.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12.5, color: 'var(--t1)', textDecoration: 'none', display: 'block', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        className="int-file-link"
                      >
                        {f.name}
                      </a>
                    </td>
                    <td>
                      <span className="int-file-type">{mimeLabel(f.mimeType)}</span>
                    </td>
                    <td style={{ fontSize: 11.5, color: 'var(--t3)' }}>
                      {f.owners[0] ?? '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', letterSpacing: '0.04em' }}>
                      {formatFileSize(f.size)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                      {formatRelTime(f.modifiedTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── NOTION ────────────────────────────────────────────────────── */}
        <div className="int-section">
          <SectionHeader icon="◆" label="Notion" count={notionPages.length} loading={notionLoading} />
          {!notionStatus ? (
            <NotConnectedBanner service="Notion" />
          ) : notionLoading ? (
            <TableSkeleton rows={6} />
          ) : notionPages.length === 0 ? (
            <div className="int-empty">No pages found.</div>
          ) : (
            <table className="nyx-table int-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Last Edited</th>
                </tr>
              </thead>
              <tbody>
                {notionPages.map(p => (
                  <tr key={p.id}>
                    <td>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12.5, color: 'var(--t1)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, maxWidth: 400 }}
                        className="int-file-link"
                      >
                        {p.icon && p.icon.length <= 2 && (
                          <span style={{ fontSize: 14, flexShrink: 0 }}>{p.icon}</span>
                        )}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.title}
                        </span>
                      </a>
                    </td>
                    <td>
                      <span className="int-file-type" style={{ color: p.type === 'database' ? 'var(--blue)' : 'var(--t3)' }}>
                        {p.type === 'database' ? 'Database' : 'Page'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                      {formatRelTime(p.lastEdited)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
