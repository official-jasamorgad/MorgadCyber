import { db, products } from '@morgad/db'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import type { Metadata } from 'next'
import { CATEGORY_META, FEATURED_CATEGORIES } from '../lib/category-meta'
import BrandLogo from '../components/BrandLogo'
import ThemeToggle from '../components/ThemeToggle'

export const metadata: Metadata = {
  title: '1024 Tera — Digital Marketplace',
  description: 'Platform marketplace produk digital terpercaya.',
}

// Revalidate every 60 seconds
export const revalidate = 60

export default async function HomePage() {
  const featuredProducts = await db
    .select()
    .from(products)
    .where(eq(products.status, 'PUBLISHED'))
    .limit(8)

  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <TrendingSection products={featuredProducts} />
        <CategoriesSection />
        <FeaturedBanner products={featuredProducts.filter(p => p.featured)} />
        <HowItWorksSection />
        <TrustSection />
      </main>
      <Footer />
    </>
  )
}

// ─── Navbar ──────────────────────────────────────────────────

function Navbar() {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #e2e8f0',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <BrandLogo />
        <nav style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <Link href="/categories" style={{ fontSize: 14, fontWeight: 500, color: '#475569' }}>Kategori</Link>
          <Link href="/order" style={{ fontSize: 14, fontWeight: 500, color: '#475569' }}>Cek Pesanan</Link>
          <Link href="/order" style={{
            background: '#7c3aed', color: '#fff',
            padding: '8px 20px', borderRadius: 8,
            fontSize: 14, fontWeight: 600,
          }}>Lacak Pesanan</Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}

// ─── Hero ─────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section style={{
      background: '#f8fafc',
      padding: '96px 24px',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#ede9fe', borderRadius: 100, padding: '6px 16px',
          marginBottom: 24,
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Digital Marketplace</span>
        </div>
        <h1 style={{ fontSize: 56, fontWeight: 800, color: '#0f172a', lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20 }}>
          Produk digital untuk kebutuhan nyata
        </h1>
        <p style={{ fontSize: 18, color: '#64748b', lineHeight: 1.6, marginBottom: 40 }}>
          Temukan software, template, e-book, dan aset digital berkualitas tinggi. Beli sekali, download langsung. Tanpa akun, tanpa ribet.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/categories" style={{
            background: '#7c3aed', color: '#fff',
            padding: '14px 32px', borderRadius: 10,
            fontSize: 15, fontWeight: 700,
            boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
          }}>
            Lihat katalog
          </Link>
          <Link href="/order" style={{
            background: '#fff', color: '#0f172a',
            border: '1px solid #e2e8f0',
            padding: '14px 32px', borderRadius: 10,
            fontSize: 15, fontWeight: 600,
          }}>
            Cek pesanan
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Trending Products ─────────────────────────────────────────

type Product = {
  id: string
  name: string
  slug: string
  price: number
  currency: string
  category: string
  shortDescription: string | null
  thumbnailUrl: string | null
  featured: boolean
}

function TrendingSection({ products }: { products: Product[] }) {
  return (
    <section style={{ padding: '80px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Katalog</p>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Produk tersedia</h2>
          </div>
          <Link href="/categories" style={{ fontSize: 14, fontWeight: 600, color: '#7c3aed' }}>Lihat katalog →</Link>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 24,
        }}>
          {products.length > 0 ? products.map(product => (
            <ProductCard key={product.id} product={product} />
          )) : (
            <p style={{ gridColumn: '1 / -1', padding: '48px 24px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 8 }}>
              Belum ada produk yang dipublikasikan.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function ProductCard({ product }: { product: Product }) {
  const formattedPrice = new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(product.price)

  return (
    <Link href={`/products/${product.slug}`} style={{
      display: 'block',
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    }}>
      <div style={{
        height: 200,
        background: '#f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 48,
      }}>
        {product.thumbnailUrl ? (
          <img src={product.thumbnailUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span aria-hidden="true">FILE</span>
        )}
      </div>
      <div style={{ padding: '20px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          {product.category.replace('_', ' ')}
        </p>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8, lineHeight: 1.3 }}>{product.name}</h3>
        {product.shortDescription && (
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>{product.shortDescription}</p>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{formattedPrice}</span>
          <span style={{
            background: '#7c3aed', color: '#fff',
            padding: '6px 16px', borderRadius: 6,
            fontSize: 12, fontWeight: 700,
          }}>Beli</span>
        </div>
      </div>
    </Link>
  )
}

// ─── Categories ────────────────────────────────────────────────

const CATEGORIES = FEATURED_CATEGORIES.map(slug => ({ slug, ...CATEGORY_META[slug] }))

function CategoriesSection() {
  const categoryCards = [
    { title: 'Software', subtitle: 'software', palette: { bg: '#0b1b45', accent: '#dfe6ff', icon: '🔒', text: '#f8fafc' }, href: '/categories/software' },
    { title: 'Tools', subtitle: 'tools', palette: { bg: '#111827', accent: '#f8fafc', icon: 'FRP', text: '#f8fafc' }, href: '/categories/software' },
    { title: 'Tools Teknis', subtitle: 'tools', palette: { bg: '#e5e7eb', accent: '#111827', icon: '🖥️', text: '#111827' }, href: '/categories/software' },
    { title: 'Creative Packs', subtitle: 'creative', palette: { bg: '#dbeafe', accent: '#0f172a', icon: '📁', text: '#0f172a' }, href: '/categories/digital_asset' },
    { title: 'Trending Collections', subtitle: 'trends', palette: { bg: '#dfeae8', accent: '#0f172a', icon: 'TRNDS', text: '#0f172a' }, href: '/categories/digital_asset' },
  ]

  return (
    <section style={{ padding: '80px 24px 32px', background: '#0d0d0d' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, marginBottom: 32 }}>
          <h2 style={{ fontSize: 48, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.04em', margin: 0 }}>Browse Categories</h2>
          <Link href="/categories" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#f8fafc', border: '1px solid rgba(255,255,255,0.35)',
            background: 'rgba(255,255,255,0.02)', borderRadius: 10,
            padding: '12px 22px', fontWeight: 600, fontSize: 16,
          }}>
            Explore All Categories →
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 20 }}>
          {categoryCards.map(card => (
            <Link key={card.title} href={card.href} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', minHeight: 230, borderRadius: 18, overflow: 'hidden',
              background: card.palette.bg, border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
              textDecoration: 'none',
            }}>
              <div style={{
                width: '100%', height: '100%', padding: '22px 16px 18px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                color: card.palette.text,
              }}>
                <div style={{
                  width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center',
                  fontSize: card.palette.icon === 'FRP' || card.palette.icon === 'TRNDS' ? 72 : 46,
                  fontWeight: 800, letterSpacing: '-0.05em', color: card.palette.accent,
                  opacity: 0.96, marginBottom: 10,
                }}>
                  {card.palette.icon}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, textAlign: 'center' }}>{card.title}</div>
                <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.85, textTransform: 'lowercase', marginTop: 4 }}>{card.subtitle}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function InsightsSection() {
  const articles = [
    {
      title: '10 Tips to Create Viral Images That Get Noticed',
      tag: 'Tips & Guides',
      date: 'May 18, 2026',
      tone: 'dark',
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Best Digital Art Styles Trending in 2026',
      tag: 'Inspiration',
      date: 'May 12, 2026',
      tone: 'light',
      image: '',
    },
    {
      title: 'Where to Find High-Quality Images For Your Projects',
      tag: 'Resources',
      date: 'May 08, 2026',
      tone: 'light',
      image: '',
    },
  ]

  return (
    <section style={{ padding: '32px 24px 80px', background: '#0d0d0d' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, marginBottom: 32 }}>
          <h2 style={{ fontSize: 48, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.04em', margin: 0 }}>From the Hub</h2>
          <Link href="/articles" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.35)', borderRadius: 10,
            color: '#f8fafc', background: 'rgba(255,255,255,0.02)',
            padding: '12px 22px', fontWeight: 600, fontSize: 16,
          }}>
            View All Articles →
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 24 }}>
          {articles.map(article => (
            <article key={article.title} style={{
              background: article.tone === 'dark' ? '#171717' : '#f8f7f5',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18,
              overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
            }}>
              <div style={{
                height: 290, background: article.image ? `url(${article.image}) center/cover no-repeat` : article.tone === 'dark' ? '#111827' : '#e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
              }}>
                {article.image ? null : (
                  <div style={{
                    width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 56, fontWeight: 800, letterSpacing: '-0.08em', color: '#111827', opacity: 0.9,
                  }}>Art</div>
                )}
              </div>
              <div style={{ padding: '18px 18px 22px' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', padding: '6px 12px', borderRadius: 999,
                  background: article.tone === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                  color: article.tone === 'dark' ? '#fef3c7' : '#0f172a',
                  fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>{article.tag}</div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginTop: 12, marginBottom: 12, color: article.tone === 'dark' ? '#cbd5e1' : '#475569',
                  fontSize: 13,
                }}>
                  <span>{article.date}</span>
                </div>
                <h3 style={{
                  margin: 0, color: article.tone === 'dark' ? '#f8fafc' : '#111827',
                  fontSize: 24, lineHeight: 1.18, letterSpacing: '-0.03em',
                }}>{article.title}</h3>
                <Link href="/articles" style={{
                  display: 'inline-flex', marginTop: 18, fontWeight: 700,
                  color: article.tone === 'dark' ? '#f8fafc' : '#111827',
                }}>
                  Read More →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Featured Banner ───────────────────────────────────────────

function FeaturedBanner({ products }: { products: Product[] }) {
  const featured = products[0]
  if (!featured) return null

  const price = new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(featured.price)

  return (
    <section style={{ padding: '80px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{
          background: '#1e293b',
          borderRadius: 20, padding: '60px 48px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 32,
        }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Koleksi Unggulan</p>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 16, letterSpacing: '-0.02em' }}>{featured.name}</h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 32 }}>{featured.shortDescription}</p>
            <Link href={`/products/${featured.slug}`} style={{
              background: '#fff', color: '#7c3aed',
              padding: '14px 32px', borderRadius: 10,
              fontSize: 15, fontWeight: 800,
              display: 'inline-block',
            }}>
              Beli Sekarang — {price}
            </Link>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.1)', borderRadius: 16,
            padding: '32px', color: '#fff', textAlign: 'center', minWidth: 200,
          }}>
            <p style={{ fontSize: 14, fontWeight: 600 }}>Format digital</p>
            <p style={{ fontSize: 12, opacity: 0.7 }}>Detail file tersedia di halaman produk</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── How It Works ──────────────────────────────────────────────

function HowItWorksSection() {
  const steps = [
    { n: '01', title: 'Pilih Produk', desc: 'Buka katalog dan pilih produk yang kamu butuhkan.' },
    { n: '02', title: 'Checkout & Bayar', desc: 'Isi email, bayar lewat Mayar. Tidak perlu buat akun.' },
    { n: '03', title: 'Download Langsung', desc: 'Setelah pembayaran terverifikasi, link download dikirim via email.' },
  ]
  return (
    <section style={{ padding: '80px 24px', background: '#f8fafc' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Cara Kerja</p>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', marginBottom: 56, letterSpacing: '-0.02em' }}>Cara membeli</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
          {steps.map(step => (
            <div key={step.n} style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: '#7c3aed', color: '#fff',
                fontSize: 16, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>{step.n}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{step.title}</h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Trust Section ─────────────────────────────────────────────

function TrustSection() {
  const items = [
    { label: 'Pembayaran', desc: 'Pembayaran diproses melalui Mayar.' },
    { label: 'Pengiriman', desc: 'Link download tersedia setelah pembayaran terverifikasi.' },
    { label: 'Tanpa akun', desc: 'Gunakan alamat email saat checkout.' },
    { label: 'File privat', desc: 'Produk disimpan di penyimpanan privat.' },
  ]
  return (
    <section style={{ padding: '80px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
          {items.map(item => (
            <div key={item.label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{item.label}</h3>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Footer ────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '48px 24px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, color: '#fff', marginBottom: 8 }}>
            J.S. Morgad <span style={{ color: '#a78bfa' }}>Cyber</span>
          </div>
          <p style={{ fontSize: 13, maxWidth: 280, lineHeight: 1.6 }}>Platform marketplace produk digital terpercaya.</p>
        </div>
        <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Produk</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/categories/digital_asset" style={{ fontSize: 13 }}>Aset Digital</Link>
              <Link href="/categories/template" style={{ fontSize: 13 }}>Template</Link>
              <Link href="/categories/ebook" style={{ fontSize: 13 }}>E-Book</Link>
              <Link href="/categories/software" style={{ fontSize: 13 }}>Software</Link>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Bantuan</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/order" style={{ fontSize: 13 }}>Cek Pesanan</Link>
              <Link href="/order" style={{ fontSize: 13 }}>Resend Download</Link>
            </div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1280, margin: '32px auto 0', paddingTop: 24, borderTop: '1px solid #1e293b', fontSize: 12, color: '#475569' }}>
        © {new Date().getFullYear()} 1024 Tera Digital Marketplace. All rights reserved.
      </div>
    </footer>
  )
}
