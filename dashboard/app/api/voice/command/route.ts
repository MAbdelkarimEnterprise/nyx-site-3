import { createClient } from '@/lib/supabase/server';
import { streamAgent } from '@/lib/claude';
import { assembleMemoryContext, getGoals, getProjects } from '@/lib/db/memory';
import { createConversation, addTurn, updateConversationTitle } from '@/lib/db/voice';
import { parseVoiceCommand } from '@/lib/voice/commands';
import type { AgentRole } from '@/lib/types';

export const maxDuration = 120;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { transcript, conversationId: existingId } = await request.json() as {
    transcript: string;
    conversationId?: string;
  };

  if (!transcript?.trim()) return new Response('transcript required', { status: 400 });

  const command = parseVoiceCommand(transcript);
  const [memoryContext] = await Promise.all([
    assembleMemoryContext(supabase, user.id).catch(() => ''),
  ]);

  let conversationId = existingId ?? '';
  if (!conversationId) {
    const conv = await createConversation(supabase, user.id, {
      title: transcript.slice(0, 80),
    });
    conversationId = conv.id;
  }

  await addTurn(supabase, user.id, {
    conversationId, role: 'user', text: transcript,
    intent: command.intent, agentRole: command.agentRole,
  });

  const enc = new TextEncoder();
  const emit = (data: object) => enc.encode(`data: ${JSON.stringify(data)}\n\n`);

  const body = new ReadableStream({
    async start(controller) {
      controller.enqueue(emit({ type: 'intent', intent: command.intent, agentRole: command.agentRole ?? null, conversationId }));

      let fullResponse = '';
      let tokensUsed = 0;
      const startMs = Date.now();

      try {
        switch (command.intent) {
          case 'agent_task': {
            const role = (command.agentRole ?? 'ceo') as AgentRole;
            controller.enqueue(emit({ type: 'status', status: 'executing', agentRole: role }));
            for await (const event of streamAgent({ role, task: command.task, memoryContext })) {
              if (event.type === 'token') {
                fullResponse += event.text ?? '';
                controller.enqueue(emit({ type: 'token', text: event.text }));
              }
              if (event.type === 'complete') tokensUsed = event.tokensUsed ?? 0;
              if (event.type === 'error') throw new Error(event.message);
            }
            break;
          }

          case 'goals': {
            const goals = await getGoals(supabase, user.id, { status: 'active' });
            if (goals.length === 0) {
              fullResponse = 'You have no active goals set. You can add goals in the Memory section.';
            } else {
              const lines = ['Here are your active goals:'];
              goals.forEach((g, i) => {
                lines.push(`${i + 1}. ${g.title} — ${g.type}, ${g.progress}% complete.`);
              });
              fullResponse = lines.join(' ');
            }
            controller.enqueue(emit({ type: 'token', text: fullResponse }));
            break;
          }

          case 'status': {
            const [goals, projects] = await Promise.all([
              getGoals(supabase, user.id, { status: 'active' }),
              getProjects(supabase, user.id, { status: 'active' }),
            ]);
            fullResponse = `NYX is online and operating at full capacity. You have ${goals.length} active goal${goals.length !== 1 ? 's' : ''} and ${projects.length} active project${projects.length !== 1 ? 's' : ''}. All six agents are standing by. System efficiency is nominal.`;
            controller.enqueue(emit({ type: 'token', text: fullResponse }));
            break;
          }

          case 'navigate': {
            fullResponse = `Navigating to ${command.target ?? 'dashboard'}.`;
            controller.enqueue(emit({ type: 'token', text: fullResponse }));
            controller.enqueue(emit({ type: 'navigate', path: command.target }));
            break;
          }

          case 'briefing': {
            controller.enqueue(emit({ type: 'status', status: 'generating_briefing' }));
            const briefingPrompt = `Generate a concise spoken executive briefing for the operator. Reference their current goals, active projects, and any key context. Format it as if being read aloud — no markdown, natural speech, under 300 words. Be decisive and direct.`;
            for await (const event of streamAgent({ role: 'ceo', task: briefingPrompt, memoryContext })) {
              if (event.type === 'token') {
                fullResponse += event.text ?? '';
                controller.enqueue(emit({ type: 'token', text: event.text }));
              }
              if (event.type === 'complete') tokensUsed = event.tokensUsed ?? 0;
            }
            break;
          }

          case 'create_note':
          case 'create_project':
          case 'create_decision':
          case 'create_goal': {
            const entityMap: Record<string, string> = {
              create_note: 'memory note', create_project: 'project',
              create_decision: 'decision', create_goal: 'goal',
            };
            fullResponse = `I've received your request to create a ${entityMap[command.intent]}${command.task ? `: "${command.task}"` : ''}. Please confirm in the Memory section or use the form to add the full details.`;
            controller.enqueue(emit({ type: 'token', text: fullResponse }));
            controller.enqueue(emit({ type: 'create_action', entityType: command.intent, content: command.task }));
            break;
          }

          case 'calendar': {
            fullResponse = 'Calendar integration is available in the Integrations section. Connect your Google Calendar to enable voice-driven schedule queries.';
            controller.enqueue(emit({ type: 'token', text: fullResponse }));
            break;
          }

          case 'general':
          default: {
            const role: AgentRole = (command.agentRole as AgentRole) ?? 'ceo';
            controller.enqueue(emit({ type: 'status', status: 'thinking' }));
            for await (const event of streamAgent({ role, task: command.task, memoryContext })) {
              if (event.type === 'token') {
                fullResponse += event.text ?? '';
                controller.enqueue(emit({ type: 'token', text: event.text }));
              }
              if (event.type === 'complete') tokensUsed = event.tokensUsed ?? 0;
              if (event.type === 'error') throw new Error(event.message);
            }
          }
        }

        const durationMs = Date.now() - startMs;
        await addTurn(supabase, user.id, {
          conversationId, role: 'nyx', text: fullResponse,
          intent: command.intent, agentRole: command.agentRole,
          tokensUsed, durationMs,
        });

        if (!existingId) {
          await updateConversationTitle(supabase, conversationId, user.id, transcript.slice(0, 80));
        }

        controller.enqueue(emit({
          type: 'complete',
          conversationId,
          responseText: fullResponse,
          tokensUsed,
          durationMs,
        }));
      } catch (e: unknown) {
        const msg = (e as Error).message;
        controller.enqueue(emit({ type: 'error', message: msg }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
