/**
 * In-memory rate limiter for admin login brute-force protection.
 *
 * For production with multiple instances, replace with Redis-backed rate limiting
 * (e.g., @upstash/ratelimit or ioredis).
 */

interface AttemptRecord {
  count: number
  firstAttemptAt: number
  lockedUntil: number | null
}

const store = new Map<string, AttemptRecord>()

const MAX_ATTEMPTS = parseInt(process.env.LOGIN_RATE_LIMIT_MAX ?? '5', 10)
const WINDOW_MS = parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS ?? '900000', 10) // 15 min
const LOCKOUT_MS = WINDOW_MS

/**
 * Check if a login attempt is allowed for a given key (IP or email).
 * Returns { allowed: boolean, retryAfterMs?: number }
 */
export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  const record = store.get(key)

  if (!record) {
    return { allowed: true }
  }

  // Check if locked out
  if (record.lockedUntil && now < record.lockedUntil) {
    return { allowed: false, retryAfterMs: record.lockedUntil - now }
  }

  // Reset if window expired
  if (now - record.firstAttemptAt > WINDOW_MS) {
    store.delete(key)
    return { allowed: true }
  }

  if (record.count >= MAX_ATTEMPTS) {
    // Lock out
    record.lockedUntil = now + LOCKOUT_MS
    store.set(key, record)
    return { allowed: false, retryAfterMs: LOCKOUT_MS }
  }

  return { allowed: true }
}

/**
 * Record a failed login attempt. Call after a failed login.
 */
export function recordFailedLogin(key: string): void {
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || now - existing.firstAttemptAt > WINDOW_MS) {
    store.set(key, { count: 1, firstAttemptAt: now, lockedUntil: null })
  } else {
    existing.count += 1
    if (existing.count >= MAX_ATTEMPTS) {
      existing.lockedUntil = now + LOCKOUT_MS
    }
    store.set(key, existing)
  }
}

/**
 * Clear failed login attempts for a key. Call after a successful login.
 */
export function clearLoginAttempts(key: string): void {
  store.delete(key)
}
