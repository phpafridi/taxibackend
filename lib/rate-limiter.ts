// lib/rate-limiter.ts
// In-memory IP-based rate limiter for login attempts.
// Protects against brute force on non-existent accounts where
// the DB-based lockout (failedLoginAttempts) can't apply.

interface RateLimitEntry {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
}

const store = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS   = 10;        // max attempts per window
const WINDOW_MS      = 15 * 60 * 1000; // 15 minute window
const BLOCK_MS       = 15 * 60 * 1000; // 15 minute block

// Clean up old entries every 30 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.firstAttemptAt > WINDOW_MS * 2) {
      store.delete(key);
    }
  }
}, 30 * 60 * 1000);

export function checkIpRateLimit(ip: string): { blocked: boolean; minutesLeft?: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry) return { blocked: false };

  // Currently blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    const minutesLeft = Math.ceil((entry.blockedUntil - now) / 60000);
    return { blocked: true, minutesLeft };
  }

  // Block expired — reset
  if (entry.blockedUntil && now >= entry.blockedUntil) {
    store.delete(ip);
    return { blocked: false };
  }

  // Window expired — reset
  if (now - entry.firstAttemptAt > WINDOW_MS) {
    store.delete(ip);
    return { blocked: false };
  }

  // Too many attempts in window
  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_MS;
    store.set(ip, entry);
    const minutesLeft = Math.ceil(BLOCK_MS / 60000);
    return { blocked: true, minutesLeft };
  }

  return { blocked: false };
}

export function recordIpAttempt(ip: string): void {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry) {
    store.set(ip, { count: 1, firstAttemptAt: now, blockedUntil: null });
    return;
  }

  // Reset if window expired
  if (now - entry.firstAttemptAt > WINDOW_MS) {
    store.set(ip, { count: 1, firstAttemptAt: now, blockedUntil: null });
    return;
  }

  entry.count += 1;
  store.set(ip, entry);
}

export function clearIpAttempts(ip: string): void {
  store.delete(ip);
}
