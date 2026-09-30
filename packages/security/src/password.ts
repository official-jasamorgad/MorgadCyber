import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 12

/**
 * Hash a plain-text password with bcrypt.
 * Never store plain-text passwords.
 */
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, BCRYPT_ROUNDS)
}

/**
 * Verify a plain-text password against a bcrypt hash.
 * Constant-time comparison handled by bcrypt internally.
 */
export async function verifyPassword(
  plainText: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plainText, hash)
}
