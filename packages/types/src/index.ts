// ============================================================
// Shared TypeScript types for 1024 Tera Digital Marketplace
// ============================================================

// ─── Product ─────────────────────────────────────────────────

export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type ProductCategory =
  | 'software'
  | 'application'
  | 'saas'
  | 'source_code'
  | 'plugin'
  | 'template'
  | 'journal'
  | 'paper'
  | 'makalah'
  | 'ebook'
  | 'document'
  | 'digital_asset'
  | 'other'

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  shortDescription: string | null
  category: ProductCategory
  price: number           // in IDR (smallest unit, integer)
  currency: string        // 'IDR'
  fileKey: string         // private storage key
  fileName: string
  fileSize: number | null
  fileMimeType: string | null
  version: string
  maxDownloads: number | null  // null = unlimited
  status: ProductStatus
  featured: boolean
  thumbnailUrl: string | null
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

// ─── Order ───────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'FAILED'

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED'

export interface Order {
  id: string
  orderNumber: string
  productId: string
  customerName: string | null
  customerEmail: string
  amount: number          // Must match product price at time of order
  currency: string
  paymentProvider: 'mayar'
  paymentReference: string | null   // Mayar invoice/payment ID
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  paidAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// ─── Download Access ─────────────────────────────────────────

export interface DownloadAccess {
  id: string
  orderId: string
  productId: string
  tokenHash: string       // SHA-256 of raw token — NEVER store raw token
  expiresAt: Date
  downloadCount: number
  maxDownloads: number | null  // null = unlimited
  revoked: boolean
  revokedAt: Date | null
  revokedReason: string | null
  createdAt: Date
  lastDownloadAt: Date | null
}

// ─── Webhook Event ───────────────────────────────────────────

export type WebhookEventStatus = 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'IGNORED'

export interface WebhookEvent {
  id: string
  eventId: string         // UNIQUE — used for idempotency
  provider: 'mayar'
  eventType: string
  payload: Record<string, unknown>
  status: WebhookEventStatus
  errorMessage: string | null
  processedAt: Date | null
  createdAt: Date
}

// ─── Admin User ──────────────────────────────────────────────

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'SUPPORT'

export interface AdminUser {
  id: string
  email: string
  name: string
  passwordHash: string    // bcrypt hash — never plaintext
  role: AdminRole
  active: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// ─── Audit Log ───────────────────────────────────────────────

export interface AuditLog {
  id: string
  adminId: string | null
  action: string
  resourceType: string
  resourceId: string | null
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: Date
}

// ─── API Response Types ──────────────────────────────────────

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: string
  code?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ─── Checkout ────────────────────────────────────────────────

export interface CheckoutRequest {
  productId: string
  customerName: string
  customerEmail: string
}

export interface CheckoutResponse {
  orderId: string
  orderNumber: string
  paymentStatus: PaymentStatus
  checkoutUrl: string       // Mayar checkout URL to redirect customer
  mayarReference: string | null
}

// ─── Order Lookup ────────────────────────────────────────────

export interface OrderLookupRequest {
  orderNumber: string
  email: string
}

export interface OrderStatusResponse {
  orderNumber: string
  productName: string
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  downloadAvailable: boolean
  downloadUrl: string | null
  createdAt: Date
}

// ─── Admin Session ───────────────────────────────────────────

export interface AdminSession {
  adminId: string
  email: string
  name: string
  role: AdminRole
  issuedAt: number
  expiresAt: number
}

export interface Payment {
  id: string
  orderId: string
  paymentProvider: 'mayar'
  paymentReference: string | null
  amount: number
  currency: 'IDR' | 'USD'
  paymentStatus: PaymentStatus
  paidAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface License {
  id: string
  orderId: string
  productId: string
  licenseKey: string
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED'
  revokedAt: Date | null
  revokedReason: string | null
  createdAt: Date
  updatedAt: Date
}

// ─── Dashboard Stats ─────────────────────────────────────────

export interface DashboardStats {
  totalRevenueIdr: number
  totalRevenueUsd: number
  totalOrders: number
  totalPaidOrders: number
  totalProducts: number
  totalCustomers: number
  revenueThisMonthIdr: number
  revenueThisMonthUsd: number
  recentOrders: Array<{
    orderNumber: string
    productName: string
    customerEmail: string
    amount: number
    currency: string
    paymentStatus: PaymentStatus
    createdAt: Date
  }>
}

