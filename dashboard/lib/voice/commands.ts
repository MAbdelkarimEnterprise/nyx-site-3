import type { AgentRole } from '@/lib/types';

export type VoiceIntent =
  | 'agent_task'
  | 'briefing'
  | 'goals'
  | 'calendar'
  | 'status'
  | 'navigate'
  | 'create_note'
  | 'create_project'
  | 'create_decision'
  | 'create_goal'
  | 'general';

export interface ParsedCommand {
  intent: VoiceIntent;
  agentRole?: AgentRole;
  task: string;
  target?: string;
  raw: string;
}

const AGENT_KEYWORDS: [string[], AgentRole][] = [
  [['research agent', 'oracle', 'research', 'investigate', 'analyze competitors', 'scan the market', 'look up', 'find out about'], 'research'],
  [['marketing agent', 'signal', 'marketing', 'content ideas', 'campaign', 'social media', 'copy', 'growth'], 'marketing'],
  [['ceo agent', 'apex', 'strategic summary', 'executive summary', 'synthesize', 'big picture'], 'ceo'],
  [['sales agent', 'convert', 'pipeline', 'deals', 'prospects', 'outbound', 'revenue opportunities'], 'sales'],
  [['developer agent', 'forge', 'engineering', 'code review', 'technical', 'architecture', 'security'], 'developer'],
  [['finance agent', 'ledger', 'burn rate', 'runway', 'financial', 'budget', 'p&l'], 'finance'],
];

const NAV_TARGETS: [RegExp, string][] = [
  [/\b(workflow|workflows)\b/, '/workflows'],
  [/\b(agent|agents)\b/, '/agents'],
  [/\b(task|tasks)\b/, '/tasks'],
  [/\b(execution|executions|logs)\b/, '/executions'],
  [/\b(brief|briefing|briefings)\b/, '/briefings'],
  [/\b(integration|integrations|gmail|calendar|drive|notion)\b/, '/integrations'],
  [/\b(memory|notes|knowledge|brain)\b/, '/memory'],
  [/\b(voice)\b/, '/voice'],
];

function extractTask(t: string, keyword: string): string {
  const patterns = [
    new RegExp(`.*${keyword}[,.]?\\s*(to|and|please)?\\s*`, 'i'),
    /^(ask|tell|have|get)\s+\w+\s+(to|and)\s*/i,
  ];
  let result = t;
  for (const p of patterns) {
    result = result.replace(p, '').trim();
  }
  return result || t;
}

export function parseVoiceCommand(transcript: string): ParsedCommand {
  const t = transcript.toLowerCase().trim();

  // Agent delegation — check longest keyword first for specificity
  const sorted = [...AGENT_KEYWORDS].sort((a, b) => {
    const aMax = Math.max(...a[0].map(k => k.length));
    const bMax = Math.max(...b[0].map(k => k.length));
    return bMax - aMax;
  });

  for (const [keywords, role] of sorted) {
    for (const kw of keywords) {
      if (t.includes(kw)) {
        return { intent: 'agent_task', agentRole: role, task: extractTask(t, kw), raw: transcript };
      }
    }
  }

  // Morning briefing
  if (/\b(morning brief|executive brief|daily brief|generate brief|read briefing)\b/.test(t)) {
    return { intent: 'briefing', task: transcript, raw: transcript };
  }

  // Goals / priorities
  if (/\b(goals?|priorities|what.?s my focus|what should i focus|today.?s objectives|what.?s important)\b/.test(t)) {
    return { intent: 'goals', task: transcript, raw: transcript };
  }

  // Calendar
  if (/\b(meetings?|calendar|schedule|agenda|events? today|what.?s on)\b/.test(t)) {
    return { intent: 'calendar', task: transcript, raw: transcript };
  }

  // Navigation
  if (/\b(open|show me|go to|navigate to|take me to)\b/.test(t)) {
    for (const [pattern, path] of NAV_TARGETS) {
      if (pattern.test(t)) {
        return { intent: 'navigate', task: transcript, target: path, raw: transcript };
      }
    }
  }

  // Memory creation
  if (/\b(remember that|make a note|save this|log this|note that)\b/.test(t)) {
    if (/\bproject\b/.test(t)) return { intent: 'create_project', task: extractCreationContent(t), raw: transcript };
    if (/\bdecision\b/.test(t)) return { intent: 'create_decision', task: extractCreationContent(t), raw: transcript };
    if (/\bgoal\b/.test(t)) return { intent: 'create_goal', task: extractCreationContent(t), raw: transcript };
    return { intent: 'create_note', task: extractCreationContent(t), raw: transcript };
  }

  if (/\bcreate (a )?new project\b/.test(t)) return { intent: 'create_project', task: t.replace(/create (a )?new project/i, '').trim(), raw: transcript };
  if (/\bcreate (a )?new goal\b/.test(t)) return { intent: 'create_goal', task: t.replace(/create (a )?new goal/i, '').trim(), raw: transcript };
  if (/\blog (a )?decision\b/.test(t)) return { intent: 'create_decision', task: t.replace(/log (a )?decision/i, '').trim(), raw: transcript };

  // System status
  if (/\b(system status|how is nyx|nyx status|are you (online|working|running))\b/.test(t)) {
    return { intent: 'status', task: transcript, raw: transcript };
  }

  // Default: CEO agent general query
  return { intent: 'general', agentRole: 'ceo', task: transcript, raw: transcript };
}

function extractCreationContent(t: string): string {
  return t
    .replace(/\b(remember that|make a note|save this|log this|note that|create (a )?new (project|goal|decision)|log (a )?decision)\b/gi, '')
    .trim();
}

export const INTENT_LABELS: Record<VoiceIntent, string> = {
  agent_task: 'Agent Task',
  briefing: 'Executive Briefing',
  goals: 'Goals Query',
  calendar: 'Calendar Query',
  status: 'System Status',
  navigate: 'Navigation',
  create_note: 'Create Note',
  create_project: 'Create Project',
  create_decision: 'Log Decision',
  create_goal: 'Create Goal',
  general: 'General Query',
};
