'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import BrandLogo from '../../components/BrandLogo'
import ThemeToggle from '../../components/ThemeToggle'

type OrderStatus = {
  orderNumber: string
  productName: string
  paymentStatus: string
  orderStatus: string
  downloadAvailable: boolean
  downloadUrl: string | null
  amount: number
  currency: string
  createdAt: string
}

export default function OrderPage() {
  const searchParams = useSearchParams()
  const [orderNumber, setOrderNumber] = useState(searchParams.get('number') ?? '')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<OrderStatus | null>(null)
  const [resendMsg, setResendMsg] = useState('')

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setResult(null)
    setResendMsg('')
    if (!orderNumber.trim() || !email.trim()) {
      setError('Nomor pesanan dan email harus diisi.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/order?number=${encodeURIComponent(orderNumber.trim())}&email=${encodeURIComponent(email.trim())}`)
      const data = await res.json()
      if (!data.success) {
        setError(data.error ?? 'Pesanan tidak ditemukan.')
        return
      }
      setResult(data.data)
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResendMsg('')
    setResendLoading(true)
    try {
      const res = await fetch('/api/order/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), email: email.trim() }),
      })
      const data = await res.json()
      setResendMsg(data.success ? 'Link download baru telah dikirim ke email Anda.' : (data.error ?? 'Gagal mengirim ulang.'))
    } catch {
      setResendMsg('Terjadi kesalahan jaringan.')
    } finally {
      setResendLoading(false)
    }
  }

  const statusLabel: Record<string, { label: string; color: string; bg: string }> = {
    PAID:    { label: 'Lunas', color: '#16a34a', bg: '#f0fdf4' },
    PENDING: { label: 'Menunggu Pembayaran', color: '#d97706', bg: '#fffbeb' },
    FAILED:  { label: 'Gagal', color: '#dc2626', bg: '#fef2f2' },
    EXPIRED: { label: 'Kedaluwarsa', color: '#6b7280', bg: '#f9fafb' },
    REFUNDED:{ label: 'Dikembalikan', color: '#7c3aed', bg: '#f5f3ff' },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <BrandLogo />
          <nav style={{ display: 'flex', gap: 24 }}>
            <Link href="/categories" style={{ fontSize: 14, fontWeight: 500, color: '#475569' }}>Kategori</Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 560, margin: '64px auto', padding: '0 24px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 8, letterSpacing: '-0.02em' }}>Cek Pesanan</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 32 }}>Masukkan nomor pesanan dan email untuk melihat status pesanan Anda.</p>

          <form onSubmit={handleLookup} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Nomor Pesanan</label>
              <input
                type="text"
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
                placeholder="ORD-20260918-XXXXXXXX"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@contoh.com"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading} style={{
              background: '#7c3aed', color: '#fff', padding: '12px', borderRadius: 8,
              fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
            }}>
              {loading ? 'Mencari...' : 'Cek Pesanan'}
            </button>
          </form>

          {result && (
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>Detail Pesanan</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Row label="No. Pesanan" value={result.orderNumber} mono />
                <Row label="Produk" value={result.productName} />
                <Row label="Tanggal" value={new Date(result.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' })} />
                <Row label="Jumlah" value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: result.currency, minimumFractionDigits: 0 }).format(result.amount)} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Status Pembayaran</span>
                  <span style={{
                    background: statusLabel[result.paymentStatus]?.bg ?? '#f9fafb',
                    color: statusLabel[result.paymentStatus]?.color ?? '#6b7280',
                    padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 700,
                  }}>
                    {statusLabel[result.paymentStatus]?.label ?? result.paymentStatus}
                  </span>
                </div>
              </div>

              {result.downloadAvailable && result.downloadUrl && (
                <a href={result.downloadUrl} style={{
                  display: 'block', textAlign: 'center', marginTop: 24,
                  background: '#7c3aed', color: '#fff',
                  padding: '14px 24px', borderRadius: 10, fontSize: 15, fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
                }}>⬇️ Download Produk</a>
              )}

              {result.paymentStatus === 'PAID' && !result.downloadAvailable && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 12, marginTop: 20 }}>
                  <p style={{ fontSize: 13, color: '#92400e' }}>Link download sudah kedaluwarsa atau tidak tersedia. Gunakan tombol di bawah untuk meminta link baru.</p>
                </div>
              )}

              {result.paymentStatus === 'PAID' && (
                <div style={{ marginTop: 16 }}>
                  <button onClick={handleResend} disabled={resendLoading} style={{
                    width: '100%', background: '#fff', border: '1px solid #7c3aed', color: '#7c3aed',
                    padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}>
                    {resendLoading ? 'Mengirim...' : 'Kirim ulang link download'}
                  </button>
                  {resendMsg && <p style={{ fontSize: 13, color: '#16a34a', marginTop: 8, textAlign: 'center' }}>{resendMsg}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', fontFamily: mono ? 'monospace' : undefined }}>{value}</span>
    </div>
  )
}
