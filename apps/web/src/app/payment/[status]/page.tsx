import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db, orders, downloadAccess } from '@morgad/db'
import { eq } from 'drizzle-orm'

export const metadata: Metadata = { title: 'Status Pembayaran' }
// Never cache — payment status must always be fresh
export const revalidate = 0

type Props = { params: { status: string }; searchParams: { order?: string } }

export default async function PaymentStatusPage({ params, searchParams }: Props) {
  const { status } = params
  if (!['pending', 'success', 'failed', 'expired'].includes(status)) notFound()

  const orderNumber = searchParams.order

  // Fetch real order status from database
  let orderData: typeof orders.$inferSelect | undefined
  let hasDownload = false

  if (orderNumber) {
    const rows = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1)
    orderData = rows[0]
    if (orderData) {
      const dlRows = await db.select().from(downloadAccess).where(eq(downloadAccess.orderId, orderData.id)).limit(1)
      hasDownload = dlRows.length > 0 && !dlRows[0].revoked && new Date(dlRows[0].expiresAt) > new Date()
    }
  }

  const realStatus = orderData?.paymentStatus ?? status.toUpperCase()

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 520, width: '100%', padding: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          {realStatus === 'PAID' ? (
            <>
              <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Pembayaran Berhasil!</h1>
              <p style={{ fontSize: 15, color: '#64748b', marginBottom: 8 }}>Terima kasih! Pembayaran Anda telah terverifikasi.</p>
              {orderNumber && <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 32, fontFamily: 'monospace' }}>No. Pesanan: {orderNumber}</p>}
              {hasDownload && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 20, marginBottom: 24 }}>
                  <p style={{ fontSize: 14, color: '#16a34a', fontWeight: 600, marginBottom: 4 }}>Link download tersedia!</p>
                  <p style={{ fontSize: 13, color: '#15803d' }}>Cek email Anda atau gunakan halaman pencarian pesanan.</p>
                </div>
              )}
              <Link href="/order" style={{
                display: 'block', background: '#7c3aed', color: '#fff',
                padding: '14px 24px', borderRadius: 10, fontSize: 15, fontWeight: 700,
                marginBottom: 12,
              }}>Cek Pesanan & Download</Link>
              <Link href="/" style={{ fontSize: 14, color: '#7c3aed' }}>Kembali ke Beranda</Link>
            </>
          ) : realStatus === 'FAILED' ? (
            <>
              <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Pembayaran Gagal</h1>
              <p style={{ fontSize: 15, color: '#64748b', marginBottom: 32 }}>Pembayaran belum berhasil. Silakan coba kembali.</p>
              <Link href="/" style={{
                display: 'block', background: '#7c3aed', color: '#fff',
                padding: '14px 24px', borderRadius: 10, fontSize: 15, fontWeight: 700,
                marginBottom: 12,
              }}>Kembali ke Beranda</Link>
            </>
          ) : realStatus === 'EXPIRED' ? (
            <>
              <div style={{ fontSize: 64, marginBottom: 16 }}>⏰</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Sesi Pembayaran Kedaluwarsa</h1>
              <p style={{ fontSize: 15, color: '#64748b', marginBottom: 32 }}>Sesi pembayaran telah berakhir. Silakan buat pembayaran baru.</p>
              <Link href="/" style={{
                display: 'block', background: '#7c3aed', color: '#fff',
                padding: '14px 24px', borderRadius: 10, fontSize: 15, fontWeight: 700,
              }}>Pilih Produk Lagi</Link>
            </>
          ) : (
            <>
              <div style={{ fontSize: 64, marginBottom: 16 }}>⏳</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Menunggu Konfirmasi</h1>
              <p style={{ fontSize: 15, color: '#64748b', marginBottom: 8 }}>Pembayaran Anda sedang diproses oleh DOKU.</p>
              {orderNumber && <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 32, fontFamily: 'monospace' }}>No. Pesanan: {orderNumber}</p>}
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 32 }}>
                Konfirmasi biasanya berlangsung dalam beberapa menit. Anda akan menerima email setelah pembayaran dikonfirmasi.
              </p>
              <Link href={orderNumber ? `/order?number=${orderNumber}` : '/order'} style={{
                display: 'block', background: '#7c3aed', color: '#fff',
                padding: '14px 24px', borderRadius: 10, fontSize: 15, fontWeight: 700,
                marginBottom: 12,
              }}>Cek Status Pesanan</Link>
              <Link href="/" style={{ fontSize: 14, color: '#7c3aed' }}>Kembali ke Beranda</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
