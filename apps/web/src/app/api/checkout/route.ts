import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, products, orders } from '@morgad/db'
import { eq } from 'drizzle-orm'
import { createMayarInvoice, MAYAR_NATIVE_CHANNELS } from '@morgad/mayar'
import { generateOrderNumber } from '@morgad/security'

const CheckoutSchema = z.object({
  productId: z.string().min(1),
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email(),
  paymentMethod: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = CheckoutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Data tidak valid.' }, { status: 400 })
    }

    const { productId, customerName, customerEmail, paymentMethod } = parsed.data
    const normalizedMethod = paymentMethod.trim().toLowerCase()

    if (!MAYAR_NATIVE_CHANNELS.includes(normalizedMethod as typeof MAYAR_NATIVE_CHANNELS[number])) {
      return NextResponse.json({ success: false, error: 'Metode pembayaran tidak tersedia.' }, { status: 400 })
    }

    const productRows = await db.select().from(products).where(eq(products.id, productId)).limit(1)
    const product = productRows[0]

    if (!product) {
      return NextResponse.json({ success: false, error: 'Produk tidak ditemukan.' }, { status: 404 })
    }
    if (product.status !== 'PUBLISHED') {
      return NextResponse.json({ success: false, error: 'Produk tidak tersedia.' }, { status: 400 })
    }

    const orderNumber = generateOrderNumber()
    const [newOrder] = await db.insert(orders).values({
      orderNumber,
      productId: product.id,
      customerName,
      customerEmail,
      amount: product.price,
      currency: product.currency,
      paymentProvider: 'mayar',
      paymentMethod: normalizedMethod,
      paymentStatus: 'PENDING',
      orderStatus: 'PENDING',
      extraData: { productId: product.id, orderNumber },
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning()

    const invoiceResult = await createMayarInvoice({
      name: customerName,
      email: customerEmail,
      mobile: '000000000000',
      description: `Pembelian: ${product.name}`,
      expiredAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      items: [{
        quantity: 1,
        rate: product.price,
        description: product.name,
      }],
      paymentMethod: normalizedMethod,
      extraData: {
        orderId: newOrder.id,
        orderNumber,
        productId: product.id,
      },
    })

    if (!invoiceResult.success) {
      await db.update(orders).set({
        paymentStatus: 'FAILED',
        orderStatus: 'FAILED',
        updatedAt: new Date(),
      }).where(eq(orders.id, newOrder.id))
      return NextResponse.json({ success: false, error: invoiceResult.error ?? 'Pembayaran gagal dibuat.' }, { status: 400 })
    }

    await db.update(orders).set({
      paymentReference: invoiceResult.id,
      transactionId: invoiceResult.transactionId,
      checkoutUrl: invoiceResult.link,
      paymentMethod: normalizedMethod,
      paymentDetail: invoiceResult.paymentDetail ?? null,
      extraData: { orderId: newOrder.id, orderNumber, productId: product.id },
      paymentStatus: 'PENDING',
      orderStatus: 'PAYMENT_PENDING',
      expiresAt: invoiceResult.expiredAt ? new Date(invoiceResult.expiredAt) : null,
      updatedAt: new Date(),
    }).where(eq(orders.id, newOrder.id))

    return NextResponse.json({
      success: true,
      data: {
        orderId: newOrder.id,
        orderNumber,
        paymentStatus: 'PENDING',
        checkoutUrl: invoiceResult.link,
        paymentReference: invoiceResult.id,
        paymentMethod: normalizedMethod,
        paymentDetail: invoiceResult.paymentDetail,
      },
    })
  } catch (err) {
    console.error('[Checkout] Error:', err)
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan. Silakan coba lagi.' }, { status: 500 })
  }
}
