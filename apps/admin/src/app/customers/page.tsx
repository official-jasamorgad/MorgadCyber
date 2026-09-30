import { headers } from 'next/headers'
import { db, orders } from '@morgad/db'
import { sql, desc } from 'drizzle-orm'
import { AdminShell } from '@/components/AdminShell'

function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export default async function AdminCustomersPage() {
  const headersList = headers()
  const adminName = headersList.get('x-admin-id') ?? 'Admin'
  const adminRole = headersList.get('x-admin-role') ?? ''

  // Aggregate customers by email
  const customers = await db
    .select({
      customerEmail: orders.customerEmail,
      customerName: sql<string>`MAX(${orders.customerName})`,
      totalOrders: sql<string>`COUNT(*)`,
      totalSpent: sql<string>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'PAID' THEN ${orders.amount} ELSE 0 END), 0)`,
      lastOrderAt: sql<Date>`MAX(${orders.createdAt})`,
    })
    .from(orders)
    .groupBy(orders.customerEmail)
    .orderBy(desc(sql`MAX(${orders.createdAt})`))

  return (
    <AdminShell title="Daftar Pelanggan" adminName={adminName} adminRole={adminRole}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>Pelanggan Marketplace</h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Daftar pelanggan berdasarkan email transaksi. Pelanggan bertransaksi tanpa perlu membuat akun.</p>
      </div>

      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {customers.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Belum ada data pelanggan</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Data pelanggan akan otomatis terhimpun saat ada transaksi pesanan masuk.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Email Pelanggan', 'Nama', 'Total Pesanan', 'Total Belanja (Lunas)', 'Pesanan Terakhir'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={c.customerEmail} style={{ borderBottom: i < customers.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                      {c.customerEmail}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
                      {c.customerName || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>
                      {c.totalOrders} pesanan
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#16a34a' }}>
                      {formatIDR(parseInt(c.totalSpent, 10))}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {formatDate(c.lastOrderAt)}
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
