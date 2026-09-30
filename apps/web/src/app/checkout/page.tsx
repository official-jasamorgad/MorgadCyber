'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import BrandLogo from '../../components/BrandLogo'
import ThemeToggle from '../../components/ThemeToggle'

const CHANNEL_OPTIONS = [
  { value: 'qris', label: 'QRIS' },
  { value: 'va/bni', label: 'Virtual Account BNI' },
  { value: 'va/bri', label: 'Virtual Account BRI' },
  { value: 'ewallet/dana', label: 'DANA' },
  { value: 'ewallet/gopay', label: 'GoPay' },
  { value: 'ewallet/shopeepay', label: 'ShopeePay' },
]

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const productId = searchParams.get('product') ?? ''

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [paymentMethod, setPaymentMethod] = useState(CHANNEL_OPTIONS[0].value)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentDetail, setPaymentDetail] = useState<any>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)

  const paymentTitle = useMemo(() => CHANNEL_OPTIONS.find((option) => option.value === paymentMethod)?.label ?? 'Pembayaran', [paymentMethod])

  useEffect(() => {
    if (!orderNumber || !email.trim()) return

    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch(`/api/order?number=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email.trim())}`)
        const data = await res.json()
        if (!data?.success || cancelled) return

        const nextStatus = data.data?.paymentStatus as string | undefined
        if (nextStatus === 'PAID') {
          router.push(`/payment/success?order=${encodeURIComponent(orderNumber)}`)
          return
        }
        if (nextStatus === 'FAILED' || nextStatus === 'EXPIRED') {
          router.push(`/payment/failed?order=${encodeURIComponent(orderNumber)}`)
          return
        }
      } catch {
        // Ignore transient polling errors and keep the native payment flow active.
      }
    }

    poll()
    const interval = setInterval(poll, 8000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [orderNumber, email, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!productId) { setError('Produk tidak ditemukan.'); return }
    if (!name.trim()) { setError('Nama harus diisi.'); return }
    if (!email.trim() || !email.includes('@')) { setError('Email tidak valid.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, customerName: name, customerEmail: email, paymentMethod }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error ?? 'Terjadi kesalahan. Silakan coba lagi.')
        return
      }

      const detail = data.data.paymentDetail ?? null
      setOrderNumber(data.data.orderNumber ?? null)
      setPaymentDetail(detail)
      if (!detail) {
        router.push(`/payment/pending?order=${data.data.orderNumber}`)
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <BrandLogo />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 14, color: '#64748b' }}>Checkout</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 700, margin: '64px auto', padding: '0 24px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 8, letterSpacing: '-0.02em' }}>Checkout</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 32 }}>Pilih channel pembayaran yang ingin Anda gunakan, lalu bayar di aplikasi.</p>

          {!productId && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, marginBottom: 24 }}>
              <p style={{ fontSize: 14, color: '#dc2626', fontWeight: 500 }}>Produk tidak ditemukan. Silakan pilih produk terlebih dahulu.</p>
            </div>
          )}

          {!paymentDetail ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Nama Lengkap</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@contoh.com"
                  required
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Metode Pembayaran</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 15, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                >
                  {CHANNEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12 }}>
                  <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !productId}
                style={{ background: loading ? '#a78bfa' : '#7c3aed', color: '#fff', padding: '14px', borderRadius: 10, fontSize: 15, fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}
              >
                {loading ? 'Memproses...' : `Buat ${paymentTitle}`}
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7c3aed', marginBottom: 8 }}>Native Checkout</p>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>{paymentTitle}</h2>
                {orderNumber && (
                  <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px', fontFamily: 'monospace' }}>No. Pesanan: {orderNumber}</p>
                )}
                <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>Sistem akan otomatis mengecek status pembayaran Anda. Setelah dibayar, Anda akan diarahkan ke halaman konfirmasi.</p>
                {paymentDetail.type === 'QR_CODE' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, textAlign: 'center' }}>
                      <div style={{ fontSize: 42, marginBottom: 8 }}>📱</div>
                      <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>QR code pembayaran</p>
                    </div>
                    <code style={{ display: 'block', background: '#111827', color: '#e2e8f0', padding: 12, borderRadius: 8, overflowWrap: 'anywhere', fontSize: 12 }}>{paymentDetail.qrCode}</code>
                  </div>
                )}
                {paymentDetail.type === 'VIRTUAL_ACCOUNT' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
                      <p style={{ margin: '0 0 6px', fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{paymentDetail.channel}</p>
                      <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{paymentDetail.accountNumber}</p>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>A.n. {paymentDetail.customerName}</p>
                  </div>
                )}
                {paymentDetail.type === 'EWALLET' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {paymentDetail.actions.map((action: { url: string; url_type: string }, index: number) => (
                      <a key={`${action.url}-${index}`} href={action.url} target="_blank" rel="noreferrer" style={{ display: 'block', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', color: '#0f172a', textDecoration: 'none', fontWeight: 600 }}>
                        {action.url_type} — {action.url}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPaymentDetail(null)}
                style={{ background: '#e2e8f0', color: '#0f172a', padding: '12px 16px', borderRadius: 10, border: 'none', fontWeight: 700 }}
              >
                Pilih channel lain
              </button>
            </div>
          )}

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Pembayaran', 'Diproses melalui Mayar'],
              ['Akses', 'Tidak perlu membuat akun'],
              ['Pengiriman', 'Download tersedia setelah pembayaran terverifikasi'],
            ].map(([label, text]) => (
              <div key={text} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{label}</span>
                <span style={{ fontSize: 12, color: '#64748b' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
