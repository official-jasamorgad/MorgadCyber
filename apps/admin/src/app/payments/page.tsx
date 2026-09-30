import { headers } from 'next/headers'
import { db, orders, payments } from '@morgad/db'
import { desc, eq } from 'drizzle-orm'
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
    PAID: { bg: '#dcfce7', color: '#16a34a', label: 'Berhasil' },
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

export default async function AdminPaymentsPage() {
  const headersList = headers()
  const adminName = headersList.get('x-admin-id') ?? 'Admin'
  const adminRole = headersList.get('x-admin-role') ?? ''

  // Query payments or paid/pending orders
  const allPayments = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerEmail: orders.customerEmail,
      amount: orders.amount,
      currency: orders.currency,
      paymentStatus: orders.paymentStatus,
      paymentProvider: orders.paymentProvider,
      paymentReference: orders.paymentReference,
      paidAt: orders.paidAt,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt))

  return (
    <AdminShell title="Riwayat Pembayaran" adminName={adminName} adminRole={adminRole}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>Riwayat Pembayaran Mayar</h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Log transaksi pembayaran dari gateway Mayar.</p>
      </div>

      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {allPayments.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💳</div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Belum ada pembayaran</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Aktivitas pembayaran pelanggan melalui Mayar akan tercatat di sini.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['No. Pesanan', 'Email', 'Jumlah', 'Mata Uang', 'Provider', 'Ref Transaksi', 'Status', 'Waktu Bayar'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allPayments.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: i < allPayments.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>
                      {p.orderNumber}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
                      {p.customerEmail}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                      {formatCurrency(p.amount, p.currency)}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748b' }}>
                      {p.currency}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                      {p.paymentProvider}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', fontFamily: 'monospace', color: '#64748b' }}>
                      {p.paymentReference ?? '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge status={p.paymentStatus as PaymentStatus} />
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {p.paidAt ? formatDate(p.paidAt) : '—'}
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
