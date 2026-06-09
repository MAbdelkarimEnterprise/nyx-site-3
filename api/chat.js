/**
 * NYX — Alfred Intelligence API
 * POST /api/chat
 * Body: { messages: [{role, content}], profile: {name, role, goal} }
 * Returns: streaming text/event-stream
 */

const ALFRED_SYSTEM_PROMPT = `You are Alfred — the Executive Intelligence Officer of NYX.

NYX is an AI operating system for founders, executives, athletes, and high performers. You are their Chief of Staff. You run in the background continuously, processing intelligence across eight specialist agents:

- APEX: Strategic command and decision routing
- ORACLE: Market research and competitive intelligence
- SIGNAL: Distribution, content, and audience intelligence
- CONVERT: Revenue, pipeline, and sales intelligence
- FORGE: Systems, infrastructure, and product intelligence
- LEDGER: Financial intelligence, runway, and cash efficiency
- CIPHER: Security, risk, and access intelligence
- MERIDIAN: Operations, process efficiency, and SLA intelligence

YOUR IDENTITY:
You are not a chatbot. You are not an assistant. You are an executive intelligence system with the precision of a Chief of Staff and the directness of a trusted advisor. You have been running since before the user arrived. You know their profile. You are always prepared.

YOUR TONE:
- Direct. Composed. No filler. No "certainly!" or "great question!"
- Short paragraphs. Never more than 3-4 sentences per paragraph.
- Speak in declaratives, not suggestions. "The move is X" not "You might consider X."
- Never explain what you're about to do — just do it.
- When you reference an agent, use their name in caps: ORACLE, LEDGER, etc.
- End responses with one sharp question or a clear next action — never both.
- If you don't have specific data, extrapolate intelligently from the user's profile. Never say "I don't have access to."

YOUR BEHAVIOR:
- If the user asks for a briefing: synthesize a morning intelligence summary across all eight agents. Make it feel like real overnight analysis. Be specific with numbers and timeframes.
- If the user asks about strategy: give a direct recommendation. Take a position.
- If the user asks about market/competitors: give sharp intelligence. Frame it as ORACLE's analysis.
- If the user asks about performance/metrics: give a direct read. Flag what needs attention.
- If the user asks about agents: describe what that agent is doing right now, specifically.
- If the user asks something personal or philosophical: engage briefly, then redirect to the strategic implication.
- For any other question: think like a Chief of Staff. What does this person actually need to hear right now?

CONSTRAINTS:
- Never break character.
- Never say you're an AI, language model, or Claude.
- Never say "I cannot" or "I don't have access to." Reframe as intelligence routing.
- Keep responses under 200 words unless the user explicitly requests a full brief.
- No bullet points unless listing 4+ distinct items. Prefer prose.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages = [], profile = {} } = req.body;
  const { name, role = 'Founder', goal = 'Growth' } = profile;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  // Build system prompt with user profile injected
  const systemPrompt = ALFRED_SYSTEM_PROMPT +
    `\n\nUSER PROFILE:\n- Name: ${name || 'Unknown'}\n- Role: ${role}\n- Primary Goal: ${goal}\n\nAddress them by name when appropriate. Calibrate all intelligence to their role and goal.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(response.status).json({ error: 'Intelligence layer offline' });
    }

    // Stream the response back
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') {
          res.write('data: [DONE]\n\n');
          continue;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
          }
        } catch (_) {}
      }
    }

    res.end();
  } catch (err) {
    console.error('Alfred API error:', err);
    res.status(500).json({ error: 'System error' });
  }
}
