'use client';

import { useState, useEffect, useRef } from 'react';
import type { Workflow, WorkflowStatus } from '@/lib/types';

const STATUS_FILTERS = ['all', 'active', 'running', 'paused', 'error'] as const;

function statusBadge(s: WorkflowStatus) {
  return <span className={`badge badge-${s}`}><span className={`sdot sdot-${s}`} />{s}</span>;
}

function triggerBadge(t: Workflow['trigger']) {
  return <span className={`badge badge-${t}`}>{t}</span>;
}

function formatDuration(secs: number) {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
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

function formatNext(iso: string | null) {
  if (!iso) return '—';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'overdue';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `in ${hrs}h`;
  return `in ${Math.floor(hrs / 24)}d`;
}

type StepState = 'pending' | 'running' | 'complete' | 'error';

interface StepProgress {
  id: string;
  label: string;
  agentRole: string;
  state: StepState;
  tokens?: number;
  duration?: number;
}

interface WorkflowRunState {
  state: 'idle' | 'running' | 'complete' | 'error';
  steps: StepProgress[];
  output: string;
  briefingId: string | null;
  errorMessage: string | null;
  executionId: string | null;
}

const STEP_CODENAMES: Record<string, string> = {
  research: 'ORACLE', marketing: 'SIGNAL', ceo: 'APEX',
  sales: 'CONVERT', developer: 'FORGE', finance: 'LEDGER',
};

function WorkflowRunPanel({ workflow, onClose, onComplete }: {
  workflow: Workflow;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [run, setRun] = useState<WorkflowRunState>({
    state: 'idle', steps: [], output: '', briefingId: null, errorMessage: null, executionId: null,
  });
  const outputRef = useRef<HTMLDivElement>(null);

  async function startRun() {
    setRun({ state: 'running', steps: [], output: '', briefingId: null, errorMessage: null, executionId: null });

    try {
      const response = await fetch(`/api/workflows/${workflow.id}/run`, { method: 'POST' });
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'step_start') {
              setRun(r => {
                const steps = [...r.steps];
                const newStep: StepProgress = {
                  id: data.stepId ?? crypto.randomUUID(),
                  label: data.label ?? 'Processing…',
                  agentRole: data.agentRole ?? '',
                  state: 'running',
                };
                const idx = steps.findIndex(s => s.id === newStep.id);
                if (idx >= 0) steps[idx] = newStep; else steps.push(newStep);
                return { ...r, steps, output: '' };
              });
            }

            if (data.type === 'token') {
              setRun(r => ({ ...r, output: r.output + (data.text ?? '') }));
              if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
            }

            if (data.type === 'step_complete') {
              setRun(r => ({
                ...r,
                steps: r.steps.map(s =>
                  s.state === 'running' ? { ...s, state: 'complete' as StepState, tokens: data.tokensUsed, duration: data.duration } : s
                ),
              }));
            }

            if (data.type === 'workflow_complete') {
              setRun(r => ({
                ...r,
                state: 'complete',
                executionId: data.executionId ?? null,
                steps: r.steps.map(s => s.state === 'running' ? { ...s, state: 'complete' as StepState } : s),
              }));
              onComplete();
            }

            if (data.type === 'briefing_created') {
              setRun(r => ({ ...r, briefingId: data.briefingId ?? null }));
            }

            if (data.type === 'error') {
              setRun(r => ({
                ...r,
                state: 'error',
                errorMessage: data.message ?? 'Unknown error',
                steps: r.steps.map(s => s.state === 'running' ? { ...s, state: 'error' as StepState } : s),
              }));
            }
          } catch {}
        }
      }
    } catch (e) {
      setRun(r => ({ ...r, state: 'error', errorMessage: `Network error: ${(e as Error).message}` }));
    }
  }

  return (
    <div className="workflow-run-panel">
      <div className="workflow-run-header">
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.22em', color: 'var(--t4)', textTransform: 'uppercase', marginBottom: 4 }}>Execute Workflow</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>{workflow.name}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {run.state === 'complete' && run.briefingId && (
            <a href="/briefings" className="btn btn-ghost btn-sm" style={{ fontSize: 8, padding: '3px 8px' }}>View Briefing →</a>
          )}
          {run.state !== 'running' && (
            <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
          )}
        </div>
      </div>

      {run.steps.length > 0 && (
        <div className="workflow-step-list">
          {run.steps.map((step, i) => (
            <div key={step.id} className={`workflow-step-item workflow-step-${step.state}`}>
              <div className="workflow-step-indicator">
                {step.state === 'complete' && <span style={{ color: 'var(--green)', fontSize: 10 }}>✓</span>}
                {step.state === 'running' && <span className="agent-running-dot" />}
                {step.state === 'error' && <span style={{ color: 'var(--red)', fontSize: 10 }}>✗</span>}
                {step.state === 'pending' && <span style={{ color: 'var(--t4)', fontSize: 8 }}>{i + 1}</span>}
              </div>
              <div className="workflow-step-content">
                <div className="workflow-step-label">{step.label}</div>
                {step.agentRole && (
                  <div className="workflow-step-agent">{STEP_CODENAMES[step.agentRole] ?? step.agentRole.toUpperCase()} Agent</div>
                )}
              </div>
              {step.state === 'complete' && step.tokens && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--t4)', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
                  {step.tokens.toLocaleString()}t · {step.duration}s
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(run.output || run.state === 'running') && (
        <div ref={outputRef} className="workflow-output-stream">
          {run.output || <span className="workflow-stream-placeholder">Waiting for agent output…</span>}
          {run.state === 'running' && <span className="agent-cursor">▋</span>}
        </div>
      )}

      {run.state === 'error' && run.errorMessage && (
        <div className="workflow-run-error">{run.errorMessage}</div>
      )}

      {run.state === 'idle' && (
        <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={startRun}>
          ▶ Execute Workflow
        </button>
      )}

      {run.state === 'complete' && (
        <div className="workflow-run-complete">
          <span style={{ color: 'var(--green)', fontSize: 12 }}>✓</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--green)', letterSpacing: '0.18em' }}>WORKFLOW COMPLETE</span>
          {run.briefingId && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t4)', marginLeft: 8 }}>· Briefing generated</span>
          )}
        </div>
      )}

      {run.state === 'error' && (
        <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          onClick={() => setRun(r => ({ ...r, state: 'idle', errorMessage: null, steps: [] }))}>
          Retry
        </button>
      )}
    </div>
  );
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<import('@/lib/types').WorkflowTemplate[]>([]);
  const [creatingTemplate, setCreatingTemplate] = useState<string | null>(null);
  const [wfActions, setWfActions] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/workflows')
      .then(r => r.json())
      .then(data => { setWorkflows(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function openTemplates() {
    if (templates.length === 0) {
      const r = await fetch('/api/workflows/templates');
      const data = await r.json();
      setTemplates(Array.isArray(data) ? data : []);
    }
    setShowTemplates(true);
  }

  async function createFromTemplate(templateId: string) {
    setCreatingTemplate(templateId);
    const r = await fetch('/api/workflows/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId }) });
    if (r.ok) {
      const wf = await r.json();
      setWorkflows(ws => [wf, ...ws]);
    }
    setCreatingTemplate(null);
    setShowTemplates(false);
  }

  async function duplicateWorkflow(id: string) {
    setWfActions(a => ({ ...a, [id]: 'duplicating' }));
    const r = await fetch(`/api/workflows/${id}/duplicate`, { method: 'POST' });
    if (r.ok) {
      const wf = await r.json();
      setWorkflows(ws => [wf, ...ws]);
    }
    setWfActions(a => { const n = { ...a }; delete n[id]; return n; });
  }

  async function pauseWorkflow(id: string) {
    setWfActions(a => ({ ...a, [id]: 'pausing' }));
    await fetch(`/api/workflows/${id}/pause`, { method: 'POST' });
    setWorkflows(ws => ws.map(w => w.id === id ? { ...w, status: 'paused' as import('@/lib/types').WorkflowStatus } : w));
    setWfActions(a => { const n = { ...a }; delete n[id]; return n; });
  }

  async function resumeWorkflow(id: string) {
    setWfActions(a => ({ ...a, [id]: 'resuming' }));
    await fetch(`/api/workflows/${id}/resume`, { method: 'POST' });
    setWorkflows(ws => ws.map(w => w.id === id ? { ...w, status: 'active' as import('@/lib/types').WorkflowStatus } : w));
    setWfActions(a => { const n = { ...a }; delete n[id]; return n; });
  }

  const visible = filter === 'all' ? workflows : workflows.filter(w => w.status === filter);
  const counts = STATUS_FILTERS.reduce((acc, f) => {
    acc[f] = f === 'all' ? workflows.length : workflows.filter(w => w.status === f).length;
    return acc;
  }, {} as Record<string, number>);

  const totalRuns = workflows.reduce((a, w) => a + w.runCount, 0);
  const activeCount = workflows.filter(w => w.status === 'active' || w.status === 'running').length;
  const avgSuccess = workflows.length
    ? Math.round(workflows.reduce((a, w) => a + w.successRate, 0) / workflows.length * 10) / 10
    : 0;
  const runningNow = workflows.filter(w => w.status === 'running').length;

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <div className="topbar-breadcrumb">
            <span>NYX</span>
            <span className="topbar-breadcrumb-sep">/</span>
            <span className="topbar-page-title">Workflows</span>
          </div>
        </div>
        <div className="topbar-right">
          <div className="topbar-status">
            <span className={`sdot ${runningNow > 0 ? 'sdot-running' : 'sdot-active'}`} />
            <span className="topbar-status-text">
              {runningNow > 0 ? `${runningNow} running` : 'Standby'}
            </span>
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Workflows</h1>
            <p className="page-subtitle">Automated intelligence pipelines. Configure triggers, assign agents, and monitor execution.</p>
          </div>
          <div className="page-header-right">
            <button className="btn btn-ghost btn-sm" onClick={openTemplates}>Templates</button>
            <button className="btn btn-primary btn-sm">+ New Workflow</button>
          </div>
        </div>

        {loading ? (
          <div className="skeleton-row-group">
            {[1,2,3,4].map(i => <div key={i} className="skeleton-row" />)}
          </div>
        ) : (
          <>
            <div className="metrics-row">
              {[
                { label: 'Total Workflows', value: workflows.length, sub: 'configured', delta: null },
                { label: 'Active', value: activeCount, sub: 'running or on-standby', delta: null },
                { label: 'Total Executions', value: totalRuns.toLocaleString(), sub: 'all time', delta: null },
                { label: 'Avg Success Rate', value: `${avgSuccess}%`, sub: 'across all workflows', delta: null },
              ].map(m => (
                <div key={m.label} className="metric-card">
                  <div className="metric-card-label">{m.label}</div>
                  <div className="metric-card-value">{m.value}</div>
                  <div className="metric-card-sub">{m.sub}</div>
                </div>
              ))}
            </div>

            <div className="filter-tabs">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f}
                  className={`filter-tab${filter === f ? ' active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className="filter-tab-count">{counts[f]}</span>
                </button>
              ))}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="nyx-table">
                <thead>
                  <tr>
                    <th>Workflow</th>
                    <th>Trigger</th>
                    <th>Status</th>
                    <th>Last Run</th>
                    <th>Next Run</th>
                    <th style={{ textAlign: 'right' }}>Runs</th>
                    <th style={{ textAlign: 'right' }}>Success</th>
                    <th style={{ textAlign: 'right' }}>Avg Duration</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map(wf => (
                    <>
                      <tr key={wf.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(selected === wf.id ? null : wf.id)}>
                        <td>
                          <div style={{ fontWeight: 400, fontSize: 13, marginBottom: 3 }}>{wf.name}</div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t4)', letterSpacing: '0.06em' }}>
                            {wf.agentIds.length} agent{wf.agentIds.length !== 1 ? 's' : ''} · {wf.tags.slice(0, 2).join(', ')}
                          </div>
                        </td>
                        <td>{triggerBadge(wf.trigger)}</td>
                        <td>{statusBadge(wf.status)}</td>
                        <td><span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t3)', letterSpacing: '0.04em' }}>{formatRelative(wf.lastRun)}</span></td>
                        <td><span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: wf.nextRun ? 'var(--t3)' : 'var(--t4)', letterSpacing: '0.04em' }}>{formatNext(wf.nextRun)}</span></td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.04em' }}>{wf.runCount.toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.04em', color: wf.successRate >= 98 ? 'var(--green)' : wf.successRate >= 90 ? 'var(--t1)' : 'var(--red)' }}>
                            {wf.successRate}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t3)', letterSpacing: '0.04em' }}>{formatDuration(wf.avgDuration)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ padding: '4px 10px' }}
                              onClick={e => { e.stopPropagation(); setActiveRun(activeRun === wf.id ? null : wf.id); }}
                            >
                              {activeRun === wf.id ? '✕' : '▶ Run'}
                            </button>
                            {wf.status === 'active' && (
                              <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}
                                onClick={e => { e.stopPropagation(); pauseWorkflow(wf.id); }}
                                disabled={!!wfActions[wf.id]}
                                title="Pause workflow"
                              >⏸</button>
                            )}
                            {wf.status === 'paused' && (
                              <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}
                                onClick={e => { e.stopPropagation(); resumeWorkflow(wf.id); }}
                                disabled={!!wfActions[wf.id]}
                                title="Resume workflow"
                              >▶</button>
                            )}
                            <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}
                              onClick={e => { e.stopPropagation(); duplicateWorkflow(wf.id); }}
                              disabled={!!wfActions[wf.id]}
                              title="Duplicate workflow"
                            >⧉</button>
                          </div>
                        </td>
                      </tr>
                      {activeRun === wf.id && (
                        <tr key={`${wf.id}-run`}>
                          <td colSpan={9} style={{ padding: 0, background: 'var(--deep)' }}>
                            <WorkflowRunPanel
                              workflow={wf}
                              onClose={() => setActiveRun(null)}
                              onComplete={() => setWorkflows(ws => ws.map(w => w.id === wf.id ? { ...w, runCount: w.runCount + 1 } : w))}
                            />
                          </td>
                        </tr>
                      )}
                      {selected === wf.id && activeRun !== wf.id && (
                        <tr key={`${wf.id}-detail`}>
                          <td colSpan={9} style={{ background: 'var(--deep)', padding: '14px 28px', borderBottom: '1px solid var(--line)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                              <div>
                                <div className="label" style={{ marginBottom: 8 }}>Description</div>
                                <div style={{ fontSize: 12.5, fontWeight: 300, color: 'var(--t2)', lineHeight: 1.7 }}>{wf.description}</div>
                              </div>
                              <div>
                                <div className="label" style={{ marginBottom: 8 }}>Schedule</div>
                                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)', letterSpacing: '0.04em', marginBottom: 10 }}>
                                  {wf.schedule || 'On-demand / Webhook'}
                                </div>
                                <div className="label" style={{ marginBottom: 6 }}>Tags</div>
                                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                  {wf.tags.map(t => <span key={t} className="tag">{t}</span>)}
                                </div>
                              </div>
                              <div>
                                <div className="label" style={{ marginBottom: 8 }}>Performance</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {[
                                    { label: 'Total Runs', value: wf.runCount.toLocaleString() },
                                    { label: 'Success Rate', value: `${wf.successRate}%` },
                                    { label: 'Avg Duration', value: formatDuration(wf.avgDuration) },
                                    { label: 'Created', value: wf.createdAt.split('T')[0] },
                                  ].map(({ label, value }) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--t4)' }}>{label}</span>
                                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)', letterSpacing: '0.06em' }}>{value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {visible.length === 0 && (
              <div className="empty-state">
                <span className="empty-state-label">
                  {workflows.length === 0 ? 'No workflows yet. Create your first workflow.' : 'No workflows match this filter.'}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div className="modal-overlay" onClick={() => setShowTemplates(false)}>
          <div className="modal-panel" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Workflow Templates</span>
              <button className="modal-close" onClick={() => setShowTemplates(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: 460, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {templates.map(t => (
                <div key={t.id} className="template-card">
                  <div className="template-card-top">
                    <div>
                      <div className="template-name">{t.name}</div>
                      <div className="template-desc">{t.description}</div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                      onClick={() => createFromTemplate(t.id)}
                      disabled={creatingTemplate === t.id}
                    >
                      {creatingTemplate === t.id ? 'Creating…' : '+ Use Template'}
                    </button>
                  </div>
                  <div className="template-meta">
                    <span className={`badge badge-${t.trigger}`}>{t.trigger}</span>
                    {t.agentRoles.map(r => <span key={r} className="tag">{r}</span>)}
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t4)' }}>~{Math.round(t.estimatedDuration / 60)}m</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
