import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, orders, downloadAccess, auditLogs } from '@morgad/db'
import { eq, and } from 'drizzle-orm'
import { generateDownloadToken, getTokenExpiryDate } from '@morgad/security'

const ResendSchema = z.object({
  orderNumber: z.string().min(1),
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = ResendSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Parameter tidak valid.' }, { status: 400 })
    }

    const { orderNumber, email } = parsed.data

    // Verify order ownership: both order number AND email required
    const orderRows = await db
      .select()
      .from(orders)
      .where(and(eq(orders.orderNumber, orderNumber), eq(orders.customerEmail, email.toLowerCase())))
      .limit(1)

    const order = orderRows[0]
    if (!order) {
      return NextResponse.json({ success: false, error: 'Pesanan tidak ditemukan.' }, { status: 404 })
    }

    if (order.paymentStatus !== 'PAID') {
      return NextResponse.json({ success: false, error: 'Pembayaran belum terverifikasi.' }, { status: 400 })
    }

    // Generate a new token and update download access
    const { rawToken, tokenHash } = generateDownloadToken()
    const expiresAt = getTokenExpiryDate()

    const existing = await db.select().from(downloadAccess).where(eq(downloadAccess.orderId, order.id)).limit(1)

    if (existing.length > 0) {
      await db.update(downloadAccess).set({
        tokenHash,
        expiresAt,
        revoked: false,
        revokedAt: null,
        revokedReason: null,
      }).where(eq(downloadAccess.id, existing[0].id))
    } else {
      await db.insert(downloadAccess).values({
        orderId: order.id,
        productId: order.productId,
        tokenHash,
        expiresAt,
        downloadCount: 0,
        revoked: false,
      })
    }

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
    const downloadUrl = `${appUrl}/download/${rawToken}`

    // TODO: Send email with downloadUrl to order.customerEmail
    // await sendDownloadEmail({ email: order.customerEmail, orderNumber, downloadUrl })

    await db.insert(auditLogs).values({
      action: 'DOWNLOAD_LINK_RESENT',
      resourceType: 'order',
      resourceId: order.id,
      metadata: { orderNumber, email },
    })

    return NextResponse.json({ success: true, data: { message: 'Link download baru telah dikirim ke email Anda.' } })
  } catch (err) {
    console.error('[Resend] Error:', err)
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan. Silakan coba lagi.' }, { status: 500 })
  }
}
