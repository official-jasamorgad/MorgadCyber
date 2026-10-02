/**
 * Mayar Webhook Handler
 *
 * Processes incoming webhooks from Mayar with:
 * 1. Signature verification (per Mayar docs)
 * 2. Idempotency (via webhook_events.event_id UNIQUE constraint)
 * 3. Amount verification
 * 4. Payment state machine enforcement
 *
 * IMPORTANT: Webhook signature verification method must follow the
 * official Mayar documentation at https://docs.mayar.id
 * Do not invent or guess the signature algorithm.
 */

import { createHash, createHmac, timingSafeEqual } from 'crypto'
import type { MayarWebhookPayload, MayarWebhookVerification, MayarPaymentStatus } from './types'

function normalizeEventName(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/[_\-:\s]+/g, '.')
}

function normalizeSignatureValue(signatureHeader: string): string {
  const trimmed = signatureHeader.trim()
  if (!trimmed) return ''
  const stripped = trimmed.replace(/^sha256\s*[:=]/i, '').trim()
  return stripped.replace(/^['"]|['"]$/g, '')
}

function normalizeDokuSignatureValue(signatureHeader: string): string {
  const trimmed = signatureHeader.trim()
  if (!trimmed) return ''
  const noQuotes = trimmed.replace(/^['"]|['"]$/g, '')
  const withoutPrefix = noQuotes.replace(/^hmacsha256\s*[:=]/i, '').trim()
  return withoutPrefix
}

/**
 * Verify Mayar webhook signature.
 *
 * The exact signature verification algorithm must follow the Mayar docs.
 * https://docs.mayar.id/webhook
 *
 * Common pattern: HMAC-SHA256 of raw request body using webhook secret.
 * The header name containing the signature must also come from the docs.
 *
 * If Mayar does not provide signature verification, document that explicitly
 * and use alternative security measures (IP whitelist, token in URL, etc.)
 */
export function verifyMayarWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string | null,
  options?: {
    clientId?: string
    requestId?: string
    timestamp?: string
    targetPath?: string
  }
): MayarWebhookVerification {
  const dokuSecret = process.env.DOKU_SECRET_KEY
  const mayarSecret = process.env.MAYAR_WEBHOOK_SECRET

  if (!signatureHeader) {
    return { valid: false, error: 'Missing webhook signature header' }
  }

  const sigValue = signatureHeader.trim()

  // 1. DOKU Signature Verification (HMACSHA256=<base64>)
  if (dokuSecret && (sigValue.toUpperCase().startsWith('HMACSHA256=') || sigValue.includes('='))) {
    try {
      const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody
      const clientId = options?.clientId || process.env.DOKU_CLIENT_ID || ''
      const requestId = options?.requestId || ''
      const timestamp = options?.timestamp || ''
      const targetPath = options?.targetPath || ''

      const digest = createHash('sha256').update(bodyStr, 'utf8').digest('base64')
      const stringToSign = targetPath
        ? `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${targetPath}\nDigest:${digest}`
        : `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nDigest:${digest}`

      const expectedSig = 'HMACSHA256=' + createHmac('sha256', dokuSecret).update(stringToSign, 'utf8').digest('base64')
      const normalizedReceived = normalizeDokuSignatureValue(sigValue)
      const normalizedExpected = normalizeDokuSignatureValue(expectedSig)
      if (normalizedReceived && normalizedExpected && normalizedReceived.length === normalizedExpected.length && timingSafeEqual(Buffer.from(normalizedReceived), Buffer.from(normalizedExpected))) {
        return { valid: true }
      }

      const simpleSig = 'HMACSHA256=' + createHmac('sha256', dokuSecret).update(bodyStr, 'utf8').digest('base64')
      const normalizedSimple = normalizeDokuSignatureValue(simpleSig)
      if (normalizedReceived && normalizedSimple && normalizedReceived.length === normalizedSimple.length && timingSafeEqual(Buffer.from(normalizedReceived), Buffer.from(normalizedSimple))) {
        return { valid: true }
      }
    } catch {
      // Fall through to Mayar check
    }
  }

  // 2. Mayar Signature Verification (Hex HMAC)
  if (!mayarSecret) {
    return { valid: false, error: 'Payment webhook secret not configured' }
  }

  try {
    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody
    const expectedSig = createHmac('sha256', mayarSecret)
      .update(bodyStr, 'utf8')
      .digest('hex')

    const normalized = normalizeSignatureValue(signatureHeader)
    const sigBuffer = Buffer.from(normalized)
    const expectedBuffer = Buffer.from(expectedSig)

    if (sigBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: 'Signature length mismatch' }
    }

    const isValid = timingSafeEqual(sigBuffer, expectedBuffer)
    return isValid
      ? { valid: true }
      : { valid: false, error: 'Signature mismatch' }
  } catch {
    return { valid: false, error: 'Signature verification error' }
  }
}

export function verifyDokuWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string | null,
  options: {
    clientId: string
    requestId: string
    timestamp: string
    targetPath: string
  }
): MayarWebhookVerification {
  const secretKey = process.env.DOKU_SECRET_KEY
  const configuredClientId = process.env.DOKU_CLIENT_ID
  if (!secretKey || !configuredClientId) {
    return { valid: false, error: 'DOKU credentials are not configured' }
  }
  if (!signatureHeader || !options.requestId || !options.timestamp || !options.targetPath.startsWith('/')) {
    return { valid: false, error: 'Missing DOKU signature component' }
  }
  if (options.clientId !== configuredClientId) {
    return { valid: false, error: 'DOKU client ID mismatch' }
  }

  const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody
  const digest = createHash('sha256').update(body, 'utf8').digest('base64')
  const stringToSign = [
    `Client-Id:${options.clientId}`,
    `Request-Id:${options.requestId}`,
    `Request-Timestamp:${options.timestamp}`,
    `Request-Target:${options.targetPath}`,
    `Digest:${digest}`,
  ].join('\n')
  const expected = `HMACSHA256=${createHmac('sha256', secretKey).update(stringToSign, 'utf8').digest('base64')}`
  const normalizedExpected = normalizeDokuSignatureValue(expected)
  const normalizedReceived = normalizeDokuSignatureValue(signatureHeader)

  if (!normalizedReceived || !normalizedExpected) {
    return { valid: false, error: 'Missing DOKU signature value' }
  }

  if (normalizedReceived.length !== normalizedExpected.length) {
    return { valid: false, error: 'Signature length mismatch' }
  }

  return timingSafeEqual(Buffer.from(normalizedReceived), Buffer.from(normalizedExpected))
    ? { valid: true }
    : { valid: false, error: 'Signature mismatch' }
}

/**
 * Extract the idempotency key (unique event ID) from webhook payload.
 */
export function extractWebhookEventId(payload: MayarWebhookPayload): string | null {
  return (
    payload.transaction?.original_request_id
    ?? (payload.transaction?.originalRequestId as string)
    ?? (payload.event_id as string)
    ?? (payload.id as string)
    ?? (payload.data?.id as string)
    ?? null
  )
}

/**
 * Extract the external order reference from webhook.
 */
export function extractExternalId(payload: MayarWebhookPayload): string | null {
  const candidates = [
    payload.order?.invoice_number,
    payload.order?.invoiceNumber,
    payload.order_number,
    payload.order_id,
    payload.invoice_number,
    payload.externalId,
    payload.data?.externalId,
    payload.data?.external_id,
    payload.data?.orderId,
    payload.data?.order_id,
    payload.id,
    payload.data?.id,
  ]

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) return value
  }

  return null
}

/**
 * Extract the paid amount from webhook.
 */
export function extractPaidAmount(payload: MayarWebhookPayload): number | null {
  const raw = payload.order?.amount ?? payload.amount ?? payload.data?.amount
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/**
 * Map Mayar payment status string to our internal PaymentStatus enum.
 */
export function mapMayarStatus(mayarStatus: string | undefined): MayarPaymentStatus {
  const status = (mayarStatus ?? '').trim().toLowerCase()
  if (['paid', 'success', 'completed', 'settled'].includes(status)) return 'PAID'
  if (['failed', 'failure', 'declined'].includes(status)) return 'FAILED'
  if (status === 'expired') return 'EXPIRED'
  if (status === 'refunded') return 'REFUNDED'
  return 'PENDING'
}

/**
 * Determine if a Mayar webhook event type represents a successful payment.
 */
export function isPaymentSuccessEvent(eventType: string): boolean {
  const normalized = normalizeEventName(eventType)
  const successEvents = [
    'payment.success',
    'payment.paid',
    'transaction.success',
    'invoice.paid',
    'transaction.paid',
    'invoice.success',
  ]
  return successEvents.includes(normalized) || normalized.includes('paid') || normalized.includes('success')
}

/**
 * Determine if a Mayar webhook event type represents a payment failure.
 */
export function isPaymentFailureEvent(eventType: string): boolean {
  const normalized = normalizeEventName(eventType)
  const failureEvents = [
    'payment.failed',
    'payment.failure',
    'transaction.failed',
    'invoice.failed',
    'transaction.failure',
    'invoice.failure',
  ]
  return failureEvents.includes(normalized) || normalized.includes('failed') || normalized.includes('failure')
}
