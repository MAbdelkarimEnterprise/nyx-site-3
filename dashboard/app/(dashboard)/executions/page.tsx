'use client';

import { useState, useEffect } from 'react';
import type { Execution } from '@/lib/types';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'running', label: 'Running' },
  { id: 'success', label: 'Success' },
  { id: 'failed', label: 'Failed' },
  { id: 'cancelled', label: 'Cancelled' },
];

function formatDuration(secs: number | null) {
  if (secs === null) return '—';
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}

function formatDate(iso: string) { return iso.split('T')[0]; }

function formatTokens(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const LOG_PREFIXES: Record<string, string> = { info: '→', success: '✓', warn: '⚠', error: '✗' };

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/executions')
      .then(r => r.json())
      .then(data => { setExecutions(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const visible = filter === 'all' ? executions : executions.filter(e => e.status === filter);
  const counts = FILTERS.reduce((acc, f) => {
    acc[f.id] = f.id === 'all' ? executions.length : executions.filter(e => e.status === f.id).length;
    return acc;
  }, {} as Record<string, number>);

  const runningCount = executions.filter(e => e.status === 'running').length;
  const successCount = executions.filter(e => e.status === 'success').length;
  const failedCount = executions.filter(e => e.status === 'failed').length;
  const totalTokens = executions.reduce((s, e) => s + e.tokensUsed, 0);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <div className="topbar-breadcrumb">
            <span>NYX</span>
            <span className="topbar-breadcrumb-sep">/</span>
            <span className="topbar-page-title">Executions</span>
          </div>
        </div>
        <div className="topbar-right">
          {runningCount > 0 && (
            <div className="topbar-status">
              <span className="sdot sdot-running" />
              <span className="topbar-status-text">{runningCount} running now</span>
            </div>
          )}
          {failedCount > 0 && (
            <div className="topbar-status" style={{ marginLeft: 8 }}>
              <span className="sdot sdot-error" />
              <span className="topbar-status-text">{failedCount} failed</span>
            </div>
          )}
        </div>
      </div>

      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Execution Log</h1>
            <p className="page-subtitle">Real-time record of all workflow runs. Inspect logs, results, and performance for every execution.</p>
          </div>
          <div className="page-header-right">
            <button className="btn btn-ghost btn-sm">Export</button>
          </div>
        </div>

        {loading ? (
          <div className="skeleton-row-group">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton-row" />)}
          </div>
        ) : (
          <>
            <div className="metrics-row">
              {[
                { label: 'Running', value: runningCount, color: '#7FD4A8' },
                { label: 'Succeeded', value: successCount, color: 'var(--green)' },
                { label: 'Failed', value: failedCount, color: 'var(--red)' },
                { label: 'Tokens Used', value: formatTokens(totalTokens), color: 'var(--t1)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="metric-card">
                  <div className="metric-card-label">{label}</div>
                  <div className="metric-card-value" style={{ color }}>{value}</div>
                </div>
              ))}
            </div>

            <div className="filter-tabs">
              {FILTERS.map(f => (
                <button key={f.id} className={`filter-tab${filter === f.id ? ' active' : ''}`} onClick={() => setFilter(f.id)}>
                  {f.label}
                  <span className="filter-tab-count">{counts[f.id]}</span>
                </button>
              ))}
            </div>

            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '18px 1fr 120px 120px 100px 80px 80px', gap: 16, padding: '10px 20px', borderBottom: '1px solid var(--line)', background: 'var(--deep)' }}>
                {['', 'Workflow', 'Triggered', 'Start Time', 'Duration', 'Tokens', 'Status'].map((h, i) => (
                  <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--t4)' }}>{h}</div>
                ))}
              </div>

              {visible.map(exec => (
                <div key={exec.id} className={`exec-row${expanded === exec.id ? ' expanded' : ''}`}>
                  <div className="exec-row-main" onClick={() => setExpanded(expanded === exec.id ? null : exec.id)}>
                    <div className={`exec-chevron${expanded === exec.id ? ' open' : ''}`} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--t1)', marginBottom: 3 }}>{exec.workflowName}</div>
                      <div className="exec-agents">
                        {exec.agentNames.map(a => <span key={a} className="exec-agent-chip">{a}</span>)}
                      </div>
                    </div>
                    <div>
                      <span className={`badge badge-${exec.triggeredBy === 'manual' ? 'manual' : exec.triggeredBy === 'webhook' ? 'webhook' : 'scheduled'}`}>
                        {exec.triggeredBy}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', letterSpacing: '0.04em' }}>
                      <div>{formatDate(exec.startTime)}</div>
                      <div style={{ color: 'var(--t4)' }}>{formatTime(exec.startTime)}</div>
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: exec.status === 'running' ? '#7FD4A8' : 'var(--t3)', letterSpacing: '0.04em' }}>
                      {exec.status === 'running' ? '● running' : formatDuration(exec.duration)}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)', letterSpacing: '0.04em' }}>
                      {formatTokens(exec.tokensUsed)}
                    </div>
                    <div>
                      <span className={`badge badge-${exec.status}`}>
                        <span className={`sdot sdot-${exec.status}`} />
                        {exec.status}
                      </span>
                    </div>
                  </div>

                  {expanded === exec.id && (
                    <div className="exec-detail">
                      {exec.outputSummary && (
                        <div className="exec-output">
                          <div className="label" style={{ marginBottom: 6 }}>Output Summary</div>
                          {exec.outputSummary}
                        </div>
                      )}
                      {exec.result && !exec.outputSummary && (
                        <div className="exec-output">
                          <div className="label" style={{ marginBottom: 6 }}>Result</div>
                          {exec.result}
                        </div>
                      )}
                      <div style={{ marginBottom: 8 }}>
                        <div className="label" style={{ marginBottom: 8 }}>Execution Log</div>
                        <div className="log-terminal">
                          {exec.logs.map(log => (
                            <div key={log.id} className="log-line">
                              <span className="log-ts">{formatTime(log.timestamp)}</span>
                              <span className={`log-prefix-${log.level}`}>{LOG_PREFIXES[log.level]}</span>
                              {log.agentName && <span className="log-agent">[{log.agentName}]</span>}
                              <span className={`log-level-${log.level} log-msg`}>{log.message}</span>
                            </div>
                          ))}
                          {exec.status === 'running' && (
                            <div className="log-line" style={{ marginTop: 4 }}>
                              <span className="log-ts">—</span>
                              <span style={{ color: '#7FD4A8', fontFamily: 'var(--mono)', fontSize: 11 }}>● Execution in progress...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {visible.length === 0 && (
                <div className="empty-state">
                  <span className="empty-state-label">
                    {executions.length === 0 ? 'No executions yet. Workflows will log runs here.' : 'No executions match this filter.'}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
