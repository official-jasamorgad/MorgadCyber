# Backend

Folder ini menjadi batas ownership untuk server, database, storage, dan integrasi eksternal.

## Backend utama

- `../apps/web/src/app/api/`: API storefront Next.js.
- `../apps/admin/src/app/api/`: API admin Next.js.
- `../packages/db/`: schema, client, dan seed PostgreSQL.
- `../packages/mayar/`: payment gateway dan webhook.
- `../packages/security/`: session, password, token, dan rate limit.

## Legacy backend

`server.py`, `db.py`, dan `mayar.py` masih berada di root karena server Python legacy dan test mengimpornya langsung. File-file ini adalah compatibility runtime untuk port 8000.

Target migrasi berikutnya:

1. Pindahkan modul legacy ke `backend/legacy/`.
2. Tambahkan entrypoint compatibility root jika diperlukan.
3. Perbarui import dan test secara bertahap.
4. Hapus compatibility layer hanya setelah endpoint legacy tidak lagi dipakai.
