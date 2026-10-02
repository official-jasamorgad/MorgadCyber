import { NextRequest, NextResponse } from 'next/server'
import { db, orders, downloadAccess, webhookEvents, auditLogs } from '@morgad/db'
import { eq } from 'drizzle-orm'
import {
  extractExternalId,
  extractPaidAmount,
  verifyDokuWebhookSignature,
} from '@morgad/mayar'
import { generateDownloadToken, getTokenExpiryDate } from '@morgad/security'
import type { MayarWebhookPayload } from '@morgad/mayar'

export async function POST(request: NextRequest) {
  const rawBody = await request.text().catch(() => null)
  if (rawBody === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const clientId = request.headers.get('client-id') ?? ''
  const requestId = request.headers.get('request-id') ?? ''
  const timestamp = request.headers.get('request-timestamp') ?? ''
  const signature = request.headers.get('signature')
  const targetPath = new URL(request.url).pathname
  const verification = verifyDokuWebhookSignature(rawBody, signature, {
    clientId,
    requestId,
    timestamp,
    targetPath,
  })
  if (!verification.valid) {
    return NextResponse.json({ error: 'Invalid DOKU signature' }, { status: 401 })
  }

  let payload: MayarWebhookPayload
  try {
    payload = JSON.parse(rawBody) as MayarWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = payload.transaction?.status?.toUpperCase() ?? 'UNKNOWN'
  const externalId = extractExternalId(payload)
  if (!externalId) {
    return NextResponse.json({ error: 'Missing order invoice number' }, { status: 400 })
  }

  const existingEvent = await db.select()
    .from(webhookEvents)
    .where(eq(webhookEvents.eventId, requestId))
    .limit(1)
  if (existingEvent.length > 0) {
    return NextResponse.json({ status: 'duplicate_ignored' })
  }

  const [webhookEvent] = await db.insert(webhookEvents).values({
    eventId: requestId,
    provider: 'doku',
    eventType,
    payload: payload as Record<string, unknown>,
    status: 'RECEIVED',
  }).returning()

  const orderRows = await db.select()
    .from(orders)
    .where(eq(orders.orderNumber, externalId))
    .limit(1)
  const order = orderRows[0]
  if (!order || order.paymentProvider !== 'doku') {
    await db.update(webhookEvents).set({
      status: 'FAILED',
      errorMessage: order ? 'Order provider mismatch' : `Order not found: ${externalId}`,
    }).where(eq(webhookEvents.id, webhookEvent.id))
    return NextResponse.json({ status: 'order_not_found' })
  }

  if (eventType !== 'SUCCESS') {
    await db.update(webhookEvents).set({
      status: 'IGNORED',
      processedAt: new Date(),
    }).where(eq(webhookEvents.id, webhookEvent.id))
    return NextResponse.json({ status: 'ignored' })
  }

  const paidAmount = extractPaidAmount(payload)
  if (paidAmount === null || paidAmount !== order.amount) {
    await db.update(webhookEvents).set({
      status: 'FAILED',
      errorMessage: `Amount mismatch: expected ${order.amount}, got ${paidAmount}`,
      processedAt: new Date(),
    }).where(eq(webhookEvents.id, webhookEvent.id))
    await db.insert(auditLogs).values({
      action: 'PAYMENT_AMOUNT_MISMATCH',
      resourceType: 'order',
      resourceId: order.id,
      metadata: { expected: order.amount, received: paidAmount, eventId: requestId },
    })
    return NextResponse.json({ status: 'amount_mismatch' })
  }

  if (order.orderStatus !== 'PENDING' && order.orderStatus !== 'PAYMENT_PENDING') {
    await db.update(webhookEvents).set({
      status: 'IGNORED',
      processedAt: new Date(),
    }).where(eq(webhookEvents.id, webhookEvent.id))
    return NextResponse.json({ status: 'invalid_state' })
  }

  const now = new Date()
  const { tokenHash } = generateDownloadToken()
  const expiresAt = getTokenExpiryDate()
  await db.transaction(async (tx) => {
    await tx.update(orders).set({
      paymentStatus: 'PAID',
      orderStatus: 'READY',
      paidAt: now,
      updatedAt: now,
    }).where(eq(orders.id, order.id))

    await tx.insert(downloadAccess).values({
      orderId: order.id,
      productId: order.productId,
      tokenHash,
      expiresAt,
      downloadCount: 0,
      maxDownloads: null,
      revoked: false,
    }).onConflictDoNothing()

    await tx.update(webhookEvents).set({
      status: 'PROCESSED',
      processedAt: now,
    }).where(eq(webhookEvents.id, webhookEvent.id))

    await tx.insert(auditLogs).values({
      action: 'PAYMENT_PAID',
      resourceType: 'order',
      resourceId: order.id,
      metadata: { eventId: requestId, amount: order.amount, currency: order.currency },
    })
  })

  return NextResponse.json({ status: 'processed' })
}