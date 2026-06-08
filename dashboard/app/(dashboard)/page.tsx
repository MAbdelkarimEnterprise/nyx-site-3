'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface AgentRow {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'idle' | 'busy' | 'offline';
  current_task: string | null;
  last_active: string | null;
}

interface ExecutionRow {
  id: string;
  workflow_name: string;
  status: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  tokens_used: number;
}

interface WaitlistEntry {
  id: string;
  email: string;
  created_at: string;
}

function formatRelative(iso: string | null) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDur(secs: number | null) {
  if (!secs) return '—';
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

const STATUS_COLOR: Record<string, string> = {
  active:    'var(--green, #4caf50)',
  busy:      'var(--gold)',
  idle:      'var(--t3)',
  offline:   'var(--t4)',
  completed: 'var(--green, #4caf50)',
  failed:    '#e57373',
  running:   'var(--gold)',
};

function StatusDot({ status }: { status: string }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 5,
      height: 5,
      borderRadius: '50%',
      background: STATUS_COLOR[status] ?? 'var(--t3)',
      flexShrink: 0,
    }} />
  );
}

export default function OverviewPage() {
  const [agents,     setAgents]     = useState<AgentRow[]>([]);
  const [executions, setExecutions] = useState<ExecutionRow[]>([]);
  const [waitlist,   setWaitlist]   = useState<WaitlistEntry[]>([]);
  const [metrics,    setMetrics]    = useState({ agents: 0, workflows: 0, execs: 0, waitlistCount: 0 });
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async () => {
    try {
      const [agentsRes, execsRes, waitlistRes, controlRes] = await Promise.allSettled([
        fetch('/api/agents').then(r => r.ok ? r.json() : []),
        fetch('/api/executions?limit=8').then(r => r.ok ? r.json() : []),
        fetch('/api/admin/waitlist?limit=10').then(r => r.ok ? r.json() : { entries: [] }),
        fetch('/api/control').then(r => r.ok ? r.json() : {}),
      ]);

      if (agentsRes.status === 'fulfilled') setAgents(agentsRes.value ?? []);
      if (execsRes.status === 'fulfilled')  setExecutions(execsRes.value ?? []);
      if (waitlistRes.status === 'fulfilled') setWaitlist(waitlistRes.value?.entries ?? []);
      if (controlRes.status === 'fulfilled') {
        const d = controlRes.value as Record<string, number>;
        setMetrics({
          agents:        d.agentCount        ?? 0,
          workflows:     d.workflowCount     ?? 0,
          execs:         d.totalExecutions   ?? 0,
          waitlistCount: waitlistRes.status === 'fulfilled' ? (waitlistRes.value?.total ?? 0) : 0,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeAgents = agents.filter(a => a.status === 'active' || a.status === 'busy').length;

  return (
    <div className="page-root" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--t4)', textTransform: 'uppercase', marginBottom: 6 }}>
            NYX — OVERVIEW
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 300, color: 'var(--t1)', letterSpacing: '-0.01em' }}>
            Command Center
          </h1>
        </div>
        <Link href="/jarvis" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: '1px solid rgba(196,169,124,0.3)', color: 'var(--gold)',
          fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.22em',
          textTransform: 'uppercase', padding: '9px 16px', textDecoration: 'none',
          transition: 'background .2s, border-color .2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,169,124,0.07)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)', animation: 'statusPulse 2s infinite' }} />
          Activate Jarvis
        </Link>
      </div>

      {/* Metric strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'rgba(196,169,124,0.08)' }}>
        {[
          { label: 'Agents Online',   value: loading ? '—' : `${activeAgents}/${metrics.agents}`, sub: 'of 6 active' },
          { label: 'Workflows',        value: loading ? '—' : metrics.workflows, sub: 'configured' },
          { label: 'Executions',       value: loading ? '—' : metrics.execs, sub: 'all time' },
          { label: 'Waitlist',         value: loading ? '—' : metrics.waitlistCount, sub: 'signups' },
        ].map((m) => (
          <div key={m.label} style={{ background: 'var(--bg, #000)', padding: '20px 20px 16px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.2em', color: 'var(--t4)', textTransform: 'uppercase', marginBottom: 8 }}>{m.label}</div>
            <div style={{ fontSize: 28, fontWeight: 300, color: 'var(--t1)', letterSpacing: '-0.02em', lineHeight: 1 }}>{m.value}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t4)', marginTop: 5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Two columns: Jarvis launcher + Agent status */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 1, background: 'rgba(196,169,124,0.08)' }}>
        {/* Jarvis launcher card */}
        <div style={{ background: 'var(--bg, #000)', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.22em', color: 'var(--t4)', textTransform: 'uppercase', alignSelf: 'flex-start' }}>Voice OS</div>
          <svg viewBox="0 0 160 160" fill="none" style={{ width: 130, height: 130 }} aria-hidden="true">
            <circle cx="80" cy="80" r="72" stroke="#C4A97C" strokeWidth="0.4" opacity="0.1"/>
            <circle cx="80" cy="80" r="56" stroke="#C4A97C" strokeWidth="0.7" opacity="0.2" strokeDasharray="2 8"/>
            <circle cx="80" cy="80" r="38" stroke="#C4A97C" strokeWidth="1.2" opacity="0.4"/>
            <circle cx="80" cy="80" r="20" stroke="#C4A97C" strokeWidth="1.5" opacity="0.6"/>
            <circle cx="80" cy="80" r="6"  fill="#C4A97C" opacity="0.9"/>
            <line x1="80" y1="8"  x2="80" y2="22"  stroke="#C4A97C" strokeWidth="0.6" opacity="0.3"/>
            <line x1="80" y1="138" x2="80" y2="152" stroke="#C4A97C" strokeWidth="0.6" opacity="0.3"/>
            <line x1="8"  y1="80" x2="22"  y2="80" stroke="#C4A97C" strokeWidth="0.6" opacity="0.3"/>
            <line x1="138" y1="80" x2="152" y2="80" stroke="#C4A97C" strokeWidth="0.6" opacity="0.3"/>
          </svg>
          <Link href="/jarvis" style={{
            fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: 'var(--gold)',
            border: '1px solid rgba(196,169,124,0.25)', padding: '8px 16px',
            textDecoration: 'none', display: 'block', textAlign: 'center', width: '100%',
            transition: 'background .2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,169,124,0.07)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Open Jarvis HUD
          </Link>
          <Link href="/voice" style={{
            fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: 'var(--t3)',
            textDecoration: 'none', textAlign: 'center',
          }}>
            Voice Log →
          </Link>
        </div>

        {/* Agent status panel */}
        <div style={{ background: 'var(--bg, #000)', padding: '24px 22px' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.22em', color: 'var(--t4)', textTransform: 'uppercase', marginBottom: 14 }}>Agent Status</div>
          {loading ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '0.1em' }}>Loading…</div>
          ) : agents.length === 0 ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '0.1em' }}>No agents found. Create agents in the Agents panel.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(196,169,124,0.06)' }}>
              {agents.map(a => (
                <div key={a.id} style={{
                  display: 'grid', gridTemplateColumns: '130px 80px 1fr auto',
                  alignItems: 'center', gap: 16,
                  background: 'var(--bg, #000)', padding: '11px 14px',
                }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t1)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <StatusDot status={a.status} />
                    {a.name}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: a.status === 'offline' ? 'var(--t4)' : a.status === 'busy' ? 'var(--gold)' : 'var(--t3)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                    {a.status}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t3)', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.current_task || '—'}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--t4)', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                    {formatRelative(a.last_active)}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 14 }}>
            <Link href="/agents" style={{ fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--t3)', textDecoration: 'none' }}>
              Manage Agents →
            </Link>
            <Link href="/control" style={{ fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--t3)', textDecoration: 'none' }}>
              Control Center →
            </Link>
          </div>
        </div>
      </div>

      {/* Command history */}
      <div style={{ background: 'var(--bg, #000)', border: '1px solid rgba(196,169,124,0.08)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(196,169,124,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.22em', color: 'var(--t4)', textTransform: 'uppercase' }}>Command History</div>
          <Link href="/executions" style={{ fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--t3)', textDecoration: 'none' }}>
            All Executions →
          </Link>
        </div>
        {loading ? (
          <div style={{ padding: '20px', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '0.1em' }}>Loading…</div>
        ) : executions.length === 0 ? (
          <div style={{ padding: '20px', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '0.1em' }}>No executions yet. Run a workflow or trigger an agent.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(196,169,124,0.06)' }}>
                {['Workflow', 'Status', 'Duration', 'Tokens', 'Time'].map(h => (
                  <th key={h} style={{ fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: '0.18em', color: 'var(--t4)', textTransform: 'uppercase', textAlign: 'left', padding: '8px 16px', fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {executions.map(ex => (
                <tr key={ex.id} style={{ borderBottom: '1px solid rgba(196,169,124,0.04)' }}>
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t1)', letterSpacing: '0.05em' }}>{ex.workflow_name}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: STATUS_COLOR[ex.status] ?? 'var(--t3)' }}>{ex.status}</span>
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t3)', letterSpacing: '0.07em' }}>{formatDur(ex.duration)}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t3)', letterSpacing: '0.07em' }}>{ex.tokens_used ? ex.tokens_used.toLocaleString() : '—'}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t4)', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{formatRelative(ex.start_time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Waitlist signups */}
      <div style={{ background: 'var(--bg, #000)', border: '1px solid rgba(196,169,124,0.08)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(196,169,124,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.22em', color: 'var(--t4)', textTransform: 'uppercase' }}>
            Waitlist Signups
            {metrics.waitlistCount > 0 && (
              <span style={{ marginLeft: 10, color: 'var(--gold)' }}>{metrics.waitlistCount}</span>
            )}
          </div>
        </div>
        {loading ? (
          <div style={{ padding: '20px', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '0.1em' }}>Loading…</div>
        ) : waitlist.length === 0 ? (
          <div style={{ padding: '20px', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '0.1em' }}>
            No waitlist data. Ensure the <code style={{ color: 'var(--gold)', background: 'rgba(196,169,124,0.08)', padding: '1px 5px' }}>waitlist_signups</code> table exists in Supabase with columns: id, email, created_at.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(196,169,124,0.06)' }}>
                {['Email', 'Signed Up'].map(h => (
                  <th key={h} style={{ fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: '0.18em', color: 'var(--t4)', textTransform: 'uppercase', textAlign: 'left', padding: '8px 16px', fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {waitlist.map(w => (
                <tr key={w.id} style={{ borderBottom: '1px solid rgba(196,169,124,0.04)' }}>
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t1)', letterSpacing: '0.05em' }}>{w.email}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t4)', letterSpacing: '0.07em' }}>{formatRelative(w.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
