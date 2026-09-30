import { NextRequest, NextResponse } from 'next/server'
import { db, orders, downloadAccess, webhookEvents, auditLogs } from '@morgad/db'
import { eq } from 'drizzle-orm'
import {
  verifyMayarWebhookSignature,
  extractWebhookEventId,
  extractExternalId,
  extractPaidAmount,
  mapMayarStatus,
  isPaymentSuccessEvent,
  isPaymentFailureEvent,
} from '@morgad/mayar'
import { generateDownloadToken, getTokenExpiryDate } from '@morgad/security'
import type { MayarWebhookPayload } from '@morgad/mayar'

export async function POST(request: NextRequest) {
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // ── Step 1-3: Validate & verify webhook signature ────────────
  const signatureHeader = request.headers.get('x-callback-token')
    ?? request.headers.get('x-signature')
    ?? request.headers.get('x-mayar-signature')

  const verification = verifyMayarWebhookSignature(rawBody, signatureHeader)
  if (!verification.valid) {
    console.error('[Webhook] Signature invalid:', verification.error)
    // Return 200 to prevent Mayar from retrying invalid sigs
    return NextResponse.json({ status: 'signature_invalid' }, { status: 200 })
  }

  let payload: MayarWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = (payload.event as string) ?? 'unknown'
  const mayarStatus = mapMayarStatus((payload.data?.status as string) ?? undefined)

  // ── Step 4: Identify payment ─────────────────────────────────
  const eventId = extractWebhookEventId(payload)
  const externalId = extractExternalId(payload)

  if (!eventId) {
    console.warn('[Webhook] No event ID found, using fallback idempotency')
  }

  const idempotencyKey = eventId ?? `${externalId}_${eventType}_${Date.now()}`

  // ── Step 8-10: Check idempotency ─────────────────────────────
  const existingEvent = await db.select()
    .from(webhookEvents)
    .where(eq(webhookEvents.eventId, idempotencyKey))
    .limit(1)

  if (existingEvent.length > 0) {
    console.log('[Webhook] Duplicate event ignored:', idempotencyKey)
    return NextResponse.json({ status: 'duplicate_ignored' })
  }

  // Record event as received
  const [whEvent] = await db.insert(webhookEvents).values({
    eventId: idempotencyKey,
    provider: 'mayar',
    eventType,
    payload: payload as Record<string, unknown>,
    status: 'RECEIVED',
  }).returning()

  // ── Step 5: Find local order ─────────────────────────────────
  if (!externalId) {
    await db.update(webhookEvents).set({ status: 'FAILED', errorMessage: 'No externalId' }).where(eq(webhookEvents.id, whEvent.id))
    return NextResponse.json({ status: 'no_external_id' })
  }

  const orderRows = await db.select().from(orders).where(eq(orders.orderNumber, externalId)).limit(1)
  const order = orderRows[0]

  if (!order) {
    await db.update(webhookEvents).set({ status: 'FAILED', errorMessage: `Order not found: ${externalId}` }).where(eq(webhookEvents.id, whEvent.id))
    return NextResponse.json({ status: 'order_not_found' })
  }

  // ── Step 6-7: Verify payment status and amount ───────────────
  const isSuccess = isPaymentSuccessEvent(eventType) || mayarStatus === 'PAID'
  const isFailure = isPaymentFailureEvent(eventType) || mayarStatus === 'FAILED' || mayarStatus === 'EXPIRED' || mayarStatus === 'REFUNDED'

  if (isSuccess) {
    const paidAmount = extractPaidAmount(payload)

    // Verify amount matches local order (CRITICAL security check)
    if (paidAmount !== null && paidAmount !== order.amount) {
      console.error(`[Webhook] Amount mismatch: expected ${order.amount}, got ${paidAmount} for order ${externalId}`)
      await db.update(webhookEvents).set({
        status: 'FAILED',
        errorMessage: `Amount mismatch: expected ${order.amount}, got ${paidAmount}`,
        processedAt: new Date(),
      }).where(eq(webhookEvents.id, whEvent.id))
      await db.insert(auditLogs).values({
        action: 'PAYMENT_AMOUNT_MISMATCH',
        resourceType: 'order',
        resourceId: order.id,
        metadata: { expected: order.amount, received: paidAmount, eventId: idempotencyKey },
      })
      return NextResponse.json({ status: 'amount_mismatch' }, { status: 200 })
    }

    // Verify state transition: only PENDING / PAYMENT_PENDING → PAID is valid
    if (order.orderStatus !== 'PENDING' && order.orderStatus !== 'PAYMENT_PENDING') {
      console.warn(`[Webhook] Invalid state transition: ${order.orderStatus} → PAID for order ${externalId}`)
      await db.update(webhookEvents).set({ status: 'IGNORED', processedAt: new Date() }).where(eq(webhookEvents.id, whEvent.id))
      return NextResponse.json({ status: 'invalid_state' })
    }

    // ── Steps 11-14: Update order + create download access ───────
    const now = new Date()
    const { rawToken, tokenHash } = generateDownloadToken()
    const expiresAt = getTokenExpiryDate()

    // Use DB transaction to ensure atomicity
    await db.transaction(async (tx) => {
      // Update order to PAID
      await tx.update(orders).set({
        paymentStatus: 'PAID',
        orderStatus: 'READY',
        paidAt: now,
        updatedAt: now,
      }).where(eq(orders.id, order.id))

      // Create download access — UNIQUE(order_id) prevents duplicates
      await tx.insert(downloadAccess).values({
        orderId: order.id,
        productId: order.productId,
        tokenHash,  // SHA-256 hash only — raw token is never stored
        expiresAt,
        downloadCount: 0,
        maxDownloads: null,  // Product max_downloads applied at download time
        revoked: false,
      }).onConflictDoNothing()

      // Mark webhook as processed
      await tx.update(webhookEvents).set({
        status: 'PROCESSED',
        processedAt: now,
      }).where(eq(webhookEvents.id, whEvent.id))

      // Audit log
      await tx.insert(auditLogs).values({
        action: 'PAYMENT_PAID',
        resourceType: 'order',
        resourceId: order.id,
        metadata: { eventId: idempotencyKey, amount: order.amount, currency: order.currency },
      })
    })

    // Note: rawToken is used to build the download URL
    // It's sent via email and returned here for logging only
    // The raw token is NOT stored in the database
    console.log(`[Webhook] Payment verified for order ${externalId}. Download token created.`)

    // TODO: Send email with download link using rawToken
    // sendDownloadEmail({ email: order.customerEmail, orderNumber: order.orderNumber, rawToken })

    return NextResponse.json({ status: 'processed' })
  }

  if (isFailure) {
    if (order.paymentStatus === 'PENDING') {
      await db.update(orders).set({
        paymentStatus: 'FAILED',
        orderStatus: 'FAILED',
        updatedAt: new Date(),
      }).where(eq(orders.id, order.id))
    }
    await db.update(webhookEvents).set({ status: 'PROCESSED', processedAt: new Date() }).where(eq(webhookEvents.id, whEvent.id))
    await db.insert(auditLogs).values({ action: 'PAYMENT_FAILED', resourceType: 'order', resourceId: order.id, metadata: { eventId: idempotencyKey } })
    return NextResponse.json({ status: 'processed_failed' })
  }

  // Unhandled event type
  await db.update(webhookEvents).set({ status: 'IGNORED', processedAt: new Date() }).where(eq(webhookEvents.id, whEvent.id))
  return NextResponse.json({ status: 'ignored' })
}
