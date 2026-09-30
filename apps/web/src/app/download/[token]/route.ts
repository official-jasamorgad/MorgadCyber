import { NextRequest, NextResponse } from 'next/server'
import { db, downloadAccess, orders, products, auditLogs } from '@morgad/db'
import { eq } from 'drizzle-orm'
import { verifyToken } from '@morgad/security'
import { hashToken } from '@morgad/security'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  const rawToken = params.token

  if (!rawToken || rawToken.length < 10) {
    return new NextResponse('Token tidak valid.', { status: 400 })
  }

  // ── Step 1: Hash incoming token for DB lookup ────────────────
  const tokenHash = hashToken(rawToken)

  // ── Step 2: Find download access record ──────────────────────
  const dlRows = await db.select().from(downloadAccess).where(eq(downloadAccess.tokenHash, tokenHash)).limit(1)
  const dl = dlRows[0]

  if (!dl) {
    return new NextResponse('Link download tidak valid.', { status: 404 })
  }

  // ── Step 3: Check expiration ─────────────────────────────────
  if (new Date() > new Date(dl.expiresAt)) {
    return new NextResponse('Link download sudah kedaluwarsa. Silakan minta link baru melalui halaman Cek Pesanan.', { status: 410 })
  }

  // ── Step 4: Check revocation ─────────────────────────────────
  if (dl.revoked) {
    return new NextResponse('Akses download ini sudah tidak aktif.', { status: 403 })
  }

  // ── Step 5: Verify order ─────────────────────────────────────
  const orderRows = await db.select().from(orders).where(eq(orders.id, dl.orderId)).limit(1)
  const order = orderRows[0]

  if (!order) {
    return new NextResponse('Pesanan tidak ditemukan.', { status: 404 })
  }

  // ── Step 6: Verify payment ───────────────────────────────────
  if (order.paymentStatus !== 'PAID' && order.paymentStatus !== 'REFUNDED') {
    return new NextResponse('Pembayaran belum terverifikasi.', { status: 402 })
  }
  if (order.paymentStatus === 'REFUNDED') {
    return new NextResponse('Pesanan ini telah dikembalikan (refunded).', { status: 403 })
  }

  // ── Step 7: Verify product ───────────────────────────────────
  const productRows = await db.select().from(products).where(eq(products.id, dl.productId)).limit(1)
  const product = productRows[0]

  if (!product) {
    return new NextResponse('Produk tidak ditemukan.', { status: 404 })
  }

  // ── Step 8: Verify access belongs to order/product ───────────
  if (dl.orderId !== order.id || dl.productId !== product.id) {
    return new NextResponse('Akses tidak valid.', { status: 403 })
  }

  // ── Step 9: Check download limit ─────────────────────────────
  const maxDownloads = dl.maxDownloads ?? product.maxDownloads
  if (maxDownloads !== null && dl.downloadCount >= maxDownloads) {
    return new NextResponse('Batas download telah tercapai. Hubungi support untuk bantuan.', { status: 403 })
  }

  // ── Step 10: Verify file exists in private storage ───────────
  // For S3-compatible storage, generate a temporary signed URL
  // The file is never served from a public URL
  const signedUrl = await generateSignedDownloadUrl(product.fileKey)

  if (!signedUrl) {
    console.error(`[Download] File not found in storage: ${product.fileKey}`)
    return new NextResponse('File tidak tersedia saat ini. Silakan hubungi support.', { status: 503 })
  }

  // ── Increment download count ──────────────────────────────────
  await db.update(downloadAccess).set({
    downloadCount: dl.downloadCount + 1,
    lastDownloadAt: new Date(),
  }).where(eq(downloadAccess.id, dl.id))

  // Audit log
  await db.insert(auditLogs).values({
    action: 'DOWNLOAD_STARTED',
    resourceType: 'download_access',
    resourceId: dl.id,
    metadata: { orderId: order.id, productId: product.id, downloadCount: dl.downloadCount + 1 },
    ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null,
  })

  // Redirect to temporary signed URL (expires in ~60 seconds)
  return NextResponse.redirect(signedUrl, { status: 302 })
}

/**
 * Generate a temporary signed URL for a private file.
 *
 * In production, use your S3-compatible storage SDK to generate
 * a pre-signed URL with short expiry (e.g., 60 seconds).
 *
 * This is a placeholder that must be implemented with your actual
 * storage provider (Cloudflare R2, AWS S3, etc.)
 */
async function generateSignedDownloadUrl(fileKey: string): Promise<string | null> {
  // PLACEHOLDER — replace with actual S3 SDK implementation
  // Example for AWS S3:
  //   const command = new GetObjectCommand({ Bucket: process.env.STORAGE_BUCKET, Key: fileKey })
  //   return getSignedUrl(s3Client, command, { expiresIn: 60 })
  //
  // Example for Cloudflare R2:
  //   Similar to AWS S3 using @aws-sdk/s3-request-presigner

  const storageEndpoint = process.env.STORAGE_ENDPOINT
  const storageBucket = process.env.STORAGE_BUCKET

  if (!storageEndpoint || !storageBucket) {
    // Development fallback: serve from local storage/ directory if it exists
    console.warn('[Download] Storage not configured, using development fallback')
    return null
  }

  // Real implementation: generate presigned URL with S3 SDK
  // Return null if file doesn't exist
  return null
}
