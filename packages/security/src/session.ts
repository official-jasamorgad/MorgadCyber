import { SignJWT, jwtVerify } from 'jose'
import type { AdminSession } from '@morgad/types'

function getSessionSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('ADMIN_SESSION_SECRET must be set and at least 32 characters')
  }
  return new TextEncoder().encode(secret)
}

const COOKIE_NAME = 'admin_session'
const SESSION_EXPIRY_HOURS = parseInt(process.env.ADMIN_SESSION_EXPIRY_HOURS ?? '8', 10)

/**
 * Create a signed JWT session token for an admin user.
 * Returns the signed token string.
 */
export async function createAdminSession(payload: Omit<AdminSession, 'issuedAt' | 'expiresAt'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = now + SESSION_EXPIRY_HOURS * 3600

  const token = await new SignJWT({
    ...payload,
    issuedAt: now,
    expiresAt,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(getSessionSecret())

  return token
}

/**
 * Verify and decode an admin session JWT.
 * Returns null if invalid or expired.
 */
export async function verifyAdminSession(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ['HS256'],
    })
    return payload as unknown as AdminSession
  } catch {
    return null
  }
}

/**
 * Cookie configuration for the admin session.
 * HttpOnly + Secure + SameSite=Strict prevents XSS and CSRF.
 */
export function getSessionCookieOptions(expiresIn?: number) {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: expiresIn ?? SESSION_EXPIRY_HOURS * 3600,
  }
}

export { COOKIE_NAME }
