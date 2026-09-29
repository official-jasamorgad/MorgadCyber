# 1024 Tera — Digital Marketplace Platform

Monorepo platform untuk penjualan produk digital. Dibangun dengan Next.js 14, TypeScript, PostgreSQL + Drizzle ORM, dan Mayar sebagai payment gateway.

## Arsitektur

```
morgad/
├── frontend/       # Batas ownership UI dan rencana migrasi legacy storefront
├── backend/        # Batas ownership server dan rencana migrasi legacy backend
├── apps/
│   ├── web/          # Customer storefront (port 3000)
│   └── admin/        # Admin dashboard (port 3001)
├── packages/
│   ├── db/           # PostgreSQL schema + Drizzle ORM
│   ├── mayar/        # Mayar API + webhook integration
│   ├── security/     # Token, bcrypt, session, rate limiting
│   ├── email/        # Transactional email (Resend)
│   └── types/        # Shared TypeScript types
```

### Struktur legacy dan compatibility

File legacy di root masih dipertahankan sementara karena dipakai langsung oleh `server.py`, test Python, dan asset relatif. Pembagian ownership serta rencana migrasinya dicatat di [frontend/README.md](frontend/README.md) dan [backend/README.md](backend/README.md). Memindahkan file legacy tanpa migrasi routing akan memutus halaman `/categories`, `/MorgadAdmin`, dan asset storefront.

## Setup

### Prerequisites

- Node.js >= 20
- PostgreSQL (running locally atau cloud)
- pnpm (opsional, bisa menggunakan npm workspaces)

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` ke `.env`:

```bash
cp .env.example .env
```

Isi semua nilai, terutama:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/morgad
MAYAR_API_KEY=your_mayar_api_key
MAYAR_WEBHOOK_SECRET=your_webhook_secret
DOWNLOAD_TOKEN_SECRET=random_string_min_32_chars
ADMIN_SESSION_SECRET=random_string_min_32_chars
```

### Legacy Python Server (Local Downloads)

Arsip produk lokal disimpan di `storage/private/products/`; database SQLite menyimpan path file. File di-stream langsung dengan bongkahan kecil, bukan dibaca seluruhnya ke memori.

```bash
export MAYAR_WEBHOOK_SECRET='secret-dari-dashboard-mayar'
python3 server.py
```

Endpoint `/api/download/[TOKEN]` memvalidasi token download pesanan sebelum mengirim arsip lokal. Webhook legacy tersedia di `POST /webhook-mayar` dan mensyaratkan HMAC `X-Mayar-Signature`; token sementara yang diterbitkan endpoint itu berlaku 15 menit dan digunakan melalui `/download?token=...`.

### 3. Database Setup

```bash
# Generate migrations dari schema
npm run db:generate

# Apply migrations ke PostgreSQL
npm run db:migrate

# Seed akun admin awal; katalog produk dibiarkan kosong
npm run db:seed
```

**Default admin credentials:**
- Email: `sujon@morgad.com`
- Password: `Admin@1024Tera!`

⚠️ **WAJIB** ganti password setelah login pertama.

### 4. Run Development Server

```bash
# Run both web + admin
npm run dev

# Atau run terpisah:
npm run dev:web    # http://localhost:3000
npm run dev:admin  # http://localhost:3001
```

## Mayar Integration

Baca dokumentasi resmi Mayar sebelum konfigurasi:
- https://docs.mayar.id
- https://mayar.id/agents

Set webhook URL di Mayar dashboard ke:
```
https://your-domain.com/api/webhooks/mayar
```
Untuk legacy Python server, gunakan `https://your-domain.com/webhook-mayar`.

## Security Architecture

| Feature | Implementation |
|---|---|
| Admin auth | JWT in HTTP-only secure cookie |
| Password | bcrypt (12 rounds) |
| Download token | Random 32 bytes → SHA-256 hash in DB |
| Webhook idempotency | UNIQUE(event_id) constraint |
| Amount verification | Order amount vs Mayar amount |
| State machine | PENDING→PAID only via webhook |
| Rate limiting | 5 attempts → 15-min lockout |
| Private storage | S3-compatible, signed URLs only |

## API Endpoints

### Customer (apps/web)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/products` | Public product list |
| `POST` | `/api/checkout` | Create order + Mayar payment |
| `POST` | `/api/webhooks/mayar` | Mayar webhook handler |
| `GET` | `/api/order` | Order lookup (requires number + email) |
| `POST` | `/api/order/resend` | Resend download link |
| `GET` | `/download/[token]` | Secure file download |

### Admin (apps/admin)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Admin login |
| `POST` | `/api/auth/logout` | Admin logout |
| `GET` | `/api/admin/stats` | Dashboard stats |
| `GET/POST` | `/api/admin/products` | Product management |
| `GET` | `/api/admin/orders` | Order list |
| `PATCH` | `/api/admin/downloads/[id]/revoke` | Revoke download token |

## Customer Flow

```
Homepage → /categories → /categories/[slug] → /products/[slug]
→ /checkout?product=ID → Mayar Payment → /payment/[status]
→ Email dengan download link → /download/[token]
```

Pelanggan dapat cek status pesanan tanpa login di `/order` (Order ID + Email).

## Admin Flow

```
/MorgadAdmin/login → bcrypt verify → JWT session cookie → /MorgadAdmin/dashboard
→ Products / Orders / Payments / Downloads / Customers / Settings
```

Admin console tidak ditautkan dari storefront dan hanya tersedia melalui URL langsung `/MorgadAdmin`.

## Tests

```bash
npm run test
```

Tests mencakup:
- Token entropy dan SHA-256 hashing
- Payment state machine
- Amount verification
- Webhook idempotency
- Download limits
- Admin authentication

## Non-Negotiable Rules

1. Customer TIDAK perlu login
2. Admin HARUS login
3. File berbayar TIDAK diberikan sebelum pembayaran terverifikasi
4. Harga SELALU dari database, bukan frontend
5. Webhook amount DIVERIFIKASI terhadap order amount
6. Raw download token TIDAK disimpan di database (hanya hash SHA-256)
7. "Explore All Categories" navigasi ke `/categories`
8. Tidak ada fake/dummy data di produksi
# MorgadCyber
# MorgadCyber
