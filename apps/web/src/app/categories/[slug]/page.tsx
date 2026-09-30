import { db, products } from '@morgad/db'
import { eq, and, ilike, gte, lte, asc, desc, sql } from 'drizzle-orm'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CATEGORY_META } from '../../../lib/category-meta'
import BrandLogo from '../../../components/BrandLogo'
import ThemeToggle from '../../../components/ThemeToggle'

type Props = { params: { slug: string }; searchParams: { q?: string; sort?: string; minPrice?: string; maxPrice?: string; page?: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const meta = CATEGORY_META[params.slug]
  if (!meta) return { title: 'Kategori tidak ditemukan' }
  return { title: `${meta.label} — 1024 Tera` }
}

export const revalidate = 60

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = params
  const meta = CATEGORY_META[slug]
  if (!meta) notFound()

  const q = searchParams.q ?? ''
  const sort = searchParams.sort ?? 'newest'
  const minPrice = searchParams.minPrice ? parseInt(searchParams.minPrice) : undefined
  const maxPrice = searchParams.maxPrice ? parseInt(searchParams.maxPrice) : undefined
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const pageSize = 40

  // Build where conditions
  const conditions = [
    eq(products.status, 'PUBLISHED'),
    eq(products.category, slug as any),
    ...(q ? [ilike(products.name, `%${q}%`)] : []),
    ...(minPrice !== undefined ? [gte(products.price, minPrice)] : []),
    ...(maxPrice !== undefined ? [lte(products.price, maxPrice)] : []),
  ]

  // Build order
  const orderBy = sort === 'price_asc' ? asc(products.price)
    : sort === 'price_desc' ? desc(products.price)
    : desc(products.createdAt)

  const [rows, countResult] = await Promise.all([
    db.select().from(products).where(and(...conditions)).orderBy(orderBy).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(products).where(and(...conditions)),
  ])

  const total = Number(countResult[0]?.count ?? 0)
  const totalPages = Math.ceil(total / pageSize)

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
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{meta.label}</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.12em' }}>CATEGORY</span>
            <div>
              <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{meta.label}</h1>
              <p style={{ fontSize: 14, color: '#64748b' }}>{meta.desc}</p>
            </div>
          </div>
          <p style={{ fontSize: 14, color: '#64748b' }}>{total} produk ditemukan</p>
        </div>

        {/* Search & Filters */}
        <form method="GET" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 280px' }}>
            <input name="q" defaultValue={q} placeholder="Cari produk..." style={{
              width: '100%', padding: '10px 16px', borderRadius: 8,
              border: '1px solid #e2e8f0', fontSize: 14, outline: 'none',
              background: '#fff',
            }} />
          </div>
          <div>
            <select name="sort" defaultValue={sort} style={{
              padding: '10px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
              fontSize: 14, background: '#fff', cursor: 'pointer',
            }}>
              <option value="newest">Terbaru</option>
              <option value="price_asc">Harga: Rendah → Tinggi</option>
              <option value="price_desc">Harga: Tinggi → Rendah</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input name="minPrice" type="number" defaultValue={minPrice} placeholder="Harga min" style={{
              width: 120, padding: '10px 12px', borderRadius: 8,
              border: '1px solid #e2e8f0', fontSize: 14, background: '#fff',
            }} />
            <input name="maxPrice" type="number" defaultValue={maxPrice} placeholder="Harga maks" style={{
              width: 120, padding: '10px 12px', borderRadius: 8,
              border: '1px solid #e2e8f0', fontSize: 14, background: '#fff',
            }} />
          </div>
          <button type="submit" style={{
            background: '#7c3aed', color: '#fff', padding: '10px 24px',
            borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>Filter</button>
          {(q || minPrice || maxPrice || sort !== 'newest') && (
            <Link href={`/categories/${slug}`} style={{
              padding: '10px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
              fontSize: 14, color: '#64748b', background: '#fff',
            }}>Reset</Link>
          )}
        </form>

        {/* Product Grid */}
        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#475569' }}>Tidak ada produk ditemukan.</p>
            <p style={{ fontSize: 14, marginTop: 8 }}>Coba ubah kata kunci pencarian atau filter.</p>
            <Link href={`/categories/${slug}`} style={{
              display: 'inline-block', marginTop: 24, background: '#7c3aed', color: '#fff',
              padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
            }}>Lihat Semua</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {rows.map(product => {
              const price = new Intl.NumberFormat('id-ID', {
                style: 'currency', currency: product.currency, minimumFractionDigits: 0,
              }).format(product.price)
              return (
                <div key={product.id} style={{
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
                  overflow: 'hidden', display: 'block',
                }}>
                  <div style={{ height: 180, background: '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.12em' }}>
                    DIGITAL FILE
                  </div>
                  <div style={{ padding: 20 }}>
                    <Link href={`/products/${product.slug}`} style={{ display: 'block' }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6, lineHeight: 1.3 }}>{product.name}</h3>
                    </Link>
                    {product.shortDescription && <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>{product.shortDescription}</p>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{price}</span>
                      <Link href={`/checkout?product=${product.id}`} style={{ background: '#7c3aed', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>Beli</Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 48 }}>
            {page > 1 ? (
              <Link href={`/categories/${slug}?${new URLSearchParams({ ...(q && { q }), sort, ...(minPrice && { minPrice: String(minPrice) }), ...(maxPrice && { maxPrice: String(maxPrice) }), page: String(page - 1) })}`} style={{
                minWidth: 80, height: 40, padding: '0 12px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600,
              }}>Previous</Link>
            ) : (
              <span style={{ minWidth: 80, height: 40, padding: '0 12px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600 }}>Previous</span>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <Link key={p} href={`/categories/${slug}?${new URLSearchParams({ ...(q && { q }), sort, ...(minPrice && { minPrice: String(minPrice) }), ...(maxPrice && { maxPrice: String(maxPrice) }), page: String(p) })}`} style={{
                width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: p === page ? '#7c3aed' : '#fff',
                color: p === page ? '#fff' : '#0f172a',
                border: '1px solid #e2e8f0',
                fontSize: 14, fontWeight: 600,
              }}>{p}</Link>
            ))}
            {page < totalPages ? (
              <Link href={`/categories/${slug}?${new URLSearchParams({ ...(q && { q }), sort, ...(minPrice && { minPrice: String(minPrice) }), ...(maxPrice && { maxPrice: String(maxPrice) }), page: String(page + 1) })}`} style={{
                minWidth: 80, height: 40, padding: '0 12px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600,
              }}>Next</Link>
            ) : (
              <span style={{ minWidth: 80, height: 40, padding: '0 12px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600 }}>Next</span>
            )}
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
