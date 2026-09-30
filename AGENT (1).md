# AGENT.md

# DIGITAL PRODUCT PLATFORM
## Software, Application, Journal, Paper & Digital File Marketplace

---

## 1. PROJECT PURPOSE

Project ini adalah platform penjualan produk digital.

Jenis produk yang didukung:

- Software
- Desktop application
- Web application
- Mobile application
- SaaS
- Source code
- Plugin
- Template
- Journal
- Research paper
- Makalah
- E-book
- PDF
- DOCX
- ZIP
- Digital assets
- File digital lainnya

Platform menggunakan **Mayar sebagai platform pembayaran utama**.

User tidak diwajibkan membuat akun/login untuk:

- melihat produk;
- melakukan checkout;
- membayar;
- mendapatkan akses download setelah pembayaran berhasil.

Identitas transaksi dapat menggunakan:

- email;
- order ID;
- payment/invoice reference;
- secure download token.

---

# 2. CORE PRINCIPLE

Prinsip utama:

```text
USER
  ↓
SELECT PRODUCT
  ↓
CHECKOUT
  ↓
CREATE LOCAL ORDER
  ↓
CREATE MAYAR PAYMENT
  ↓
USER PAYS THROUGH MAYAR
  ↓
MAYAR WEBHOOK
  ↓
VERIFY PAYMENT
  ↓
ORDER = PAID
  ↓
CREATE DOWNLOAD ACCESS
  ↓
SECURE DOWNLOAD
```

Jangan memberikan produk sebelum pembayaran benar-benar terverifikasi.

---

# 3. MAYAR

Mayar digunakan sebagai payment platform untuk menangani pembayaran.

Integrasi dapat menggunakan Mayar API.

Mayar menyediakan API untuk:

- Invoice
- Payment Request
- Payment Link
- Customer
- Product
- Transaction
- Webhook
- QRIS
- License management

Gunakan dokumentasi API Mayar terbaru sebagai sumber kebenaran implementasi.

Official documentation:

https://docs.mayar.id

Mayar API saat ini menyediakan REST API v2.

Base API URL dan endpoint harus mengikuti dokumentasi Mayar terbaru dan **tidak boleh ditebak oleh agent**.

---

# 4. MAYAR API AUTHENTICATION

API key Mayar adalah secret.

API key:

```text
MAYAR_API_KEY
```

harus disimpan di environment variable.

Contoh:

```env
MAYAR_API_KEY=your_secret_key
```

Jangan:

- hardcode API key;
- memasukkan API key ke frontend;
- memasukkan API key ke Git;
- memasukkan API key ke database sebagai plaintext jika tidak diperlukan;
- menampilkan API key kepada user.

Frontend tidak boleh memanggil Mayar API menggunakan secret API key.

Semua operasi sensitif harus melalui backend.

---

# 5. ENVIRONMENT VARIABLES

Minimal:

```env
APP_URL=
DATABASE_URL=

MAYAR_API_KEY=
MAYAR_WEBHOOK_URL=

DOWNLOAD_TOKEN_SECRET=
DOWNLOAD_TOKEN_EXPIRY=

STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
```

Development dan production harus menggunakan credential yang berbeda.

---

# 6. USER WITHOUT LOGIN

Login bukan requirement untuk customer.

Customer cukup memberikan:

```text
email
```

saat checkout.

Order akan memiliki:

```text
order_id
customer_email
product_id
amount
currency
payment_status
```

User tidak perlu membuat:

```text
username
password
account
session
```

hanya untuk membeli produk.

---

# 7. CUSTOMER IDENTITY

Karena customer tidak menggunakan login, sistem menggunakan kombinasi:

```text
Order ID
+
Customer Email
+
Payment Reference
+
Secure Download Token
```

untuk mengidentifikasi transaksi.

Jangan menggunakan email sebagai satu-satunya authorization mechanism.

---

# 8. PRODUCT

Product minimal:

```text
id
name
slug
description
category
price
currency
file_id
file_name
file_size
version
status
created_at
updated_at
```

Contoh:

```json
{
  "id": "prod_001",
  "name": "AI Research Journal",
  "slug": "ai-research-journal",
  "description": "Research journal tentang Artificial Intelligence",
  "category": "journal",
  "price": 50000,
  "currency": "IDR",
  "version": "1.0",
  "status": "published"
}
```

---

# 9. PRODUCT CATEGORY

Gunakan category:

```text
software
application
saas
source_code
plugin
template
journal
paper
makalah
ebook
document
digital_asset
other
```

---

# 10. ORDER

Order dibuat di database lokal sebelum membuat transaksi Mayar.

Minimal:

```text
id
order_number
product_id
customer_email
amount
currency
payment_provider
payment_reference
payment_status
order_status
download_status
created_at
paid_at
```

Contoh:

```json
{
  "order_number": "ORD-20260917-0001",
  "product_id": "prod_001",
  "customer_email": "customer@example.com",
  "amount": 50000,
  "currency": "IDR",
  "payment_provider": "mayar",
  "payment_status": "PENDING",
  "order_status": "PENDING"
}
```

---

# 11. ORDER STATUS

Gunakan status:

```text
PENDING
PAYMENT_PENDING
PAID
READY
COMPLETED
CANCELLED
EXPIRED
REFUNDED
FAILED
```

Payment status:

```text
PENDING
PAID
FAILED
EXPIRED
REFUNDED
```

Jangan mencampurkan payment status dengan order status tanpa alasan yang jelas.

---

# 12. CHECKOUT FLOW

Ketika user memilih produk:

```text
PRODUCT
  ↓
CHECKOUT
  ↓
SERVER LOAD PRODUCT FROM DATABASE
  ↓
SERVER GET REAL PRICE
  ↓
CREATE LOCAL ORDER
  ↓
CREATE MAYAR PAYMENT
  ↓
SAVE MAYAR REFERENCE
  ↓
REDIRECT USER TO MAYAR CHECKOUT
```

Harga harus selalu berasal dari database server.

Jangan percaya harga dari frontend.

---

# 13. PRICE SECURITY

Frontend boleh mengirim:

```text
product_id
```

Tetapi frontend tidak boleh menjadi sumber kebenaran untuk:

```text
price
discount
payment_status
```

Contoh request:

```json
{
  "product_id": "prod_001"
}
```

Backend:

```text
product_id
      ↓
database
      ↓
price = 50000
      ↓
create Mayar payment
```

---

# 14. MAYAR PAYMENT CREATION

Backend harus membuat transaksi pembayaran melalui Mayar.

Conceptual flow:

```text
POST BACKEND /api/checkout

        ↓

Create Local Order

        ↓

Call Mayar API

        ↓

Create Invoice / Payment Request

        ↓

Save Mayar Reference

        ↓

Return Checkout URL
```

Gunakan endpoint Mayar yang sesuai dengan API version aktif.

Agent **tidak boleh mengarang endpoint Mayar**.

Jika dokumentasi Mayar berubah, implementasi harus mengikuti dokumentasi resmi terbaru.

---

# 15. MAYAR PAYMENT REFERENCE

Simpan identifier/reference dari Mayar.

Contoh:

```text
mayar_invoice_id
mayar_payment_id
mayar_transaction_id
```

Nama field harus mengikuti identifier yang benar-benar diberikan oleh Mayar API.

Jangan membuat reference palsu.

---

# 16. CHECKOUT RESPONSE

Backend dapat mengembalikan:

```json
{
  "order_id": "ORD-20260917-0001",
  "payment_provider": "mayar",
  "payment_status": "PENDING",
  "checkout_url": "..."
}
```

Frontend mengarahkan user ke checkout Mayar.

---

# 17. MAYAR PAYMENT METHODS

Gunakan metode pembayaran yang tersedia dan aktif pada akun Mayar.

Contoh channel yang Mayar dukung dapat mencakup:

- QRIS
- Bank Transfer / VA
- E-Wallet
- Kartu
- PayLater
- Mini Market

Jangan mengasumsikan channel tertentu selalu aktif.

Channel harus mengikuti konfigurasi merchant Mayar.

---

# 18. PAYMENT SUCCESS

Jangan menganggap user sudah membayar hanya karena:

```text
user kembali ke success page
```

atau:

```text
browser redirect berhasil
```

Success page hanya merupakan indikasi UX.

Sumber kebenaran pembayaran harus berasal dari:

```text
Mayar API / Webhook
```

sesuai mekanisme yang didokumentasikan Mayar.

---

# 19. MAYAR WEBHOOK

Webhook adalah bagian penting dari sistem.

Flow:

```text
MAYAR
  ↓
WEBHOOK
  ↓
BACKEND /api/webhooks/mayar
  ↓
VALIDATE REQUEST
  ↓
FIND ORDER
  ↓
VERIFY PAYMENT
  ↓
UPDATE ORDER
  ↓
CREATE DOWNLOAD ACCESS
```

---

# 20. WEBHOOK SECURITY

Webhook Mayar harus diproses dengan aman sesuai mekanisme autentikasi/verifikasi yang disediakan Mayar.

Agent tidak boleh membuat asumsi mengenai:

- nama header;
- signature format;
- hashing algorithm;
- payload structure.

Semua harus mengikuti dokumentasi webhook Mayar yang aktif.

Jika Mayar menyediakan signature verification:

```text
VERIFY SIGNATURE
```

wajib dilakukan sebelum memproses pembayaran.

---

# 21. WEBHOOK IDEMPOTENCY

Webhook dapat dikirim lebih dari satu kali.

Sistem harus aman terhadap duplicate webhook.

Contoh:

```text
Webhook #1
→ process payment

Webhook #2
→ already processed
→ ignore duplicate
```

Gunakan:

```text
webhook_event_id
```

atau identifier unik lain yang tersedia dari Mayar.

Jika event ID tidak tersedia, gunakan kombinasi reference yang aman untuk idempotency.

---

# 22. PAYMENT VERIFICATION

Ketika webhook diterima:

```text
1. Validate webhook
2. Identify Mayar transaction
3. Find local order
4. Verify payment status
5. Verify amount
6. Verify currency if available
7. Verify product/order reference
8. Check duplicate event
9. Update order
```

---

# 23. AMOUNT VERIFICATION

Jangan hanya memeriksa:

```text
payment_status = PAID
```

Pastikan nominal pembayaran sesuai dengan order.

Contoh:

```text
Local Order:
Rp50.000

Mayar Payment:
Rp50.000

RESULT:
VALID
```

Jika:

```text
Local Order:
Rp50.000

Mayar Payment:
Rp5.000

RESULT:
REJECT
```

Jangan memberikan produk.

---

# 24. PAYMENT STATE MACHINE

Gunakan:

```text
PENDING
   ↓
PAID
   ↓
READY
```

atau:

```text
PENDING
   ↓
FAILED
```

atau:

```text
PENDING
   ↓
EXPIRED
```

Jangan melakukan:

```text
FAILED → PAID
```

tanpa event pembayaran valid.

---

# 25. DOWNLOAD ACCESS

Setelah payment terverifikasi:

```text
PAYMENT = PAID
       ↓
CREATE DOWNLOAD ACCESS
       ↓
GENERATE SECURE TOKEN
       ↓
STORE HASH/TOKEN REFERENCE
       ↓
RETURN DOWNLOAD LINK
```

---

# 26. NO LOGIN DOWNLOAD

User yang sudah membayar dapat mengunduh tanpa login.

Contoh:

```text
https://example.com/download/SECURE_TOKEN
```

Token harus:

- random;
- cryptographically secure;
- sulit ditebak;
- memiliki expiry;
- terkait dengan order;
- terkait dengan product;
- dapat dicabut.

---

# 27. DOWNLOAD TOKEN

Jangan menggunakan:

```text
order_id
product_id
email
timestamp
```

sebagai token download.

Buruk:

```text
/download/ORD-0001
```

Lebih baik:

```text
/download/9f3a...secure-random-token...
```

---

# 28. TOKEN STORAGE

Jika memungkinkan, jangan menyimpan raw token.

Gunakan:

```text
raw token
    ↓
hash
    ↓
database
```

Saat user download:

```text
incoming token
    ↓
hash
    ↓
compare database
```

---

# 29. DOWNLOAD TOKEN EXPIRATION

Token dapat memiliki masa berlaku.

Contoh:

```text
created_at:
2026-09-17 08:00

expires_at:
2026-09-24 08:00
```

Jika expired:

```text
DOWNLOAD_DENIED
```

User dapat meminta link baru melalui sistem.

---

# 30. DOWNLOAD ACCESS TABLE

Buat tabel khusus:

```text
download_access
```

Minimal:

```text
id
order_id
product_id
token_hash
expires_at
download_count
max_downloads
revoked
created_at
last_download_at
```

---

# 31. DOWNLOAD VALIDATION

Sebelum file diberikan:

```text
CHECK TOKEN
     ↓
CHECK EXPIRATION
     ↓
CHECK ORDER
     ↓
CHECK PAYMENT
     ↓
CHECK PRODUCT
     ↓
CHECK REVOKED
     ↓
CHECK DOWNLOAD LIMIT
     ↓
ALLOW DOWNLOAD
```

Jika salah satu gagal:

```text
DENY DOWNLOAD
```

---

# 32. PRIVATE STORAGE

File produk tidak boleh berada pada public URL yang mudah ditebak.

Buruk:

```text
/public/files/app.zip
```

Buruk:

```text
/uploads/journal.pdf
```

Gunakan private storage:

```text
PRIVATE STORAGE
      ↓
DOWNLOAD API
      ↓
VALIDATION
      ↓
SIGNED URL
```

---

# 33. SIGNED DOWNLOAD URL

Setelah token berhasil divalidasi, backend dapat membuat temporary signed URL dari storage.

Contoh konsep:

```text
/download/{token}
        ↓
validate
        ↓
generate signed URL
        ↓
redirect/download
```

Signed URL harus memiliki expiration pendek.

---

# 34. DIRECT STORAGE ACCESS

User tidak boleh mengetahui credential storage.

Jangan expose:

```text
STORAGE_ACCESS_KEY
STORAGE_SECRET
```

ke browser.

---

# 35. RESEND DOWNLOAD LINK

User dapat meminta:

> "Saya sudah bayar tetapi link download hilang."

User memberikan:

```text
order_id
email
```

Backend memverifikasi kepemilikan order.

Jika:

```text
order exists
AND
email matches
AND
payment = PAID
```

maka generate token baru.

---

# 36. RESEND DOWNLOAD SECURITY

Jangan mengirim download link hanya berdasarkan:

```text
order_id
```

Order ID tidak boleh menjadi secret.

Gunakan kombinasi:

```text
order_id
+
email verification
```

dan mekanisme anti-abuse/rate limit.

---

# 37. DOWNLOAD LIMIT

Produk dapat memiliki:

```text
max_downloads
```

Contoh:

```text
max_downloads = 5
```

Setelah download:

```text
download_count += 1
```

Jika:

```text
download_count >= max_downloads
```

maka:

```text
DOWNLOAD_LIMIT_REACHED
```

Produk dapat dikonfigurasi unlimited jika diperlukan.

---

# 38. PAYMENT EMAIL

Setelah payment terverifikasi, sistem dapat mengirim email:

```text
Payment successful.

Order:
ORD-20260917-0001

Product:
AI Research Journal

Download:
[Download Product]
```

Email bukan pengganti database authorization.

---

# 39. PAYMENT SUCCESS PAGE

Setelah user kembali dari Mayar:

```text
Payment Status

Order ID:
ORD-20260917-0001

Status:
Checking payment...
```

Frontend/backend melakukan pengecekan.

Jika sudah terverifikasi:

```text
Payment Successful

[Download Product]
```

Jika belum:

```text
Payment is still being verified.
Please wait a moment and refresh.
```

---

# 40. PAYMENT PENDING

Jika payment belum confirmed:

```text
Payment Pending

Order:
ORD-20260917-0001

Status:
Menunggu konfirmasi pembayaran.
```

Jangan memberikan download access.

---

# 41. PAYMENT FAILED

Jika payment gagal:

```text
Payment Failed

Pembayaran belum berhasil.

Silakan kembali ke halaman pembayaran dan coba lagi.
```

Jangan memberikan produk.

---

# 42. PAYMENT EXPIRED

Jika payment expired:

```text
Payment Expired

Sesi pembayaran telah berakhir.

Silakan membuat pembayaran baru.
```

Jangan menggunakan invoice/payment lama apabila Mayar menyatakan transaksi tersebut sudah expired dan flow mengharuskan transaksi baru.

---

# 43. REFUND

Jika pembayaran di-refund:

```text
PAID
 ↓
REFUNDED
```

Jika kebijakan produk mengharuskan akses dicabut:

```text
REFUNDED
 ↓
REVOKE DOWNLOAD ACCESS
 ↓
REVOKE LICENSE
```

Aturan refund harus dikonfigurasi secara eksplisit.

Jangan otomatis mengasumsikan semua refund harus mencabut akses tanpa aturan bisnis.

---

# 44. MAYAR TRANSACTION RECONCILIATION

Backend dapat menggunakan API Mayar untuk memeriksa transaksi jika diperlukan.

Gunakan reconciliation untuk:

- webhook gagal;
- payment status tidak sinkron;
- debugging;
- admin verification;
- periodic consistency check.

Jangan menganggap data lokal selalu benar.

---

# 45. WEBHOOK FAILURE

Jika webhook gagal diproses:

```text
1. Log error
2. Jangan memberikan akses jika payment belum terverifikasi
3. Return response yang sesuai
4. Retry sesuai mekanisme yang aman
5. Gunakan Mayar webhook history/retry jika tersedia
```

---

# 46. ADMIN PAYMENT VERIFICATION

Admin dapat melihat:

```text
Order ID
Product
Customer Email
Amount
Payment Provider
Mayar Reference
Payment Status
Order Status
Created At
Paid At
```

Admin tidak boleh mengubah status:

```text
PAID
```

secara sembarangan.

Jika manual override diperlukan, wajib:

```text
reason
admin_id
timestamp
audit_log
```

---

# 47. ADMIN PRODUCT

Admin dapat:

```text
CREATE PRODUCT
UPDATE PRODUCT
UPLOAD FILE
SET PRICE
SET VERSION
PUBLISH PRODUCT
UNPUBLISH PRODUCT
DELETE PRODUCT
```

Produk yang sudah dibeli jangan dihapus secara fisik tanpa mempertimbangkan order dan download history.

---

# 48. FILE VERSIONING

Software/application mendukung:

```text
1.0.0
1.1.0
1.2.0
2.0.0
```

Order dapat memiliki:

```text
purchased_version
```

Jika produk memberikan lifetime update:

```text
latest_version
```

dapat digunakan.

Aturan update harus ditentukan oleh produk.

---

# 49. SOFTWARE LICENSE

Untuk software yang menggunakan license key:

```text
PAYMENT VERIFIED
       ↓
GENERATE LICENSE
       ↓
SAVE LICENSE
       ↓
SHOW LICENSE TO CUSTOMER
```

Mayar juga menyediakan fitur terkait license management dan validasi license untuk software/SaaS. Jika fitur Mayar tersebut digunakan, integrasinya harus mengikuti API Mayar yang aktif.

---

# 50. LICENSE SECURITY

License:

```text
ACTIVE
EXPIRED
REVOKED
USED
```

Jangan memasukkan secret internal ke dalam license.

---

# 51. JOURNAL / PAPER / MAKALAH

Metadata:

```text
title
author
publisher
year
language
pages
category
description
version
file
```

Format:

```text
PDF
DOCX
EPUB
ZIP
```

---

# 52. FILE UPLOAD SECURITY

Admin upload harus melakukan:

```text
MIME validation
Extension validation
File size validation
File signature validation
Filename sanitization
Malware scanning where appropriate
```

File tidak boleh langsung dieksekusi.

---

# 53. FRONTEND PAGES

Public:

```text
/
 /products
 /products/{slug}
 /checkout
 /payment
 /payment/success
 /payment/pending
 /payment/failed
 /download/{token}
 /order
 /support
```

Admin:

```text
/admin
/admin/products
/admin/orders
/admin/payments
/admin/files
/admin/downloads
/admin/licenses
```

---

# 54. API ENDPOINTS

Contoh backend:

```text
GET    /api/products
GET    /api/products/:slug

POST   /api/orders
POST   /api/orders/:id/payment

GET    /api/orders/:id/status

POST   /api/webhooks/mayar

GET    /api/download/:token

POST   /api/orders/:id/resend-download
```

Admin:

```text
POST   /api/admin/products
PATCH  /api/admin/products/:id
DELETE /api/admin/products/:id

GET    /api/admin/orders
GET    /api/admin/payments

POST   /api/admin/downloads/:id/revoke
```

Endpoint final dapat disesuaikan dengan framework.

---

# 55. WEBHOOK ENDPOINT

Endpoint:

```text
POST /api/webhooks/mayar
```

Harus:

```text
PUBLIC
BUT
SECURE
```

Jangan menggunakan authentication login biasa jika mekanisme webhook Mayar menggunakan signature/header khusus.

Gunakan mekanisme verifikasi webhook Mayar yang sesuai dokumentasi.

---

# 56. WEBHOOK PROCESSING

Pseudo-flow:

```text
POST /api/webhooks/mayar
        ↓
Read raw request
        ↓
Validate Mayar webhook
        ↓
Parse event
        ↓
Extract payment reference
        ↓
Find local order
        ↓
Verify payment
        ↓
Verify amount
        ↓
Check idempotency
        ↓
Update payment status
        ↓
Create download access
        ↓
Commit transaction
        ↓
Return success
```

---

# 57. DATABASE TRANSACTION

Payment update dan download access creation harus konsisten.

Conceptual:

```text
BEGIN TRANSACTION

update order = PAID

create download_access

create audit_log

COMMIT
```

Jika gagal:

```text
ROLLBACK
```

---

# 58. IDEMPOTENT PAYMENT PROCESSING

Contoh:

```text
Mayar webhook
      ↓
Order already PAID?
      ↓
YES
      ↓
Do not create duplicate download access
```

Gunakan unique constraint.

Contoh:

```text
UNIQUE(order_id)
```

untuk access yang seharusnya hanya satu.

---

# 59. DATABASE RELATIONS

Minimal:

```text
products
orders
payments
download_access
webhook_events
licenses
audit_logs
```

Relations:

```text
products
   │
   └── orders
          │
          ├── payments
          │
          ├── download_access
          │
          └── licenses
```

---

# 60. PAYMENTS TABLE

Contoh:

```text
payments

id
order_id
provider
provider_reference
amount
currency
status
raw_reference
paid_at
created_at
updated_at
```

Jangan menyimpan data sensitif Mayar yang tidak diperlukan.

---

# 61. WEBHOOK EVENTS

Contoh:

```text
webhook_events

id
provider
event_id
event_type
payload_hash
processed
processed_at
created_at
```

Payload mentah hanya disimpan jika memang diperlukan dan harus memperhatikan keamanan serta privacy.

---

# 62. AUDIT LOG

Catat:

```text
ORDER_CREATED
PAYMENT_CREATED
PAYMENT_PENDING
PAYMENT_PAID
PAYMENT_FAILED
PAYMENT_REFUNDED
DOWNLOAD_ACCESS_CREATED
DOWNLOAD_STARTED
DOWNLOAD_COMPLETED
DOWNLOAD_REVOKED
LICENSE_CREATED
LICENSE_REVOKED
ADMIN_ACTION
```

---

# 63. SECURITY

Wajib:

```text
HTTPS
Secure Headers
Input Validation
SQL Injection Protection
XSS Protection
CSRF Protection where applicable
Rate Limiting
Secure Cookies where used
Secret Management
Private Storage
Secure Tokens
Webhook Verification
Server-side Authorization
```

---

# 64. RATE LIMITING

Rate limit:

```text
/api/orders
/api/payment
/api/download
/api/orders/:id/status
/api/orders/:id/resend-download
/api/webhooks/mayar
```

Webhook rate limiting tidak boleh mengganggu legitimate retries dari Mayar.

---

# 65. ANTI TOKEN ENUMERATION

Download token harus memiliki entropy tinggi.

Jika seseorang mencoba banyak token:

```text
TOKEN1
TOKEN2
TOKEN3
...
```

sistem harus:

```text
rate limit
monitor
block abuse
```

---

# 66. CUSTOMER DATA

Data minimal:

```text
email
order
payment reference
download activity
```

Jangan meminta data yang tidak diperlukan.

---

# 67. AGENT INPUT PROCESSING

Agent harus:

```text
READ
 ↓
UNDERSTAND
 ↓
IDENTIFY INTENT
 ↓
VALIDATE
 ↓
EXECUTE
 ↓
VERIFY
 ↓
RESPOND
```

Tidak boleh:

```text
READ
 ↓
GUESS
 ↓
EXECUTE
```

---

# 68. TYPO HANDLING

Agent harus memahami typo.

Contoh:

```text
sofdwere → software
apliksi → aplikasi
jurnla → jurnal
makalh → makalah
mayr → mayar
bayar → payment
donwload → download
```

Namun jangan mengubah maksud jika terdapat lebih dari satu kemungkinan.

Jika ambigu:

```text
ASK CLARIFICATION
```

---

# 69. MULTI-INSTRUCTION

Jika user berkata:

> Buat produk jurnal, upload PDF, pasang harga 50 ribu dan publish.

Agent harus memecah:

```text
1. Create product
2. Upload PDF
3. Set price
4. Publish
```

Jika step 1 gagal:

```text
STOP DEPENDENT STEPS
```

Jangan melanjutkan proses yang bergantung pada task yang gagal.

---

# 70. NO FALSE SUCCESS

Agent tidak boleh mengatakan:

> Pembayaran berhasil.

jika belum diverifikasi Mayar.

Agent tidak boleh mengatakan:

> File sudah tersedia.

jika file belum ada.

Agent tidak boleh mengatakan:

> Download berhasil.

jika proses download belum benar-benar terjadi.

Agent harus selalu menggunakan data aktual dari backend.

---

# 71. ERROR MESSAGES

User-facing error:

```text
PAYMENT_PENDING
```

→

> Pembayaran Anda masih menunggu konfirmasi.

```text
PAYMENT_FAILED
```

→

> Pembayaran belum berhasil. Silakan coba kembali.

```text
DOWNLOAD_EXPIRED
```

→

> Link download sudah kedaluwarsa. Silakan minta link baru.

```text
DOWNLOAD_REVOKED
```

→

> Akses download ini sudah tidak aktif.

```text
ORDER_NOT_FOUND
```

→

> Pesanan tidak ditemukan. Periksa kembali nomor pesanan Anda.

---

# 72. INTERNAL ERROR

Jangan tampilkan:

```text
SQL error
stack trace
API key
database information
storage credentials
Mayar secret
internal path
```

kepada user.

User hanya mendapatkan pesan aman.

Detail masuk ke server log.

---

# 73. MAYAR API FAILURE

Jika Mayar API gagal:

```text
1. Log error
2. Do not mark payment as PAID
3. Do not generate download access
4. Return safe error
5. Allow retry where appropriate
```

Contoh:

> Sistem pembayaran sedang tidak dapat dihubungi. Silakan coba lagi beberapa saat lagi.

---

# 74. MAYAR WEBHOOK FAILURE

Jika webhook tidak dapat diproses:

```text
Payment status:
UNKNOWN/PENDING
```

Jangan langsung memberikan file.

Gunakan:

```text
Mayar transaction check
```

atau webhook retry sesuai mekanisme yang tersedia.

Mayar menyediakan pengelolaan webhook dan riwayat/retry webhook pada platform/API-nya.

---

# 75. ADMIN MANUAL PAYMENT

Manual payment confirmation hanya boleh dilakukan oleh admin dengan permission khusus.

Wajib mencatat:

```text
admin_id
order_id
reason
old_status
new_status
timestamp
```

Contoh:

```text
MANUAL_PAYMENT_CONFIRMATION

Admin:
admin_001

Order:
ORD-001

Reason:
Verified through Mayar dashboard

Old:
PENDING

New:
PAID
```

---

# 76. PRODUCT DELIVERY

Setelah pembayaran terverifikasi:

```text
Mayar Payment
      ↓
Local Order PAID
      ↓
Download Access
      ↓
Email
      ↓
Download
```

---

# 77. EMAIL DELIVERY

Email dapat berisi:

```text
Order ID
Product Name
Payment Status
Download Button
License Key if applicable
Support Information
```

Jangan mengirim:

```text
API keys
database credentials
storage credentials
Mayar API key
```

---

# 78. SUPPORT

User dapat meminta:

```text
cek pembayaran
cek order
kirim ulang download
masalah download
masalah license
masalah file
```

Agent harus terlebih dahulu membaca data order sebelum memberikan jawaban.

---

# 79. ORDER LOOKUP

Order lookup tanpa login harus menggunakan kombinasi aman.

Contoh:

```text
Order ID
+
Email
```

Jangan mengizinkan seseorang melihat seluruh informasi order hanya dengan menebak order ID.

---

# 80. CUSTOMER DOWNLOAD FLOW

```text
CUSTOMER
   ↓
Open Download Link
   ↓
Validate Token
   ↓
Find Download Access
   ↓
Find Order
   ↓
Check Payment
   ↓
Check Expiration
   ↓
Check Download Limit
   ↓
Generate Temporary Signed URL
   ↓
DOWNLOAD
```

---

# 81. PRODUCT ACCESS AFTER PAYMENT

Rule utama:

```text
IF payment_status != PAID
THEN deny download
```

Tidak ada pengecualian kecuali aturan bisnis eksplisit.

---

# 82. REFUND ACCESS

Jika order:

```text
REFUNDED
```

maka sistem harus mengikuti konfigurasi produk:

```text
KEEP_ACCESS
```

atau:

```text
REVOKE_ACCESS
```

Jika:

```text
REVOKE_ACCESS
```

maka:

```text
download_access.revoked = true
```

dan jika software menggunakan license:

```text
license = REVOKED
```

---

# 83. PERFORMANCE

File besar tidak seharusnya melewati application server jika tidak diperlukan.

Prefer:

```text
Application
   ↓
Authorization
   ↓
Signed URL
   ↓
Object Storage/CDN
```

---

# 84. BACKUP

Backup:

```text
Database
Product Metadata
Order Data
Payment References
License Data
Audit Logs
```

File digital harus memiliki backup sesuai kebutuhan bisnis.

---

# 85. OBSERVABILITY

Monitor:

```text
Payment success rate
Payment pending
Webhook failures
Download failures
Download count
Expired tokens
Failed checkout
Mayar API errors
Storage errors
```

---

# 86. HEALTH CHECK

Backend harus memiliki:

```text
GET /api/health
```

yang mengecek minimal:

```text
application
database
storage
```

Integrasi Mayar dapat memiliki health/integration check jika dibutuhkan.

---

# 87. DEVELOPMENT MODE

Development tidak boleh menggunakan production credentials.

Gunakan:

```text
.env.local
```

dan secret management yang sesuai.

Jangan commit:

```text
.env
.env.local
API keys
credentials
private keys
```

---

# 88. PRODUCTION CHECKLIST

Sebelum production:

```text
[ ] Mayar API configured
[ ] Mayar API key stored securely
[ ] Mayar webhook URL configured
[ ] Webhook verification implemented
[ ] Payment amount verification
[ ] Payment reference stored
[ ] Idempotency implemented
[ ] Private storage configured
[ ] Download token implemented
[ ] Token expiration implemented
[ ] Download limit implemented
[ ] Rate limiting enabled
[ ] HTTPS enabled
[ ] Error handling implemented
[ ] Audit log enabled
[ ] Database backup configured
[ ] Email delivery configured
[ ] Product file backup configured
[ ] Refund flow defined
[ ] License flow defined
[ ] Monitoring configured
```

---

# 89. GOLDEN RULE

Agent harus selalu mengikuti:

```text
READ
 ↓
UNDERSTAND
 ↓
VALIDATE
 ↓
EXECUTE
 ↓
VERIFY
 ↓
RESPOND
```

Jangan:

```text
READ
 ↓
GUESS
 ↓
EXECUTE
 ↓
CLAIM SUCCESS
```

---

# 90. FINAL SYSTEM RULE

Sistem harus memberikan pengalaman:

```text
SIMPLE
SECURE
NO LOGIN REQUIRED
MAYAR PAYMENT
VERIFIED PAYMENT
SECURE DOWNLOAD
```

Alur final:

```text
                    ┌───────────────┐
                    │     USER      │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   PRODUCT     │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   CHECKOUT    │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ LOCAL ORDER   │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ MAYAR PAYMENT │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │     USER      │
                    │     PAYS      │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ MAYAR WEBHOOK │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ VERIFY PAYMENT│
                    └───────┬───────┘
                            │
                     ┌──────┴──────┐
                     │             │
                   FAILED         PAID
                     │             │
                     ▼             ▼
                  NO ACCESS   CREATE ACCESS
                                   │
                                   ▼
                           SECURE DOWNLOAD
                                   │
                                   ▼
                               USER FILE
```

---

# 91. NON-NEGOTIABLE RULES

1. Jangan memberikan file sebelum payment terverifikasi.
2. Jangan mempercayai payment status dari frontend.
3. Jangan mempercayai harga dari frontend.
4. Jangan menganggap redirect success sebagai bukti pembayaran.
5. Jangan mengarang response Mayar.
6. Jangan mengarang endpoint Mayar.
7. Selalu gunakan dokumentasi Mayar terbaru.
8. Jangan expose Mayar API key.
9. Jangan expose storage credentials.
10. Jangan menyimpan produk berbayar pada public URL.
11. Gunakan secure download token.
12. Gunakan expiration.
13. Gunakan rate limiting.
14. Gunakan idempotency.
15. Validasi nominal pembayaran.
16. Validasi reference pembayaran.
17. Catat aktivitas penting.
18. Jangan mengatakan berhasil sebelum hasil diverifikasi.
19. Jika input user ambigu, tanyakan klarifikasi.
20. Jika API gagal, jangan mengarang hasil.

---

# 92. OFFICIAL MAYAR REFERENCES

Gunakan sumber resmi Mayar untuk implementasi:

- Mayar Developer & AI Agent:
  https://mayar.id/agents

- Mayar API Documentation:
  https://docs.mayar.id

- Mayar MCP:
  https://mcp.mayar.id

- Mayar Software & SaaS:
  https://mayar.id/software-and-saas

Jika dokumentasi API berbeda dengan contoh dalam file ini, **dokumentasi API Mayar terbaru menjadi sumber kebenaran**.

---

# 93. DEFINITION OF DONE

Task dianggap selesai apabila:

```text
[ ] User intent understood
[ ] Product identified
[ ] Price verified from database
[ ] Local order created
[ ] Mayar payment created
[ ] Mayar reference stored
[ ] User can pay
[ ] Webhook configured
[ ] Payment verified
[ ] Amount verified
[ ] Order marked PAID
[ ] Download access created
[ ] Secure token generated
[ ] File stored privately
[ ] Download tested
[ ] Expiration tested
[ ] Unauthorized download tested
[ ] Duplicate webhook tested
[ ] Payment failure tested
[ ] Payment pending tested
[ ] Refund behavior tested
[ ] Error handling tested
```

---

# END OF AGENT.MD

---

# 94. REPOSITORY & TECH STACK

## 94.1 Repository Structure

Gunakan monorepo yang sederhana, modular, dan mudah dirawat.

```text
digital-products-platform/
├── apps/
│   ├── web/                         # Customer storefront + checkout
│   └── admin/                       # Admin dashboard
├── packages/
│   ├── db/                          # PostgreSQL schema, migrations, queries
│   ├── mayar/                       # Mayar API + webhook integration
│   ├── storage/                     # Private object-storage adapter
│   ├── email/                       # Transactional email
│   ├── security/                    # Token, hashing, validation, rate limit
│   ├── ui/                          # Shared UI primitives
│   ├── config/                      # Shared configuration
│   └── types/                       # Shared TypeScript types
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── deployment/
│   └── design/
├── scripts/
│   ├── seed/
│   └── maintenance/
├── .env.example
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── README.md
└── AGENT.md
```

### Repository Rules

- `apps/web` adalah storefront customer.
- `apps/admin` adalah dashboard operasional admin.
- Business logic pembayaran tidak boleh berada di komponen React.
- Integrasi Mayar harus berada di package/module tersendiri.
- Secret, credential, private key, dan file berbayar tidak boleh masuk Git.
- Shared package hanya dibuat jika memang digunakan lintas aplikasi.
- Jangan membuat struktur folder berlebihan tanpa kebutuhan nyata.

---

## 94.2 Recommended Stack

### Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
```

Gunakan Next.js App Router.

### UI

```text
Tailwind CSS
Radix UI primitives
Lucide Icons
CSS Variables / Design Tokens
```

Gunakan primitive library sebagai fondasi, bukan sebagai identitas visual.

### Backend

```text
Next.js Route Handlers
Server Actions where appropriate
TypeScript strict mode
Zod
```

Operasi sensitif wajib server-side.

### Database

```text
PostgreSQL
Drizzle ORM
```

Gunakan migration yang versioned.

### Payment

```text
Mayar API
Mayar Webhook
```

Endpoint, payload, signature, dan authentication harus selalu mengikuti dokumentasi Mayar terbaru.

### Storage

```text
Private S3-compatible Object Storage
```

Provider dapat berupa Cloudflare R2, AWS S3, atau provider S3-compatible lain.

### Email

Transactional email provider melalui server-side API.

Contoh:

```text
Resend
Postmark
Amazon SES
```

Provider final dapat disesuaikan dengan deployment.

### Testing

```text
Vitest
Playwright
```

Minimal test:

```text
payment creation
webhook verification
webhook idempotency
amount verification
download authorization
expired token
revoked token
download limit
admin authorization
```

### Code Quality

```text
ESLint
Prettier
TypeScript strict
```

Jangan menggunakan `any` hanya untuk melewati type checking.

---

# 95. UI/UX DESIGN DIRECTION

## 95.1 Core Principle

UI harus terasa seperti marketplace produk digital yang dirancang oleh product designer, bukan template AI atau landing-page generator.

Karakter visual:

```text
PRECISE
EDITORIAL
QUIET
USEFUL
TRUSTWORTHY
HUMAN
```

Prioritas:

```text
CONTENT
TYPOGRAPHY
LAYOUT
SPACING
PRODUCT INFORMATION
```

bukan dekorasi.

---

## 95.2 Hindari "AI-Looking UI"

Jangan menjadikan pola berikut sebagai default:

```text
gradient background
+
glassmorphism
+
glowing blobs
+
huge centered heading
+
3 identical cards
+
excessive rounded corners
+
neon accent
```

Hindari pula:

- terlalu banyak gradient;
- glow/neon tanpa fungsi;
- semua elemen dibuat card;
- semua elemen memakai `rounded-full`;
- heading marketing yang terlalu generik;
- terlalu banyak icon;
- terlalu banyak badge;
- animasi pada setiap section;
- whitespace kosong yang tidak membantu hierarchy.

---

## 95.3 Visual Personality

Gunakan pendekatan editorial-commerce:

```text
clean navigation
strong typography
thin borders
controlled whitespace
small/medium radius
subtle surface contrast
restrained shadows
clear product metadata
```

Produk harus terasa nyata dan informatif.

Jangan membuat halaman produk seperti halaman promosi SaaS generik.

---

## 95.4 Typography

Gunakan maksimal dua keluarga font.

Baseline:

```text
Primary:
Inter

Optional:
IBM Plex Sans / DM Sans
```

Satu keluarga font juga diperbolehkan jika hasilnya lebih konsisten.

Hierarchy:

```text
Display
H1
H2
H3
Body
Small
Caption
```

Hindari H1 yang terlalu besar sampai mengorbankan informasi produk.

---

## 95.5 Color System

Gunakan warna yang tenang.

Baseline:

```text
Background      → warm white / neutral
Foreground      → near black
Surface         → subtle neutral
Border          → soft neutral
Primary         → single brand color
Success         → restrained green
Warning         → restrained amber
Danger          → restrained red
```

Jangan menggunakan gradient sebagai background default.

---

## 95.6 Radius & Shadow

Gunakan radius berdasarkan hierarchy:

```text
buttons         → medium
inputs          → medium
cards           → small/medium
dialogs         → medium
large sections  → minimal
```

Shadow harus subtle.

Prioritaskan:

```text
border
surface contrast
spacing
typography
```

daripada shadow besar.

---

# 96. UI COMPONENT SYSTEM

Komponen storefront:

```text
Header
Navigation
ProductCard
ProductGrid
ProductHero
PriceBlock
CategoryFilter
SearchInput
CheckoutSummary
PaymentStatus
DownloadPanel
OrderLookup
StatusBadge
FileMeta
VersionHistory
FAQ
Footer
```

Komponen admin:

```text
AdminSidebar
AdminHeader
DataTable
ProductEditor
OrderTable
PaymentTable
DownloadAccessTable
LicenseTable
AuditLogTable
```

Jangan membuat setiap section menjadi card terpisah.

Gunakan:

```text
layout
spacing
divider
typography
surface
```

untuk membentuk grouping.

---

# 97. STORE FRONT UI

## 97.1 Homepage

Homepage harus menjawab dengan cepat:

```text
Apa yang dijual?
Produk apa yang tersedia?
Berapa harganya?
Bagaimana cara membelinya?
Bagaimana produk dikirim?
```

Struktur:

```text
Header
↓
Compact Hero
↓
Category Navigation
↓
Featured Products
↓
Product Categories
↓
How It Works
↓
Trust / Delivery Information
↓
Support
↓
Footer
```

Hero tidak boleh menjadi poster kosong dengan heading raksasa.

---

## 97.2 Product Listing

Gunakan:

```text
Page title
Short description
Search
Category/filter
Product grid/list
```

Product card minimal:

```text
product type
product name
short description
version if relevant
format if relevant
price
CTA
```

Jangan menampilkan terlalu banyak badge.

---

# 98. PRODUCT DETAIL UI

Halaman produk adalah sumber informasi utama customer.

Struktur:

```text
Breadcrumb
↓
Product title
Product summary
Price
Primary CTA
Product preview / cover
↓
Description
What's included
File information
Version
Requirements
License information
FAQ
Support
```

Journal/paper/makalah:

```text
title
author
publisher
year
language
pages
format
description
```

Software/application:

```text
version
platform
requirements
license
file size
changelog
```

Jangan memaksa semua tipe produk menggunakan metadata yang sama.

---

# 99. CHECKOUT UI/UX

Checkout harus sederhana.

Tampilkan:

```text
Product
Price
Customer email
Order summary
Payment CTA
```

Jangan meminta data yang tidak diperlukan.

Customer tidak perlu membuat password.

Gunakan CTA yang spesifik:

```text
Lanjut ke Pembayaran
```

bukan:

```text
Continue
Submit
Get Started
```

---

# 100. PAYMENT STATUS UI

## Pending

```text
Pembayaran sedang diverifikasi

Order #ORD-XXXX

Kami sedang menunggu konfirmasi pembayaran.
Halaman ini akan diperbarui setelah pembayaran terverifikasi.
```

## Success

```text
Pembayaran berhasil

Order #ORD-XXXX

Produk Anda sudah siap diunduh.

[Download Produk]
```

## Failed

```text
Pembayaran belum berhasil

Order #ORD-XXXX

Silakan coba pembayaran kembali.

[Coba Lagi]
```

## Expired

```text
Sesi pembayaran telah berakhir

Buat pembayaran baru untuk melanjutkan.

[Bayar Kembali]
```

Jangan menggunakan loading animation tanpa informasi yang berguna.

---

# 101. DOWNLOAD UI/UX

Download page harus terasa seperti halaman delivery, bukan dashboard yang rumit.

Tampilkan:

```text
Product name
Order number
File name
File size
Version
Download button
Expiration information
Support
```

Contoh struktur:

```text
Your purchase is ready

AI Research Journal
PDF · 4.8 MB · Version 1.0

[Download PDF]

Link expires in 6 days
Need help? Contact support.
```

Jika gagal:

```text
Link download tidak dapat digunakan.

Kemungkinan penyebab:
- link sudah kedaluwarsa
- akses telah dicabut
- batas download tercapai

[Request New Download Link]
```

---

# 102. HUMAN-CENTERED COPY

Gunakan bahasa yang langsung.

Hindari copy generik seperti:

```text
Unlock your potential
Supercharge your workflow
Revolutionary
Next-generation
Powered by cutting-edge AI
```

kecuali memang relevan dengan produk.

Prioritaskan:

```text
Download produk
Lihat detail
Beli sekarang
Cek pesanan
Kirim ulang link
Coba pembayaran lagi
Hubungi dukungan
```

CTA harus menjelaskan tindakan yang akan terjadi.

---

# 103. ANTI-AI VISUAL CHECKLIST

Sebelum UI dianggap selesai:

```text
[ ] Tidak menggunakan gradient berlebihan
[ ] Tidak semua elemen berbentuk card
[ ] Tidak semua radius terlalu besar
[ ] Tidak menggunakan glow/neon tanpa alasan
[ ] Tidak menggunakan heading generik
[ ] Tidak menggunakan terlalu banyak icon
[ ] Tidak menggunakan badge berlebihan
[ ] Product information terlihat jelas
[ ] CTA memiliki tujuan spesifik
[ ] Typography memiliki hierarchy
[ ] Layout memiliki ritme visual
[ ] Mobile layout dirancang dengan sengaja
[ ] Error state terasa manusiawi
[ ] Loading state memiliki konteks
[ ] Empty state menjelaskan tindakan berikutnya
[ ] UI memiliki identitas visual sendiri
```

---

# 104. RESPONSIVE DESIGN

Prioritaskan:

```text
mobile
tablet
desktop
```

Perhatikan:

```text
touch target
text wrapping
product image ratio
checkout usability
download CTA
navigation
```

CTA utama harus mudah dijangkau pada mobile.

Jangan hanya mengecilkan desktop layout untuk mobile.

---

# 105. ACCESSIBILITY

Wajib:

```text
semantic HTML
keyboard navigation
visible focus state
sufficient contrast
accessible labels
form error messages
reduced-motion support
alt text
```

Jangan menggunakan warna sebagai satu-satunya indikator status.

Contoh:

```text
PAID
✓ Payment verified
```

bukan hanya badge hijau.

---

# 106. MOTION DESIGN

Motion harus membantu pemahaman.

Gunakan secara ringan untuk:

```text
button feedback
modal
toast
loading
status change
page transition where useful
```

Hindari:

```text
constant floating objects
parallax everywhere
scroll animation on every section
animated gradients
```

Hormati `prefers-reduced-motion`.

---

# 107. ADMIN UI/UX

Admin berbeda dari storefront.

Prioritas:

```text
information density
speed
search
filter
clear status
auditability
```

Gunakan table untuk data.

Admin harus cepat melakukan:

```text
find order
check payment
find product
check download
revoke access
inspect webhook
inspect audit log
```

Jangan membuat dashboard admin menjadi kumpulan metric cards besar jika table lebih berguna.

---

# 108. DESIGN TOKENS

Simpan token secara terpusat.

Contoh:

```text
--background
--foreground
--surface
--surface-muted
--border
--primary
--primary-foreground
--success
--warning
--danger

--radius-sm
--radius-md
--radius-lg

--space-1
--space-2
--space-3
--space-4
--space-6
--space-8
--space-12
--space-16
```

Jangan menulis warna dan spacing secara acak di setiap component.

---

# 109. FRONTEND ENGINEERING RULES

Sensitive operations:

```text
Mayar API
database writes
webhook verification
token generation
storage signing
admin authorization
```

harus server-side.

Client Components hanya digunakan jika membutuhkan:

```text
interaction
browser API
local state
client-only behavior
```

Jangan menjadikan seluruh aplikasi `"use client"`.

---

# 110. ERROR / EMPTY / LOADING STATES

Setiap halaman utama harus memiliki:

```text
loading
success
empty
error
```

Contoh empty state:

```text
Belum ada produk di kategori ini.

Coba kategori lain atau hapus filter.
```

Contoh order error:

```text
Pesanan tidak ditemukan.

Periksa kembali nomor pesanan dan email Anda.
```

Hindari error generik seperti:

```text
Oops! Something went wrong!!!
```

sebagai satu-satunya informasi.

---

# 111. SEO & CONTENT

Public product pages harus memiliki:

```text
title
meta description
canonical URL
Open Graph metadata
structured product information where appropriate
```

Gunakan slug yang mudah dibaca:

```text
/produk/ai-research-journal
```

bukan:

```text
/product?id=928381
```

---

# 112. PERFORMANCE

Prioritaskan:

```text
fast initial render
optimized images
lazy loading where appropriate
small client bundles
server rendering where useful
cached product data
direct object-storage downloads
```

Jangan mengirim JavaScript client untuk fungsi yang dapat dilakukan server.

---

# 113. DEPLOYMENT BASELINE

Baseline deployment:

```text
Web:
Vercel / equivalent Next.js hosting

Database:
Managed PostgreSQL

Storage:
Private S3-compatible object storage

Email:
Transactional email provider

Payment:
Mayar
```

Environment:

```text
development
staging
production
```

Credential setiap environment harus terpisah.

---

# 114. IMPLEMENTATION PRIORITY

Urutan implementasi:

```text
1. Repository setup
2. Database schema
3. Product catalog
4. Product detail
5. Checkout
6. Mayar payment integration
7. Mayar webhook
8. Payment verification
9. Secure download
10. Email delivery
11. Admin product management
12. Admin order/payment management
13. License management if required
14. Monitoring
15. Automated tests
16. Production hardening
```

Jangan membangun visual kompleks sebelum payment, order, dan download flow memiliki fondasi yang benar.

---

# 115. UI DEFINITION OF DONE

UI selesai jika:

```text
[ ] Product mudah ditemukan
[ ] Product information mudah dipahami
[ ] Harga terlihat jelas
[ ] Checkout sederhana
[ ] Customer tidak dipaksa login
[ ] Payment state mudah dipahami
[ ] Download state mudah dipahami
[ ] Error state memberikan solusi
[ ] Mobile layout nyaman
[ ] Keyboard navigation berfungsi
[ ] Typography konsisten
[ ] Spacing konsisten
[ ] Tidak terlihat seperti template AI
[ ] Dekorasi tidak mengalahkan content
[ ] CTA memiliki label spesifik
```

---

# 116. FINAL STACK SUMMARY

```text
Architecture:
Monorepo

Frontend:
Next.js + React + TypeScript

Styling:
Tailwind CSS + CSS Design Tokens

UI:
Custom design system + Radix primitives where useful

Backend:
Next.js Route Handlers / Server Actions

Validation:
Zod

Database:
PostgreSQL + Drizzle ORM

Payment:
Mayar API + Mayar Webhook

Storage:
Private S3-compatible Object Storage

Email:
Transactional Email Provider

Testing:
Vitest + Playwright

Code Quality:
ESLint + Prettier + TypeScript strict

Customer Auth:
No login

Admin Auth:
Authenticated + role-based access

Delivery:
Secure token + private storage + temporary signed URL

Deployment:
Next.js hosting + managed PostgreSQL + private object storage
```

---

# 117. FINAL PRODUCT EXPERIENCE

Target experience:

```text
DISCOVER
   ↓
UNDERSTAND
   ↓
CHECKOUT
   ↓
PAY WITH MAYAR
   ↓
PAYMENT VERIFIED
   ↓
DOWNLOAD
```

Secara visual:

```text
NOT:
AI LANDING PAGE

BUT:
DIGITAL PRODUCT STORE
```

Prinsip akhir:

> Gunakan teknologi modern di belakang layar, tetapi biarkan customer merasakan produk digital store yang sederhana, matang, informatif, dan dibuat untuk manusia.

---

# END OF AGENT.MD

---

# 118. SYSTEM IMPLEMENTATION — SOURCE OF TRUTH

UI/UX sudah ditetapkan pada bagian sebelumnya. Bagian ini menjadi aturan utama untuk implementasi sistem.

Gunakan arsitektur yang sederhana, aman, modular, dan mudah dirawat.

Prioritas sistem:

```text
CORRECTNESS
SECURITY
PAYMENT INTEGRITY
DATA CONSISTENCY
DOWNLOAD PROTECTION
PERFORMANCE
MAINTAINABILITY
```

Jangan membuat fitur hanya agar terlihat lengkap. Setiap fitur harus memiliki fungsi bisnis yang jelas.

---

# 119. SYSTEM ARCHITECTURE

Gunakan pola:

```text
Customer Browser
      ↓
Next.js Web
      ↓
Server Actions / Route Handlers
      ↓
Application Services
      ↓
Repositories / ORM
      ↓
PostgreSQL

Payment:
Application → Mayar
Mayar → Webhook → Application

Files:
Application → Private Object Storage
                   ↓
             Temporary Signed URL
```

Business logic penting harus berjalan di server.

Frontend hanya bertanggung jawab untuk:

- rendering UI;
- mengirim input;
- menampilkan state;
- menangani interaksi user.

Frontend tidak boleh menentukan sendiri:

- harga final;
- status pembayaran;
- hak download;
- status order;
- license validity;
- permission admin.

---

# 120. PROJECT MODULES

Struktur aplikasi:

```text
apps/
├── web/
│   ├── storefront
│   ├── checkout
│   ├── payment
│   ├── order lookup
│   └── download
│
└── admin/
    ├── dashboard
    ├── products
    ├── orders
    ├── payments
    ├── downloads
    ├── licenses
    ├── customers
    ├── categories
    ├── articles
    ├── reports
    └── settings

packages/
├── db/
├── mayar/
├── storage/
├── email/
├── security/
├── ui/
├── config/
└── types/
```

Jangan mencampurkan payment logic, storage logic, dan UI logic dalam satu file besar.

---

# 121. DOMAIN SERVICES

Gunakan service layer untuk business logic.

Minimal:

```text
ProductService
OrderService
PaymentService
MayarService
WebhookService
DownloadService
LicenseService
EmailService
AdminService
AuditService
```

Contoh:

```text
Checkout
  ↓
OrderService.create()
  ↓
PaymentService.create()
  ↓
MayarService.createPayment()
```

Webhook:

```text
Mayar webhook
  ↓
WebhookService.verify()
  ↓
PaymentService.verifyAndApply()
  ↓
DownloadService.createAccess()
  ↓
EmailService.sendDownloadEmail()
```

Service harus dapat diuji tanpa bergantung langsung pada komponen UI.

---

# 122. DATABASE SOURCE OF TRUTH

PostgreSQL adalah source of truth untuk data aplikasi.

Minimal entity:

```text
admins
products
product_files
categories
orders
order_items
payments
webhook_events
download_access
download_events
licenses
customers
articles
audit_logs
```

Gunakan foreign key, index, unique constraint, dan timestamp yang sesuai.

Jangan menyimpan state penting hanya di frontend atau localStorage.

---

# 123. PRODUCT MODEL

Product minimal memiliki:

```text
id
slug
name
short_description
description
product_type
category_id
price
currency
status
thumbnail_url
version
license_type
created_at
updated_at
published_at
```

Product status:

```text
DRAFT
PUBLISHED
ARCHIVED
```

Hanya `PUBLISHED` yang dapat dibeli customer.

Product yang diarsipkan tidak boleh muncul sebagai product baru yang dapat dibeli.

---

# 124. PRODUCT FILE MODEL

File product dipisahkan dari data product.

Minimal:

```text
id
product_id
storage_key
original_name
mime_type
size_bytes
version
is_primary
created_at
```

File berbayar wajib berada pada private storage.

Jangan menyimpan file berbayar pada:

```text
/public
/static
public CDN URL
```

Storage key tidak boleh diekspos sebagai download URL permanen.

---

# 125. CUSTOMER WITHOUT LOGIN

Customer tidak perlu membuat akun.

Customer identity menggunakan data minimal:

```text
email
order_id
payment_reference
download_token
```

Jangan membuat customer authentication hanya untuk mengunduh file.

Jika sistem membutuhkan customer record untuk histori atau support, record tersebut dibuat berdasarkan email/order secara aman dan bukan berarti customer harus login.

---

# 126. CHECKOUT FLOW

Flow wajib:

```text
Product Detail
      ↓
Checkout
      ↓
Validate Product
      ↓
Read Server Price
      ↓
Create Local Order
      ↓
Create Mayar Payment
      ↓
Save Payment Reference
      ↓
Redirect Customer to Payment
```

Server harus membaca harga dari database.

Jangan menerima harga final dari browser.

Jika product berubah harga setelah halaman checkout dibuka, gunakan harga server saat order dibuat.

---

# 127. ORDER STATE MACHINE

Gunakan state yang eksplisit.

```text
PENDING
   ├── PAID
   ├── FAILED
   └── EXPIRED

PAID
   ↓
READY
```

Jika refund didukung:

```text
PAID / READY
      ↓
REFUNDED
```

State transition harus divalidasi di server.

Jangan memperbolehkan transisi arbitrer seperti:

```text
FAILED → PAID
```

tanpa bukti pembayaran yang valid.

---

# 128. MAYAR PAYMENT INTEGRATION

Mayar hanya boleh diintegrasikan melalui server.

Gunakan:

```text
MAYAR_API_KEY
MAYAR_WEBHOOK_SECRET
```

melalui environment variables atau secret manager.

Jangan pernah mengirim secret ke browser.

Endpoint, payload, header, signature, event type, dan response Mayar harus mengikuti dokumentasi Mayar terbaru.

Jangan mengarang format API.

Official references:

```text
https://docs.mayar.id
https://mayar.id/agents
https://mcp.mayar.id
```

Jika dokumentasi berubah, implementasi harus mengikuti dokumentasi terbaru.

---

# 129. PAYMENT CREATION

Saat membuat payment:

```text
Validate product
      ↓
Calculate server-side amount
      ↓
Create local order
      ↓
Create Mayar payment
      ↓
Save provider reference
      ↓
Return payment URL / required payment response
```

Jika Mayar gagal:

```text
Do not mark order as PAID
Do not create download access
Log failure
Return safe error
```

Jangan membuat payment dua kali karena retry browser.

Gunakan idempotency atau mekanisme deduplikasi yang sesuai dengan API Mayar dan database.

---

# 130. MAYAR WEBHOOK

Webhook endpoint:

```text
POST /api/webhooks/mayar
```

Flow:

```text
Receive raw request
      ↓
Verify webhook authenticity
      ↓
Validate event
      ↓
Extract payment reference
      ↓
Find local payment/order
      ↓
Verify payment state
      ↓
Verify amount
      ↓
Verify currency/reference when available
      ↓
Check duplicate event
      ↓
Update payment + order
      ↓
Create download access
      ↓
Create audit log
      ↓
Commit transaction
```

Webhook harus idempotent.

Retry dari Mayar tidak boleh menghasilkan:

- duplicate order state;
- duplicate download access;
- duplicate license;
- duplicate email delivery record;
- duplicate audit event yang seharusnya unik.

---

# 131. PAYMENT VERIFICATION RULE

Payment dianggap valid hanya jika seluruh informasi penting cocok.

Minimal:

```text
Provider
Reference
Payment Status
Order
Amount
Currency when available
```

Contoh:

```text
LOCAL ORDER
Rp50.000

MAYAR
Rp50.000

RESULT
VALID
```

Jika nominal berbeda:

```text
RESULT
REJECT
```

Jangan memberikan download access.

Redirect ke `/payment/success` bukan bukti pembayaran.

---

# 132. PAYMENT SUCCESS DELIVERY

Download hanya dibuat setelah payment benar-benar terverifikasi.

```text
Mayar verified
      ↓
Order = PAID
      ↓
Create Download Access
      ↓
Generate Secure Token
      ↓
Email Download Link
      ↓
Customer Download
```

Semua perubahan kritis harus dilakukan dalam transaction yang konsisten.

---

# 133. SECURE DOWNLOAD SYSTEM

Download endpoint:

```text
GET /download/[token]
```

Token harus:

- cryptographically secure;
- high entropy;
- random;
- tidak berasal dari order ID;
- tidak berasal dari email;
- memiliki expiration;
- terikat pada order;
- terikat pada product/file;
- dapat dicabut;
- memiliki download limit jika diperlukan.

Preferensi:

```text
raw token
   ↓
SHA-256/HMAC-safe hash strategy
   ↓
database
```

Jangan menyimpan raw token jika tidak diperlukan.

---

# 134. DOWNLOAD REQUEST VALIDATION

Sebelum mengirim file:

```text
Token exists?
      ↓
Not expired?
      ↓
Not revoked?
      ↓
Order exists?
      ↓
Order PAID?
      ↓
Product exists?
      ↓
File exists?
      ↓
Download limit available?
      ↓
Create download event
      ↓
Generate temporary signed URL
      ↓
Return / redirect to file
```

Jika satu pemeriksaan penting gagal, jangan berikan file.

---

# 135. TEMPORARY FILE ACCESS

Jangan memberikan public permanent URL.

Gunakan:

```text
Private Storage
      ↓
Server Authorization
      ↓
Short-lived Signed URL
      ↓
Customer
```

Signed URL harus memiliki expiration pendek dan hanya dibuat setelah authorization berhasil.

---

# 136. DOWNLOAD LIMIT

Jika product memiliki batas download:

```text
download_count < max_downloads
```

Setelah download valid:

```text
download_count += 1
last_download_at = now()
```

Gunakan transaction/atomic update untuk mencegah race condition.

Jangan menganggap page load sebagai download selesai.

Bedakan:

```text
DOWNLOAD_STARTED
DOWNLOAD_COMPLETED
```

jika infrastruktur memungkinkan pelacakan tersebut.

---

# 137. ORDER LOOKUP WITHOUT LOGIN

Customer dapat mengecek order tanpa login.

Minimal:

```text
Order ID + Email
```

Server harus melakukan rate limiting dan response yang tidak mempermudah enumeration.

Jangan mengungkap detail order hanya berdasarkan order ID.

Jangan menampilkan data customer lain.

---

# 138. EMAIL DELIVERY

Setelah payment verified:

```text
Payment PAID
      ↓
Download Access Created
      ↓
Send Transactional Email
```

Email dapat berisi:

```text
Order ID
Product Name
Payment Status
Download Link
License Key when applicable
Support Information
```

Jangan mengirim secret internal.

Email failure tidak boleh membatalkan payment yang sudah valid.

Simpan delivery status dan sediakan mekanisme resend yang aman.

---

# 139. LICENSE SYSTEM

Jika product menggunakan license:

```text
PAID
 ↓
CREATE LICENSE
 ↓
STORE LICENSE
 ↓
DELIVER LICENSE
```

License harus terkait dengan:

```text
order_id
product_id
```

Jika license dapat dicabut:

```text
ACTIVE
  ↓
REVOKED
```

Jangan membuat license baru setiap webhook retry.

---

# 140. ADMIN AUTHORIZATION

Admin wajib authenticated.

Gunakan role-based access control.

Contoh role:

```text
SUPER_ADMIN
ADMIN
EDITOR
SUPPORT
FINANCE
```

Permission harus server-side.

Contoh:

```text
PRODUCT_CREATE
PRODUCT_UPDATE
PRODUCT_DELETE
ORDER_VIEW
PAYMENT_VIEW
PAYMENT_MANUAL_CONFIRM
DOWNLOAD_REVOKE
LICENSE_REVOKE
ADMIN_MANAGE
SETTINGS_MANAGE
```

Jangan mengandalkan hidden button sebagai authorization.

---

# 141. ADMIN DASHBOARD DATA

Dashboard mengambil data aktual dari database.

Metric minimal:

```text
Total Revenue
Total Orders
Successful Payments
Pending Payments
Products
Downloads
```

Dashboard tidak boleh menggunakan data dummy pada production.

Untuk analytics:

```text
Database Query
      ↓
Server Aggregation
      ↓
Validated DTO
      ↓
Dashboard UI
```

Gunakan pagination untuk tabel besar.

---

# 142. ADMIN PRODUCT MANAGEMENT

Admin dapat:

```text
Create Product
Edit Product
Upload Product File
Replace Product File
Set Price
Set Category
Set Version
Set License
Publish
Unpublish
Archive
```

Publishing validation:

```text
Name exists
Price valid
Category valid
Product description exists when required
Product file exists
File is accessible from private storage
```

Product tidak boleh published jika file wajib belum tersedia.

---

# 143. FILE UPLOAD SYSTEM

Upload harus melalui server atau controlled upload mechanism.

Validasi:

```text
File size
MIME type
Extension
Storage destination
Product ownership
Upload permission
```

Gunakan unique storage key.

Jangan menggunakan nama file user sebagai storage key utama.

Contoh:

```text
products/{productId}/{uuid}/file.zip
```

Simpan metadata file di database.

---

# 144. API DESIGN

Gunakan API hanya jika memang diperlukan.

Route examples:

```text
/api/products
/api/products/[slug]
/api/orders
/api/orders/[id]
/api/orders/[id]/status
/api/payment
/api/download/[token]
/api/orders/[id]/resend-download
/api/webhooks/mayar
```

Admin API harus membutuhkan authorization.

Public endpoint harus rate limited jika dapat disalahgunakan.

Response jangan membocorkan internal database structure.

---

# 145. VALIDATION

Gunakan Zod untuk input boundary.

Validasi pada:

```text
API input
Server Action input
Admin forms
Checkout
Order lookup
Product creation
File metadata
Webhook payload after authenticity verification
```

Validation harus dilakukan server-side meskipun frontend sudah melakukan validation.

---

# 146. ERROR HANDLING

Gunakan typed application errors.

Contoh:

```text
PRODUCT_NOT_FOUND
ORDER_NOT_FOUND
INVALID_INPUT
PAYMENT_PENDING
PAYMENT_FAILED
PAYMENT_VERIFICATION_FAILED
DOWNLOAD_EXPIRED
DOWNLOAD_REVOKED
DOWNLOAD_LIMIT_REACHED
FILE_NOT_FOUND
UNAUTHORIZED
FORBIDDEN
RATE_LIMITED
INTERNAL_ERROR
```

Customer mendapatkan pesan aman.

Server log menyimpan detail teknis yang diperlukan.

Jangan menampilkan:

```text
stack trace
SQL query
API key
secret
storage path
internal exception
```

---

# 147. TRANSACTION INTEGRITY

Gunakan database transaction untuk operasi yang harus atomik.

Contoh payment:

```text
BEGIN
 ↓
lock payment/order when required
 ↓
verify current state
 ↓
update payment
 ↓
update order
 ↓
create download access
 ↓
create license if required
 ↓
create audit log
 ↓
COMMIT
```

Jika gagal:

```text
ROLLBACK
```

Perhatikan race condition antara webhook, retry, dan admin action.

---

# 148. CONCURRENCY AND IDEMPOTENCY

Sistem harus aman terhadap:

- double click checkout;
- refresh payment page;
- duplicate webhook;
- webhook retry;
- simultaneous download;
- admin retry;
- email resend retry.

Gunakan kombinasi:

```text
unique constraints
idempotency keys
database transaction
row locking when required
atomic updates
```

Jangan mengandalkan JavaScript frontend untuk mencegah duplicate operation.

---

# 149. RATE LIMITING

Rate limit endpoint yang sensitif:

```text
/api/orders
/api/payment
/api/orders/[id]/status
/api/orders/[id]/resend-download
/api/download/[token]
/api/webhooks/mayar
order lookup
admin authentication
```

Rate limit harus mempertimbangkan legitimate traffic.

Webhook retry dari Mayar tidak boleh rusak hanya karena rate limiting yang salah konfigurasi.

---

# 150. SECURITY BASELINE

Wajib:

```text
HTTPS
Secure Headers
CSP where appropriate
Input Validation
Output Encoding
SQL Injection Protection
XSS Protection
CSRF Protection where applicable
Rate Limiting
Secure Cookies
Secret Management
Private Storage
Webhook Verification
Server-side Authorization
Audit Logging
```

Secret hanya berada di server.

Environment variables wajib digunakan untuk secret.

Jangan commit `.env` berisi secret.

---

# 151. OBSERVABILITY

Sediakan:

```text
structured logs
request ID / correlation ID
payment logs
webhook logs
download logs
admin audit logs
error monitoring
health check
```

Jangan log:

```text
API secrets
webhook secrets
raw download tokens
passwords
sensitive payment data
```

Log harus cukup untuk melakukan debugging tanpa membocorkan rahasia.

---

# 152. BACKGROUND JOBS

Gunakan background jobs bila proses tidak perlu menahan request utama.

Contoh:

```text
Send Email
Retry Email
Cleanup Expired Tokens
Generate Reports
Webhook Retry Processing
Storage Cleanup
```

Jangan membuat user menunggu proses email jika payment sudah berhasil.

Namun download access yang dibutuhkan customer harus tersedia secara konsisten sebelum sistem menyatakan delivery siap.

---

# 153. CACHE RULES

Cache boleh digunakan untuk data yang aman di-cache:

```text
published product catalog
categories
articles
static configuration
```

Jangan cache secara public:

```text
private order data
payment state
download authorization
admin data
license secrets
```

Payment status yang sensitif harus berasal dari source of truth yang sesuai.

---

# 154. PERFORMANCE

Prioritas:

```text
Fast initial page load
Optimized images
Lazy loading where appropriate
Pagination
Database indexes
Efficient queries
Server-side rendering where useful
Avoid unnecessary client JavaScript
```

Jangan mengambil seluruh orders/downloads hanya untuk menampilkan 10 item.

Gunakan query dengan limit/pagination.

---

# 155. DATABASE INDEXES

Index minimal yang perlu dipertimbangkan:

```text
products.slug
products.status
products.category_id
orders.order_number
orders.email
orders.status
payments.provider_reference
payments.status
webhook_events.event_id
webhook_events.payload_hash
download_access.token_hash
download_access.order_id
download_access.expires_at
licenses.order_id
licenses.product_id
```

Gunakan unique index jika domain mengharuskannya.

---

# 156. REFUND / REVOCATION

Jika payment direfund atau akses dibatalkan:

```text
REFUNDED
   ↓
Revoke Download Access when business rule requires
   ↓
Revoke License when applicable
   ↓
Audit Log
```

Jangan menghapus histori transaksi.

Gunakan status/revocation agar histori tetap tersedia untuk audit.

---

# 157. ADMIN MANUAL PAYMENT

Manual confirmation hanya untuk role yang memiliki permission khusus.

Wajib:

```text
admin identity
order
reason
old status
new status
timestamp
```

Manual confirmation tidak boleh menjadi shortcut untuk melewati security checks.

Jika tersedia, tetap simpan bukti atau referensi verifikasi yang relevan.

---

# 158. DATA PRIVACY

Kumpulkan data seminimal mungkin.

Customer minimal:

```text
email
order information
payment reference
download activity
```

Jangan meminta:

```text
password
identity document
unnecessary profile data
```

kecuali benar-benar diperlukan oleh kebutuhan bisnis/legal dan dijelaskan dengan jelas.

---

# 159. FRONTEND/BACKEND TRUST BOUNDARY

Anggap semua data dari browser sebagai untrusted input.

Termasuk:

```text
price
product ID
order ID
email
payment status
download token
admin action
```

Semua keputusan keamanan harus dibuat server-side.

---

# 160. TESTING REQUIREMENTS

Minimum test coverage:

```text
Unit Tests
Integration Tests
Webhook Tests
Payment Verification Tests
Download Authorization Tests
Security Tests
E2E Tests
```

Test wajib:

```text
Wrong amount → rejected
Wrong payment reference → rejected
Unverified payment → no download
Duplicate webhook → no duplicate access
Expired token → denied
Revoked token → denied
Exceeded download limit → denied
Invalid order lookup → safe response
Unauthorized admin action → denied
Mayar failure → payment not marked PAID
```

---

# 161. E2E CUSTOMER FLOW

Test end-to-end:

```text
Browse Product
 ↓
Product Detail
 ↓
Checkout
 ↓
Create Order
 ↓
Create Mayar Payment
 ↓
Payment
 ↓
Webhook Verification
 ↓
Order PAID
 ↓
Download Access
 ↓
Email
 ↓
Download
```

Customer tidak boleh diminta login pada flow normal.

---

# 162. E2E ADMIN FLOW

Test:

```text
Admin Login
 ↓
Dashboard
 ↓
Create Product
 ↓
Upload File
 ↓
Set Price
 ↓
Publish
 ↓
View Order
 ↓
View Payment
 ↓
View Download Activity
 ↓
Manage License
 ↓
Audit Log
```

Permission harus diuji untuk setiap role.

---

# 163. DEPLOYMENT ENVIRONMENT

Environment minimal:

```text
development
staging
production
```

Secret berbeda untuk setiap environment.

Production tidak boleh menggunakan:

```text
dummy payment credentials
test storage credentials
local file paths
hardcoded secrets
```

Database migration harus dijalankan secara terkontrol.

---

# 164. ENVIRONMENT VARIABLES

Contoh kategori configuration:

```text
DATABASE_URL
MAYAR_API_KEY
MAYAR_WEBHOOK_SECRET
STORAGE_ENDPOINT
STORAGE_BUCKET
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY
EMAIL_API_KEY
APP_URL
```

Nama environment variable dapat disesuaikan dengan provider yang dipilih.

Jangan hardcode secret di source code.

---

# 165. DEVELOPMENT RULES FOR AGENT

Saat mengubah sistem:

```text
READ EXISTING CODE
      ↓
UNDERSTAND ARCHITECTURE
      ↓
IDENTIFY DEPENDENCIES
      ↓
PLAN CHANGE
      ↓
IMPLEMENT
      ↓
RUN TYPECHECK
      ↓
RUN LINT
      ↓
RUN TESTS
      ↓
VERIFY RESULT
```

Jangan menghapus sistem lama hanya karena terlihat lebih mudah.

Pertahankan behavior yang sudah benar.

---

# 166. AGENT CODE MODIFICATION RULE

Sebelum mengubah file:

1. Baca file terkait.
2. Cari dependency/import yang terdampak.
3. Pahami database schema terkait.
4. Pahami route/service terkait.
5. Ubah bagian paling kecil yang diperlukan.
6. Jalankan validation.
7. Periksa regression.

Jangan melakukan rewrite besar tanpa alasan teknis yang jelas.

---

# 167. NO MOCK IN PRODUCTION

Mock atau dummy data hanya boleh digunakan untuk:

```text
development
storybook
design preview
test
```

Production harus menggunakan data aktual.

Jangan membuat:

```text
fake payment success
fake download success
fake order status
fake revenue
```

untuk menutupi sistem yang belum selesai.

---

# 168. DEFINITION OF SYSTEM DONE

Sistem dianggap selesai apabila:

```text
[ ] Product catalog bekerja
[ ] Product detail bekerja
[ ] Checkout bekerja
[ ] Local order dibuat sebelum payment
[ ] Mayar payment integration bekerja
[ ] Webhook verification bekerja
[ ] Amount verification bekerja
[ ] Idempotency bekerja
[ ] Payment state machine bekerja
[ ] Private storage bekerja
[ ] Secure download token bekerja
[ ] Token expiration bekerja
[ ] Download authorization bekerja
[ ] Download limit bekerja jika diaktifkan
[ ] Email delivery bekerja
[ ] Order lookup tanpa login bekerja
[ ] Admin authentication bekerja
[ ] Admin authorization bekerja
[ ] Product management bekerja
[ ] Payment management bekerja
[ ] Download monitoring bekerja
[ ] License management bekerja jika diperlukan
[ ] Audit log bekerja
[ ] Rate limiting bekerja
[ ] Error handling bekerja
[ ] Logging dan monitoring tersedia
[ ] Database backup tersedia
[ ] Tests lulus
[ ] Typecheck lulus
[ ] Lint lulus
[ ] Production secrets aman
[ ] Tidak ada payment/download shortcut
```

---

# 169. FINAL SYSTEM PRINCIPLE

Sistem harus selalu mengikuti prinsip:

```text
USER INPUT
   ↓
VALIDATE
   ↓
SERVER DECISION
   ↓
DATABASE / PROVIDER VERIFICATION
   ↓
AUTHORIZED ACTION
   ↓
VERIFY RESULT
   ↓
RESPOND
```

Untuk payment:

```text
MAYAR VERIFICATION > FRONTEND STATUS
```

Untuk harga:

```text
DATABASE PRICE > FRONTEND PRICE
```

Untuk download:

```text
VERIFIED PAYMENT + VALID ACCESS > URL KNOWLEDGE
```

Untuk admin:

```text
SERVER AUTHORIZATION > UI VISIBILITY
```

Untuk sistem secara keseluruhan:

```text
DO NOT GUESS.
DO NOT TRUST THE CLIENT.
DO NOT CLAIM SUCCESS WITHOUT VERIFICATION.
DO NOT EXPOSE PRIVATE FILES.
DO NOT BYPASS PAYMENT VERIFICATION.
```

UI/UX membuat platform terlihat profesional.

Sistem membuat platform dapat dipercaya.

Keduanya harus berjalan sebagai satu produk yang konsisten.

---

# END OF AGENT.MD
