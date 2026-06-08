'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Agent, AgentStatus, AgentRole } from '@/lib/types';

const ROLE_LABELS: Record<AgentRole, string> = {
  ceo:       'Strategic Command',
  research:  'Intelligence',
  marketing: 'Growth',
  sales:     'Revenue',
  finance:   'Financial Ops',
  developer: 'Engineering',
};

const STATUS_SORT: Record<AgentStatus, number> = { busy: 0, active: 1, idle: 2, offline: 3 };

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTokens(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

type RunState = 'idle' | 'running' | 'complete' | 'error';

interface AgentRunPanel {
  agentId: string;
  task: string;
  output: string;
  state: RunState;
  tokensUsed: number;
  duration: number;
  executionId: string | null;
}

function TaskRunner({
  agent,
  onComplete,
}: {
  agent: Agent;
  onComplete: (agentId: string) => void;
}) {
  const [task, setTask] = useState('');
  const [run, setRun] = useState<AgentRunPanel>({
    agentId: agent.id,
    task: '',
    output: '',
    state: 'idle',
    tokensUsed: 0,
    duration: 0,
    executionId: null,
  });
  const outputRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, []);

  async function execute() {
    if (!task.trim() || run.state === 'running') return;
    setRun(r => ({ ...r, state: 'running', output: '', task, tokensUsed: 0, duration: 0, executionId: null }));

    try {
      const response = await fetch(`/api/agents/${agent.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });

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
            if (data.type === 'token') {
              setRun(r => ({ ...r, output: r.output + (data.text ?? '') }));
              scrollToBottom();
            } else if (data.type === 'complete') {
              setRun(r => ({
                ...r,
                state: 'complete',
                tokensUsed: data.tokensUsed ?? 0,
                duration: data.duration ?? 0,
                executionId: data.executionId ?? null,
              }));
              onComplete(agent.id);
            } else if (data.type === 'error') {
              setRun(r => ({ ...r, state: 'error', output: r.output + `\n\nError: ${data.message}` }));
            }
          } catch {}
        }
      }
    } catch (e) {
      setRun(r => ({ ...r, state: 'error', output: `Network error: ${(e as Error).message}` }));
    }
  }

  function reset() {
    setTask('');
    setRun(r => ({ ...r, state: 'idle', output: '', executionId: null }));
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  const PLACEHOLDER_BY_ROLE: Record<AgentRole, string> = {
    ceo:       'Synthesize this week\'s key signals and give me a priority directive…',
    research:  'Analyze the current competitive landscape for AI automation tools…',
    marketing: 'Generate 5 content ideas around autonomous AI agents for technical founders…',
    sales:     'Analyze pipeline health and identify the top 3 deals most at risk of slipping…',
    developer: 'Review the current auth implementation and identify security gaps…',
    finance:   'Model a scenario where we 2x our burn rate — what\'s our runway impact?',
  };

  return (
    <div className="agent-task-runner">
      {run.state === 'idle' ? (
        <div className="agent-task-input">
          <textarea
            ref={textareaRef}
            className="agent-task-textarea"
            placeholder={PLACEHOLDER_BY_ROLE[agent.role as AgentRole]}
            value={task}
            onChange={e => setTask(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) execute();
            }}
            rows={3}
          />
          <div className="agent-task-actions">
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.14em', color: 'var(--t4)' }}>
              ⌘↵ to execute
            </span>
            <button
              className="btn btn-primary btn-sm"
              onClick={execute}
              disabled={!task.trim()}
            >
              Execute
            </button>
          </div>
        </div>
      ) : (
        <div className="agent-task-output-wrap">
          <div className="agent-task-output-header">
            {run.state === 'running' && (
              <>
                <span className="agent-running-dot" />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--gold)' }}>
                  Executing
                </span>
              </>
            )}
            {run.state === 'complete' && (
              <>
                <span style={{ color: 'var(--green)', fontSize: 11 }}>✓</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--green)' }}>
                  Complete
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t4)', marginLeft: 6 }}>
                  {run.duration}s · {formatTokens(run.tokensUsed)} tokens
                </span>
              </>
            )}
            {run.state === 'error' && (
              <>
                <span style={{ color: 'var(--red)', fontSize: 11 }}>✗</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--red)' }}>
                  Error
                </span>
              </>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {run.state === 'complete' && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '3px 8px', fontSize: 8 }}
                  onClick={() => navigator.clipboard.writeText(run.output)}
                >
                  Copy
                </button>
              )}
              {run.state !== 'running' && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '3px 8px', fontSize: 8 }}
                  onClick={reset}
                >
                  New task
                </button>
              )}
            </div>
          </div>
          <div
            ref={outputRef}
            className="agent-task-output"
          >
            <div className="agent-task-prompt">
              <span style={{ color: 'var(--gold)', opacity: 0.5 }}>›</span> {run.task}
            </div>
            <div className="agent-task-response">
              {run.output}
              {run.state === 'running' && <span className="agent-cursor">▋</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [taskRunner, setTaskRunner] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => { setAgents(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function handleRunComplete(agentId: string) {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAgents(data); });
  }

  const sorted = [...agents].sort((a, b) => STATUS_SORT[a.status] - STATUS_SORT[b.status]);
  const busyCount = agents.filter(a => a.status === 'busy').length;
  const activeCount = agents.filter(a => a.status === 'active').length;
  const totalTasks = agents.reduce((s, a) => s + a.metrics.tasksCompleted, 0);
  const totalTokens = agents.reduce((s, a) => s + a.metrics.tokensUsed, 0);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <div className="topbar-breadcrumb">
            <span>NYX</span>
            <span className="topbar-breadcrumb-sep">/</span>
            <span className="topbar-page-title">Agents</span>
          </div>
        </div>
        <div className="topbar-right">
          <div className="topbar-status">
            <span className="sdot sdot-busy" />
            <span className="topbar-status-text">{busyCount} active · {activeCount} standby</span>
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Agent Network</h1>
            <p className="page-subtitle">Six autonomous agents operating across every domain. Give any agent a task and watch it execute in real time.</p>
          </div>
          <div className="page-header-right">
            <button className="btn btn-ghost btn-sm">Logs</button>
          </div>
        </div>

        {loading ? (
          <div className="skeleton-row-group">
            {[1, 2, 3].map(i => <div key={i} className="skeleton-row" style={{ height: 220 }} />)}
          </div>
        ) : (
          <>
            <div className="metrics-row">
              {[
                { label: 'Active Agents', value: `${busyCount + activeCount}/${agents.length}`, sub: `${busyCount} busy, ${activeCount} standby` },
                { label: 'Tasks Completed', value: totalTasks.toLocaleString(), sub: 'all time, all agents' },
                { label: 'Tokens Consumed', value: formatTokens(totalTokens), sub: 'total context used' },
                {
                  label: 'Avg Success Rate',
                  value: agents.length
                    ? `${(agents.reduce((s, a) => s + a.metrics.successRate, 0) / agents.length).toFixed(1)}%`
                    : '—',
                  sub: 'weighted across agents',
                },
              ].map(m => (
                <div key={m.label} className="metric-card">
                  <div className="metric-card-label">{m.label}</div>
                  <div className="metric-card-value">{m.value}</div>
                  <div className="metric-card-sub">{m.sub}</div>
                </div>
              ))}
            </div>

            {agents.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-label">No agents in database. Connect Supabase and seed agents.</span>
              </div>
            ) : (
              <div className="agent-grid">
                {sorted.map(agent => (
                  <div key={agent.id} className="agent-card">
                    <div className="agent-card-header">
                      <div>
                        <div className="agent-card-name">{agent.name}</div>
                        <div className="agent-card-role">{ROLE_LABELS[agent.role as AgentRole]}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <span className={`badge badge-${agent.status}`}>
                          <span className={`sdot sdot-${agent.status}`} />
                          {agent.status}
                        </span>
                        <span className="agent-model">{agent.model.replace('claude-', '')}</span>
                      </div>
                    </div>

                    <div className="agent-card-purpose">{agent.purpose}</div>

                    <div className="agent-card-task">
                      <div className="agent-card-task-label">Current Task</div>
                      <div className="agent-card-task-text">
                        {agent.currentTask ?? (
                          <span style={{ color: 'var(--t4)', fontStyle: 'italic' }}>No active task</span>
                        )}
                      </div>
                    </div>

                    <div className="agent-metrics">
                      {[
                        { label: 'Tasks Done', value: agent.metrics.tasksCompleted.toLocaleString() },
                        { label: 'Success', value: `${agent.metrics.successRate}%` },
                        { label: 'Avg Response', value: `${agent.metrics.avgResponseTime}s` },
                        { label: 'Uptime', value: `${agent.metrics.uptime}%` },
                      ].map(({ label, value }) => (
                        <div key={label} className="agent-metric-item">
                          <span className="agent-metric-label">{label}</span>
                          <span className="agent-metric-value">{value}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--t4)' }}>Efficiency</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--gold)' }}>{agent.metrics.successRate}%</span>
                      </div>
                      <div className="progress-bar-track">
                        <div
                          className={`progress-bar-fill ${agent.metrics.successRate >= 98 ? 'progress-bar-fill-green' : ''}`}
                          style={{ width: `${agent.metrics.successRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Task Runner Toggle */}
                    <button
                      className={`btn btn-sm ${taskRunner === agent.id ? 'btn-ghost' : 'btn-primary'}`}
                      style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}
                      onClick={() => setTaskRunner(taskRunner === agent.id ? null : agent.id)}
                    >
                      {taskRunner === agent.id ? '↑ Close' : '▶ Run Task'}
                    </button>

                    {taskRunner === agent.id && (
                      <TaskRunner agent={agent} onComplete={handleRunComplete} />
                    )}

                    {/* Activity Toggle */}
                    {taskRunner !== agent.id && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ width: '100%', justifyContent: 'center', marginBottom: expanded === agent.id ? 12 : 0 }}
                        onClick={() => setExpanded(expanded === agent.id ? null : agent.id)}
                      >
                        {expanded === agent.id ? 'Hide Activity' : 'Recent Activity'}
                      </button>
                    )}

                    {expanded === agent.id && taskRunner !== agent.id && (
                      <div className="agent-activity">
                        {(agent.recentActivity ?? []).length === 0 ? (
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t4)', textAlign: 'center', padding: '8px 0' }}>
                            No activity yet
                          </div>
                        ) : (
                          agent.recentActivity.map(act => (
                            <div key={act.id} className="agent-activity-item">
                              <span
                                className="agent-activity-ts"
                                style={{ color: act.status === 'warn' ? 'var(--amber)' : act.status === 'success' ? 'var(--green)' : 'var(--t4)' }}
                              >
                                {formatTime(act.timestamp)}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="agent-activity-text"><strong>{act.action}</strong></div>
                                <div style={{ fontSize: 11, color: 'var(--t4)', lineHeight: 1.5, marginTop: 2 }}>{act.result}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    <div style={{ marginTop: 10, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {agent.capabilities.map(c => (
                        <span key={c} className="tag">{c}</span>
                      ))}
                    </div>

                    <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.12em', color: 'var(--t4)' }}>
                      Last active {formatTime(agent.lastActive)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
