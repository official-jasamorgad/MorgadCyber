import { headers } from 'next/headers'
import Link from 'next/link'
import { db, products } from '@morgad/db'
import { desc } from 'drizzle-orm'
import { AdminShell } from '@/components/AdminShell'

function formatPrice(amount: number, currency: string = 'IDR') {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100)
  }
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export default async function AdminProductsPage() {
  const headersList = headers()
  const adminName = headersList.get('x-admin-id') ?? 'Admin'
  const adminRole = headersList.get('x-admin-role') ?? ''

  const allProducts = await db.select().from(products).orderBy(desc(products.createdAt))

  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
    PUBLISHED: { bg: '#dcfce7', color: '#16a34a', label: 'Dipublikasikan' },
    DRAFT: { bg: '#fef3c7', color: '#d97706', label: 'Draft' },
    ARCHIVED: { bg: '#f1f5f9', color: '#64748b', label: 'Diarsipkan' },
  }

  return (
    <AdminShell title="Kelola Produk" adminName={adminName} adminRole={adminRole}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>Daftar Produk</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Kelola katalog produk digital, harga, file, dan status publikasi.</p>
        </div>
        <Link
          href="/products/new"
          style={{
            backgroundColor: '#7c3aed',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tambah Produk
        </Link>
      </div>

      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {allProducts.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Belum ada produk</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Tambahkan produk agar bisa ditampilkan di katalog.</div>
            <Link
              href="/products/new"
              style={{
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                textDecoration: 'none',
              }}
            >
              Tambah Produk Sekarang
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Nama Produk', 'Kategori', 'Harga', 'Mata Uang', 'Versi', 'Status', 'File', 'Aksi'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allProducts.map((p, i) => {
                  const s = statusColors[p.status] ?? statusColors.DRAFT
                  return (
                    <tr key={p.id} style={{ borderBottom: i < allProducts.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#0f172a' }}>{p.name}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>{p.slug}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
                        {p.category.replace('_', ' ')}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                        {formatPrice(p.price, p.currency)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748b' }}>
                        {p.currency}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>
                        v{p.version}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '500', backgroundColor: s.bg, color: s.color }}>
                          {s.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748b', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.fileName}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '13px', color: '#7c3aed', cursor: 'pointer', fontWeight: '500' }}>Edit</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
