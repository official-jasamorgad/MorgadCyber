'use client'

import { useState } from 'react'

interface DownloadRecord {
  id: string
  orderNumber: string | null
  customerEmail: string | null
  productName: string | null
  downloadCount: number
  maxDownloads: number | null
  expiresAt: Date | string
  revoked: boolean
  createdAt: Date | string
  lastDownloadAt: Date | string | null
}

function formatDate(date: Date | string | null) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export default function DownloadTableClient({ initialRecords }: { initialRecords: DownloadRecord[] }) {
  const [records, setRecords] = useState<DownloadRecord[]>(initialRecords)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  async function handleRevoke(id: string) {
    if (!confirm('Apakah Anda yakin ingin mencabut akses download untuk token ini?')) return
    setRevokingId(id)
    setMessage('')

    try {
      const res = await fetch(`/MorgadAdmin/api/admin/downloads/${id}/revoke`, { method: 'PATCH' })
      const data = await res.json()
      if (data.success) {
        setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, revoked: true } : r)))
        setMessage('Akses download berhasil dicabut.')
      } else {
        alert(data.error ?? 'Gagal mencabut akses download.')
      }
    } catch {
      alert('Terjadi kesalahan jaringan.')
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <div>
      {message && (
        <div style={{ marginBottom: '16px', padding: '10px 14px', backgroundColor: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', fontSize: '13px' }}>
          {message}
        </div>
      )}

      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {records.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📥</div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Belum ada aktivitas download</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Token download dan log akses akan terdata otomatis setelah pesanan dibayar.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['No. Pesanan', 'Produk', 'Email', 'Unduhan / Kuota', 'Kedaluwarsa', 'Status', 'Aksi'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => {
                  const isExpired = new Date(r.expiresAt) < new Date()
                  return (
                    <tr key={r.id} style={{ borderBottom: i < records.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>
                        {r.orderNumber ?? '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.productName ?? '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
                        {r.customerEmail ?? '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>
                        {r.downloadCount} / {r.maxDownloads ?? '∞'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: isExpired ? '#dc2626' : '#64748b' }}>
                        {formatDate(r.expiresAt)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {r.revoked ? (
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: '500', backgroundColor: '#fee2e2', color: '#dc2626' }}>
                            Dicabut
                          </span>
                        ) : isExpired ? (
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: '500', backgroundColor: '#f1f5f9', color: '#64748b' }}>
                            Kedaluwarsa
                          </span>
                        ) : (
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: '500', backgroundColor: '#dcfce7', color: '#16a34a' }}>
                            Aktif
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {!r.revoked && (
                          <button
                            onClick={() => handleRevoke(r.id)}
                            disabled={revokingId === r.id}
                            style={{
                              backgroundColor: 'transparent',
                              border: '1px solid #fee2e2',
                              color: '#dc2626',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: revokingId === r.id ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {revokingId === r.id ? 'Memproses...' : 'Cabut Akses'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
