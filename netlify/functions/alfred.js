// Alfred backend is intentionally disabled — the live Alfred experience runs
// fully client-side via the Vercel /api function. This stub stays in place so
// any legacy POST to /.netlify/functions/alfred returns a clean, explicit
// response instead of throwing a ReferenceError (Anthropic was undefined here).

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  return {
    statusCode: 410,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      error: 'This endpoint has been retired. Alfred now runs via the primary API.',
    }),
  };
};
