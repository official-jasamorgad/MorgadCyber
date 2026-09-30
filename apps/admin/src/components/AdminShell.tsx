import { Sidebar } from './Sidebar'

interface AdminShellProps {
  children: React.ReactNode
  title: string
  adminName?: string
  adminRole?: string
}

export function AdminShell({ children, title, adminName, adminRole }: AdminShellProps) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Sidebar adminName={adminName} adminRole={adminRole} />

      <div style={{ flex: 1, marginLeft: '240px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Header */}
        <header
          style={{
            height: '64px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            padding: '0 32px',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          <h1
            style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#0f172a',
              margin: 0,
            }}
          >
            {title}
          </h1>
        </header>

        {/* Main content */}
        <main style={{ flex: 1, padding: '32px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
