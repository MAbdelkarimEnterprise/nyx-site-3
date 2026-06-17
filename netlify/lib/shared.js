// Shared helpers for NYX serverless functions.
// Lives outside netlify/functions so it is bundled (esbuild) but never exposed
// as its own endpoint.

const memBuckets = new Map();

function memoryLimited(key, max, windowMs) {
  const now = Date.now();
  const arr = (memBuckets.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  memBuckets.set(key, arr);
  if (memBuckets.size > 5000) memBuckets.clear();
  return arr.length > max;
}

// Durable, cross-instance rate limit when Upstash is configured; otherwise a
// best-effort per-instance fallback. Never throws — a limiter outage must not
// take down the endpoint.
async function checkRateLimit(ip, { max = 20, windowMs = 60_000, prefix = 'rl' } = {}) {
  const key = `${prefix}:${ip}`;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return memoryLimited(key, max, windowMs);

  try {
    const windowKey = `${key}:${Math.floor(Date.now() / windowMs)}`;
    const ttl = Math.ceil(windowMs / 1000);
    // Pipeline: INCR then EXPIRE (idempotent) in one round-trip.
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCR', windowKey], ['EXPIRE', windowKey, String(ttl)]]),
    });
    if (!res.ok) return memoryLimited(key, max, windowMs);
    const out = await res.json();
    const count = Number(out?.[0]?.result ?? 0);
    return count > max;
  } catch (err) {
    console.error('rate-limit error, falling back to memory:', err.message);
    return memoryLimited(key, max, windowMs);
  }
}

// Structured error logging. Forwards to ERROR_WEBHOOK_URL (Sentry-compatible or
// Slack/Discord) when configured; always logs to the function console.
async function logError(scope, err, meta = {}) {
  const payload = {
    scope,
    message: err?.message || String(err),
    ...meta,
    ts: new Date().toISOString(),
  };
  console.error(`[NYX:${scope}]`, payload.message, meta);
  const hook = process.env.ERROR_WEBHOOK_URL;
  if (!hook) return;
  try {
    await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `[NYX:${scope}] ${payload.message}`, ...payload }),
    });
  } catch { /* swallow — logging must never throw */ }
}

module.exports = { checkRateLimit, logError };
