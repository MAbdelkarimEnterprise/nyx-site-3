'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AutonomyMode } from '@/lib/types';

interface AgentRow { id: string; name: string; role: string; status: string; current_task: string | null; last_active: string | null; }
interface WorkflowRow { id: string; name: string; status: string; trigger: string; last_run: string | null; next_run: string | null; run_count: number; success_rate: number; }
interface ExecutionRow { id: string; workflow_name: string; status: string; start_time: string; end_time: string | null; duration: number | null; tokens_used: number; triggered_by: string; }
interface Alert { id: string; level: 'info' | 'warn' | 'error'; message: string; source: string; timestamp: string; resolved: boolean; }

interface ControlData {
  agentCount: number; activeAgents: number;
  workflowCount: number; runningWorkflows: number;
  totalExecutions: number; successRate: number;
  avgDuration: number; tokensUsedToday: number;
  alerts: Alert[]; autonomyMode: AutonomyMode;
  agents: AgentRow[]; workflows: WorkflowRow[];
  recentExecutions: ExecutionRow[];
}

const AUTONOMY_LABELS: Record<AutonomyMode, string> = {
  suggest: 'Suggest Mode',
  approval: 'Approval Mode',
  autonomous: 'Autonomous Mode',
};

const AUTONOMY_DESCRIPTIONS: Record<AutonomyMode, string> = {
  suggest: 'NYX proposes actions. You decide.',
  approval: 'NYX executes after your approval.',
  autonomous: 'NYX executes without interruption.',
};

const AUTONOMY_COLORS: Record<AutonomyMode, string> = {
  suggest: 'var(--t3)',
  approval: 'var(--gold)',
  autonomous: 'var(--green)',
};

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

function formatDuration(secs: number | null) {
  if (!secs) return '—';
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'active' || status === 'running' || status === 'busy' || status === 'success'
    ? 'var(--green)'
    : status === 'paused' || status === 'idle'
    ? 'var(--gold)'
    : status === 'error' || status === 'failed'
    ? 'var(--red)'
    : 'var(--t4)';
  return <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: color, marginRight: 6, flexShrink: 0 }} />;
}

export default function ControlPage() {
  const [data, setData] = useState<ControlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingMode, setSettingMode] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [workflowActions, setWorkflowActions] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch('/api/control');
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setAutonomyMode(mode: AutonomyMode) {
    setSettingMode(true);
    await fetch('/api/control', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ autonomyMode: mode }) });
    setData(d => d ? { ...d, autonomyMode: mode } : d);
    setSettingMode(false);
  }

  async function pauseWorkflow(id: string) {
    setWorkflowActions(a => ({ ...a, [id]: 'pausing' }));
    await fetch(`/api/workflows/${id}/pause`, { method: 'POST' });
    await load();
    setWorkflowActions(a => { const n = { ...a }; delete n[id]; return n; });
  }

  async function resumeWorkflow(id: string) {
    setWorkflowActions(a => ({ ...a, [id]: 'resuming' }));
    await fetch(`/api/workflows/${id}/resume`, { method: 'POST' });
    await load();
    setWorkflowActions(a => { const n = { ...a }; delete n[id]; return n; });
  }

  if (loading) return <div className="control-loading">Initializing Control Center...</div>;
  if (!data) return <div className="control-loading">Unable to load system data.</div>;

  const visibleAlerts = data.alerts.filter(a => !dismissedAlerts.has(a.id));

  return (
    <div className="control-root">
      <div className="control-header">
        <div>
          <div className="control-title">Control Center</div>
          <div className="control-sub">System Operations &amp; Autonomy Management</div>
        </div>
        <button className="control-refresh" onClick={load}>↺ Refresh</button>
      </div>

      {/* Alerts */}
      {visibleAlerts.length > 0 && (
        <div className="control-alerts">
          {visibleAlerts.map(alert => (
            <div key={alert.id} className={`control-alert control-alert-${alert.level}`}>
              <span className="control-alert-icon">{alert.level === 'error' ? '⚠' : alert.level === 'warn' ? '△' : 'ℹ'}</span>
              <span className="control-alert-msg">{alert.message}</span>
              <span className="control-alert-src">{alert.source}</span>
              <button className="control-alert-dismiss" onClick={() => setDismissedAlerts(s => { const n = new Set(s); n.add(alert.id); return n; })}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="control-metrics">
        <div className="control-metric">
          <div className="control-metric-val">{data.agentCount}</div>
          <div className="control-metric-label">Agents</div>
          <div className="control-metric-sub">{data.activeAgents} active</div>
        </div>
        <div className="control-metric">
          <div className="control-metric-val">{data.workflowCount}</div>
          <div className="control-metric-label">Workflows</div>
          <div className="control-metric-sub">{data.runningWorkflows} running</div>
        </div>
        <div className="control-metric">
          <div className="control-metric-val">{data.totalExecutions}</div>
          <div className="control-metric-label">Executions Today</div>
          <div className="control-metric-sub" style={{ color: data.successRate >= 80 ? 'var(--green)' : 'var(--red)' }}>{data.successRate}% success</div>
        </div>
        <div className="control-metric">
          <div className="control-metric-val">{formatDuration(data.avgDuration)}</div>
          <div className="control-metric-label">Avg Duration</div>
          <div className="control-metric-sub">{data.tokensUsedToday.toLocaleString()} tokens today</div>
        </div>
      </div>

      {/* Autonomy Mode */}
      <div className="control-section">
        <div className="control-section-header">
          <span>Autonomy Mode</span>
          <span className="control-section-status" style={{ color: AUTONOMY_COLORS[data.autonomyMode] }}>
            {AUTONOMY_LABELS[data.autonomyMode]}
          </span>
        </div>
        <div className="control-autonomy-grid">
          {(['suggest', 'approval', 'autonomous'] as AutonomyMode[]).map(mode => (
            <button
              key={mode}
              className={`control-autonomy-btn${data.autonomyMode === mode ? ' active' : ''}`}
              style={data.autonomyMode === mode ? { borderColor: AUTONOMY_COLORS[mode], color: AUTONOMY_COLORS[mode] } : {}}
              onClick={() => setAutonomyMode(mode)}
              disabled={settingMode}
            >
              <div className="control-autonomy-name">{AUTONOMY_LABELS[mode]}</div>
              <div className="control-autonomy-desc">{AUTONOMY_DESCRIPTIONS[mode]}</div>
              {data.autonomyMode === mode && <div className="control-autonomy-active-dot" style={{ background: AUTONOMY_COLORS[mode] }} />}
            </button>
          ))}
        </div>
      </div>

      <div className="control-two-col">
        {/* Agent Network */}
        <div className="control-section">
          <div className="control-section-header"><span>Agent Network</span></div>
          <div className="control-agent-list">
            {data.agents.length === 0 && <div className="control-empty">No agents configured.</div>}
            {data.agents.map(agent => (
              <div key={agent.id} className="control-agent-row">
                <StatusDot status={agent.status} />
                <div className="control-agent-info">
                  <div className="control-agent-name">{agent.name}</div>
                  <div className="control-agent-role">{agent.role.toUpperCase()}</div>
                </div>
                <div className="control-agent-right">
                  {agent.current_task
                    ? <div className="control-agent-task">{agent.current_task.slice(0, 40)}</div>
                    : <div className="control-agent-idle">{agent.status}</div>
                  }
                  <div className="control-agent-last">{formatRelative(agent.last_active)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workflow Status */}
        <div className="control-section">
          <div className="control-section-header"><span>Workflows</span></div>
          <div className="control-workflow-list">
            {data.workflows.length === 0 && <div className="control-empty">No workflows configured.</div>}
            {data.workflows.slice(0, 8).map(wf => (
              <div key={wf.id} className="control-wf-row">
                <StatusDot status={wf.status} />
                <div className="control-wf-info">
                  <div className="control-wf-name">{wf.name}</div>
                  <div className="control-wf-meta">{wf.trigger} · {wf.run_count}x · {Math.round(wf.success_rate)}%</div>
                </div>
                <div className="control-wf-actions">
                  {wf.status === 'active' && (
                    <button className="control-wf-btn" onClick={() => pauseWorkflow(wf.id)} disabled={!!workflowActions[wf.id]}>
                      {workflowActions[wf.id] === 'pausing' ? '...' : '⏸'}
                    </button>
                  )}
                  {wf.status === 'paused' && (
                    <button className="control-wf-btn" onClick={() => resumeWorkflow(wf.id)} disabled={!!workflowActions[wf.id]}>
                      {workflowActions[wf.id] === 'resuming' ? '...' : '▶'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Executions */}
      <div className="control-section">
        <div className="control-section-header"><span>Recent Executions</span></div>
        <table className="control-exec-table">
          <thead>
            <tr>
              <th>Workflow</th>
              <th>Status</th>
              <th>Triggered By</th>
              <th>Started</th>
              <th>Duration</th>
              <th>Tokens</th>
            </tr>
          </thead>
          <tbody>
            {data.recentExecutions.length === 0 && (
              <tr><td colSpan={6} className="control-empty" style={{ textAlign: 'center' }}>No executions yet.</td></tr>
            )}
            {data.recentExecutions.map(ex => (
              <tr key={ex.id}>
                <td className="control-exec-name">{ex.workflow_name}</td>
                <td><span className={`badge badge-${ex.status}`}><StatusDot status={ex.status} />{ex.status}</span></td>
                <td style={{ color: 'var(--t3)' }}>{ex.triggered_by}</td>
                <td style={{ color: 'var(--t3)' }}>{formatRelative(ex.start_time)}</td>
                <td style={{ color: 'var(--t3)' }}>{formatDuration(ex.duration)}</td>
                <td style={{ color: 'var(--t3)' }}>{ex.tokens_used?.toLocaleString() ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
