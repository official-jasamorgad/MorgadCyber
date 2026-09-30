import { headers } from 'next/headers'
import { db, downloadAccess, orders, products } from '@morgad/db'
import { desc, eq } from 'drizzle-orm'
import { AdminShell } from '@/components/AdminShell'
import DownloadTableClient from './DownloadTableClient'

export default async function AdminDownloadsPage() {
  const headersList = headers()
  const adminName = headersList.get('x-admin-id') ?? 'Admin'
  const adminRole = headersList.get('x-admin-role') ?? ''

  const records = await db
    .select({
      id: downloadAccess.id,
      orderNumber: orders.orderNumber,
      customerEmail: orders.customerEmail,
      productName: products.name,
      downloadCount: downloadAccess.downloadCount,
      maxDownloads: downloadAccess.maxDownloads,
      expiresAt: downloadAccess.expiresAt,
      revoked: downloadAccess.revoked,
      createdAt: downloadAccess.createdAt,
      lastDownloadAt: downloadAccess.lastDownloadAt,
    })
    .from(downloadAccess)
    .leftJoin(orders, eq(downloadAccess.orderId, orders.id))
    .leftJoin(products, eq(downloadAccess.productId, products.id))
    .orderBy(desc(downloadAccess.createdAt))

  return (
    <AdminShell title="Aktivitas Unduhan" adminName={adminName} adminRole={adminRole}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>Aktivitas & Token Unduhan</h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Pantau akses download, penggunaan kuota token, dan lakukan pencabutan izin akses jika diperlukan.</p>
      </div>

      <DownloadTableClient initialRecords={records} />
    </AdminShell>
  )
}
