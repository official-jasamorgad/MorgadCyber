'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminShell } from '@/components/AdminShell'

const CATEGORIES = [
  { value: 'software', label: 'Software' },
  { value: 'application', label: 'Application' },
  { value: 'saas', label: 'SaaS' },
  { value: 'source_code', label: 'Source Code' },
  { value: 'plugin', label: 'Plugin' },
  { value: 'template', label: 'Template' },
  { value: 'journal', label: 'Journal' },
  { value: 'paper', label: 'Paper' },
  { value: 'makalah', label: 'Makalah' },
  { value: 'ebook', label: 'E-Book' },
  { value: 'document', label: 'Document' },
  { value: 'digital_asset', label: 'Aset Digital' },
  { value: 'other', label: 'Lainnya' },
]

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    shortDescription: '',
    category: 'digital_asset',
    price: 50000,
    currency: 'IDR',
    fileName: '',
    fileKey: '',
    version: '1.0',
    maxDownloads: 5,
    status: 'PUBLISHED',
    featured: false,
  })

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
    setFormData((prev) => ({ ...prev, name, slug: prev.slug || slug }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!formData.name.trim() || !formData.slug.trim()) {
      setError('Nama dan slug produk wajib diisi.')
      return
    }
    if (!formData.description.trim()) {
      setError('Deskripsi produk wajib diisi.')
      return
    }
    if (formData.price <= 0) {
      setError('Harga produk harus lebih besar dari 0.')
      return
    }
    if (!formData.fileName.trim()) {
      setError('Nama file master wajib diisi.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/MorgadAdmin/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fileKey: formData.fileKey || `products/${formData.slug}/${formData.fileName}`,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        setError(data.error ?? 'Gagal membuat produk.')
        return
      }

      router.push('/products')
      router.refresh()
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminShell title="Tambah Produk Baru">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href="/products" style={{ fontSize: '13px', color: '#7c3aed', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
            ← Kembali ke Daftar Produk
          </Link>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>Tambah Produk Baru</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Isi informasi produk digital. Produk berstatus PUBLISHED dapat langsung dibeli pelanggan.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Nama Produk *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={handleNameChange}
                placeholder="Contoh: Digital Asset Pack"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Slug URL *</label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="digital-asset-pack"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Ringkasan Pendek</label>
            <input
              type="text"
              value={formData.shortDescription}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              placeholder="Deskripsi singkat produk yang muncul di kartu katalog"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Deskripsi Lengkap *</label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Jelaskan fitur, isi file, dan detail produk..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Kategori *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Harga *</label>
              <input
                type="number"
                required
                min={1}
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value, 10) || 0 })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Mata Uang *</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              >
                <option value="IDR">IDR (Rupiah)</option>
                <option value="USD">USD (Dollar)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Nama File Master *</label>
              <input
                type="text"
                required
                value={formData.fileName}
                onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
                placeholder="package.zip"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>File disimpan di private storage.</span>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Versi Produk</label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="1.0"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Batas Download (Maksimal)</label>
              <input
                type="number"
                min={1}
                value={formData.maxDownloads}
                onChange={(e) => setFormData({ ...formData, maxDownloads: parseInt(e.target.value, 10) || 5 })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Status Publikasi *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              >
                <option value="PUBLISHED">PUBLISHED (Dapat Dibeli)</option>
                <option value="DRAFT">DRAFT (Disembunyikan)</option>
                <option value="ARCHIVED">ARCHIVED (Diarsipkan)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Link
              href="/products"
              style={{
                padding: '10px 18px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#64748b',
                textDecoration: 'none',
              }}
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: loading ? '#a78bfa' : '#7c3aed',
                color: '#ffffff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Menyimpan...' : 'Simpan Produk'}
            </button>
          </div>
        </form>
      </div>
    </AdminShell>
  )
}
