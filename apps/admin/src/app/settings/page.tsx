import { headers } from 'next/headers'
import { AdminShell } from '@/components/AdminShell'

export default function AdminSettingsPage() {
  const headersList = headers()
  const adminName = headersList.get('x-admin-id') ?? 'Admin'
  const adminRole = headersList.get('x-admin-role') ?? 'SUPER_ADMIN'

  return (
    <AdminShell title="Pengaturan Sistem" adminName={adminName} adminRole={adminRole}>
      <div style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>Pengaturan & Profil Admin</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Informasi akun administrator dan konfigurasi sistem marketplace.</p>
        </div>

        {/* Profile Card */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>Profil Administrator</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Identitas Admin</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{adminName}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Role / Hak Akses</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#7c3aed' }}>{adminRole.replace('_', ' ')}</div>
            </div>
          </div>
        </div>

        {/* Security Info Card */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>Status Keamanan Sistem</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { title: 'Autentikasi Admin', desc: 'Password dienkripsi menggunakan bcrypt (12 rounds) & session HTTP-only cookie.', ok: true },
              { title: 'Otorisasi Download', desc: 'Token acak 256-bit di-hash dengan SHA-256 di database (raw token tidak disimpan).', ok: true },
              { title: 'Webhook Idempotency', desc: 'Unique constraint pada webhook_events mencegah proses duplikat Mayar retries.', ok: true },
              { title: 'Otoritas Harga Server', desc: 'Harga produk dihitung mutlak dari database, tidak pernah mempercayai input klien.', ok: true },
              { title: 'Private Storage', desc: 'File berbayar tersimpan di private bucket dan hanya diakses melalui signed URL.', ok: true },
            ].map((item) => (
              <div key={item.title} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ color: '#16a34a', fontSize: '16px', lineHeight: '1.2' }}>✓</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{item.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Gateway Info */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>Gateway Pembayaran Mayar</h2>
          <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
            Sistem terintegrasi dengan REST API Mayar sesuai dokumentasi resmi di{' '}
            <a href="https://docs.mayar.id" target="_blank" rel="noopener noreferrer" style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: '500' }}>
              https://docs.mayar.id
            </a>
            . URL webhook endpoint dikonfigurasi ke <code>/api/webhooks/mayar</code>.
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
