import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, adminUsers, auditLogs } from '@morgad/db'
import {
  verifyPassword,
  createAdminSession,
  getSessionCookieOptions,
  checkLoginRateLimit,
  recordFailedLogin,
  clearLoginAttempts,
} from '@morgad/security'
import { eq, ilike, or } from 'drizzle-orm'

const loginSchema = z.object({
  identifier: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  password: z.string().min(1),
}).refine((data) => Boolean(data.identifier ?? data.email), {
  path: ['identifier'],
})

const GENERIC_ERROR = 'Email atau password salah.'

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown'
  }
  return request.headers.get('x-real-ip') ?? 'unknown'
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)

  // Rate limit check
  const rateCheck = checkLoginRateLimit(ip)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { success: false, error: 'Terlalu banyak percobaan. Coba lagi nanti.' },
      { status: 429 },
    )
  }

  // Parse & validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: GENERIC_ERROR },
      { status: 400 },
    )
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: GENERIC_ERROR },
      { status: 400 },
    )
  }

  const { password } = parsed.data
  const normalizedIdentifier = (parsed.data.identifier ?? parsed.data.email ?? '').trim().toLowerCase()

  // Query admin user
  const [user] = await db
    .select()
    .from(adminUsers)
    .where(or(eq(adminUsers.email, normalizedIdentifier), ilike(adminUsers.name, normalizedIdentifier)))
    .limit(1)

  if (!user || !user.active) {
    recordFailedLogin(ip)
    // Constant-time delay to prevent user enumeration via timing
    await verifyPassword(password, '$2a$12$invalidhashfortimingequalityaaaa')
    return NextResponse.json(
      { success: false, error: GENERIC_ERROR },
      { status: 401 },
    )
  }

  // Verify password
  const passwordValid = await verifyPassword(password, user.passwordHash)
  if (!passwordValid) {
    recordFailedLogin(ip)
    return NextResponse.json(
      { success: false, error: GENERIC_ERROR },
      { status: 401 },
    )
  }

  // Successful login
  clearLoginAttempts(ip)

  const token = await createAdminSession({
    adminId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })

  const cookieOptions = getSessionCookieOptions()

  // Update lastLoginAt
  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(adminUsers.id, user.id))

  // Insert audit log
  await db.insert(auditLogs).values({
    adminId: user.id,
    action: 'ADMIN_LOGIN_SUCCESS',
    resourceType: 'admin_users',
    resourceId: user.id,
    metadata: { email: user.email },
    ipAddress: ip,
  })

  const response = NextResponse.json({ success: true })
  response.cookies.set({
    name: cookieOptions.name,
    value: token,
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
    maxAge: cookieOptions.maxAge,
  })

  return response
}
