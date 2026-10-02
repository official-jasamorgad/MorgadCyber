import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, orders, downloadAccess } from '@morgad/db'
import { eq, and } from 'drizzle-orm'

const QuerySchema = z.object({
  number: z.string().min(1),
  email: z.string().email(),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    number: searchParams.get('number') ?? '',
    email: searchParams.get('email') ?? '',
  })

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Parameter tidak valid.' }, { status: 400 })
  }

  const { number, email } = parsed.data

  // Require BOTH order number AND email — never allow lookup by order number alone
  const orderRows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderNumber, number), eq(orders.customerEmail, email.toLowerCase())))
    .limit(1)

  const order = orderRows[0]

  if (!order) {
    // Generic error — do not reveal whether the order number exists
    return NextResponse.json({ success: false, error: 'Pesanan tidak ditemukan. Periksa kembali nomor pesanan dan email Anda.' }, { status: 404 })
  }

  let currentStatus = order.paymentStatus

  // Check download access
  let downloadUrl: string | null = null
  if (currentStatus === 'PAID') {
    const dlRows = await db.select().from(downloadAccess).where(eq(downloadAccess.orderId, order.id)).limit(1)
    const dl = dlRows[0]
    if (dl && !dl.revoked && new Date(dl.expiresAt) > new Date()) {
      downloadUrl = null
    }
  }

  // Load product name
  const { products } = await import('@morgad/db')
  const productRows = await db.select({ name: products.name }).from(products).where(eq(products.id, order.productId)).limit(1)

  return NextResponse.json({
    success: true,
    data: {
      orderNumber: order.orderNumber,
      productName: productRows[0]?.name ?? 'Unknown',
      paymentStatus: currentStatus,
      orderStatus: currentStatus === 'PAID' ? 'READY' : order.orderStatus,
      downloadAvailable: false, // Token not recoverable — use resend
      downloadUrl,
      amount: order.amount,
      currency: order.currency,
      createdAt: order.createdAt,
    },
  })
}
