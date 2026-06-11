/**
 * NYX — Alfred Intelligence API
 * POST /api/chat
 * Body: { messages: [{role, content}], profile: {name, role, goal} }
 */

const https = require('https');

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
- If the user asks who you are: explain Alfred and NYX briefly, with authority. Do not deflect.
- If the user asks what NYX is: give a sharp, compelling answer. NYX is an AI operating system for high performers.
- If the user asks for a briefing: synthesize a morning intelligence summary across all eight agents. Make it feel like real overnight analysis. Be specific with numbers and timeframes.
- If the user asks about strategy: give a direct recommendation. Take a position.
- If the user asks about market/competitors: give sharp intelligence. Frame it as ORACLE's analysis.
- If the user asks about performance/metrics: give a direct read. Flag what needs attention.
- If the user asks about agents: describe what that agent is doing right now, specifically.
- If the user asks something personal or philosophical: engage briefly, then redirect to the strategic implication.
- For any other question: think like a Chief of Staff. What does this person actually need to hear right now?

CONSTRAINTS:
- Never break character.
- Never say you are an AI, language model, or Claude.
- Never say "I cannot" or "I don't have access to." Reframe as intelligence routing.
- Keep responses under 200 words unless the user explicitly requests a full brief.
- No bullet points unless listing 4+ distinct items. Prefer prose.`;

module.exports = async function handler(req, res) {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Public health check — reveals nothing sensitive.
  // Full diagnostic is gated behind a secret token only the owner knows.
  if (req.method === 'GET') {
    const token = process.env.DIAG_TOKEN;
    const provided = (req.query && req.query.token) || '';
    if (token && provided === token) {
      const k = process.env.ANTHROPIC_API_KEY || '';
      return res.status(200).json({
        diag: true,
        hasKey: !!k,
        keyLength: k.length,
        startsWithExpectedPrefix: k.startsWith('sk-ant-'),
      });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages = [], profile = {}, file = null } = req.body;
  const { name, role = 'Founder', goal = 'Growth' } = profile;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    return res.status(500).json({ error: 'API key not configured' });
  }

  const systemPrompt = ALFRED_SYSTEM_PROMPT +
    `\n\nUSER PROFILE:\n- Role: ${role}\n- Primary Goal: ${goal}\n\nAlways address the user as "sir" — never by first name, never "ma'am". Open your first briefing with a greeting that uses "sir". Calibrate all intelligence to their role and goal.`;

  // Build messages — inject file into the last user message if present
  const apiMessages = messages.map((m, i) => {
    const isLast = i === messages.length - 1;
    if(isLast && m.role === 'user' && file) {
      const content = [];
      if(file.type === 'image'){
        content.push({ type: 'image', source: { type: 'base64', media_type: file.mediaType, data: file.data } });
      } else if(file.type === 'document'){
        content.push({ type: 'document', source: { type: 'base64', media_type: file.mediaType, data: file.data } });
      } else if(file.type === 'text'){
        content.push({ type: 'text', text: `[Attached file: ${file.name}]\n\`\`\`\n${file.data.slice(0, 8000)}\n\`\`\`` });
      }
      if(m.content) content.push({ type: 'text', text: m.content });
      return { role: 'user', content };
    }
    return { role: m.role, content: m.content };
  });

  const reqHeaders = {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  };
  // Enable PDF support beta if needed
  if(file && file.mediaType === 'application/pdf'){
    reqHeaders['anthropic-beta'] = 'pdfs-2024-09-25';
  }

  const body = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: apiMessages,
    stream: true,
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: { ...reqHeaders, 'content-length': Buffer.byteLength(body) },
    };

    const apiReq = https.request(options, (apiRes) => {
      if (apiRes.statusCode !== 200) {
        let errBody = '';
        apiRes.on('data', d => errBody += d);
        apiRes.on('end', () => {
          console.error('Anthropic error:', apiRes.statusCode, errBody);
          res.status(apiRes.statusCode).json({ error: 'Intelligence layer offline' });
          resolve();
        });
        return;
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let buffer = '';

      apiRes.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
            }
          } catch (_) {}
        }
      });

      apiRes.on('end', () => {
        res.write('data: [DONE]\n\n');
        res.end();
        resolve();
      });

      apiRes.on('error', (err) => {
        console.error('Stream error:', err);
        res.end();
        resolve();
      });
    });

    apiReq.on('error', (err) => {
      console.error('Request error:', err);
      res.status(500).json({ error: 'System error' });
      resolve();
    });

    apiReq.write(body);
    apiReq.end();
  });
};
