import { db, products } from '@morgad/db'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import BrandLogo from '../../../components/BrandLogo'
import ThemeToggle from '../../../components/ThemeToggle'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await db.select().from(products).where(eq(products.slug, params.slug)).limit(1)
  if (!product[0]) return { title: 'Produk tidak ditemukan' }
  return {
    title: product[0].name,
    description: product[0].shortDescription ?? product[0].description.slice(0, 160),
  }
}

export const revalidate = 60

const CATEGORY_LABELS: Record<string, string> = {
  software: 'Software', application: 'Application', saas: 'SaaS',
  source_code: 'Source Code', plugin: 'Plugin', template: 'Template',
  journal: 'Journal', paper: 'Paper', makalah: 'Makalah', ebook: 'E-Book',
  document: 'Document', digital_asset: 'Aset Digital', other: 'Lainnya',
}

export default async function ProductPage({ params }: Props) {
  const rows = await db.select().from(products).where(eq(products.slug, params.slug)).limit(1)
  const product = rows[0]

  if (!product || product.status !== 'PUBLISHED') notFound()

  const price = new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: product.currency, minimumFractionDigits: 0,
  }).format(product.price)

  const fileSizeMB = product.fileSize ? (product.fileSize / 1024 / 1024).toFixed(1) : null

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 32, fontSize: 13, color: '#64748b' }}>
          <Link href="/" style={{ color: '#7c3aed' }}>Home</Link>
          <span>/</span>
          <Link href="/categories" style={{ color: '#7c3aed' }}>Kategori</Link>
          <span>/</span>
          <Link href={`/categories/${product.category}`} style={{ color: '#7c3aed' }}>{CATEGORY_LABELS[product.category] ?? product.category}</Link>
          <span>/</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{product.name}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 48, alignItems: 'start' }}>
          {/* Left: Details */}
          <div>
            <div style={{
              height: 360, background: '#f1f5f9',
              borderRadius: 16, marginBottom: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.12em',
            }}>
              DIGITAL FILE
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 16 }}>{product.name}</h1>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700 }}>
                {CATEGORY_LABELS[product.category] ?? product.category}
              </span>
              <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700 }}>
                v{product.version}
              </span>
              {product.fileMimeType && (
                <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600 }}>
                  {product.fileMimeType.split('/')[1]?.toUpperCase() ?? 'FILE'}
                </span>
              )}
            </div>
            <p style={{ fontSize: 16, color: '#334155', lineHeight: 1.8, marginBottom: 32, whiteSpace: 'pre-wrap' }}>
              {product.description}
            </p>
            {/* File Info */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Informasi File</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <InfoRow label="Format" value={product.fileName.split('.').pop()?.toUpperCase() ?? 'ZIP'} />
                {fileSizeMB && <InfoRow label="Ukuran" value={`${fileSizeMB} MB`} />}
                <InfoRow label="Versi" value={`v${product.version}`} />
                {product.maxDownloads && <InfoRow label="Maks Download" value={`${product.maxDownloads}×`} />}
              </div>
            </div>
          </div>

          {/* Right: Buy Box */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{price}</div>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 32 }}>Bayar sekali, download langsung.</p>
              <Link href={`/checkout?product=${product.id}`} style={{
                display: 'block', textAlign: 'center',
                background: '#7c3aed', color: '#fff',
                padding: '16px 24px', borderRadius: 10,
                fontSize: 16, fontWeight: 700,
                marginBottom: 16,
                boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
              }}>
                Beli Sekarang
              </Link>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
                <TrustRow text="Pembayaran diproses melalui Mayar" />
                <TrustRow text="Link download tersedia setelah pembayaran" />
                <TrustRow text="Link dikirim ke alamat email checkout" />
                <TrustRow text="File disimpan di penyimpanan privat" />
              </div>
            </div>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Link href="/order" style={{ fontSize: 13, color: '#7c3aed', fontWeight: 500 }}>
                Sudah punya pesanan? Cek di sini →
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SimpleFooter />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{value}</p>
    </div>
  )
}

function TrustRow({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: '#475569' }}>{text}</span>
    </div>
  )
}

function Navbar() {
  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <BrandLogo />
        <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="/categories" style={{ fontSize: 14, fontWeight: 500, color: '#475569' }}>Kategori</Link>
          <Link href="/order" style={{ fontSize: 14, fontWeight: 500, color: '#475569' }}>Cek Pesanan</Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}

function SimpleFooter() {
  return (
    <footer style={{ background: '#0f172a', color: '#64748b', padding: '32px 24px', textAlign: 'center', fontSize: 13, marginTop: 80 }}>
      © {new Date().getFullYear()} 1024 Tera Digital Marketplace
    </footer>
  )
}
