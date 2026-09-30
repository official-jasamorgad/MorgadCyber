import { headers } from 'next/headers'
import { db, products, orders } from '@morgad/db'
import { eq, sql, gte, and } from 'drizzle-orm'
import { AdminShell } from '@/components/AdminShell'
import type { PaymentStatus } from '@morgad/types'

function formatCurrency(amount: number, currency: string = 'IDR'): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100) // cents to USD if stored as integer, or raw amount
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, { bg: string; color: string; label: string }> = {
    PAID: { bg: '#dcfce7', color: '#16a34a', label: 'Lunas' },
    PENDING: { bg: '#fef3c7', color: '#d97706', label: 'Menunggu' },
    FAILED: { bg: '#fee2e2', color: '#dc2626', label: 'Gagal' },
    EXPIRED: { bg: '#f1f5f9', color: '#64748b', label: 'Kedaluwarsa' },
    REFUNDED: { bg: '#ede9fe', color: '#7c3aed', label: 'Refund' },
  }
  const s = styles[status] ?? { bg: '#f1f5f9', color: '#64748b', label: status }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: '500',
        backgroundColor: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  )
}

async function getDashboardStats() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Total revenue IDR (sum of paid orders in IDR)
  const [revenueIdrResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(${orders.amount}), 0)` })
    .from(orders)
    .where(and(eq(orders.paymentStatus, 'PAID'), eq(orders.currency, 'IDR')))

  // Total revenue USD (sum of paid orders in USD)
  const [revenueUsdResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(${orders.amount}), 0)` })
    .from(orders)
    .where(and(eq(orders.paymentStatus, 'PAID'), eq(orders.currency, 'USD')))

  // Total orders
  const [ordersResult] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(orders)

  // Total paid orders
  const [paidOrdersResult] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(orders)
    .where(eq(orders.paymentStatus, 'PAID'))

  // Total published products
  const [productsResult] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(products)
    .where(eq(products.status, 'PUBLISHED'))

  // Orders this month
  const [monthOrdersResult] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(orders)
    .where(gte(orders.createdAt, startOfMonth))

  // Revenue this month IDR
  const [monthRevenueIdrResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(${orders.amount}), 0)` })
    .from(orders)
    .where(and(eq(orders.paymentStatus, 'PAID'), eq(orders.currency, 'IDR'), gte(orders.createdAt, startOfMonth)))

  // Revenue this month USD
  const [monthRevenueUsdResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(${orders.amount}), 0)` })
    .from(orders)
    .where(and(eq(orders.paymentStatus, 'PAID'), eq(orders.currency, 'USD'), gte(orders.createdAt, startOfMonth)))

  // Recent 10 orders with product name
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

  return {
    totalRevenueIdr: parseInt(revenueIdrResult?.total ?? '0', 10),
    totalRevenueUsd: parseInt(revenueUsdResult?.total ?? '0', 10),
    totalOrders: parseInt(ordersResult?.count ?? '0', 10),
    totalPaidOrders: parseInt(paidOrdersResult?.count ?? '0', 10),
    totalProducts: parseInt(productsResult?.count ?? '0', 10),
    ordersThisMonth: parseInt(monthOrdersResult?.count ?? '0', 10),
    revenueThisMonthIdr: parseInt(monthRevenueIdrResult?.total ?? '0', 10),
    revenueThisMonthUsd: parseInt(monthRevenueUsdResult?.total ?? '0', 10),
    recentOrders,
  }
}

export default async function DashboardPage() {
  const headersList = headers()
  const adminName = headersList.get('x-admin-id') ?? 'Admin'
  const adminRole = headersList.get('x-admin-role') ?? ''

  const stats = await getDashboardStats()

  const kpiCards = [
    {
      label: 'Pendapatan IDR',
      value: formatCurrency(stats.totalRevenueIdr, 'IDR'),
      sub: `Bulan ini: ${formatCurrency(stats.revenueThisMonthIdr, 'IDR')}`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      iconBg: '#ede9fe',
    },
    {
      label: 'Pendapatan USD',
      value: formatCurrency(stats.totalRevenueUsd, 'USD'),
      sub: `Bulan ini: ${formatCurrency(stats.revenueThisMonthUsd, 'USD')}`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      iconBg: '#d1fae5',
    },
    {
      label: 'Total Pesanan',
      value: stats.totalOrders.toLocaleString('id-ID'),
      sub: `Bulan ini: ${stats.ordersThisMonth}`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
      iconBg: '#dbeafe',
    },
    {
      label: 'Pesanan Lunas',
      value: stats.totalPaidOrders.toLocaleString('id-ID'),
      sub: `dari ${stats.totalOrders} total pesanan`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
      iconBg: '#dcfce7',
    },
    {
      label: 'Produk Aktif',
      value: stats.totalProducts.toLocaleString('id-ID'),
      sub: 'Produk dipublikasikan',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      ),
      iconBg: '#fef3c7',
    },
  ]

  return (
    <AdminShell title="Dashboard" adminName={adminName} adminRole={adminRole}>
      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {kpiCards.map((card) => (
          <div
            key={card.label}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>{card.label}</div>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: card.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {card.icon}
              </div>
            </div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
              {card.value}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', margin: 0 }}>
            Pesanan Terbaru
          </h2>
          <a
            href="/orders"
            style={{
              fontSize: '13px',
              color: '#7c3aed',
              fontWeight: '500',
              textDecoration: 'none',
            }}
          >
            Lihat semua →
          </a>
        </div>

        {stats.recentOrders.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '14px',
            }}
          >
            <div style={{ marginBottom: '8px', fontSize: '32px' }}>📭</div>
            Belum ada pesanan.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  {['No. Pesanan', 'Produk', 'Email', 'Jumlah', 'Mata Uang', 'Status', 'Tanggal'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 16px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#64748b',
                        borderBottom: '1px solid #e2e8f0',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order, i) => (
                  <tr
                    key={order.orderNumber}
                    style={{
                      borderBottom: i < stats.recentOrders.length - 1 ? '1px solid #f1f5f9' : 'none',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500', color: '#0f172a', fontFamily: 'monospace' }}>
                      {order.orderNumber}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.productName ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.customerEmail}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#0f172a', fontWeight: '500', whiteSpace: 'nowrap' }}>
                      {formatCurrency(order.amount, order.currency ?? 'IDR')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>
                      {order.currency ?? 'IDR'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status={order.paymentStatus as PaymentStatus} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
