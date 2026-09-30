import { NextResponse } from 'next/server'
import { db, products, orders } from '@morgad/db'
import { eq, sql, gte, and } from 'drizzle-orm'

export async function GET() {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [revenueIdrResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${orders.amount}), 0)` })
      .from(orders)
      .where(and(eq(orders.paymentStatus, 'PAID'), eq(orders.currency, 'IDR')))

    const [revenueUsdResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${orders.amount}), 0)` })
      .from(orders)
      .where(and(eq(orders.paymentStatus, 'PAID'), eq(orders.currency, 'USD')))

    const [ordersResult] = await db.select({ count: sql<string>`COUNT(*)` }).from(orders)

    const [paidOrdersResult] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(orders)
      .where(eq(orders.paymentStatus, 'PAID'))

    const [productsResult] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(products)
      .where(eq(products.status, 'PUBLISHED'))

    const [monthOrdersResult] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(orders)
      .where(gte(orders.createdAt, startOfMonth))

    const [monthRevenueIdrResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${orders.amount}), 0)` })
      .from(orders)
      .where(and(eq(orders.paymentStatus, 'PAID'), eq(orders.currency, 'IDR'), gte(orders.createdAt, startOfMonth)))

    const [monthRevenueUsdResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${orders.amount}), 0)` })
      .from(orders)
      .where(and(eq(orders.paymentStatus, 'PAID'), eq(orders.currency, 'USD'), gte(orders.createdAt, startOfMonth)))

    const recentOrders = await db
      .select({
        orderNumber: orders.orderNumber,
        customerEmail: orders.customerEmail,
        amount: orders.amount,
        currency: orders.currency,
        paymentStatus: orders.paymentStatus,
        createdAt: orders.createdAt,
        productName: products.name,
      })
      .from(orders)
      .leftJoin(products, eq(orders.productId, products.id))
      .orderBy(sql`${orders.createdAt} DESC`)
      .limit(10)

    return NextResponse.json({
      success: true,
      data: {
        totalRevenueIdr: parseInt(revenueIdrResult?.total ?? '0', 10),
        totalRevenueUsd: parseInt(revenueUsdResult?.total ?? '0', 10),
        totalOrders: parseInt(ordersResult?.count ?? '0', 10),
        totalPaidOrders: parseInt(paidOrdersResult?.count ?? '0', 10),
        totalProducts: parseInt(productsResult?.count ?? '0', 10),
        ordersThisMonth: parseInt(monthOrdersResult?.count ?? '0', 10),
        revenueThisMonthIdr: parseInt(monthRevenueIdrResult?.total ?? '0', 10),
        revenueThisMonthUsd: parseInt(monthRevenueUsdResult?.total ?? '0', 10),
        recentOrders,
      },
    })
  } catch (err) {
    console.error('[Admin Stats API] Error:', err)
    return NextResponse.json({ success: false, error: 'Gagal memuat statistik.' }, { status: 500 })
  }
}
