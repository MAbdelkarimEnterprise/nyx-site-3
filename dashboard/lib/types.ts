// ── WORKFLOW TYPES ──────────────────────────────────────────────────────────

export type WorkflowStatus = 'active' | 'paused' | 'running' | 'error' | 'completed';
export type WorkflowTrigger = 'manual' | 'scheduled' | 'webhook' | 'event';

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  schedule: string | null;
  status: WorkflowStatus;
  lastRun: string | null;
  nextRun: string | null;
  agentIds: string[];
  runCount: number;
  successRate: number;
  avgDuration: number;
  createdAt: string;
  tags: string[];
}

export interface DbWorkflow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  trigger: WorkflowTrigger;
  schedule: string | null;
  status: WorkflowStatus;
  last_run: string | null;
  next_run: string | null;
  agent_ids: string[];
  run_count: number;
  success_rate: number;
  avg_duration: number;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export function mapWorkflow(db: DbWorkflow): Workflow {
  return {
    id: db.id,
    name: db.name,
    description: db.description ?? '',
    trigger: db.trigger,
    schedule: db.schedule,
    status: db.status,
    lastRun: db.last_run,
    nextRun: db.next_run,
    agentIds: db.agent_ids ?? [],
    runCount: db.run_count,
    successRate: Number(db.success_rate),
    avgDuration: db.avg_duration,
    createdAt: db.created_at,
    tags: db.tags ?? [],
  };
}

// ── AGENT TYPES ─────────────────────────────────────────────────────────────

export type AgentStatus = 'active' | 'idle' | 'busy' | 'offline';
export type AgentRole = 'ceo' | 'research' | 'marketing' | 'sales' | 'finance' | 'developer';

export interface AgentMetrics {
  tasksCompleted: number;
  successRate: number;
  avgResponseTime: number;
  tokensUsed: number;
  uptime: number;
}

export interface AgentActivity {
  id: string;
  timestamp: string;
  action: string;
  result: string;
  status: 'success' | 'info' | 'warn';
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  purpose: string;
  status: AgentStatus;
  currentTask: string | null;
  metrics: AgentMetrics;
  recentActivity: AgentActivity[];
  model: string;
  capabilities: string[];
  lastActive: string;
}

export interface DbAgent {
  id: string;
  user_id: string;
  name: string;
  role: AgentRole;
  purpose: string | null;
  status: AgentStatus;
  model: string;
  capabilities: string[];
  current_task: string | null;
  last_active: string | null;
  metrics: AgentMetrics;
  recent_activity: AgentActivity[];
  created_at: string;
  updated_at: string;
}

export function mapAgent(db: DbAgent): Agent {
  return {
    id: db.id,
    name: db.name,
    role: db.role,
    purpose: db.purpose ?? '',
    status: db.status,
    currentTask: db.current_task,
    metrics: db.metrics ?? { tasksCompleted: 0, successRate: 100, avgResponseTime: 0, tokensUsed: 0, uptime: 100 },
    recentActivity: db.recent_activity ?? [],
    model: db.model,
    capabilities: db.capabilities ?? [],
    lastActive: db.last_active ?? db.updated_at,
  };
}

// ── TASK TYPES ───────────────────────────────────────────────────────────────

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  agentId: string;
  agentName: string;
  dueDate: string;
  status: TaskStatus;
  workflowId: string | null;
  tags: string[];
  createdAt: string;
}

export interface DbTask {
  id: string;
  user_id: string;
  workflow_id: string | null;
  agent_id: string | null;
  agent_name: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export function mapTask(db: DbTask): Task {
  return {
    id: db.id,
    title: db.title,
    description: db.description ?? '',
    priority: db.priority,
    agentId: db.agent_id ?? '',
    agentName: db.agent_name ?? 'Unassigned',
    dueDate: db.due_date ?? '',
    status: db.status,
    workflowId: db.workflow_id,
    tags: db.tags ?? [],
    createdAt: db.created_at,
  };
}

// ── EXECUTION TYPES ──────────────────────────────────────────────────────────

export type ExecutionStatus = 'running' | 'success' | 'failed' | 'cancelled';

export interface ExecutionLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  agentName?: string;
}

export interface Execution {
  id: string;
  workflowId: string;
  workflowName: string;
  agentNames: string[];
  startTime: string;
  endTime: string | null;
  status: ExecutionStatus;
  duration: number | null;
  result: string | null;
  logs: ExecutionLog[];
  triggeredBy: 'schedule' | 'manual' | 'webhook';
  tokensUsed: number;
  outputSummary: string | null;
}

export interface DbExecution {
  id: string;
  user_id: string;
  workflow_id: string | null;
  workflow_name: string;
  agent_names: string[];
  status: ExecutionStatus;
  triggered_by: 'schedule' | 'manual' | 'webhook';
  start_time: string;
  end_time: string | null;
  duration: number | null;
  result: string | null;
  output_summary: string | null;
  tokens_used: number;
  logs: ExecutionLog[];
  created_at: string;
}

export function mapExecution(db: DbExecution): Execution {
  return {
    id: db.id,
    workflowId: db.workflow_id ?? '',
    workflowName: db.workflow_name,
    agentNames: db.agent_names ?? [],
    startTime: db.start_time,
    endTime: db.end_time,
    status: db.status,
    duration: db.duration,
    result: db.result,
    logs: db.logs ?? [],
    triggeredBy: db.triggered_by,
    tokensUsed: db.tokens_used,
    outputSummary: db.output_summary,
  };
}

// ── BRIEFING TYPES ───────────────────────────────────────────────────────────

export type BriefingSectionType =
  | 'priorities'
  | 'calendar'
  | 'emails'
  | 'projects'
  | 'recommendations'
  | 'risks'
  | 'opportunities';

export interface BriefingItem {
  id: string;
  content: string;
  source?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  time?: string;
  tags?: string[];
}

export interface BriefingSection {
  id: string;
  title: string;
  type: BriefingSectionType;
  items: BriefingItem[];
  summary?: string;
}

export interface Briefing {
  date: string;
  classification: string;
  generatedAt: string;
  generatedBy: string;
  executiveSummary: string;
  systemScore: number;
  sections: BriefingSection[];
}

export interface DbBriefing {
  id: string;
  user_id: string;
  date: string;
  classification: string;
  executive_summary: string | null;
  system_score: number;
  sections: BriefingSection[];
  generated_by: string | null;
  generated_at: string;
  created_at: string;
}

export function mapBriefing(db: DbBriefing): Briefing & { id: string } {
  return {
    id: db.id,
    date: db.date,
    classification: db.classification,
    generatedAt: db.generated_at,
    generatedBy: db.generated_by ?? 'NYX Intelligence Engine',
    executiveSummary: db.executive_summary ?? '',
    systemScore: db.system_score,
    sections: db.sections ?? [],
  };
}

// ── MEMORY TYPES ─────────────────────────────────────────────────────────────

export interface MemoryProfile {
  id: string;
  userId: string;
  name: string | null;
  company: string | null;
  role: string | null;
  timezone: string;
  communicationStyle: 'direct' | 'detailed' | 'concise' | 'narrative' | null;
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type MemoryCategory = 'note' | 'document' | 'research' | 'meeting' | 'sop' | 'knowledge';

export interface Memory {
  id: string;
  userId: string;
  category: MemoryCategory;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  relatedIds: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type GoalType = 'daily' | 'weekly' | 'quarterly' | 'longterm';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';

export interface MemoryGoal {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  type: GoalType;
  status: GoalStatus;
  progress: number;
  dueDate: string | null;
  completedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 'active' | 'planning' | 'completed' | 'archived';

export interface ProjectMilestone {
  id: string;
  title: string;
  done: boolean;
  dueDate?: string;
}

export interface ProjectDeliverable {
  id: string;
  title: string;
  done: boolean;
}

export interface MemoryProject {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  milestones: ProjectMilestone[];
  deliverables: ProjectDeliverable[];
  tags: string[];
  startDate: string | null;
  endDate: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type DecisionImpact = 'low' | 'medium' | 'high' | 'critical';

export interface MemoryDecision {
  id: string;
  userId: string;
  title: string;
  what: string;
  why: string | null;
  impact: DecisionImpact;
  relatedProjectIds: string[];
  tags: string[];
  decidedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type RelationshipType = 'team' | 'client' | 'investor' | 'partner' | 'contact';

export interface MemoryRelationship {
  id: string;
  userId: string;
  name: string;
  role: string | null;
  type: RelationshipType;
  company: string | null;
  email: string | null;
  notes: string | null;
  tags: string[];
  lastInteraction: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type TimelineEventType = 'milestone' | 'decision' | 'achievement' | 'project_start' | 'project_end' | 'note';

export interface MemoryTimelineEvent {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  type: TimelineEventType;
  eventDate: string;
  relatedIds: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
}

// DB Row types (snake_case)

export interface DbMemoryProfile {
  id: string; user_id: string; name: string | null; company: string | null;
  role: string | null; timezone: string; communication_style: string | null;
  preferences: Record<string, unknown>; created_at: string; updated_at: string;
}

export interface DbMemory {
  id: string; user_id: string; category: MemoryCategory; title: string; content: string;
  tags: string[]; pinned: boolean; related_ids: string[];
  metadata: Record<string, unknown>; created_at: string; updated_at: string;
}

export interface DbMemoryGoal {
  id: string; user_id: string; title: string; description: string | null;
  type: GoalType; status: GoalStatus; progress: number; due_date: string | null;
  completed_at: string | null; metadata: Record<string, unknown>;
  created_at: string; updated_at: string;
}

export interface DbMemoryProject {
  id: string; user_id: string; name: string; description: string | null;
  status: ProjectStatus; milestones: ProjectMilestone[]; deliverables: ProjectDeliverable[];
  tags: string[]; start_date: string | null; end_date: string | null;
  metadata: Record<string, unknown>; created_at: string; updated_at: string;
}

export interface DbMemoryDecision {
  id: string; user_id: string; title: string; what: string; why: string | null;
  impact: DecisionImpact; related_project_ids: string[]; tags: string[];
  decided_at: string; created_at: string; updated_at: string;
}

export interface DbMemoryRelationship {
  id: string; user_id: string; name: string; role: string | null; type: RelationshipType;
  company: string | null; email: string | null; notes: string | null; tags: string[];
  last_interaction: string | null; metadata: Record<string, unknown>;
  created_at: string; updated_at: string;
}

export interface DbMemoryTimelineEvent {
  id: string; user_id: string; title: string; description: string | null;
  type: TimelineEventType; event_date: string; related_ids: string[];
  metadata: Record<string, unknown>; created_at: string;
}

// Mappers

export function mapMemoryProfile(db: DbMemoryProfile): MemoryProfile {
  return {
    id: db.id, userId: db.user_id, name: db.name, company: db.company, role: db.role,
    timezone: db.timezone ?? 'UTC',
    communicationStyle: db.communication_style as MemoryProfile['communicationStyle'],
    preferences: db.preferences ?? {}, createdAt: db.created_at, updatedAt: db.updated_at,
  };
}

export function mapMemory(db: DbMemory): Memory {
  return {
    id: db.id, userId: db.user_id, category: db.category, title: db.title, content: db.content,
    tags: db.tags ?? [], pinned: db.pinned ?? false, relatedIds: db.related_ids ?? [],
    metadata: db.metadata ?? {}, createdAt: db.created_at, updatedAt: db.updated_at,
  };
}

export function mapMemoryGoal(db: DbMemoryGoal): MemoryGoal {
  return {
    id: db.id, userId: db.user_id, title: db.title, description: db.description,
    type: db.type, status: db.status, progress: db.progress ?? 0,
    dueDate: db.due_date, completedAt: db.completed_at,
    metadata: db.metadata ?? {}, createdAt: db.created_at, updatedAt: db.updated_at,
  };
}

export function mapMemoryProject(db: DbMemoryProject): MemoryProject {
  return {
    id: db.id, userId: db.user_id, name: db.name, description: db.description,
    status: db.status, milestones: db.milestones ?? [], deliverables: db.deliverables ?? [],
    tags: db.tags ?? [], startDate: db.start_date, endDate: db.end_date,
    metadata: db.metadata ?? {}, createdAt: db.created_at, updatedAt: db.updated_at,
  };
}

export function mapMemoryDecision(db: DbMemoryDecision): MemoryDecision {
  return {
    id: db.id, userId: db.user_id, title: db.title, what: db.what, why: db.why,
    impact: db.impact, relatedProjectIds: db.related_project_ids ?? [],
    tags: db.tags ?? [], decidedAt: db.decided_at,
    createdAt: db.created_at, updatedAt: db.updated_at,
  };
}

export function mapMemoryRelationship(db: DbMemoryRelationship): MemoryRelationship {
  return {
    id: db.id, userId: db.user_id, name: db.name, role: db.role, type: db.type,
    company: db.company, email: db.email, notes: db.notes, tags: db.tags ?? [],
    lastInteraction: db.last_interaction, metadata: db.metadata ?? {},
    createdAt: db.created_at, updatedAt: db.updated_at,
  };
}

export function mapMemoryTimelineEvent(db: DbMemoryTimelineEvent): MemoryTimelineEvent {
  return {
    id: db.id, userId: db.user_id, title: db.title, description: db.description,
    type: db.type, eventDate: db.event_date, relatedIds: db.related_ids ?? [],
    metadata: db.metadata ?? {}, createdAt: db.created_at,
  };
}

// ── VOICE TYPES ──────────────────────────────────────────────────────────────

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface VoiceConversation {
  id: string;
  userId: string;
  title: string | null;
  linkedProjectId: string | null;
  linkedGoalId: string | null;
  linkedDecisionId: string | null;
  turnCount: number;
  summary: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceTurn {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'nyx';
  text: string;
  intent: string | null;
  agentRole: string | null;
  tokensUsed: number;
  durationMs: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DbVoiceConversation {
  id: string; user_id: string; title: string | null;
  linked_project_id: string | null; linked_goal_id: string | null;
  linked_decision_id: string | null;
  turn_count: number; summary: string | null;
  metadata: Record<string, unknown>; created_at: string; updated_at: string;
}

export interface DbVoiceTurn {
  id: string; conversation_id: string; user_id: string;
  role: 'user' | 'nyx'; text: string; intent: string | null;
  agent_role: string | null; tokens_used: number | null; duration_ms: number | null;
  metadata: Record<string, unknown>; created_at: string;
}

// ── AUTONOMY & CONTROL TYPES ─────────────────────────────────────────────────

export type AutonomyMode = 'suggest' | 'approval' | 'autonomous';

export interface SystemHealth {
  agentCount: number;
  activeAgents: number;
  workflowCount: number;
  runningWorkflows: number;
  totalExecutions: number;
  successRate: number;
  avgDuration: number;
  tokensUsedToday: number;
  alerts: SystemAlert[];
  autonomyMode: AutonomyMode;
}

export interface SystemAlert {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  source: string;
  timestamp: string;
  resolved: boolean;
}

// ── AGENT DELEGATION TYPES ───────────────────────────────────────────────────

export interface AgentDelegation {
  id: string;
  fromRole: AgentRole;
  toRole: AgentRole;
  task: string;
  context: string | null;
  output: string;
  tokensUsed: number;
  durationMs: number;
  parentExecutionId: string | null;
  createdAt: string;
}

export const AGENT_TOOL_PERMISSIONS: Record<AgentRole, string[]> = {
  ceo:       ['research.scan', 'memory.read', 'memory.write', 'delegate.all', 'briefing.generate', 'workflow.trigger'],
  research:  ['memory.read', 'memory.write', 'knowledge.search', 'delegate.none'],
  marketing: ['memory.read', 'memory.write', 'knowledge.search', 'delegate.research'],
  sales:     ['memory.read', 'memory.write', 'knowledge.search', 'delegate.research'],
  finance:   ['memory.read', 'memory.write', 'knowledge.search', 'delegate.none'],
  developer: ['memory.read', 'memory.write', 'knowledge.search', 'delegate.none'],
};

// ── WORKFLOW TEMPLATE TYPES ──────────────────────────────────────────────────

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'intelligence' | 'marketing' | 'sales' | 'finance' | 'engineering' | 'operations';
  trigger: WorkflowTrigger;
  schedule: string | null;
  estimatedDuration: number;
  agentRoles: AgentRole[];
  tags: string[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'morning-briefing',
    name: 'Morning Intelligence Briefing',
    description: 'Daily competitive scan, content strategy, and executive synthesis across Research → Marketing → CEO',
    category: 'intelligence',
    trigger: 'scheduled',
    schedule: '0 7 * * 1-5',
    estimatedDuration: 180,
    agentRoles: ['research', 'marketing', 'ceo'],
    tags: ['daily', 'intelligence', 'briefing'],
  },
  {
    id: 'weekly-performance',
    name: 'Weekly Performance Review',
    description: 'Finance + Sales pipeline health check with CEO synthesis and recommended actions',
    category: 'operations',
    trigger: 'scheduled',
    schedule: '0 9 * * 1',
    estimatedDuration: 240,
    agentRoles: ['finance', 'sales', 'ceo'],
    tags: ['weekly', 'performance', 'review'],
  },
  {
    id: 'competitive-sprint',
    name: 'Competitive Analysis Sprint',
    description: 'Deep competitive intelligence scan with actionable positioning recommendations',
    category: 'intelligence',
    trigger: 'manual',
    schedule: null,
    estimatedDuration: 120,
    agentRoles: ['research', 'marketing'],
    tags: ['competitive', 'analysis', 'positioning'],
  },
  {
    id: 'content-calendar',
    name: 'Content Calendar Planning',
    description: 'Research-driven content strategy with 30-day editorial calendar',
    category: 'marketing',
    trigger: 'scheduled',
    schedule: '0 10 * * 1',
    estimatedDuration: 150,
    agentRoles: ['research', 'marketing'],
    tags: ['content', 'calendar', 'marketing'],
  },
  {
    id: 'sales-pipeline',
    name: 'Sales Pipeline Review',
    description: 'Pipeline health analysis, deal risk assessment, and next-step recommendations',
    category: 'sales',
    trigger: 'scheduled',
    schedule: '0 8 * * 5',
    estimatedDuration: 120,
    agentRoles: ['sales', 'ceo'],
    tags: ['sales', 'pipeline', 'revenue'],
  },
  {
    id: 'finance-health',
    name: 'Finance Health Check',
    description: 'Burn rate, runway, scenario modeling, and financial risk assessment',
    category: 'finance',
    trigger: 'manual',
    schedule: null,
    estimatedDuration: 90,
    agentRoles: ['finance'],
    tags: ['finance', 'runway', 'burn'],
  },
  {
    id: 'engineering-audit',
    name: 'Engineering Architecture Audit',
    description: 'Technical debt assessment, security posture review, and performance analysis',
    category: 'engineering',
    trigger: 'manual',
    schedule: null,
    estimatedDuration: 120,
    agentRoles: ['developer', 'ceo'],
    tags: ['engineering', 'architecture', 'security'],
  },
];

// ── DEVICE SUPPORT TYPES ─────────────────────────────────────────────────────

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'wearable';
export type InputMethod = 'microphone' | 'bluetooth' | 'airpods' | 'keyboard';

export interface VoiceDevice {
  deviceType: DeviceType;
  platform: 'web' | 'ios' | 'android' | 'macos' | 'windows';
  inputMethod: InputMethod;
  userAgent?: string;
}
