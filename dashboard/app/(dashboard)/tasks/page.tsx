'use client';

import { useState, useEffect } from 'react';
import type { Task, TaskStatus, TaskPriority } from '@/lib/types';

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'var(--t4)' },
  { id: 'in_progress', label: 'In Progress', color: '#E0B46A' },
  { id: 'review', label: 'Review', color: 'var(--blue)' },
  { id: 'completed', label: 'Completed', color: 'var(--green)' },
];

function isOverdue(dueDate: string) {
  return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
}

function isDueToday(dueDate: string) {
  return new Date(dueDate).toDateString() === new Date().toDateString();
}

function PriorityIcon({ p }: { p: TaskPriority }) {
  return (
    <div className="task-card-priority">
      <span className={`priority-pip priority-pip-${p}`} />
      <span className={`priority-label priority-label-${p}`}>{p}</span>
    </div>
  );
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const overdue = isOverdue(task.dueDate);
  const today = isDueToday(task.dueDate);
  return (
    <div className="task-card" onClick={onClick} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') onClick(); }}>
      <PriorityIcon p={task.priority} />
      <div className="task-card-title">{task.title}</div>
      <div className="task-card-meta">
        <span className="task-card-agent">{task.agentName}</span>
        <span className={`task-card-due${overdue ? ' task-card-due-urgent' : ''}`}>
          {overdue ? '⚠ ' : today ? '◉ ' : ''}{task.dueDate}
        </span>
      </div>
      {task.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          {task.tags.slice(0, 2).map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      )}
    </div>
  );
}

function TaskDetail({ task, onClose }: { task: Task; onClose: () => void }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surf)', border: '1px solid var(--line-hi)', width: '100%', maxWidth: 540, padding: 28 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div className="label-gold" style={{ marginBottom: 8 }}>Task Details</div>
            <div className={`badge badge-${task.priority}`} style={{ marginBottom: 8 }}>{task.priority}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 300, color: 'var(--t1)', marginBottom: 12, lineHeight: 1.3 }}>
          {task.title}
        </h2>
        <p style={{ fontSize: 13, fontWeight: 300, color: 'var(--t2)', lineHeight: 1.7, marginBottom: 20 }}>
          {task.description}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {[
            { label: 'Status', value: task.status.replace('_', ' ') },
            { label: 'Assigned Agent', value: task.agentName },
            { label: 'Due Date', value: task.dueDate },
            { label: 'Created', value: task.createdAt.split('T')[0] },
            { label: 'Workflow', value: task.workflowId ?? 'Manual task' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="label" style={{ marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)', letterSpacing: '0.04em' }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {task.tags.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm">Reassign</button>
          <button className="btn btn-primary btn-sm">Mark Complete</button>
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Task | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(data => { setTasks(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalByCol = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id).length;
    return acc;
  }, {} as Record<string, number>);

  const criticalCount = tasks.filter(t => t.priority === 'critical' && t.status !== 'completed').length;
  const overdueCount = tasks.filter(t => isOverdue(t.dueDate) && t.status !== 'completed').length;

  const filteredTasks = (status: TaskStatus) => {
    const base = tasks.filter(t => t.status === status);
    if (filter === 'all') return base;
    if (filter === 'critical') return base.filter(t => t.priority === 'critical');
    if (filter === 'overdue') return base.filter(t => isOverdue(t.dueDate));
    return base;
  };

  return (
    <>
      {selected && <TaskDetail task={selected} onClose={() => setSelected(null)} />}

      <div className="topbar">
        <div className="topbar-left">
          <div className="topbar-breadcrumb">
            <span>NYX</span>
            <span className="topbar-breadcrumb-sep">/</span>
            <span className="topbar-page-title">Tasks</span>
          </div>
        </div>
        <div className="topbar-right">
          {criticalCount > 0 && (
            <div className="topbar-status">
              <span className="sdot sdot-error" />
              <span className="topbar-status-text">{criticalCount} critical</span>
            </div>
          )}
          {overdueCount > 0 && (
            <div className="topbar-status" style={{ marginLeft: 8 }}>
              <span className="sdot" style={{ background: 'var(--amber)' }} />
              <span className="topbar-status-text">{overdueCount} overdue</span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="page-content">
          <div className="skeleton-row-group">
            {[1,2,3,4].map(i => <div key={i} className="skeleton-row" />)}
          </div>
        </div>
      ) : (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <h1 className="page-title">Tasks</h1>
              <p className="page-subtitle">Agent-assigned work across all active workflows. {tasks.length} total tasks.</p>
            </div>
            <div className="page-header-right">
              <div className="filter-tabs" style={{ borderBottom: 'none', padding: 0 }}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'critical', label: 'Critical', count: criticalCount },
                  { id: 'overdue', label: 'Overdue', count: overdueCount },
                ].map(({ id, label, count }) => (
                  <button
                    key={id}
                    className={`filter-tab${filter === id ? ' active' : ''}`}
                    style={{ padding: '6px 12px' }}
                    onClick={() => setFilter(id)}
                  >
                    {label}
                    {count !== undefined && count > 0 && (
                      <span className="filter-tab-count">{count}</span>
                    )}
                  </button>
                ))}
              </div>
              <button className="btn btn-primary btn-sm">+ Add Task</button>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="page-content">
              <div className="empty-state">
                <span className="empty-state-label">No tasks yet. Tasks will appear here when workflows create them.</span>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div className="kanban-board" style={{ flex: 1 }}>
                {COLUMNS.map(col => {
                  const colTasks = filteredTasks(col.id);
                  return (
                    <div key={col.id} className="kanban-column">
                      <div className="kanban-col-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                          <span className="kanban-col-title">{col.label}</span>
                        </div>
                        <span className="kanban-col-count">{totalByCol[col.id]}</span>
                      </div>
                      <div className="kanban-col-body">
                        {colTasks.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '20px 0', fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--t4)' }}>
                            Empty
                          </div>
                        ) : (
                          colTasks.map(task => (
                            <TaskCard key={task.id} task={task} onClick={() => setSelected(task)} />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
