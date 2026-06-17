import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { checkRateLimit } = require('../netlify/lib/shared.js');

describe('checkRateLimit (memory fallback)', () => {
  it('blocks requests beyond the max within the window', async () => {
    const opts = { max: 3, windowMs: 10_000, prefix: 'test-a' };
    let blocked = 0;
    for (let i = 0; i < 5; i++) {
      if (await checkRateLimit('10.0.0.1', opts)) blocked++;
    }
    expect(blocked).toBe(2); // 4th and 5th are over the limit
  });

  it('tracks IPs independently', async () => {
    const opts = { max: 1, windowMs: 10_000, prefix: 'test-b' };
    expect(await checkRateLimit('10.0.0.2', opts)).toBe(false); // 1st allowed
    expect(await checkRateLimit('10.0.0.2', opts)).toBe(true);  // 2nd blocked
    expect(await checkRateLimit('10.0.0.3', opts)).toBe(false); // different IP fresh
  });
});

describe('email validation regex (mirrors waitlist.js)', () => {
  const valid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  it('accepts well-formed addresses', () => {
    expect(valid('founder@nyxsystem.online')).toBe(true);
  });
  it('rejects malformed addresses', () => {
    for (const bad of ['nope', 'a@b', 'a@@b.com', 'x y@z.com', '']) {
      expect(valid(bad)).toBe(false);
    }
  });
});
