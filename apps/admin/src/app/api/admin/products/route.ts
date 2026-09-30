import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, products, auditLogs } from '@morgad/db'
import { desc } from 'drizzle-orm'

const ProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().min(1),
  shortDescription: z.string().optional().nullable(),
  category: z.enum([
    'software', 'application', 'saas', 'source_code', 'plugin', 'template',
    'journal', 'paper', 'makalah', 'ebook', 'document', 'digital_asset', 'other',
  ]),
  price: z.number().int().positive(),
  currency: z.enum(['IDR', 'USD']).default('IDR'),
  fileKey: z.string().min(1),
  fileName: z.string().min(1),
  version: z.string().default('1.0'),
  maxDownloads: z.number().int().positive().nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
  featured: z.boolean().default(false),
})

export async function GET() {
  try {
    const allProducts = await db.select().from(products).orderBy(desc(products.createdAt))
    return NextResponse.json({ success: true, data: allProducts })
  } catch (err) {
    console.error('[Admin API Products] GET error:', err)
    return NextResponse.json({ success: false, error: 'Gagal memuat produk.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-admin-id') ?? 'unknown'
    const body = await request.json()
    const parsed = ProductSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Data produk tidak valid.', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const [createdProduct] = await db.insert(products).values(parsed.data).returning()

    // Audit log
    await db.insert(auditLogs).values({
      adminId: adminId !== 'unknown' ? adminId : null,
      action: 'PRODUCT_CREATED',
      resourceType: 'product',
      resourceId: createdProduct.id,
      metadata: { name: createdProduct.name, price: createdProduct.price, currency: createdProduct.currency, status: createdProduct.status },
    })

    return NextResponse.json({ success: true, data: createdProduct }, { status: 201 })
  } catch (err: any) {
    console.error('[Admin API Products] POST error:', err)
    if (err.code === '23505') {
      return NextResponse.json({ success: false, error: 'Slug produk sudah digunakan.' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: 'Gagal membuat produk.' }, { status: 500 })
  }
}
