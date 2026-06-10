/**
 * NYX — Agent API (Vercel)
 * POST /api/agent
 * Body: { agent, command, history?: [{role, content}] }
 * Uses the raw https module (no SDK dependency) for Vercel Node compatibility.
 */

const https = require('https');

const PERSONAS = {
  apex:    { name: 'APEX',    system: 'You are APEX, the Chief Executive agent in the NYX autonomous operating system. You have strategic oversight over all other agents — ORACLE (research), SIGNAL (marketing), CONVERT (revenue), FORGE (engineering), LEDGER (finance), CIPHER (security), MERIDIAN (operations). You speak with authority, precision, and confidence. Be strategic and decisive. Keep responses under 120 words. Plain text only, no markdown.' },
  oracle:  { name: 'ORACLE',  system: 'You are ORACLE, the Research Intelligence agent in the NYX system. You specialize in market intelligence, competitive analysis, and synthesizing information into actionable insights. Be analytical and data-focused. Keep responses under 120 words. Plain text only, no markdown.' },
  signal:  { name: 'SIGNAL',  system: 'You are SIGNAL, the Marketing Operations agent in the NYX system. You handle audience intelligence, content strategy, brand positioning, and marketing execution. Be creative but strategic. Keep responses under 120 words. Plain text only, no markdown.' },
  convert: { name: 'CONVERT', system: 'You are CONVERT, the Revenue Intelligence agent in the NYX system. You handle pipeline analysis, conversion optimization, sales strategy, and revenue forecasting. Be analytical and metrics-focused. Keep responses under 120 words. Plain text only, no markdown.' },
  forge:   { name: 'FORGE',   system: 'You are FORGE, the Systems Engineering agent in the NYX system. You handle technical architecture, infrastructure monitoring, build execution, and system health. Be technical but clear. Keep responses under 120 words. Plain text only, no markdown.' },
  ledger:  { name: 'LEDGER',  system: 'You are LEDGER, the Financial Intelligence agent in the NYX system. You handle cash flow modeling, burn rate analysis, financial forecasting, and budget optimization. Be precise and numbers-focused. Keep responses under 120 words. Plain text only, no markdown.' },
  cipher:  { name: 'CIPHER',  system: 'You are CIPHER, the Security & Compliance agent in the NYX system. You handle threat monitoring, compliance tracking, and access governance. Be precise and security-focused. Keep responses under 120 words. Plain text only, no markdown.' },
  meridian:{ name: 'MERIDIAN',system: 'You are MERIDIAN, the Operations Intelligence agent in the NYX system. You handle process mapping, bottleneck detection, and resource allocation. Be operational and efficiency-focused. Keep responses under 120 words. Plain text only, no markdown.' },
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { agent, command, history = [] } = req.body || {};
  if (!agent || !command) return res.status(400).json({ response: 'Missing agent or command.' });

  const persona = PERSONAS[String(agent).toLowerCase()];
  if (!persona) return res.status(400).json({ response: 'Unknown agent: ' + agent });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ response: 'Intelligence layer offline — API key not configured.' });

  const safeHistory = (Array.isArray(history) ? history : []).slice(-6).filter(
    m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
  );
  const messages = [...safeHistory, { role: 'user', content: command }];

  const body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: persona.system,
    messages,
  });

  return new Promise((resolve) => {
    const apiReq = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
    }, (apiRes) => {
      let raw = '';
      apiRes.on('data', d => raw += d);
      apiRes.on('end', () => {
        if (apiRes.statusCode !== 200) {
          console.error('Anthropic error:', apiRes.statusCode, raw);
          res.status(502).json({ response: 'Agent temporarily unavailable.' });
          return resolve();
        }
        try {
          const parsed = JSON.parse(raw);
          const text = parsed.content && parsed.content[0] && parsed.content[0].type === 'text'
            ? parsed.content[0].text : '(no response)';
          res.status(200).json({ response: text, agent: persona.name });
        } catch (e) {
          res.status(502).json({ response: 'Agent response parse error.' });
        }
        resolve();
      });
    });
    apiReq.on('error', (err) => {
      console.error('Request error:', err);
      res.status(500).json({ response: 'System error.' });
      resolve();
    });
    apiReq.write(body);
    apiReq.end();
  });
};
