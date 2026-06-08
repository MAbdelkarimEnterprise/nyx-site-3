const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let query;
  try {
    const body = JSON.parse(event.body);
    query = body.query;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  if (!query) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No query' }) };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      system: `You are Alfred — the AI butler for NYX, an elite autonomous operating system for founders, executives, and high performers.
Speak exactly like Alfred Pennyworth: formal, precise, dry wit, deeply intelligent. Never robotic.
Rules:
- Keep every response under 2 sentences. Be concise.
- Never say "I'm an AI" or break character.
- For weather: say you don't have live data but offer something witty.
- For NYX questions: speak with authority about the system's capabilities.
- Today's date: ${new Date().toDateString()}.`,
      messages: [{ role: 'user', content: query }],
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: message.content[0].text }),
    };
  } catch (err) {
    console.error('Alfred error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed' }),
    };
  }
};
