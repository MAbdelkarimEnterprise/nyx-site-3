import type { AgentRole } from '@/lib/types';

export interface WorkflowStep {
  id: string;
  label: string;
  agentRole: AgentRole;
  promptTemplate: string;
  outputKey: string;
}

const TODAY = () => new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

export const MORNING_BRIEFING_STEPS: WorkflowStep[] = [
  {
    id: 'research-scan',
    label: 'Competitive Intelligence Scan',
    agentRole: 'research',
    outputKey: 'research_output',
    promptTemplate: `Today is {{date}}.

Conduct your morning intelligence scan. Analyze:

1. **AI Automation Landscape** — Key developments in agentic AI, workflow automation, and AI-powered SaaS. What signals emerged recently?

2. **Competitor Watch** — Assessment of key players in the autonomous AI space: Relay, Make, Zapier, n8n, Lindy, Respell, Bardeen. What are they doing? What are they not doing?

3. **Market Signals** — Investment patterns, talent movements, enterprise adoption signals. What does the money and people flow indicate?

4. **Technology Frontier** — Notable model releases, capability improvements, or infrastructure shifts that change what's possible.

5. **Risk Factors** — Regulatory developments, competitive threats, or market headwinds that require attention.

6. **Opportunities** — Specific windows of opportunity based on today's intelligence. Time-sensitive items first.

Provide substantive analysis with specific observations. Confidence level for each major claim.`,
  },
  {
    id: 'marketing-strategy',
    label: 'Content & Growth Strategy',
    agentRole: 'marketing',
    outputKey: 'marketing_output',
    promptTemplate: `Today is {{date}}.

Based on the following competitive intelligence:

---
{{research_output}}
---

Develop today's content and growth strategy for NYX.

## Content Ideas (5 specific ideas)
For each idea:
- **Title** — Specific, not generic
- **Format** — (LinkedIn post / Thread / Essay / Demo / Case study / etc.)
- **Target Audience** — Who specifically
- **Core Message** — One sentence
- **Connection to Intelligence** — Why this message lands today

## Distribution Strategy
Which channels to hit today and in what order.

## Positioning Angle
Based on today's intelligence, what is NYX's single strongest positioning argument right now? One paragraph.

## 48-Hour Action Plan
Three specific marketing actions for the next 48 hours.`,
  },
  {
    id: 'ceo-synthesis',
    label: 'Executive Synthesis',
    agentRole: 'ceo',
    outputKey: 'ceo_summary',
    promptTemplate: `Today is {{date}}.

You have received your morning intelligence reports:

## RESEARCH INTELLIGENCE
{{research_output}}

## MARKETING RECOMMENDATIONS
{{marketing_output}}

Synthesize into a decisive executive brief.

## Strategic Position
Where does NYX stand right now? One sharp paragraph.

## Today's Top 3 Priorities
Specific. Actionable. Nothing generic. What must happen today?

## Decisions Required
What decisions does the operator need to make in the next 24 hours? List each with context and recommended direction.

## Risk Radar
What could materially hurt us this week? Be specific.

## Opportunity Window
One time-sensitive opportunity that requires action. Why now. What action.

## Command Directive
One sentence. The single most important thing to execute today.

Be direct. This brief drives real decisions.`,
  },
];

export function substituteTemplateVars(
  template: string,
  vars: Record<string, string>
): string {
  let result = template.replace('{{date}}', TODAY());
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}
