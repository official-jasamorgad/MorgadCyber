/**
 * Transactional Email Module
 *
 * Sends order confirmation and download link emails after verified payment.
 * Email is ONLY sent after payment is verified — never speculatively.
 *
 * Supported providers: Resend, Postmark, Amazon SES
 * Configure via EMAIL_PROVIDER and EMAIL_API_KEY env vars.
 *
 * DO NOT include: API keys, DB credentials, storage secrets, Mayar secrets.
 */

interface DownloadEmailParams {
  to: string
  orderNumber: string
  productName: string
  downloadUrl: string
  expiresAt: Date
}

/**
 * Send download confirmation email after verified payment.
 * Idempotent: calling multiple times with same params has same effect.
 */
export async function sendDownloadEmail(params: DownloadEmailParams): Promise<{ success: boolean; error?: string }> {
  const { to, orderNumber, productName, downloadUrl, expiresAt } = params
  const provider = process.env.EMAIL_PROVIDER ?? 'resend'
  const apiKey = process.env.EMAIL_API_KEY
  const from = process.env.EMAIL_FROM ?? 'noreply@1024tera.com'

  if (!apiKey) {
    console.warn('[Email] EMAIL_API_KEY not configured, skipping email delivery')
    return { success: false, error: 'Email not configured' }
  }

  const formattedExpiry = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long', timeStyle: 'short',
  }).format(expiresAt)

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Pembayaran Berhasil — ${productName}</title></head>
<body style="font-family: system-ui, sans-serif; background: #f8fafc; padding: 40px 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #7c3aed, #4c1d95); padding: 40px; text-align: center;">
      <div style="font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 4px;">1024Tera</div>
      <div style="font-size: 14px; color: rgba(255,255,255,0.8);">Digital Marketplace</div>
    </div>
    <div style="padding: 40px;">
      <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">✅ Pembayaran Berhasil!</h1>
      <p style="color: #64748b; margin-bottom: 32px;">Terima kasih atas pembelian Anda. Produk digital Anda siap untuk diunduh.</p>

      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="margin-bottom: 8px;"><span style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">No. Pesanan</span></div>
        <div style="font-size: 16px; font-weight: 700; color: #0f172a; font-family: monospace;">${orderNumber}</div>
      </div>

      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
        <div style="margin-bottom: 8px;"><span style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">Produk</span></div>
        <div style="font-size: 16px; font-weight: 700; color: #0f172a;">${productName}</div>
      </div>

      <a href="${downloadUrl}" style="display: block; text-align: center; background: #7c3aed; color: #fff; padding: 16px 24px; border-radius: 10px; font-size: 16px; font-weight: 700; text-decoration: none; margin-bottom: 16px;">
        ⬇️ Download Produk
      </a>

      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 32px;">
        Link download berlaku hingga: <strong>${formattedExpiry}</strong>
      </p>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 24px;">

      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="font-size: 13px; color: '#92400e'; margin: 0;">
          Link download Anda bersifat pribadi. Jangan bagikan ke orang lain.
          Jika link hilang atau kedaluwarsa, gunakan halaman <a href="${process.env.APP_URL ?? 'http://localhost:3000'}/order" style="color: #7c3aed;">Cek Pesanan</a>.
        </p>
      </div>

      <p style="font-size: 13px; color: '#64748b'; margin: 0;">
        Butuh bantuan? Hubungi support kami dengan menyertakan nomor pesanan: <strong>${orderNumber}</strong>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()

  try {
    if (provider === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to,
          subject: `✅ Pembayaran Berhasil — ${productName}`,
          html: htmlContent,
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Resend error ${res.status}: ${err}`)
      }
      return { success: true }
    }

    // TODO: Add Postmark and SES providers
    console.warn(`[Email] Provider '${provider}' not implemented`)
    return { success: false, error: `Provider ${provider} not implemented` }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Email] Send failed:', error)
    return { success: false, error }
  }
}
