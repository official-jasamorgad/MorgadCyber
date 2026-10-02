'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import BrandLogo from '../../components/BrandLogo'
import ThemeToggle from '../../components/ThemeToggle'

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const productId = searchParams.get('product') ?? ''

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        body: JSON.stringify({ productId, customerName: name, customerEmail: email }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error ?? 'Terjadi kesalahan. Silakan coba lagi.')
        return
      }

      const checkoutUrl = data.data.checkoutUrl
      if (typeof checkoutUrl !== 'string' || new URL(checkoutUrl).protocol !== 'https:') {
        setError('URL pembayaran DOKU tidak valid.')
        return
      }
      window.location.assign(checkoutUrl)
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
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 32 }}>Pembayaran aman diproses langsung melalui DOKU Checkout.</p>

          {!productId && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, marginBottom: 24 }}>
              <p style={{ fontSize: 14, color: '#dc2626', fontWeight: 500 }}>Produk tidak ditemukan. Silakan pilih produk terlebih dahulu.</p>
            </div>
          )}

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
                {loading ? 'Memproses...' : 'Lanjutkan ke DOKU'}
              </button>
          </form>

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Pembayaran', 'Diproses langsung melalui DOKU'],
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
