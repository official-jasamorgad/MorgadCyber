/**
 * Mayar API Client for the current V2 native invoice flow.
 */

import { createHash, createHmac, randomUUID } from 'crypto'
import type {
  MayarCreateInvoiceRequest,
  MayarCreateInvoiceResponse,
  MayarCreateInvoiceResult,
  MayarCreatePaymentRequest,
  MayarCreatePaymentResponse,
  MayarPaymentDetail,
  MayarPaymentResult,
} from './types'

const DOKU_BASE_URL = (process.env.DOKU_BASE_URL || 'https://doku.com').replace(/\/+$/, '')
const MAYAR_API_BASE =
  process.env.MAYAR_BASE_URL ||
  process.env.MAYAR_API_BASE ||
  (process.env.MAYAR_ENV === 'sandbox' ? 'https://mayar.io/hl/v2' : 'https://api.mayar.id/hl/v2')

const ALLOWED_SCHEMES = new Set(['https:', 'dana:', 'gojek:', 'shopeeid:'])

export function generateDokuSignature(
  clientId: string,
  secretKey: string,
  requestId: string,
  timestamp: string,
  endpointPath: string,
  payloadString: string,
): { signature: string; digest: string } {
  const digest = createHash('sha256').update(payloadString, 'utf8').digest('base64')
  const stringToSign = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${endpointPath}\nDigest:${digest}`
  const rawSig = createHmac('sha256', secretKey).update(stringToSign, 'utf8').digest('base64')
  return {
    signature: `HMACSHA256=${rawSig}`,
    digest,
  }
}

function getMayarApiKey(): string {
  const key = process.env.MAYAR_API_KEY
  if (!key) throw new Error('MAYAR_API_KEY environment variable is required')
  return key
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

export function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null

  try {
    const parsed = new URL(value)
    return ALLOWED_SCHEMES.has(parsed.protocol) ? value : null
  } catch {
    return null
  }
}

export class MayarError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message)
    this.name = 'MayarError'
  }
}

export async function mayarFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${MAYAR_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getMayarApiKey()}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  const body = (await response.json().catch(() => ({}))) as {
    statusCode?: number
    messages?: string
    message?: string
    data?: T
  }
  const statusCode = body.statusCode ?? response.status

  if (!response.ok || statusCode >= 400) {
    throw new MayarError(
      body.messages ?? body.message ?? `HTTP ${response.status}`,
      statusCode,
    )
  }

  return (body.data ?? (body as unknown as T)) as T
}

function parseQris(detail: Record<string, unknown>): MayarPaymentDetail | null {
  const qrRoot = asRecord(detail.qr_code)
  if (!qrRoot) return null
  const properties = asRecord(qrRoot.channel_properties)
  const qrCode = asText(properties?.qr_string)
  return qrCode ? { type: 'QR_CODE', qrCode } : null
}

function parseVirtualAccount(detail: Record<string, unknown>): MayarPaymentDetail | null {
  const accountRoot = asRecord(detail.virtual_account)
  if (!accountRoot) return null
  const properties = asRecord(accountRoot.channel_properties)
  const channel = asText(accountRoot.channel_code)
  const accountNumber = asText(properties?.virtual_account_number)
  const customerName = asText(properties?.customer_name)
  if (!channel || !accountNumber || !customerName) return null
  return { type: 'VIRTUAL_ACCOUNT', channel, accountNumber, customerName }
}

function parseEwallet(detail: Record<string, unknown>): MayarPaymentDetail | null {
  const walletRoot = asRecord(detail.ewallet)
  if (!walletRoot) return null
  const channel = asText(walletRoot.channel_code)
  const actions = Array.isArray(walletRoot.actions) ? walletRoot.actions : []
  const validActions = actions.flatMap((entry) => {
    const record = asRecord(entry)
    if (!record) return []
    const url = safeUrl(record.url)
    const type = asText(record.url_type)
    if (!url || !type) return []
    return [{ url, url_type: type }]
  })

  if (!channel || validActions.length === 0) return null
  return { type: 'EWALLET', channel, actions: validActions }
}

export function parsePaymentDetail(value: unknown): MayarPaymentDetail | null {
  const detail = asRecord(value)
  if (!detail) return null

  switch (asText(detail.type)?.toUpperCase()) {
    case 'QR_CODE':
      return parseQris(detail)
    case 'VIRTUAL_ACCOUNT':
      return parseVirtualAccount(detail)
    case 'EWALLET':
      return parseEwallet(detail)
    default:
      return null
  }
}

export async function createMayarInvoice(
  request: MayarCreateInvoiceRequest,
): Promise<MayarCreateInvoiceResult> {
  try {
    if (process.env.DOKU_CLIENT_ID && process.env.DOKU_SECRET_KEY) {
      const clientId = process.env.DOKU_CLIENT_ID
      const secretKey = process.env.DOKU_SECRET_KEY
      const endpointPath = '/checkout/v1/payment'
      const requestId = randomUUID()
      const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
      const totalAmount = request.items?.reduce((sum, item) => sum + (item.rate * item.quantity), 0) || 10000
      const invoiceNumber = (request.extraData?.orderNumber as string) || (request.extraData?.orderId as string) || `ORD-${Date.now()}`
      const callbackUrl = `${process.env.APP_URL || 'http://localhost:3000'}/payment/success`

      const dokuPayload = {
        order: {
          invoice_number: invoiceNumber,
          amount: Math.round(totalAmount),
          currency: 'IDR',
          callback_url: callbackUrl,
        },
        customer: {
          name: request.name,
          email: request.email,
          phone: request.mobile && request.mobile !== '000000000000' ? request.mobile : '6281234567890',
        },
      }

      const payloadStr = JSON.stringify(dokuPayload)
      const { signature } = generateDokuSignature(
        clientId,
        secretKey,
        requestId,
        timestamp,
        endpointPath,
        payloadStr
      )

      const response = await fetch(`${DOKU_BASE_URL}${endpointPath}`, {
        method: 'POST',
        headers: {
          'Client-Id': clientId,
          'Request-Id': requestId,
          'Request-Timestamp': timestamp,
          'Signature': signature,
          'Content-Type': 'application/json',
        },
        body: payloadStr,
      })

      const respJson = (await response.json().catch(() => ({}))) as Record<string, any>
      if (!response.ok) {
        const errorMsg = respJson.error?.message || respJson.message || `DOKU API error (${response.status})`
        return {
          success: false,
          id: null,
          transactionId: null,
          link: null,
          expiredAt: null,
          paymentDetail: null,
          rawResponse: respJson,
          error: errorMsg,
        }
      }

      const paymentData = respJson.response?.payment || respJson.payment || {}
      const checkoutUrl = paymentData.url || respJson.url || `${DOKU_BASE_URL}/checkout/v1/payment`
      const providerRef = paymentData.token_id || respJson.order?.invoice_number || invoiceNumber

      return {
        success: true,
        id: providerRef,
        transactionId: providerRef,
        link: checkoutUrl,
        expiredAt: null,
        paymentDetail: null,
        rawResponse: respJson,
      }
    }

    const payload = {
      name: request.name,
      email: request.email,
      mobile: request.mobile,
      description: request.description ?? 'Pembelian produk',
      expiredAt: request.expiredAt,
      items: request.items,
      paymentMethod: request.paymentMethod,
      extraData: request.extraData ?? {},
    }

    const data = await mayarFetch<MayarCreateInvoiceResponse>('/invoices/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const normalizedDetail = parsePaymentDetail(data.paymentDetail ?? null)

    return {
      success: true,
      id: data.id ?? null,
      transactionId: data.transactionId ?? null,
      link: data.link ?? null,
      expiredAt: typeof data.expiredAt === 'number' ? data.expiredAt : null,
      paymentDetail: normalizedDetail,
      rawResponse: data as Record<string, unknown>,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown payment gateway error'
    return {
      success: false,
      id: null,
      transactionId: null,
      link: null,
      expiredAt: null,
      paymentDetail: null,
      rawResponse: {},
      error: message,
    }
  }
}

export const createDokuPayment = createMayarInvoice
export const createPayment = createMayarInvoice

export async function createMayarPayment(
  request: MayarCreatePaymentRequest,
): Promise<MayarPaymentResult> {
  try {
    const payload: Record<string, unknown> = {
      amount: request.amount,
      email: request.customerEmail,
      name: request.customerName,
      externalId: request.externalId,
      description: request.description ?? `Order ${request.externalId}`,
    }

    if (request.successReturnUrl) payload.successReturnUrl = request.successReturnUrl
    if (request.failureReturnUrl) payload.failureReturnUrl = request.failureReturnUrl

    const data = await mayarFetch<MayarCreatePaymentResponse>('/payment-request', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const mayarReference = (data.id as string) ?? null
    const checkoutUrl = (data.checkoutUrl as string) ?? null

    return {
      success: true,
      mayarReference,
      checkoutUrl,
      rawResponse: data as Record<string, unknown>,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      mayarReference: null,
      checkoutUrl: null,
      rawResponse: {},
      error: message,
    }
  }
}

export function getMayarTransactionStatus(payload: Record<string, unknown> | undefined | null): 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED' | 'REFUNDED' {
  const value = payload?.status ?? payload?.paymentStatus ?? payload?.state ?? payload?.transaction_status
  const status = typeof value === 'string' ? value.trim().toUpperCase() : ''

  if (['PAID', 'SUCCESS', 'SETTLED', 'COMPLETED'].includes(status)) return 'PAID'
  if (['FAILED', 'FAILURE', 'DECLINED'].includes(status)) return 'FAILED'
  if (status === 'EXPIRED') return 'EXPIRED'
  if (status === 'REFUNDED') return 'REFUNDED'
  return 'PENDING'
}

export async function getMayarPayment(paymentId: string): Promise<Record<string, unknown> | null> {
  try {
    return await mayarFetch<Record<string, unknown>>(`/payment-request/${paymentId}`)
  } catch {
    return null
  }
}

export async function getMayarTransaction(paymentId: string): Promise<Record<string, unknown> | null> {
  try {
    return await mayarFetch<Record<string, unknown>>(`/transactions/${encodeURIComponent(paymentId)}`)
  } catch {
    return null
  }
}
