'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/MorgadAdmin/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })

      const data = (await res.json()) as { success?: boolean; error?: string }

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Email atau password salah.')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        padding: '24px',
      }}
    >
      <div className="admin-login-shell">
        <div className="admin-login-visual" aria-hidden="true">
          <div className="admin-login-orbit admin-login-orbit-one" />
          <div className="admin-login-orbit admin-login-orbit-two" />
          <div className="admin-login-visual-content">
            <span className="admin-login-kicker">MORGAD CYBER</span>
            <h2>Build, manage, and grow your digital marketplace.</h2>
            <p>One secure workspace for products, orders, customers, and downloads.</p>
          </div>
        </div>

      <div className="admin-login-panel">
        {/* Logo / Brand */}
        <div style={{ marginBottom: '34px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#7c3aed',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="admin-login-title">Welcome back</h1>
          <p className="admin-login-subtitle">Masuk ke panel administrasi Morgad.</p>
        </div>

        {/* Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          {error && (
            <div
              role="alert"
              style={{
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '20px',
                fontSize: '14px',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: '20px' }}>
              <label
                htmlFor="identifier"
                style={{
                  display: 'block',
                  fontWeight: '500',
                  color: '#0f172a',
                  marginBottom: '6px',
                  fontSize: '14px',
                }}
              >
                Email atau username
              </label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@example.com atau nama admin"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#0f172a',
                  backgroundColor: '#fff',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#7c3aed')}
                onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  fontWeight: '500',
                  color: '#0f172a',
                  marginBottom: '6px',
                  fontSize: '14px',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password"
                  style={{
                    width: '100%',
                    padding: '10px 44px 10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#0f172a',
                    backgroundColor: '#fff',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#7c3aed')}
                  onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '11px 16px',
                backgroundColor: loading ? '#a78bfa' : '#7c3aed',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              )}
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>

        <p className="admin-login-footer">Morgad Admin Panel &copy; {new Date().getFullYear()}</p>
      </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .admin-login-shell {
          width: min(1040px, 100%);
          min-height: 640px;
          display: grid;
          grid-template-columns: 0.92fr 1.08fr;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 28px;
          background: #fff;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
        }
        .admin-login-visual {
          position: relative;
          display: flex;
          align-items: flex-end;
          min-height: 640px;
          overflow: hidden;
          padding: 42px;
          color: #fff;
          background: #111827;
        }
        .admin-login-visual::before {
          content: '';
          position: absolute;
          inset: 0;
          background: #1e293b;
        }
        .admin-login-visual-content { position: relative; max-width: 330px; z-index: 1; }
        .admin-login-kicker { color: #ddd6fe; font-size: 11px; font-weight: 800; letter-spacing: 0.18em; }
        .admin-login-visual h2 { margin: 16px 0 12px; font-size: 34px; line-height: 1.08; letter-spacing: -0.03em; }
        .admin-login-visual p { margin: 0; color: #ddd6fe; font-size: 14px; line-height: 1.6; }
        .admin-login-orbit { position: absolute; border: 1px solid rgba(255,255,255,0.18); border-radius: 50%; }
        .admin-login-orbit-one { width: 420px; height: 420px; top: 70px; right: -180px; }
        .admin-login-orbit-two { width: 290px; height: 290px; top: 135px; right: -110px; border-color: rgba(216,180,254,0.35); }
        .admin-login-panel { display: flex; flex-direction: column; justify-content: center; padding: 64px 76px 42px; }
        .admin-login-title { margin: 0 0 6px; color: #0f172a; font-size: 30px; letter-spacing: -0.03em; }
        .admin-login-subtitle { margin: 0; color: #64748b; font-size: 14px; }
        .admin-login-footer { margin: auto 0 0; color: #94a3b8; font-size: 12px; }
        @media (max-width: 760px) {
          .admin-login-shell { grid-template-columns: 1fr; min-height: auto; border-radius: 20px; }
          .admin-login-visual { min-height: 250px; padding: 28px; }
          .admin-login-visual h2 { font-size: 26px; max-width: 310px; }
          .admin-login-panel { padding: 38px 26px 28px; }
          .admin-login-footer { margin-top: 34px; }
        }
      `}</style>
    </div>
  )
}
