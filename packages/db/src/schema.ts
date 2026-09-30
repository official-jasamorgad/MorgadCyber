import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

// ─── Enums ───────────────────────────────────────────────────

export const productStatusEnum = pgEnum('product_status', ['DRAFT', 'PUBLISHED', 'ARCHIVED'])
export const productCategoryEnum = pgEnum('product_category', [
  'software', 'application', 'saas', 'source_code', 'plugin', 'template',
  'journal', 'paper', 'makalah', 'ebook', 'document', 'digital_asset', 'other',
])

export const orderStatusEnum = pgEnum('order_status', [
  'PENDING', 'PAYMENT_PENDING', 'PAID', 'READY', 'COMPLETED',
  'CANCELLED', 'EXPIRED', 'REFUNDED', 'FAILED',
])

export const paymentStatusEnum = pgEnum('payment_status', [
  'PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED',
])

export const webhookEventStatusEnum = pgEnum('webhook_event_status', [
  'RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED',
])

export const adminRoleEnum = pgEnum('admin_role', [
  'SUPER_ADMIN', 'ADMIN', 'EDITOR', 'SUPPORT',
])

// ─── Products ─────────────────────────────────────────────────

export const products = pgTable('products', {
  id: text('id').primaryKey().$defaultFn(() => `prod_${createId()}`),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  shortDescription: text('short_description'),
  category: productCategoryEnum('category').notNull(),
  // Price in IDR as integer (e.g. 50000 = Rp 50.000)
  price: integer('price').notNull(),
  currency: text('currency').notNull().default('IDR'),
  // Private storage key (e.g. "products/abc123/product.zip")
  fileKey: text('file_key').notNull(),
  fileName: text('file_name').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }),
  fileMimeType: text('file_mime_type'),
  version: text('version').notNull().default('1.0'),
  // null = unlimited downloads
  maxDownloads: integer('max_downloads'),
  status: productStatusEnum('status').notNull().default('DRAFT'),
  featured: boolean('featured').notNull().default(false),
  thumbnailUrl: text('thumbnail_url'),
  tags: text('tags').array().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex('products_slug_idx').on(t.slug),
  statusIdx: index('products_status_idx').on(t.status),
  categoryIdx: index('products_category_idx').on(t.category),
}))

// ─── Orders ───────────────────────────────────────────────────

export const orders = pgTable('orders', {
  id: text('id').primaryKey().$defaultFn(() => `ord_${createId()}`),
  orderNumber: text('order_number').notNull().unique(),
  productId: text('product_id').notNull().references(() => products.id),
  customerName: text('customer_name'),
  customerEmail: text('customer_email').notNull(),
  // Amount in IDR — copied from product at checkout time (price authority)
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('IDR'),
  paymentProvider: text('payment_provider').notNull().default('mayar'),
  paymentMethod: text('payment_method'),
  transactionId: text('transaction_id'),
  // Reference returned by Mayar after payment creation
  paymentReference: text('payment_reference'),
  // Mayar checkout URL / native payment fallback URL
  checkoutUrl: text('checkout_url'),
  paymentDetail: jsonb('payment_detail'),
  extraData: jsonb('extra_data'),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('PENDING'),
  orderStatus: orderStatusEnum('order_status').notNull().default('PENDING'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orderNumberIdx: uniqueIndex('orders_order_number_idx').on(t.orderNumber),
  emailIdx: index('orders_customer_email_idx').on(t.customerEmail),
  productIdx: index('orders_product_id_idx').on(t.productId),
  paymentStatusIdx: index('orders_payment_status_idx').on(t.paymentStatus),
  paymentMethodIdx: index('orders_payment_method_idx').on(t.paymentMethod),
}))

// ─── Payments ────────────────────────────────────────────────
export const payments = pgTable('payments', {
  id: text('id').primaryKey().$defaultFn(() => `pay_${createId()}`),
  orderId: text('order_id').notNull().references(() => orders.id),
  paymentProvider: text('payment_provider').notNull().default('mayar'),
  paymentReference: text('payment_reference'),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('IDR'),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('PENDING'),
  rawPayload: jsonb('raw_payload'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orderIdx: index('payments_order_id_idx').on(t.orderId),
  referenceIdx: index('payments_reference_idx').on(t.paymentReference),
  statusIdx: index('payments_status_idx').on(t.paymentStatus),
}))

// ─── Download Access ──────────────────────────────────────────

export const downloadAccess = pgTable('download_access', {
  id: text('id').primaryKey().$defaultFn(() => `dl_${createId()}`),
  orderId: text('order_id').notNull().references(() => orders.id).unique(),
  productId: text('product_id').notNull().references(() => products.id),
  // SHA-256 hash of raw token — NEVER store the raw token
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  downloadCount: integer('download_count').notNull().default(0),
  // null = unlimited
  maxDownloads: integer('max_downloads'),
  revoked: boolean('revoked').notNull().default(false),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokedReason: text('revoked_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastDownloadAt: timestamp('last_download_at', { withTimezone: true }),
}, (t) => ({
  orderIdx: uniqueIndex('download_access_order_id_idx').on(t.orderId),
  tokenHashIdx: uniqueIndex('download_access_token_hash_idx').on(t.tokenHash),
}))

// ─── Licenses ─────────────────────────────────────────────────
export const licenses = pgTable('licenses', {
  id: text('id').primaryKey().$defaultFn(() => `lic_${createId()}`),
  orderId: text('order_id').notNull().references(() => orders.id),
  productId: text('product_id').notNull().references(() => products.id),
  licenseKey: text('license_key').notNull().unique(),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, REVOKED, EXPIRED
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokedReason: text('revoked_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  licenseKeyIdx: uniqueIndex('licenses_license_key_idx').on(t.licenseKey),
  orderIdx: index('licenses_order_id_idx').on(t.orderId),
  productIdx: index('licenses_product_id_idx').on(t.productId),
}))

// ─── Webhook Events (idempotency) ────────────────────────────

export const webhookEvents = pgTable('webhook_events', {
  id: text('id').primaryKey().$defaultFn(() => `wh_${createId()}`),
  // UNIQUE constraint is the idempotency key
  eventId: text('event_id').notNull().unique(),
  provider: text('provider').notNull().default('mayar'),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  status: webhookEventStatusEnum('status').notNull().default('RECEIVED'),
  errorMessage: text('error_message'),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  eventIdIdx: uniqueIndex('webhook_events_event_id_idx').on(t.eventId),
}))

// ─── Admin Users ──────────────────────────────────────────────

export const adminUsers = pgTable('admin_users', {
  id: text('id').primaryKey().$defaultFn(() => `adm_${createId()}`),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  // bcrypt hash — password is never stored in plaintext
  passwordHash: text('password_hash').notNull(),
  role: adminRoleEnum('role').notNull().default('SUPPORT'),
  active: boolean('active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailIdx: uniqueIndex('admin_users_email_idx').on(t.email),
}))

// ─── Audit Logs ───────────────────────────────────────────────

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey().$defaultFn(() => `aud_${createId()}`),
  adminId: text('admin_id').references(() => adminUsers.id),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  metadata: jsonb('metadata'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  adminIdx: index('audit_logs_admin_id_idx').on(t.adminId),
  actionIdx: index('audit_logs_action_idx').on(t.action),
  createdAtIdx: index('audit_logs_created_at_idx').on(t.createdAt),
}))

// ─── Login Attempts (brute-force protection) ─────────────────

export const loginAttempts = pgTable('login_attempts', {
  id: text('id').primaryKey().$defaultFn(() => `lat_${createId()}`),
  ipAddress: text('ip_address').notNull(),
  email: text('email').notNull(),
  success: boolean('success').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ipIdx: index('login_attempts_ip_idx').on(t.ipAddress),
  emailIdx: index('login_attempts_email_idx').on(t.email),
}))
