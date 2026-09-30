/**
 * Mayar API TypeScript types for the native V2 invoice flow.
 */

export const MAYAR_NATIVE_CHANNELS = [
  'qris',
  'va/bni',
  'va/bri',
  'va/mandiri',
  'va/cimb',
  'va/permata',
  'va/bjb',
  'va/bsi',
  'ewallet/dana',
  'ewallet/gopay',
  'ewallet/linkaja',
  'ewallet/shopeepay',
  'ewallet/jenius',
  'outlet/alfamart',
] as const

export type MayarNativeChannel = typeof MAYAR_NATIVE_CHANNELS[number]

export interface MayarInvoiceItem {
  quantity: number
  rate: number
  description: string
}

export interface MayarCreateInvoiceRequest {
  name: string
  email: string
  mobile: string
  description?: string
  expiredAt?: string
  items: MayarInvoiceItem[]
  paymentMethod?: string
  extraData?: Record<string, unknown>
}

export interface MayarCreateInvoiceResponse {
  id?: string
  transactionId?: string
  link?: string
  expiredAt?: number
  extraData?: Record<string, unknown>
  paymentDetail?: unknown
  [key: string]: unknown
}

export type MayarPaymentDetail =
  | { type: 'QR_CODE'; qrCode: string }
  | { type: 'VIRTUAL_ACCOUNT'; channel: string; accountNumber: string; customerName: string }
  | { type: 'EWALLET'; channel: string; actions: Array<{ url: string; url_type: string }> }

export interface MayarCreateInvoiceResult {
  success: boolean
  id: string | null
  transactionId: string | null
  link: string | null
  expiredAt: number | null
  paymentDetail: MayarPaymentDetail | null
  rawResponse: Record<string, unknown>
  error?: string
}

export interface MayarCreatePaymentRequest {
  amount: number
  customerEmail: string
  customerName?: string
  externalId: string
  description?: string
  successReturnUrl?: string
  failureReturnUrl?: string
}

export interface MayarCreatePaymentResponse {
  id?: string
  checkoutUrl?: string
  status?: string
  [key: string]: unknown
}

export interface MayarWebhookPayload {
  id?: string
  event?: string
  order_number?: string
  invoice_number?: string
  amount?: number | string
  order?: {
    invoice_number?: string
    amount?: number | string
    currency?: string
    callback_url?: string
    [key: string]: unknown
  }
  transaction?: {
    status?: string
    date?: string
    original_request_id?: string
    [key: string]: unknown
  }
  channel?: {
    id?: string
    [key: string]: unknown
  }
  data?: {
    id?: string
    status?: string
    amount?: number | string
    currency?: string
    externalId?: string
    customerEmail?: string
    [key: string]: unknown
  }
  createdAt?: string
  [key: string]: unknown
}

export interface MayarPaymentResult {
  success: boolean
  mayarReference: string | null
  checkoutUrl: string | null
  rawResponse: Record<string, unknown>
  error?: string
}

export interface MayarWebhookVerification {
  valid: boolean
  error?: string
}

export type MayarPaymentStatus = 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED' | 'REFUNDED'
