import { describe, expect, it, vi } from 'vitest'
import {
  extractExternalId,
  extractPaidAmount,
  getMayarTransactionStatus,
  isPaymentFailureEvent,
  isPaymentSuccessEvent,
  mapMayarStatus,
  parsePaymentDetail,
  verifyMayarWebhookSignature,
} from '@morgad/mayar'

describe('Mayar native payment parsing', () => {
  it('parses a QRIS payment detail payload', () => {
    const detail = parsePaymentDetail({
      type: 'QR_CODE',
      qr_code: {
        channel_properties: {
          qr_string: '000201010212...'
        }
      }
    })

    expect(detail).toEqual({
      type: 'QR_CODE',
      qrCode: '000201010212...'
    })
  })

  it('parses a virtual account payload and keeps only safe values', () => {
    const detail = parsePaymentDetail({
      type: 'VIRTUAL_ACCOUNT',
      virtual_account: {
        channel_code: 'va/bni',
        channel_properties: {
          virtual_account_number: '88123456789',
          customer_name: 'Morgad Customer'
        }
      }
    })

    expect(detail).toEqual({
      type: 'VIRTUAL_ACCOUNT',
      channel: 'va/bni',
      accountNumber: '88123456789',
      customerName: 'Morgad Customer'
    })
  })

  it('parses e-wallet actions while rejecting unsafe schemes', () => {
    const detail = parsePaymentDetail({
      type: 'EWALLET',
      ewallet: {
        channel_code: 'ewallet/dana',
        actions: [
          { url: 'https://example.com/pay', url_type: 'WEB' },
          { url: 'dana://pay?code=abc', url_type: 'DEEPLINK' },
          { url: 'javascript:alert(1)', url_type: 'WEB' }
        ]
      }
    })

    expect(detail).toEqual({
      type: 'EWALLET',
      channel: 'ewallet/dana',
      actions: [
        { url: 'https://example.com/pay', url_type: 'WEB' },
        { url: 'dana://pay?code=abc', url_type: 'DEEPLINK' }
      ]
    })
  })

  it('falls back to null for unsupported or malformed payloads', () => {
    expect(parsePaymentDetail({ type: 'UNKNOWN' })).toBeNull()
    expect(parsePaymentDetail({ type: 'QR_CODE', qr_code: null })).toBeNull()
  })

  it('identifies Mayar success and failure hooks and extracts order/payment fields', () => {
    expect(isPaymentSuccessEvent('transaction.success')).toBe(true)
    expect(isPaymentSuccessEvent('invoice.paid')).toBe(true)
    expect(isPaymentFailureEvent('payment.failed')).toBe(true)
    expect(isPaymentFailureEvent('invoice.failure')).toBe(true)
    expect(mapMayarStatus('PAID')).toBe('PAID')
    expect(mapMayarStatus('FAILED')).toBe('FAILED')

    expect(extractExternalId({ data: { externalId: 'ORD-123' } })).toBe('ORD-123')
    expect(extractExternalId({ data: { external_id: 'ORD-456' } })).toBe('ORD-456')
    expect(extractPaidAmount({ data: { amount: 250000 } })).toBe(250000)
    expect(extractPaidAmount({ data: { amount: '250000' } })).toBe(250000)
  })

  it('accepts the standard Mayar HMAC signature format and rejects mismatches', async () => {
    const oldSecret = process.env.MAYAR_WEBHOOK_SECRET
    process.env.MAYAR_WEBHOOK_SECRET = 'test-secret'

    try {
      const body = JSON.stringify({ ok: true })
      const expected = 'sha256=' + (await import('crypto')).createHmac('sha256', 'test-secret').update(body).digest('hex')

      expect(verifyMayarWebhookSignature(body, expected)).toEqual({ valid: true })
      expect(verifyMayarWebhookSignature(body, 'sha256=bad-signature')).toHaveProperty('valid', false)
    } finally {
      if (oldSecret === undefined) {
        delete process.env.MAYAR_WEBHOOK_SECRET
      } else {
        process.env.MAYAR_WEBHOOK_SECRET = oldSecret
      }
    }
  })

  it('normalizes a direct Mayar transaction status lookup into our payment state', () => {
    expect(getMayarTransactionStatus({ status: 'PAID' })).toBe('PAID')
    expect(getMayarTransactionStatus({ status: 'FAILED' })).toBe('FAILED')
    expect(getMayarTransactionStatus({ status: 'EXPIRED' })).toBe('EXPIRED')
    expect(getMayarTransactionStatus({ status: 'PENDING' })).toBe('PENDING')
  })
})
