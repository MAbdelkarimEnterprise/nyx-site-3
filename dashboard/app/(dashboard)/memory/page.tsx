'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  Memory, MemoryGoal, MemoryProject, MemoryDecision,
  MemoryRelationship, MemoryTimelineEvent, MemoryProfile,
  MemoryCategory, GoalType, ProjectStatus, DecisionImpact,
  RelationshipType, TimelineEventType,
} from '@/lib/types';

type Tab = 'all' | 'goals' | 'projects' | 'decisions' | 'knowledge' | 'relationships' | 'timeline' | 'profile';

const TABS: { id: Tab; label: string }[] = [
  { id: 'all',           label: 'Recent' },
  { id: 'goals',         label: 'Goals' },
  { id: 'projects',      label: 'Projects' },
  { id: 'decisions',     label: 'Decisions' },
  { id: 'knowledge',     label: 'Knowledge' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'timeline',      label: 'Timeline' },
  { id: 'profile',       label: 'Profile' },
];

const GOAL_TYPE_ORDER: GoalType[] = ['daily', 'weekly', 'quarterly', 'longterm'];
const GOAL_TYPE_LABELS: Record<GoalType, string> = { daily: 'Daily', weekly: 'Weekly', quarterly: 'Quarterly', longterm: 'Long-term Vision' };

const IMPACT_COLORS: Record<DecisionImpact, string> = {
  critical: 'var(--red)', high: 'var(--gold)', medium: 'var(--blue)', low: 'var(--t4)',
};

const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  team: 'var(--green)', client: 'var(--gold)', investor: 'var(--blue)',
  partner: 'var(--amber)', contact: 'var(--t4)',
};

const TIMELINE_COLORS: Record<TimelineEventType, string> = {
  milestone:     'var(--gold)',
  achievement:   'var(--green)',
  decision:      'var(--blue)',
  project_start: 'var(--amber)',
  project_end:   'var(--t2)',
  note:          'var(--t4)',
};

const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  active: 'var(--green)', planning: 'var(--amber)', completed: 'var(--blue)', archived: 'var(--t4)',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── MODAL ────────────────────────────────────────────────────────────────────

type ModalType = Tab | null;

interface ModalState {
  type: ModalType;
  editing?: Record<string, unknown>;
}

function MemoryModal({ modal, onClose, onSave }: {
  modal: ModalState;
  onClose: () => void;
  onSave: (type: string, data: Record<string, unknown>, id?: string) => Promise<void>;
}) {
  const [form, setForm] = useState<Record<string, unknown>>(modal.editing ?? {});
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(modal.type!, form, modal.editing?.id as string | undefined);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const labelClass = 'mem-form-label';
  const inputClass = 'mem-form-input';
  const textareaClass = 'mem-form-textarea';
  const selectClass = 'mem-form-select';

  function renderFields() {
    switch (modal.type) {
      case 'goals':
        return (
          <>
            <div className="mem-form-group">
              <label className={labelClass}>Title</label>
              <input className={inputClass} value={(form.title as string) ?? ''} onChange={e => set('title', e.target.value)} placeholder="Achieve $1M ARR" required />
            </div>
            <div className="mem-form-group">
              <label className={labelClass}>Description</label>
              <textarea className={textareaClass} value={(form.description as string) ?? ''} onChange={e => set('description', e.target.value)} placeholder="Context and specifics…" rows={3} />
            </div>
            <div className="mem-form-row">
              <div className="mem-form-group">
                <label className={labelClass}>Type</label>
                <select className={selectClass} value={(form.type as string) ?? 'weekly'} onChange={e => set('type', e.target.value)}>
                  {GOAL_TYPE_ORDER.map(t => <option key={t} value={t}>{GOAL_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="mem-form-group">
                <label className={labelClass}>Due Date</label>
                <input type="date" className={inputClass} value={(form.due_date as string) ?? ''} onChange={e => set('due_date', e.target.value)} />
              </div>
            </div>
            <div className="mem-form-group">
              <label className={labelClass}>Progress: {(form.progress as number) ?? 0}%</label>
              <input type="range" min={0} max={100} value={(form.progress as number) ?? 0} onChange={e => set('progress', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--gold)' }} />
            </div>
          </>
        );

      case 'projects':
        return (
          <>
            <div className="mem-form-group">
              <label className={labelClass}>Project Name</label>
              <input className={inputClass} value={(form.name as string) ?? ''} onChange={e => set('name', e.target.value)} placeholder="NYX v2.0" required />
            </div>
            <div className="mem-form-group">
              <label className={labelClass}>Description</label>
              <textarea className={textareaClass} value={(form.description as string) ?? ''} onChange={e => set('description', e.target.value)} placeholder="What this project is about…" rows={3} />
            </div>
            <div className="mem-form-row">
              <div className="mem-form-group">
                <label className={labelClass}>Status</label>
                <select className={selectClass} value={(form.status as string) ?? 'active'} onChange={e => set('status', e.target.value)}>
                  {(['active', 'planning', 'completed', 'archived'] as ProjectStatus[]).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div className="mem-form-group">
                <label className={labelClass}>Start Date</label>
                <input type="date" className={inputClass} value={(form.start_date as string) ?? ''} onChange={e => set('start_date', e.target.value)} />
              </div>
            </div>
            <div className="mem-form-group">
              <label className={labelClass}>Tags (comma-separated)</label>
              <input className={inputClass} value={Array.isArray(form.tags) ? (form.tags as string[]).join(', ') : (form.tags as string) ?? ''} onChange={e => set('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} placeholder="ai, product, growth" />
            </div>
          </>
        );

      case 'decisions':
        return (
          <>
            <div className="mem-form-group">
              <label className={labelClass}>Decision Title</label>
              <input className={inputClass} value={(form.title as string) ?? ''} onChange={e => set('title', e.target.value)} placeholder="Chose Supabase over Firebase" required />
            </div>
            <div className="mem-form-group">
              <label className={labelClass}>What was decided</label>
              <textarea className={textareaClass} value={(form.what as string) ?? ''} onChange={e => set('what', e.target.value)} placeholder="The specific decision made…" rows={3} required />
            </div>
            <div className="mem-form-group">
              <label className={labelClass}>Why</label>
              <textarea className={textareaClass} value={(form.why as string) ?? ''} onChange={e => set('why', e.target.value)} placeholder="The reasoning behind this decision…" rows={3} />
            </div>
            <div className="mem-form-row">
              <div className="mem-form-group">
                <label className={labelClass}>Impact</label>
                <select className={selectClass} value={(form.impact as string) ?? 'medium'} onChange={e => set('impact', e.target.value)}>
                  {(['critical', 'high', 'medium', 'low'] as DecisionImpact[]).map(i => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
                </select>
              </div>
              <div className="mem-form-group">
                <label className={labelClass}>Date</label>
                <input type="date" className={inputClass} value={(form.decided_at as string)?.split('T')[0] ?? new Date().toISOString().split('T')[0]} onChange={e => set('decided_at', e.target.value)} />
              </div>
            </div>
          </>
        );

      case 'knowledge':
      case 'all':
        return (
          <>
            <div className="mem-form-group">
              <label className={labelClass}>Title</label>
              <input className={inputClass} value={(form.title as string) ?? ''} onChange={e => set('title', e.target.value)} placeholder="Title" required />
            </div>
            <div className="mem-form-group">
              <label className={labelClass}>Category</label>
              <select className={selectClass} value={(form.category as string) ?? 'note'} onChange={e => set('category', e.target.value)}>
                {(['note', 'document', 'research', 'meeting', 'sop', 'knowledge'] as MemoryCategory[]).map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="mem-form-group">
              <label className={labelClass}>Content</label>
              <textarea className={textareaClass} value={(form.content as string) ?? ''} onChange={e => set('content', e.target.value)} placeholder="Write anything NYX should remember…" rows={6} required />
            </div>
            <div className="mem-form-row">
              <div className="mem-form-group">
                <label className={labelClass}>Tags</label>
                <input className={inputClass} value={Array.isArray(form.tags) ? (form.tags as string[]).join(', ') : (form.tags as string) ?? ''} onChange={e => set('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} placeholder="strategy, product" />
              </div>
              <div className="mem-form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 22 }}>
                <input type="checkbox" id="pin-mem" checked={(form.pinned as boolean) ?? false} onChange={e => set('pinned', e.target.checked)} style={{ accentColor: 'var(--gold)' }} />
                <label htmlFor="pin-mem" className={labelClass} style={{ marginBottom: 0 }}>Pin to top</label>
              </div>
            </div>
          </>
        );

      case 'relationships':
        return (
          <>
            <div className="mem-form-row">
              <div className="mem-form-group">
                <label className={labelClass}>Name</label>
                <input className={inputClass} value={(form.name as string) ?? ''} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" required />
              </div>
              <div className="mem-form-group">
                <label className={labelClass}>Type</label>
                <select className={selectClass} value={(form.type as string) ?? 'contact'} onChange={e => set('type', e.target.value)}>
                  {(['team', 'client', 'investor', 'partner', 'contact'] as RelationshipType[]).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="mem-form-row">
              <div className="mem-form-group">
                <label className={labelClass}>Role / Title</label>
                <input className={inputClass} value={(form.role as string) ?? ''} onChange={e => set('role', e.target.value)} placeholder="CTO" />
              </div>
              <div className="mem-form-group">
                <label className={labelClass}>Company</label>
                <input className={inputClass} value={(form.company as string) ?? ''} onChange={e => set('company', e.target.value)} placeholder="Acme Inc." />
              </div>
            </div>
            <div className="mem-form-group">
              <label className={labelClass}>Email</label>
              <input type="email" className={inputClass} value={(form.email as string) ?? ''} onChange={e => set('email', e.target.value)} placeholder="jane@acme.com" />
            </div>
            <div className="mem-form-group">
              <label className={labelClass}>Notes</label>
              <textarea className={textareaClass} value={(form.notes as string) ?? ''} onChange={e => set('notes', e.target.value)} placeholder="Key info, context, history…" rows={3} />
            </div>
          </>
        );

      case 'timeline':
        return (
          <>
            <div className="mem-form-group">
              <label className={labelClass}>Event Title</label>
              <input className={inputClass} value={(form.title as string) ?? ''} onChange={e => set('title', e.target.value)} placeholder="Launched v1.0" required />
            </div>
            <div className="mem-form-row">
              <div className="mem-form-group">
                <label className={labelClass}>Type</label>
                <select className={selectClass} value={(form.type as string) ?? 'milestone'} onChange={e => set('type', e.target.value)}>
                  {(['milestone', 'achievement', 'decision', 'project_start', 'project_end', 'note'] as TimelineEventType[]).map(t => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </div>
              <div className="mem-form-group">
                <label className={labelClass}>Date</label>
                <input type="date" className={inputClass} value={(form.event_date as string) ?? new Date().toISOString().split('T')[0]} onChange={e => set('event_date', e.target.value)} />
              </div>
            </div>
            <div className="mem-form-group">
              <label className={labelClass}>Description</label>
              <textarea className={textareaClass} value={(form.description as string) ?? ''} onChange={e => set('description', e.target.value)} placeholder="What happened, why it matters…" rows={3} />
            </div>
          </>
        );

      default:
        return null;
    }
  }

  const MODAL_TITLES: Partial<Record<Tab, string>> = {
    goals: 'New Goal', projects: 'New Project', decisions: 'Log Decision',
    knowledge: 'New Memory', all: 'New Memory', relationships: 'Add Contact', timeline: 'Add Timeline Event',
  };

  return (
    <div className="mem-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mem-modal">
        <div className="mem-modal-header">
          <span className="mem-modal-title">{modal.editing ? 'Edit' : MODAL_TITLES[modal.type as Tab] ?? 'New'}</span>
          <button className="mem-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="mem-modal-body">
          {renderFields()}
          <div className="mem-modal-footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Saving…' : modal.editing ? 'Save Changes' : 'Save to Memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── GOALS VIEW ───────────────────────────────────────────────────────────────

function GoalsView({ goals, onEdit, onDelete, onProgressUpdate }: {
  goals: MemoryGoal[];
  onEdit: (g: MemoryGoal) => void;
  onDelete: (id: string) => void;
  onProgressUpdate: (id: string, progress: number) => void;
}) {
  const grouped = GOAL_TYPE_ORDER.reduce((acc, t) => {
    acc[t] = goals.filter(g => g.type === t);
    return acc;
  }, {} as Record<GoalType, MemoryGoal[]>);

  return (
    <div className="mem-section">
      {GOAL_TYPE_ORDER.map(type => {
        const list = grouped[type];
        if (list.length === 0) return null;
        return (
          <div key={type} className="mem-group">
            <div className="mem-group-header">
              <span className="mem-group-label">{GOAL_TYPE_LABELS[type]}</span>
              <span className="mem-group-count">{list.length}</span>
            </div>
            <div className="mem-goal-list">
              {list.map(goal => (
                <div key={goal.id} className={`mem-goal-card ${goal.status === 'completed' ? 'mem-goal-done' : ''}`}>
                  <div className="mem-goal-top">
                    <div className="mem-goal-info">
                      <div className="mem-goal-title">{goal.title}</div>
                      {goal.description && <div className="mem-goal-desc">{goal.description}</div>}
                    </div>
                    <div className="mem-goal-actions">
                      <span className={`badge badge-${goal.status}`}>{goal.status}</span>
                      <button className="mem-icon-btn" onClick={() => onEdit(goal)}>✎</button>
                      <button className="mem-icon-btn mem-icon-btn-del" onClick={() => onDelete(goal.id)}>✕</button>
                    </div>
                  </div>
                  <div className="mem-goal-progress-row">
                    <div className="mem-goal-progress-track">
                      <div className="mem-goal-progress-fill" style={{ width: `${goal.progress}%` }} />
                    </div>
                    <span className="mem-goal-pct">{goal.progress}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100} value={goal.progress}
                    onChange={e => onProgressUpdate(goal.id, Number(e.target.value))}
                    className="mem-goal-slider"
                  />
                  {goal.dueDate && (
                    <div className="mem-goal-due">Due {formatDate(goal.dueDate)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {goals.length === 0 && <MemEmpty label="No goals yet. Start by defining what matters most." />}
    </div>
  );
}

// ── PROJECTS VIEW ────────────────────────────────────────────────────────────

function ProjectsView({ projects, onEdit, onDelete }: {
  projects: MemoryProject[];
  onEdit: (p: MemoryProject) => void;
  onDelete: (id: string) => void;
}) {
  const active = projects.filter(p => p.status === 'active');
  const other = projects.filter(p => p.status !== 'active');

  return (
    <div className="mem-section">
      {active.length > 0 && (
        <div className="mem-group">
          <div className="mem-group-header">
            <span className="mem-group-label">Active</span>
            <span className="mem-group-count">{active.length}</span>
          </div>
          <div className="mem-project-grid">
            {active.map(p => <ProjectCard key={p.id} project={p} onEdit={onEdit} onDelete={onDelete} />)}
          </div>
        </div>
      )}
      {other.length > 0 && (
        <div className="mem-group">
          <div className="mem-group-header">
            <span className="mem-group-label">Other</span>
          </div>
          <div className="mem-project-grid">
            {other.map(p => <ProjectCard key={p.id} project={p} onEdit={onEdit} onDelete={onDelete} />)}
          </div>
        </div>
      )}
      {projects.length === 0 && <MemEmpty label="No projects tracked. Add your first project." />}
    </div>
  );
}

function ProjectCard({ project, onEdit, onDelete }: {
  project: MemoryProject;
  onEdit: (p: MemoryProject) => void;
  onDelete: (id: string) => void;
}) {
  const doneM = project.milestones.filter(m => m.done).length;
  const doneD = project.deliverables.filter(d => d.done).length;

  return (
    <div className="mem-project-card">
      <div className="mem-project-header">
        <div>
          <div className="mem-project-name">{project.name}</div>
          {project.description && <div className="mem-project-desc">{project.description}</div>}
        </div>
        <div className="mem-project-actions">
          <span className="mem-status-dot" style={{ background: PROJECT_STATUS_COLORS[project.status] }} />
          <button className="mem-icon-btn" onClick={() => onEdit(project)}>✎</button>
          <button className="mem-icon-btn mem-icon-btn-del" onClick={() => onDelete(project.id)}>✕</button>
        </div>
      </div>
      <div className="mem-project-stats">
        {project.milestones.length > 0 && (
          <span className="mem-project-stat">
            <span style={{ color: 'var(--gold)' }}>◆</span> {doneM}/{project.milestones.length} milestones
          </span>
        )}
        {project.deliverables.length > 0 && (
          <span className="mem-project-stat">
            <span style={{ color: 'var(--green)' }}>✓</span> {doneD}/{project.deliverables.length} deliverables
          </span>
        )}
      </div>
      {project.tags.length > 0 && (
        <div className="mem-tags">
          {project.tags.map(t => <span key={t} className="mem-tag">{t}</span>)}
        </div>
      )}
      {project.startDate && (
        <div className="mem-project-dates">
          {formatDate(project.startDate)}{project.endDate ? ` → ${formatDate(project.endDate)}` : ''}
        </div>
      )}
    </div>
  );
}

// ── DECISIONS VIEW ───────────────────────────────────────────────────────────

function DecisionsView({ decisions, onEdit, onDelete }: {
  decisions: MemoryDecision[];
  onEdit: (d: MemoryDecision) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="mem-section">
      <div className="mem-decision-log">
        {decisions.map(d => (
          <div key={d.id} className="mem-decision-item">
            <div className="mem-decision-indicator" style={{ borderColor: IMPACT_COLORS[d.impact] }} />
            <div className="mem-decision-body">
              <div className="mem-decision-header">
                <span className="mem-decision-title">{d.title}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  <span className="mem-impact-badge" style={{ color: IMPACT_COLORS[d.impact], borderColor: IMPACT_COLORS[d.impact] }}>
                    {d.impact.toUpperCase()}
                  </span>
                  <span className="mem-decision-date">{formatDate(d.decidedAt)}</span>
                  <button className="mem-icon-btn" onClick={() => onEdit(d)}>✎</button>
                  <button className="mem-icon-btn mem-icon-btn-del" onClick={() => onDelete(d.id)}>✕</button>
                </div>
              </div>
              <div className="mem-decision-what">{d.what}</div>
              {d.why && (
                <div className="mem-decision-why">
                  <span style={{ color: 'var(--t4)', fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Why</span>
                  <span style={{ marginLeft: 8 }}>{d.why}</span>
                </div>
              )}
              {d.tags.length > 0 && (
                <div className="mem-tags" style={{ marginTop: 8 }}>
                  {d.tags.map(t => <span key={t} className="mem-tag">{t}</span>)}
                </div>
              )}
            </div>
          </div>
        ))}
        {decisions.length === 0 && <MemEmpty label="No decisions logged. Start recording important choices." />}
      </div>
    </div>
  );
}

// ── KNOWLEDGE VIEW ───────────────────────────────────────────────────────────

function KnowledgeView({ memories, onEdit, onDelete, onPin }: {
  memories: Memory[];
  onEdit: (m: Memory) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  const pinned = memories.filter(m => m.pinned);
  const rest = memories.filter(m => !m.pinned);

  return (
    <div className="mem-section">
      {pinned.length > 0 && (
        <div className="mem-group">
          <div className="mem-group-header">
            <span className="mem-group-label">Pinned</span>
            <span className="mem-group-count">{pinned.length}</span>
          </div>
          <div className="mem-knowledge-grid">
            {pinned.map(m => <MemoryCard key={m.id} memory={m} onEdit={onEdit} onDelete={onDelete} onPin={onPin} />)}
          </div>
        </div>
      )}
      {rest.length > 0 && (
        <div className="mem-group">
          {pinned.length > 0 && <div className="mem-group-header"><span className="mem-group-label">All</span></div>}
          <div className="mem-knowledge-grid">
            {rest.map(m => <MemoryCard key={m.id} memory={m} onEdit={onEdit} onDelete={onDelete} onPin={onPin} />)}
          </div>
        </div>
      )}
      {memories.length === 0 && <MemEmpty label="Knowledge base is empty. Add notes, research, SOPs, and documents." />}
    </div>
  );
}

function MemoryCard({ memory, onEdit, onDelete, onPin }: {
  memory: Memory;
  onEdit: (m: Memory) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  return (
    <div className={`mem-knowledge-card ${memory.pinned ? 'mem-knowledge-pinned' : ''}`}>
      <div className="mem-knowledge-header">
        <div className="mem-knowledge-category">{memory.category}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="mem-icon-btn" title={memory.pinned ? 'Unpin' : 'Pin'} onClick={() => onPin(memory.id, !memory.pinned)} style={{ color: memory.pinned ? 'var(--gold)' : undefined }}>◆</button>
          <button className="mem-icon-btn" onClick={() => onEdit(memory)}>✎</button>
          <button className="mem-icon-btn mem-icon-btn-del" onClick={() => onDelete(memory.id)}>✕</button>
        </div>
      </div>
      <div className="mem-knowledge-title">{memory.title}</div>
      <div className="mem-knowledge-content">{memory.content.slice(0, 200)}{memory.content.length > 200 ? '…' : ''}</div>
      {memory.tags.length > 0 && (
        <div className="mem-tags">
          {memory.tags.map(t => <span key={t} className="mem-tag">{t}</span>)}
        </div>
      )}
      <div className="mem-knowledge-date">{formatRelative(memory.updatedAt)}</div>
    </div>
  );
}

// ── RELATIONSHIPS VIEW ───────────────────────────────────────────────────────

function RelationshipsView({ relationships, onEdit, onDelete }: {
  relationships: MemoryRelationship[];
  onEdit: (r: MemoryRelationship) => void;
  onDelete: (id: string) => void;
}) {
  const types: RelationshipType[] = ['team', 'client', 'investor', 'partner', 'contact'];
  const grouped = types.reduce((acc, t) => {
    acc[t] = relationships.filter(r => r.type === t);
    return acc;
  }, {} as Record<RelationshipType, MemoryRelationship[]>);

  return (
    <div className="mem-section">
      {types.map(type => {
        const list = grouped[type];
        if (list.length === 0) return null;
        return (
          <div key={type} className="mem-group">
            <div className="mem-group-header">
              <span className="mem-group-label" style={{ color: RELATIONSHIP_COLORS[type] }}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
              <span className="mem-group-count">{list.length}</span>
            </div>
            <div className="mem-relationship-grid">
              {list.map(r => (
                <div key={r.id} className="mem-relationship-card">
                  <div className="mem-rel-avatar" style={{ background: RELATIONSHIP_COLORS[r.type] + '22', color: RELATIONSHIP_COLORS[r.type], borderColor: RELATIONSHIP_COLORS[r.type] + '44' }}>
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="mem-rel-info">
                    <div className="mem-rel-name">{r.name}</div>
                    <div className="mem-rel-role">{[r.role, r.company].filter(Boolean).join(' · ')}</div>
                    {r.email && <div className="mem-rel-email">{r.email}</div>}
                    {r.notes && <div className="mem-rel-notes">{r.notes.slice(0, 100)}</div>}
                    {r.tags.length > 0 && (
                      <div className="mem-tags">
                        {r.tags.map(t => <span key={t} className="mem-tag">{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="mem-rel-actions">
                    <button className="mem-icon-btn" onClick={() => onEdit(r)}>✎</button>
                    <button className="mem-icon-btn mem-icon-btn-del" onClick={() => onDelete(r.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {relationships.length === 0 && <MemEmpty label="No contacts tracked. Add key team members, clients, and partners." />}
    </div>
  );
}

// ── TIMELINE VIEW ────────────────────────────────────────────────────────────

function TimelineView({ events, onDelete }: {
  events: MemoryTimelineEvent[];
  onDelete: (id: string) => void;
}) {
  if (events.length === 0) return <MemEmpty label="No timeline events. Start documenting your founder journey." />;

  const grouped: Record<string, MemoryTimelineEvent[]> = {};
  events.forEach(e => {
    const year = e.eventDate.split('-')[0];
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(e);
  });

  const years = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="mem-section">
      {years.map(year => (
        <div key={year} className="mem-group">
          <div className="mem-group-header">
            <span className="mem-group-label" style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.24em' }}>{year}</span>
          </div>
          <div className="mem-timeline-list">
            {grouped[year].map((event, idx) => (
              <div key={event.id} className="mem-timeline-item">
                <div className="mem-timeline-spine">
                  <div className="mem-timeline-dot" style={{ background: TIMELINE_COLORS[event.type] }} />
                  {idx < grouped[year].length - 1 && <div className="mem-timeline-line" />}
                </div>
                <div className="mem-timeline-content">
                  <div className="mem-timeline-header">
                    <div>
                      <div className="mem-timeline-title">{event.title}</div>
                      <div className="mem-timeline-meta">
                        <span className="mem-timeline-type" style={{ color: TIMELINE_COLORS[event.type] }}>
                          {event.type.replace('_', ' ')}
                        </span>
                        <span className="mem-timeline-date">· {formatDate(event.eventDate)}</span>
                      </div>
                    </div>
                    <button className="mem-icon-btn mem-icon-btn-del" onClick={() => onDelete(event.id)}>✕</button>
                  </div>
                  {event.description && <div className="mem-timeline-desc">{event.description}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── PROFILE VIEW ─────────────────────────────────────────────────────────────

function ProfileView({ profile, onSave }: {
  profile: MemoryProfile | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: profile?.name ?? '',
    company: profile?.company ?? '',
    role: profile?.role ?? '',
    timezone: profile?.timezone ?? 'UTC',
    communication_style: profile?.communicationStyle ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mem-section">
      <div className="mem-profile-card">
        <div className="mem-profile-avatar">
          {form.name ? form.name.charAt(0).toUpperCase() : '?'}
        </div>
        <form onSubmit={handleSubmit} className="mem-profile-form">
          <div className="mem-form-row">
            <div className="mem-form-group">
              <label className="mem-form-label">Your Name</label>
              <input className="mem-form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Founder name" />
            </div>
            <div className="mem-form-group">
              <label className="mem-form-label">Company</label>
              <input className="mem-form-input" value={form.company} onChange={e => set('company', e.target.value)} placeholder="Acme Inc." />
            </div>
          </div>
          <div className="mem-form-row">
            <div className="mem-form-group">
              <label className="mem-form-label">Role</label>
              <input className="mem-form-input" value={form.role} onChange={e => set('role', e.target.value)} placeholder="CEO" />
            </div>
            <div className="mem-form-group">
              <label className="mem-form-label">Timezone</label>
              <input className="mem-form-input" value={form.timezone} onChange={e => set('timezone', e.target.value)} placeholder="America/New_York" />
            </div>
          </div>
          <div className="mem-form-group">
            <label className="mem-form-label">Communication Style</label>
            <select className="mem-form-select" value={form.communication_style} onChange={e => set('communication_style', e.target.value)}>
              <option value="">Select style…</option>
              <option value="direct">Direct — concise, no fluff</option>
              <option value="detailed">Detailed — comprehensive context</option>
              <option value="concise">Concise — bullet points preferred</option>
              <option value="narrative">Narrative — flowing prose</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      <div className="mem-profile-context-preview">
        <div className="mem-group-label" style={{ marginBottom: 10 }}>How NYX sees you</div>
        <div className="mem-context-block">
          <span className="mem-context-field">Name</span>
          <span className="mem-context-value">{form.name || '—'}</span>
          <span className="mem-context-field">Company</span>
          <span className="mem-context-value">{form.company || '—'}</span>
          <span className="mem-context-field">Role</span>
          <span className="mem-context-value">{form.role || '—'}</span>
          <span className="mem-context-field">Timezone</span>
          <span className="mem-context-value">{form.timezone || '—'}</span>
          <span className="mem-context-field">Style</span>
          <span className="mem-context-value">{form.communication_style || '—'}</span>
        </div>
      </div>
    </div>
  );
}

// ── ALL / RECENT VIEW ────────────────────────────────────────────────────────

function AllView({ memories, onEdit, onDelete, onPin }: {
  memories: Memory[];
  onEdit: (m: Memory) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  const pinned = memories.filter(m => m.pinned);
  const recent = memories.filter(m => !m.pinned).slice(0, 20);

  return (
    <div className="mem-section">
      {pinned.length > 0 && (
        <div className="mem-group">
          <div className="mem-group-header">
            <span className="mem-group-label" style={{ color: 'var(--gold)' }}>◆ Pinned</span>
          </div>
          <div className="mem-knowledge-grid">
            {pinned.map(m => <MemoryCard key={m.id} memory={m} onEdit={onEdit} onDelete={onDelete} onPin={onPin} />)}
          </div>
        </div>
      )}
      {recent.length > 0 && (
        <div className="mem-group">
          <div className="mem-group-header"><span className="mem-group-label">Recent</span></div>
          <div className="mem-knowledge-grid">
            {recent.map(m => <MemoryCard key={m.id} memory={m} onEdit={onEdit} onDelete={onDelete} onPin={onPin} />)}
          </div>
        </div>
      )}
      {memories.length === 0 && <MemEmpty label="Memory is empty. Start adding notes, goals, projects, and decisions." />}
    </div>
  );
}

function MemEmpty({ label }: { label: string }) {
  return (
    <div className="mem-empty">
      <div className="mem-empty-icon">◈</div>
      <div className="mem-empty-label">{label}</div>
    </div>
  );
}

// ── PAGE ─────────────────────────────────────────────────────────────────────

interface AllData {
  memories: Memory[];
  goals: MemoryGoal[];
  projects: MemoryProject[];
  decisions: MemoryDecision[];
  relationships: MemoryRelationship[];
  timeline: MemoryTimelineEvent[];
  profile: MemoryProfile | null;
}

export default function MemoryPage() {
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Memory[] | null>(null);
  const [data, setData] = useState<AllData>({
    memories: [], goals: [], projects: [], decisions: [],
    relationships: [], timeline: [], profile: null,
  });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);

  const counts = {
    goals: data.goals.filter(g => g.status === 'active').length,
    projects: data.projects.filter(p => p.status === 'active').length,
    decisions: data.decisions.length,
    knowledge: data.memories.length,
    relationships: data.relationships.length,
    timeline: data.timeline.length,
  };

  const loadAll = useCallback(async () => {
    const [memories, goals, projects, decisions, relationships, timeline, profile] = await Promise.all([
      fetch('/api/memory').then(r => r.json()),
      fetch('/api/memory/goals').then(r => r.json()),
      fetch('/api/memory/projects').then(r => r.json()),
      fetch('/api/memory/decisions').then(r => r.json()),
      fetch('/api/memory/relationships').then(r => r.json()),
      fetch('/api/memory/timeline').then(r => r.json()),
      fetch('/api/memory/profile').then(r => r.json()),
    ]);
    setData({
      memories: Array.isArray(memories) ? memories : [],
      goals: Array.isArray(goals) ? goals : [],
      projects: Array.isArray(projects) ? projects : [],
      decisions: Array.isArray(decisions) ? decisions : [],
      relationships: Array.isArray(relationships) ? relationships : [],
      timeline: Array.isArray(timeline) ? timeline : [],
      profile: profile?.id ? profile : null,
    });
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Debounced search
  useEffect(() => {
    if (!search.trim()) { setSearchResults(null); return; }
    const t = setTimeout(() => {
      fetch(`/api/memory?q=${encodeURIComponent(search)}`).then(r => r.json()).then(d => setSearchResults(Array.isArray(d) ? d : []));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function openModal(type?: Tab, editing?: Record<string, unknown>) {
    setModal({ type: type ?? tab, editing });
  }

  async function handleSave(type: string, formData: Record<string, unknown>, id?: string) {
    const isEdit = Boolean(id);
    const routes: Record<string, string> = {
      goals: '/api/memory/goals',
      projects: '/api/memory/projects',
      decisions: '/api/memory/decisions',
      knowledge: '/api/memory',
      all: '/api/memory',
      relationships: '/api/memory/relationships',
      timeline: '/api/memory/timeline',
    };
    const url = isEdit ? `${routes[type]}/${id}` : routes[type];
    const method = isEdit ? 'PATCH' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
    await loadAll();
  }

  async function handleDelete(type: string, id: string) {
    const routes: Record<string, string> = {
      goals: '/api/memory/goals', projects: '/api/memory/projects',
      decisions: '/api/memory/decisions', knowledge: '/api/memory', all: '/api/memory',
      relationships: '/api/memory/relationships',
    };
    await fetch(`${routes[type]}/${id}`, { method: 'DELETE' });
    await loadAll();
  }

  async function handleTimelineDelete(id: string) {
    await fetch('/api/memory/timeline', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    await loadAll();
  }

  async function handlePin(id: string, pinned: boolean) {
    await fetch(`/api/memory/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pinned }) });
    await loadAll();
  }

  async function handleProgressUpdate(id: string, progress: number) {
    await fetch(`/api/memory/goals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress, status: progress === 100 ? 'completed' : 'active', completed_at: progress === 100 ? new Date().toISOString() : null }) });
    setData(d => ({ ...d, goals: d.goals.map(g => g.id === id ? { ...g, progress, status: progress === 100 ? 'completed' : g.status } : g) }));
  }

  async function handleProfileSave(formData: Record<string, unknown>) {
    await fetch('/api/memory/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
    await loadAll();
  }

  const addLabels: Partial<Record<Tab, string>> = {
    all: 'Memory', goals: 'Goal', projects: 'Project', decisions: 'Decision',
    knowledge: 'Memory', relationships: 'Contact', timeline: 'Event',
  };

  const displayMemories = searchResults ?? data.memories;

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <div className="topbar-breadcrumb">
            <span>NYX</span>
            <span className="topbar-breadcrumb-sep">/</span>
            <span className="topbar-page-title">Memory</span>
          </div>
        </div>
        <div className="topbar-right">
          <div className="topbar-status">
            <span className="sdot sdot-active" />
            <span className="topbar-status-text">{data.memories.length + data.goals.length + data.projects.length + data.decisions.length} total memories</span>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Header */}
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Second Brain</h1>
            <p className="page-subtitle">Persistent context. NYX remembers your goals, projects, decisions, and knowledge — and references them in every interaction.</p>
          </div>
          {tab !== 'profile' && (
            <div className="page-header-right">
              <button className="btn btn-primary btn-sm" onClick={() => openModal()}>
                + {addLabels[tab] ?? 'Memory'}
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mem-search-row">
          <div className="mem-search-wrap">
            <span className="mem-search-icon">⌕</span>
            <input
              className="mem-search-input"
              placeholder="Search all memories…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="mem-search-clear" onClick={() => { setSearch(''); setSearchResults(null); }}>✕</button>
            )}
          </div>
          {searchResults && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '0.14em' }}>
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Tabs */}
        {!searchResults && (
          <div className="mem-tab-nav">
            {TABS.map(t => {
              const count = counts[t.id as keyof typeof counts];
              return (
                <button
                  key={t.id}
                  className={`mem-tab${tab === t.id ? ' active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                  {count !== undefined && count > 0 && <span className="mem-tab-count">{count}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Search Results */}
        {searchResults && (
          <KnowledgeView memories={searchResults} onEdit={m => openModal('knowledge', m as unknown as Record<string, unknown>)} onDelete={id => handleDelete('knowledge', id)} onPin={handlePin} />
        )}

        {/* Tab Content */}
        {!searchResults && (
          <>
            {loading ? (
              <div className="skeleton-row-group">
                {[1, 2, 3].map(i => <div key={i} className="skeleton-row" style={{ height: 100 }} />)}
              </div>
            ) : (
              <>
                {tab === 'all' && (
                  <AllView memories={displayMemories} onEdit={m => openModal('knowledge', m as unknown as Record<string, unknown>)} onDelete={id => handleDelete('all', id)} onPin={handlePin} />
                )}
                {tab === 'goals' && (
                  <GoalsView goals={data.goals} onEdit={g => openModal('goals', g as unknown as Record<string, unknown>)} onDelete={id => handleDelete('goals', id)} onProgressUpdate={handleProgressUpdate} />
                )}
                {tab === 'projects' && (
                  <ProjectsView projects={data.projects} onEdit={p => openModal('projects', p as unknown as Record<string, unknown>)} onDelete={id => handleDelete('projects', id)} />
                )}
                {tab === 'decisions' && (
                  <DecisionsView decisions={data.decisions} onEdit={d => openModal('decisions', d as unknown as Record<string, unknown>)} onDelete={id => handleDelete('decisions', id)} />
                )}
                {tab === 'knowledge' && (
                  <KnowledgeView memories={data.memories} onEdit={m => openModal('knowledge', m as unknown as Record<string, unknown>)} onDelete={id => handleDelete('knowledge', id)} onPin={handlePin} />
                )}
                {tab === 'relationships' && (
                  <RelationshipsView relationships={data.relationships} onEdit={r => openModal('relationships', r as unknown as Record<string, unknown>)} onDelete={id => handleDelete('relationships', id)} />
                )}
                {tab === 'timeline' && (
                  <TimelineView events={data.timeline} onDelete={handleTimelineDelete} />
                )}
                {tab === 'profile' && (
                  <ProfileView profile={data.profile} onSave={handleProfileSave} />
                )}
              </>
            )}
          </>
        )}
      </div>

      {modal && (
        <MemoryModal modal={modal} onClose={() => setModal(null)} onSave={handleSave} />
      )}
    </>
  );
}
