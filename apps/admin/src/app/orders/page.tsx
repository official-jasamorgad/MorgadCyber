import { headers } from 'next/headers'
import Link from 'next/link'
import { db, orders, products } from '@morgad/db'
import { eq, desc } from 'drizzle-orm'
import { AdminShell } from '@/components/AdminShell'
import type { PaymentStatus } from '@morgad/types'

function formatCurrency(amount: number, currency: string = 'IDR') {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100)
  }
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

function formatDate(date: Date | string) {
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

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: { status?: string }
}) {
  const headersList = headers()
  const adminName = headersList.get('x-admin-id') ?? 'Admin'
  const adminRole = headersList.get('x-admin-role') ?? ''

  const selectedStatus = searchParams?.status

  const allOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerEmail: orders.customerEmail,
      customerName: orders.customerName,
      amount: orders.amount,
      currency: orders.currency,
      paymentStatus: orders.paymentStatus,
      paymentReference: orders.paymentReference,
      createdAt: orders.createdAt,
      productName: products.name,
    })
    .from(orders)
    .leftJoin(products, eq(orders.productId, products.id))
    .where(selectedStatus ? eq(orders.paymentStatus, selectedStatus as PaymentStatus) : undefined)
    .orderBy(desc(orders.createdAt))

  const tabs = [
    { label: 'Semua', value: '' },
    { label: 'Lunas (PAID)', value: 'PAID' },
    { label: 'Menunggu (PENDING)', value: 'PENDING' },
    { label: 'Gagal (FAILED)', value: 'FAILED' },
    { label: 'Kedaluwarsa (EXPIRED)', value: 'EXPIRED' },
  ]

  return (
    <AdminShell title="Kelola Pesanan" adminName={adminName} adminRole={adminRole}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>Daftar Pesanan</h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Semua transaksi dan pesanan yang tercatat dalam sistem.</p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto' }}>
        {tabs.map((tab) => {
          const isActive = (selectedStatus ?? '') === tab.value
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/orders?status=${tab.value}` : '/orders'}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: isActive ? '600' : '400',
                backgroundColor: isActive ? '#7c3aed' : '#ffffff',
                color: isActive ? '#ffffff' : '#64748b',
                border: '1px solid',
                borderColor: isActive ? '#7c3aed' : '#e2e8f0',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {allOrders.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Belum ada pesanan</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Pesanan dari pelanggan akan muncul di sini setelah proses checkout.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['No. Pesanan', 'Produk', 'Pelanggan', 'Jumlah', 'Mata Uang', 'Status', 'Ref Mayar', 'Tanggal'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allOrders.map((o, i) => (
                  <tr key={o.orderNumber} style={{ borderBottom: i < allOrders.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>
                      {o.orderNumber}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.productName ?? '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
                      <div style={{ fontWeight: '500', color: '#0f172a' }}>{o.customerName || '—'}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{o.customerEmail}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                      {formatCurrency(o.amount, o.currency)}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748b' }}>
                      {o.currency}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge status={o.paymentStatus as PaymentStatus} />
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {o.paymentReference ?? '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {formatDate(o.createdAt)}
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
