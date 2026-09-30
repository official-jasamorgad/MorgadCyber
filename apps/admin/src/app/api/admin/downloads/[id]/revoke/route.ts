import { NextRequest, NextResponse } from 'next/server'
import { db, downloadAccess, auditLogs } from '@morgad/db'
import { eq } from 'drizzle-orm'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminId = request.headers.get('x-admin-id') ?? null
    const adminRole = request.headers.get('x-admin-role') ?? ''

    // Permission check: only SUPER_ADMIN and ADMIN can revoke downloads
    if (adminRole !== 'SUPER_ADMIN' && adminRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki izin untuk mencabut akses download.' },
        { status: 403 }
      )
    }

    const { id } = params
    const existing = await db.select().from(downloadAccess).where(eq(downloadAccess.id, id)).limit(1)

    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Akses download tidak ditemukan.' }, { status: 404 })
    }

    const now = new Date()
    await db
      .update(downloadAccess)
      .set({
        revoked: true,
        revokedAt: now,
        revokedReason: 'Dicabut oleh administrator.',
      })
      .where(eq(downloadAccess.id, id))

    // Audit log
    await db.insert(auditLogs).values({
      adminId,
      action: 'DOWNLOAD_REVOKED',
      resourceType: 'download_access',
      resourceId: id,
      metadata: { orderId: existing[0].orderId, revokedAt: now.toISOString() },
    })

    return NextResponse.json({ success: true, message: 'Akses download berhasil dicabut.' })
  } catch (err) {
    console.error('[Admin API Download Revoke] Error:', err)
    return NextResponse.json({ success: false, error: 'Gagal mencabut akses download.' }, { status: 500 })
  }
}
