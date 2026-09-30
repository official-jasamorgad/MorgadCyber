import { randomBytes, createHash } from 'crypto'

/**
 * Generate a cryptographically secure download token.
 * Returns the raw token (to be sent to user) and its SHA-256 hash (to store in DB).
 *
 * RULE: Only the hash is stored in the database.
 * The raw token is returned ONCE and never stored.
 */
export function generateDownloadToken(): { rawToken: string; tokenHash: string } {
  // 32 bytes = 256 bits of entropy
  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = hashToken(rawToken)
  return { rawToken, tokenHash }
}

/**
 * Hash a raw token with SHA-256 for database storage or comparison.
 */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex')
}

/**
 * Compare an incoming raw token against a stored hash.
 * Constant-time comparison to prevent timing attacks.
 */
export function verifyToken(rawToken: string, storedHash: string): boolean {
  const incomingHash = hashToken(rawToken)
  // Constant-time comparison
  if (incomingHash.length !== storedHash.length) return false
  let diff = 0
  for (let i = 0; i < incomingHash.length; i++) {
    diff |= incomingHash.charCodeAt(i) ^ storedHash.charCodeAt(i)
  }
  return diff === 0
}

/**
 * Generate a unique order number.
 * Format: ORD-YYYYMMDD-XXXXXXXX (8 hex chars)
 */
export function generateOrderNumber(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = randomBytes(4).toString('hex').toUpperCase()
  return `ORD-${dateStr}-${random}`
}

/**
 * Calculate download token expiry date.
 * Default: 7 days from now.
 */
export function getTokenExpiryDate(days?: number): Date {
  const expiryDays = days ?? parseInt(process.env.DOWNLOAD_TOKEN_EXPIRY_DAYS ?? '7', 10)
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + expiryDays)
  return expiry
}
