#!/usr/bin/env python3
"""Export and bulk-update product Google Drive IDs in Morgad's SQLite database."""

import argparse
import csv
import sqlite3
import sys
from pathlib import Path

import db


CSV_PATH = Path(__file__).resolve().with_name("produk_morgad.csv")
CSV_COLUMNS = ("id", "nama", "google_drive_id")


def export_products(csv_path=CSV_PATH):
    """Write every product's ID, name, and Google Drive ID to a CSV file."""
    conn = db.get_db()
    try:
        rows = conn.execute(
            "SELECT id, name, google_drive_id FROM products ORDER BY id"
        ).fetchall()
    except sqlite3.Error as error:
        raise RuntimeError(f"Tidak dapat membaca daftar produk: {error}") from error
    finally:
        conn.close()

    with open(csv_path, "w", newline="", encoding="utf-8-sig") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        for row in rows:
            writer.writerow({
                "id": row["id"],
                "nama": row["name"],
                "google_drive_id": row["google_drive_id"] or "",
            })

    return len(rows)


def import_products(csv_path=CSV_PATH):
    """Update Drive IDs for existing products atomically from a CSV file."""
    with open(csv_path, "r", newline="", encoding="utf-8-sig") as csv_file:
        reader = csv.DictReader(csv_file)
        if reader.fieldnames is None or set(reader.fieldnames) != set(CSV_COLUMNS):
            raise ValueError(
                "Header CSV harus berisi kolom: id,nama,google_drive_id."
            )

        updates = []
        seen_ids = set()
        for line_number, row in enumerate(reader, start=2):
            product_id = (row.get("id") or "").strip()
            if not product_id:
                raise ValueError(f"ID produk kosong pada baris {line_number}.")
            if product_id in seen_ids:
                raise ValueError(f"ID produk duplikat '{product_id}' pada baris {line_number}.")
            if None in row:
                raise ValueError(f"Jumlah kolom tidak sesuai pada baris {line_number}.")

            drive_id = (row.get("google_drive_id") or "").strip() or None
            updates.append((drive_id, product_id))
            seen_ids.add(product_id)

    if not updates:
        raise ValueError("CSV tidak berisi baris produk untuk diimpor.")

    conn = db.get_db()
    try:
        known_ids = {
            row["id"]
            for row in conn.execute("SELECT id FROM products").fetchall()
        }
        unknown_ids = sorted(seen_ids - known_ids)
        if unknown_ids:
            preview = ", ".join(unknown_ids[:10])
            suffix = " ..." if len(unknown_ids) > 10 else ""
            raise ValueError(f"ID produk tidak ditemukan: {preview}{suffix}")
        missing_ids = sorted(known_ids - seen_ids)
        if missing_ids:
            raise ValueError(
                f"CSV belum mencakup seluruh produk: {len(missing_ids)} ID tidak ada. "
                "Ekspor ulang CSV sebelum mengimpor."
            )

        with conn:
            conn.executemany(
                "UPDATE products SET google_drive_id = ? WHERE id = ?",
                updates,
            )
    except sqlite3.Error as error:
        raise RuntimeError(f"Pembaruan database gagal dan dibatalkan: {error}") from error
    finally:
        conn.close()

    return len(updates)


def main():
    """Parse the requested operation and report its result."""
    parser = argparse.ArgumentParser(
        description="Kelola google_drive_id produk Morgad melalui CSV."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    export_parser = subparsers.add_parser("export", help="Ekspor semua produk ke CSV.")
    export_parser.add_argument("--csv", type=Path, default=CSV_PATH, help="Lokasi CSV.")
    import_parser = subparsers.add_parser("import", help="Impor CSV dan perbarui Drive ID.")
    import_parser.add_argument("--csv", type=Path, default=CSV_PATH, help="Lokasi CSV.")
    args = parser.parse_args()

    try:
        if args.command == "export":
            count = export_products(args.csv)
            print(f"Berhasil mengekspor {count} produk ke {args.csv}.")
        else:
            count = import_products(args.csv)
            print(f"Berhasil memperbarui google_drive_id untuk {count} produk.")
    except (OSError, RuntimeError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())