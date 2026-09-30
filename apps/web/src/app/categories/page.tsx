import { db, products, orders } from '@morgad/db'
import { eq, ilike, and, asc, desc, gte, lte, sql } from 'drizzle-orm'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CATEGORY_META } from '../../lib/category-meta'
import BrandLogo from '../../components/BrandLogo'
import ThemeToggle from '../../components/ThemeToggle'

export const metadata: Metadata = { title: 'Semua Kategori' }
export const revalidate = 60

export default async function CategoriesPage() {
  // Count products per category
  const counts = await db
    .select({ category: products.category, count: sql<number>`count(*)` })
    .from(products)
    .where(eq(products.status, 'PUBLISHED'))
    .groupBy(products.category)

  const countMap = Object.fromEntries(counts.map(c => [c.category, Number(c.count)]))

  const allCats = Object.entries(CATEGORY_META)
    .map(([slug, meta]) => ({ slug, ...meta, count: countMap[slug] ?? 0 }))
    .sort((a, b) => b.count - a.count)

  const recentProducts = await db
    .select()
    .from(products)
    .where(eq(products.status, 'PUBLISHED'))
    .orderBy(desc(products.createdAt))
    .limit(8)

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Katalog</p>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 12 }}>Semua Kategori</h1>
          <p style={{ fontSize: 16, color: '#64748b' }}>Temukan produk digital yang kamu butuhkan dari {Object.values(countMap).reduce((a,b) => a+b, 0)} produk tersedia.</p>
        </div>

        {/* Category Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 64 }}>
          {allCats.map(cat => (
            <Link key={cat.slug} href={`/categories/${cat.slug}`} style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
              padding: '24px 20px', display: 'block',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{cat.label}</h2>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12, lineHeight: 1.4 }}>{cat.desc}</p>
              <span style={{ fontSize: 12, fontWeight: 600, color: cat.count > 0 ? '#7c3aed' : '#94a3b8' }}>
                {cat.count > 0 ? `${cat.count} produk →` : 'Belum ada produk'}
              </span>
            </Link>
          ))}
        </div>

        {/* Recent Products */}
        {recentProducts.length > 0 && (
          <>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 24, letterSpacing: '-0.02em' }}>Produk Terbaru</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {recentProducts.map(product => {
                const price = new Intl.NumberFormat('id-ID', {
                  style: 'currency', currency: product.currency, minimumFractionDigits: 0,
                }).format(product.price)
                return (
                  <div key={product.id} style={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
                    overflow: 'hidden', display: 'block',
                  }}>
                    <div style={{ height: 160, background: '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.12em', overflow: 'hidden' }}>
                      {product.thumbnailUrl ? (
                        <img src={product.thumbnailUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : 'DIGITAL FILE'}
                    </div>
                    <div style={{ padding: 20 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                        {CATEGORY_META[product.category]?.label ?? product.category}
                      </p>
                      <Link href={`/products/${product.slug}`} style={{ display: 'block' }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>{product.name}</h3>
                      </Link>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{price}</span>
                        <Link href={`/checkout?product=${product.id}`} style={{ background: '#7c3aed', color: '#fff', padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>Beli</Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {recentProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: '#94a3b8' }}>
            <p style={{ fontSize: 18, fontWeight: 600 }}>Belum ada produk yang dipublikasikan.</p>
            <p style={{ fontSize: 14, marginTop: 8 }}>Produk yang tersedia akan muncul di sini.</p>
          </div>
        )}
      </main>
      <SimpleFooter />
    </div>
  )
}

function Navbar() {
  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <BrandLogo />
        <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="/categories" style={{ fontSize: 14, fontWeight: 600, color: '#7c3aed' }}>Kategori</Link>
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
