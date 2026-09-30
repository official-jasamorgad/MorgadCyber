import { NextRequest, NextResponse } from 'next/server'
import { db, products } from '@morgad/db'
import { eq } from 'drizzle-orm'

// Public product listing API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      shortDescription: products.shortDescription,
      category: products.category,
      price: products.price,
      currency: products.currency,
      thumbnailUrl: products.thumbnailUrl,
      featured: products.featured,
      version: products.version,
      status: products.status,
    })
    .from(products)
    .where(eq(products.status, 'PUBLISHED'))
    .limit(limit)

  const filtered = category ? rows.filter(p => p.category === category) : rows

  return NextResponse.json({ success: true, data: filtered })
}
