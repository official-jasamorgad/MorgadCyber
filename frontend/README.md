# Frontend

Folder ini menjadi batas ownership untuk seluruh antarmuka pengguna.

## Aplikasi utama

- `../apps/web/`: storefront Next.js customer.
- `../apps/admin/`: dashboard admin Next.js.
- `pages/`: halaman Support dan Company dari footer storefront.

## Legacy storefront

File HTML legacy saat ini masih berada di root (`index.html`, `categories.html`, `admin.html`, dan halaman pendukung) karena `server.py`, test, dan asset relatif masih menggunakannya. Console admin legacy hanya dirutekan melalui `/MorgadAdmin`; `/admin` dan akses langsung ke file admin diblokir.

Target migrasi berikutnya:

1. Pindahkan halaman legacy ke `frontend/legacy/`.
2. Pindahkan asset legacy ke `frontend/legacy/assets/`.
3. Ubah `server.py` memakai static root baru.
4. Jalankan seluruh test dan cek semua URL sebelum menghapus compatibility root.
