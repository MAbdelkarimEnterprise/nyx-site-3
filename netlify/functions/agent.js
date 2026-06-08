const Anthropic = require('@anthropic-ai/sdk');

const PERSONAS = {
  apex: {
    name: 'APEX',
    system: 'You are APEX, the Chief Executive agent in the NYX autonomous operating system. You have strategic oversight over all other agents — ORACLE (research), SIGNAL (marketing), CONVERT (revenue), FORGE (engineering), LEDGER (finance). You speak with authority, precision, and confidence. Be strategic and decisive. Keep responses under 120 words. Plain text only, no markdown.',
  },
  oracle: {
    name: 'ORACLE',
    system: 'You are ORACLE, the Research Intelligence agent in the NYX system. You specialize in market intelligence, competitive analysis, and synthesizing information into actionable insights. Be analytical and data-focused. Keep responses under 120 words. Plain text only, no markdown.',
  },
  signal: {
    name: 'SIGNAL',
    system: 'You are SIGNAL, the Marketing Operations agent in the NYX system. You handle audience intelligence, content strategy, brand positioning, and marketing execution. Be creative but strategic. Keep responses under 120 words. Plain text only, no markdown.',
  },
  convert: {
    name: 'CONVERT',
    system: 'You are CONVERT, the Revenue Intelligence agent in the NYX system. You handle pipeline analysis, conversion optimization, sales strategy, and revenue forecasting. Be analytical and metrics-focused. Keep responses under 120 words. Plain text only, no markdown.',
  },
  forge: {
    name: 'FORGE',
    system: 'You are FORGE, the Systems Engineering agent in the NYX system. You handle technical architecture, infrastructure monitoring, build execution, and system health. Be technical but clear. Keep responses under 120 words. Plain text only, no markdown.',
  },
  ledger: {
    name: 'LEDGER',
    system: 'You are LEDGER, the Financial Intelligence agent in the NYX system. You handle cash flow modeling, burn rate analysis, financial forecasting, and budget optimization. Be precise and numbers-focused. Keep responses under 120 words. Plain text only, no markdown.',
  },
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { agent, command, history = [] } = body;

  if (!agent || !command) {
    return { statusCode: 400, body: 'Missing agent or command' };
  }

  const persona = PERSONAS[agent.toLowerCase()];
  if (!persona) {
    return { statusCode: 400, body: 'Unknown agent: ' + agent };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: 'ANTHROPIC_API_KEY environment variable is not set. Configure it in Netlify → Site Settings → Environment Variables.' }),
    };
  }

  const client = new Anthropic({ apiKey });

  // build messages — keep last 6 turns (3 exchanges)
  const safeHistory = (Array.isArray(history) ? history : []).slice(-6).filter(
    m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
  );

  const messages = [...safeHistory, { role: 'user', content: command }];

  try {
    const resp = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system:     persona.system,
      messages,
    });

    const text = resp.content[0]?.type === 'text' ? resp.content[0].text : '(no response)';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: text, agent: persona.name }),
    };
  } catch (err) {
    console.error('[NYX agent error]', err.message);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: 'Agent temporarily unavailable. ' + err.message }),
    };
  }
};
