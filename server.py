#!/usr/bin/env python3
"""
Digital Product Platform Server (AGENT.md Compliant).
Serves:
1. Frontend static assets (Marketplace storefront & Admin Console)
2. Secure REST API for products, orders, checkout, Mayar webhooks, and private file downloads.
"""
import http.server
import socketserver
import os
import sys
import json
import hmac
import math
import re
import secrets
import sqlite3
import threading
import time
import urllib.parse
import uuid
from datetime import datetime, timedelta, timezone
from email import policy
from email.parser import BytesParser
from html.parser import HTMLParser
from email.message import Message
import requests
import db
import mayar

PORT = int(os.environ.get("PORT", "8000"))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
DOWNLOAD_TOKEN_TTL_SECONDS = 900
DOWNLOAD_TOKENS = {}
DOWNLOAD_TOKENS_LOCK = threading.Lock()
MAX_PRODUCT_UPLOAD_BYTES = 250 * 1024 * 1024
PRODUCT_UPLOAD_LOCK = threading.Lock()
MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024
SIMULATED_PAYMENTS = {}
SIMULATED_DOWNLOAD_TOKENS = {}
DEFAULT_PRODUCT_IMAGE = "/assets/img/logo.png"


def ensure_required_product_seed():
    """Create the exact product schema expected by the storefront and seed demo data only when the catalog is empty."""
    conn = db.get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT,
                slug TEXT,
                price REAL,
                category TEXT,
                google_drive_id TEXT,
                image_path TEXT,
                is_published INTEGER DEFAULT 1
            );
        """)

        product_columns = {row["name"] for row in cursor.execute("PRAGMA table_info(products)").fetchall()}
        for column_name, column_sql in {
            "description": "TEXT",
            "slug": "TEXT",
            "price": "REAL",
            "category": "TEXT",
            "google_drive_id": "TEXT",
            "image_path": "TEXT",
            "is_published": "INTEGER DEFAULT 1",
            "status": "TEXT DEFAULT 'published'",
            "currency": "TEXT DEFAULT 'IDR'",
            "file_path": "TEXT",
            "stock_quantity": "INTEGER DEFAULT 50",
            "file_size": "TEXT",
            "version": "TEXT DEFAULT '1.0.0'",
            "max_downloads": "INTEGER DEFAULT 5",
            "created_at": "TEXT",
            "updated_at": "TEXT",
        }.items():
            if column_name not in product_columns:
                cursor.execute(f"ALTER TABLE products ADD COLUMN {column_name} {column_sql}")

        product_count = cursor.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        if product_count == 0:
            cursor.execute("""
                INSERT INTO products (
                    id, name, slug, price, category, google_drive_id, image_path, is_published,
                    status, currency, file_path, stock_quantity, file_size, version, max_downloads, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "prod-1",
                "autocad dile",
                "autocad-dile",
                10,
                "ARSITEK TOOLS",
                "1IubrS3C-p_nZNv1iCFV2vFrfVA5vq3Xa",
                DEFAULT_PRODUCT_IMAGE,
                1,
                "published",
                "IDR",
                "google-drive://1IubrS3C-p_nZNv1iCFV2vFrfVA5vq3Xa",
                50,
                "Google Drive",
                "1.0.0",
                5,
                datetime.now(timezone.utc).isoformat(),
                datetime.now(timezone.utc).isoformat(),
            ))
            print("Default product seeded: autocad dile")

        cursor.execute("UPDATE products SET stock_quantity = 50 WHERE stock_quantity IS NULL OR stock_quantity <= 0")
        cursor.execute("UPDATE products SET image_path = ? WHERE image_path IS NULL OR TRIM(image_path) = ''", (DEFAULT_PRODUCT_IMAGE,))
        cursor.execute("UPDATE products SET status = 'published' WHERE status IS NULL OR TRIM(status) = ''")
        cursor.execute("UPDATE products SET is_published = 1 WHERE is_published IS NULL OR is_published = 0")
        conn.commit()
    finally:
        conn.close()


def resolve_product_image_url(image_path=None, product_id=None):
    candidate = (image_path or "").strip()
    if not candidate:
        candidate = DEFAULT_PRODUCT_IMAGE
    if candidate.startswith("http://") or candidate.startswith("https://"):
        return candidate
    if not candidate.startswith("/"):
        candidate = "/" + candidate

    if product_id:
        for extension in (".png", ".jpg", ".jpeg", ".webp"):
            upload_candidate = f"/assets/uploads/products/{product_id}{extension}"
            upload_file = os.path.join(DIRECTORY, upload_candidate.lstrip("/"))
            if os.path.exists(upload_file):
                return upload_candidate

    local_file = os.path.join(DIRECTORY, candidate.lstrip("/"))
    if os.path.exists(local_file):
        return candidate

    return DEFAULT_PRODUCT_IMAGE


def build_mock_payment_detail(product_name, price, customer_email, invoice_id):
    return (
        f"DOKU_CHECKOUT|product={product_name}|amount={float(price):.0f}|"
        f"email={customer_email}|invoice={invoice_id}|channel=QRIS"
    )


def product_image_extension(upload):
    content = upload['content']
    content_type = upload['content_type'].lower()
    signatures = {
        'image/jpeg': (b'\xff\xd8\xff', '.jpg'),
        'image/png': (b'\x89PNG\r\n\x1a\n', '.png'),
        'image/webp': (None, '.webp'),
    }
    if content_type not in signatures or not content or len(content) > MAX_PRODUCT_IMAGE_BYTES:
        return None

    signature, extension = signatures[content_type]
    if signature is not None:
        return extension if content.startswith(signature) else None
    return extension if content.startswith(b'RIFF') and content[8:12] == b'WEBP' else None


def get_private_product_file_path(file_path):
    """Resolve only ZIP files directly inside the private products directory."""
    filename = os.path.basename(str(file_path or ""))
    if not filename or not filename.lower().endswith(".zip"):
        return None

    products_dir = os.path.realpath(db.PRODUCTS_DIR)
    candidate = os.path.realpath(os.path.join(products_dir, filename))
    if os.path.commonpath((products_dir, candidate)) != products_dir:
        return None
    return candidate


class GoogleDriveConfirmationParser(HTMLParser):
    """Read the hidden confirmation fields from Drive's large-file warning form."""
    def __init__(self):
        super().__init__()
        self.action = None
        self.fields = {}
        self._inside_download_form = False

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == 'form' and attributes.get('id') == 'download-form':
            self._inside_download_form = True
            self.action = attributes.get('action')
        elif self._inside_download_form and tag == 'input' and attributes.get('type') == 'hidden':
            name = attributes.get('name')
            if name:
                self.fields[name] = attributes.get('value', '')

    def handle_endtag(self, tag):
        if tag == 'form' and self._inside_download_form:
            self._inside_download_form = False


# Ensure DB is ready and the required testing product exists.
db.init_db()
ensure_required_product_seed()
db.seed_db()

class PlatformRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format_string, *args):
        """Keep query-string tokens and email addresses out of access logs."""
        parsed_path = urllib.parse.urlparse(self.path).path
        if parsed_path in {"/download", "/generate-download"} or parsed_path.startswith("/api/download/"):
            return super().log_message("%s %s", self.command, parsed_path)
        return super().log_message(format_string, *args)

    def send_json(self, status_code: int, data: dict):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Mayar-Signature, Client-Id, Request-Id, Request-Timestamp, Signature')
        self.end_headers()
        self.wfile.write(body)

    def send_local_product_file(self, file_path, token=None):
        """Stream a validated local ZIP in bounded chunks without loading it into RAM."""
        try:
            product_path = get_private_product_file_path(file_path)
            if not product_path:
                return self.send_error(404, "Product file was not found.")
            source = open(product_path, "rb")
        except FileNotFoundError:
            return self.send_error(404, "Product file was not found.")

        filename = os.path.basename(product_path)
        file_size = os.fstat(source.fileno()).st_size
        self.send_response(200)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(file_size))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

        if token:
            with DOWNLOAD_TOKENS_LOCK:
                DOWNLOAD_TOKENS.pop(token, None)

        try:
            with source:
                while chunk := source.read(64 * 1024):
                    self.wfile.write(chunk)
        except OSError:
            self.close_connection = True

    def send_google_drive_file(self, google_drive_id, product_name):
        """Proxy a publicly shared Drive file without exposing the Drive URL as the download endpoint."""
        if not re.fullmatch(r"[A-Za-z0-9_-]{10,200}", str(google_drive_id or "")):
            return self.send_json(404, {"error": "Google Drive file is not configured."})

        session = requests.Session()
        drive_url = "https://drive.google.com/uc"
        params = {"export": "download", "id": google_drive_id}
        response = None
        response_started = False
        try:
            response = session.get(drive_url, params=params, stream=True, timeout=(10, 90), allow_redirects=True)
            confirmation = next(
                (value for name, value in response.cookies.items() if name.startswith("download_warning")),
                None,
            )
            if confirmation:
                response.close()
                params["confirm"] = confirmation
                response = session.get(drive_url, params=params, stream=True, timeout=(10, 90), allow_redirects=True)

            content_type = response.headers.get("Content-Type", "application/octet-stream")
            if response.status_code == 200 and "text/html" in content_type.lower():
                warning = bytearray()
                for part in response.iter_content(chunk_size=16 * 1024):
                    warning.extend(part)
                    if len(warning) > 1024 * 1024:
                        break
                response.close()
                parser = GoogleDriveConfirmationParser()
                parser.feed(bytes(warning).decode(response.encoding or "utf-8", errors="replace"))
                confirm_action = urllib.parse.urljoin(response.url, parser.action or "")
                confirm_host = urllib.parse.urlsplit(confirm_action).hostname
                if (parser.fields.get("id") != google_drive_id or confirm_host not in {
                    "drive.google.com", "drive.usercontent.google.com",
                }):
                    return self.send_json(502, {"error": "Google Drive meminta izin atau konfirmasi yang tidak dapat diverifikasi."})
                response = session.get(confirm_action, params=parser.fields, stream=True, timeout=(10, 90), allow_redirects=True)

            content_type = response.headers.get("Content-Type", "application/octet-stream")
            if response.status_code != 200 or response.headers.get("Content-Disposition", "").lower().startswith("attachment;") is False and "text/html" in content_type.lower():
                if response.status_code == 200 and "text/html" in content_type.lower():
                    warning = bytearray()
                    for part in response.iter_content(chunk_size=16 * 1024):
                        warning.extend(part)
                        if len(warning) > 1024 * 1024:
                            break
                    response.close()
                    return self.send_json(502, {"error": "Google Drive memerlukan konfirmasi besar-file; mohon pastikan file publik atau gunakan link yang dapat diunduh."})
                response.close()
                return self.send_json(502, {"error": "File Google Drive tidak dapat diunduh. Pastikan akses link disetel ke siapa saja yang memiliki link."})

            fallback_name = re.sub(r"[^A-Za-z0-9._-]+", "_", str(product_name or "produk")).strip("._") or "produk"
            disposition = Message()
            disposition["Content-Disposition"] = response.headers.get("Content-Disposition", "")
            drive_filename = disposition.get_filename()
            safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", os.path.basename(drive_filename)) if drive_filename else f"{fallback_name}.bin"
            if not safe_name:
                safe_name = f"{fallback_name}.bin"
            if not os.path.splitext(safe_name)[1]:
                safe_name += ".bin"
            self.send_response(200)
            self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Disposition", f'attachment; filename="{safe_name}"')
            content_length = response.headers.get("Content-Length")
            if content_length and content_length.isdigit():
                self.send_header("Content-Length", content_length)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            response_started = True
            for chunk in response.iter_content(chunk_size=64 * 1024):
                if chunk:
                    self.wfile.write(chunk)
        except requests.RequestException:
            if not response_started:
                return self.send_json(502, {"error": "Koneksi ke Google Drive gagal."})
            self.close_connection = True
        except OSError:
            self.close_connection = True
        finally:
            if response is not None:
                response.close()
            session.close()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Mayar-Signature, Client-Id, Request-Id, Request-Timestamp, Signature')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/checkout/mayar":
            reference = query.get("ref", [""])[0].strip()
            order_ref = query.get("order_id", [""])[0].strip()
            amount_text = query.get("amount", [""])[0].strip()
            if not reference or not order_ref:
                return self.send_json(400, {"error": "Referensi pembayaran dan order wajib ada."})

            try:
                callback_amount = float(amount_text) if amount_text else None
            except ValueError:
                return self.send_json(400, {"error": "Jumlah pembayaran tidak valid."})
            if callback_amount is not None and not math.isfinite(callback_amount):
                return self.send_json(400, {"error": "Jumlah pembayaran tidak valid."})

            conn = db.get_db()
            try:
                access = conn.execute("""
                    SELECT o.id, o.order_number, o.product_id, o.payment_reference,
                           o.amount, o.payment_status, p.name AS product_name,
                               p.file_path, p.google_drive_id, p.max_downloads AS product_max_downloads,
                              da.id AS access_id,
                           da.expires_at, da.download_count, da.max_downloads, da.revoked
                    FROM orders o
                    JOIN products p ON p.id = o.product_id
                    LEFT JOIN download_access da ON da.order_id = o.id
                    WHERE (o.id = ? OR o.order_number = ?)
                    LIMIT 1
                """, (order_ref, order_ref)).fetchone()

                if not access or not hmac.compare_digest(str(access["payment_reference"] or ""), reference):
                    return self.send_json(404, {"error": "Referensi order/pembayaran tidak cocok."})
                if callback_amount is not None and abs(callback_amount - float(access["amount"])) > 0.001:
                    return self.send_json(400, {"error": "Jumlah callback tidak cocok dengan order."})
                now_iso = datetime.now(timezone.utc).isoformat()
                if access["payment_status"] != "PAID":
                    local_simulation = (
                        not mayar.MAYAR_API_KEY
                        and callback_amount is not None
                        and re.fullmatch(r"MYR-TX-\d{6}-[A-F0-9]{8}", reference)
                    )
                    if not local_simulation:
                        return self.send_json(402, {"error": "Pembayaran belum terverifikasi. Token download tidak diterbitkan."})

                    conn.execute("""
                        UPDATE orders SET payment_status = 'PAID', order_status = 'COMPLETED',
                            download_status = 'READY', paid_at = ?
                        WHERE id = ? AND payment_reference = ? AND payment_status = 'PENDING'
                    """, (now_iso, access["id"], reference))
                    conn.execute("""
                        UPDATE payments SET status = 'PAID', payment_channel = 'LOCAL_SIMULATION', paid_at = ?
                        WHERE order_id = ? AND provider_reference = ?
                    """, (now_iso, access["id"], reference))
                    conn.commit()
                    access = dict(access)
                    access["payment_status"] = "PAID"
                    access["access_id"] = None

                if access["revoked"]:
                    return self.send_json(403, {"error": "Hak download order ini sudah dicabut."})

                if access["access_id"]:
                    access_expiry = datetime.fromisoformat(access["expires_at"])
                    if access_expiry.tzinfo is None:
                        access_expiry = access_expiry.replace(tzinfo=timezone.utc)
                    if datetime.now(timezone.utc) > access_expiry:
                        return self.send_json(410, {"error": "Hak download order ini sudah kedaluwarsa."})
                if access["access_id"] and access["download_count"] >= access["max_downloads"]:
                    return self.send_json(403, {"error": "Kuota download order ini sudah habis."})

                if not access["google_drive_id"]:
                    local_file = get_private_product_file_path(access["file_path"])
                    if not local_file or not os.path.isfile(local_file):
                        return self.send_json(404, {"error": "File produk tidak tersedia di penyimpanan lokal maupun Google Drive."})

                token = "cb_" + secrets.token_urlsafe(32)
                token_expiry = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
                token_hash = mayar.hash_token(token)
                if access["access_id"]:
                    conn.execute("""
                        UPDATE download_access SET token_hash = ?, callback_token_expires_at = ?
                        WHERE id = ?
                    """, (token_hash, token_expiry, access["access_id"]))
                else:
                    access_id = str(uuid.uuid4())
                    order_expiry = (datetime.now(timezone.utc) + timedelta(days=mayar.DOWNLOAD_TOKEN_EXPIRY_DAYS)).isoformat()
                    conn.execute("""
                        INSERT INTO download_access (
                            id, order_id, product_id, token_hash, expires_at, download_count,
                            max_downloads, revoked, created_at, callback_token_expires_at
                        ) VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?, ?)
                      """, (access_id, access["id"], access["product_id"], token_hash,
                          order_expiry, access["max_downloads"] or access["product_max_downloads"] or 5,
                          now_iso, token_expiry))
                conn.commit()
            finally:
                conn.close()

            self.send_response(302)
            self.send_header("Location", f"/api/download/{urllib.parse.quote(token)}")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return

        # Issue a short-lived handoff token only for the buyer's verified, paid order.
        if path == "/generate-download":
            product_id = query.get("product_id", [""])[0]
            order_ref = query.get("order_id", [""])[0]
            customer_email = query.get("email", [""])[0].strip().lower()
            if not product_id or not order_ref or not customer_email:
                return self.send_json(400, {"error": "product_id, order_id, and email are required."})

            product_file_path = db.get_product_file_path(product_id)
            safe_file_path = get_private_product_file_path(product_file_path)
            if not safe_file_path or not os.path.isfile(safe_file_path):
                return self.send_json(404, {"error": "Local product ZIP was not found."})

            conn = db.get_db()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT o.id, o.product_id, o.customer_email, o.payment_status,
                       da.expires_at, da.download_count, da.max_downloads, da.revoked
                FROM orders o
                JOIN download_access da ON da.order_id = o.id
                WHERE (o.id = ? OR o.order_number = ?) AND o.product_id = ?
            """, (order_ref, order_ref, product_id))
            order = cursor.fetchone()
            conn.close()

            if (not order or order["payment_status"] != "PAID"
                    or order["customer_email"].lower() != customer_email):
                return self.send_json(403, {"error": "Paid order could not be verified."})

            access_expiry = datetime.fromisoformat(order["expires_at"])
            if access_expiry.tzinfo is None:
                access_expiry = access_expiry.replace(tzinfo=timezone.utc)
            if order["revoked"] or datetime.now(timezone.utc) > access_expiry:
                return self.send_json(403, {"error": "Download access is revoked or expired."})
            if order["download_count"] >= order["max_downloads"]:
                return self.send_json(403, {"error": "Download limit reached."})

            now = time.time()
            token = secrets.token_urlsafe(32)
            with DOWNLOAD_TOKENS_LOCK:
                for expired_token in [
                    key for key, value in DOWNLOAD_TOKENS.items()
                    if value["expires_at"] <= now
                ]:
                    del DOWNLOAD_TOKENS[expired_token]
                DOWNLOAD_TOKENS[token] = {
                    "product_id": product_id,
                    "order_id": order["id"],
                    "file_path": safe_file_path,
                    "expires_at": now + DOWNLOAD_TOKEN_TTL_SECONDS,
                    "claimed": False,
                }

            return self.send_json(200, {
                "status": "success",
                "download_url": f"/download?token={urllib.parse.quote(token)}",
                "expires_in": DOWNLOAD_TOKEN_TTL_SECONDS,
            })

        # Stream the local product file associated with a short-lived handoff token.
        if path == "/download":
            token = query.get("token", [""])[0]
            now = time.time()
            with DOWNLOAD_TOKENS_LOCK:
                token_data = DOWNLOAD_TOKENS.get(token)
                if not token_data or token_data["expires_at"] <= now or token_data["claimed"]:
                    DOWNLOAD_TOKENS.pop(token, None)
                    return self.send_error(403, "Invalid or expired download token.")
                token_data["claimed"] = True

            try:
                conn = db.get_db()
                conn.execute("BEGIN IMMEDIATE")
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT o.product_id, o.payment_status, da.expires_at,
                           da.download_count, da.max_downloads, da.revoked, p.name
                    FROM orders o
                    JOIN download_access da ON da.order_id = o.id
                    JOIN products p ON p.id = o.product_id
                    WHERE o.id = ? AND o.product_id = ?
                """, (token_data["order_id"], token_data["product_id"]))
                access = cursor.fetchone()
                if not access or access["payment_status"] != "PAID":
                    conn.rollback()
                    conn.close()
                    raise ValueError("Paid order could not be verified.")

                access_expiry = datetime.fromisoformat(access["expires_at"])
                if access_expiry.tzinfo is None:
                    access_expiry = access_expiry.replace(tzinfo=timezone.utc)
                if access["revoked"] or datetime.now(timezone.utc) > access_expiry:
                    conn.rollback()
                    conn.close()
                    raise ValueError("Download access is revoked or expired.")
                if access["download_count"] >= access["max_downloads"]:
                    conn.rollback()
                    conn.close()
                    raise ValueError("Download limit reached.")

                product_file_path = db.get_product_file_path(token_data["product_id"])
                safe_file_path = get_private_product_file_path(product_file_path)
                if not safe_file_path or not os.path.isfile(safe_file_path):
                    conn.rollback()
                    conn.close()
                    with DOWNLOAD_TOKENS_LOCK:
                        DOWNLOAD_TOKENS.pop(token, None)
                    return self.send_error(404, "Product file was not found.")

                now_iso = mayar.now_iso()
                cursor.execute("""
                    UPDATE download_access
                    SET download_count = download_count + 1,
                        last_download_at = ?, last_download_ip = ?
                    WHERE order_id = ?
                """, (now_iso, self.client_address[0], token_data["order_id"]))
                cursor.execute("""
                    INSERT INTO audit_logs (id, event_type, order_id, details, ip_address, created_at)
                    VALUES (?, 'DOWNLOAD_STARTED', ?, 'Local product download started', ?, ?)
                """, (str(uuid.uuid4()), token_data["order_id"], self.client_address[0], now_iso))
                conn.commit()
                conn.close()
                return self.send_local_product_file(safe_file_path, token=token)
            except ValueError as error:
                with DOWNLOAD_TOKENS_LOCK:
                    DOWNLOAD_TOKENS.pop(token, None)
                return self.send_error(403, str(error))

        if path == "/api/check-status":
            invoice_id = query.get("invoice_id", [""])[0].strip()
            if not invoice_id:
                return self.send_json(400, {"error": "invoice_id diperlukan."})

            entry = SIMULATED_PAYMENTS.get(invoice_id)
            if not entry:
                return self.send_json(404, {"error": "Invoice tidak ditemukan."})

            token = next((token for token, value in SIMULATED_DOWNLOAD_TOKENS.items() if value.get("invoice_id") == invoice_id), None)
            payload = {
                "status": "success",
                "invoice_id": invoice_id,
                "payment_status": entry.get("status", "pending"),
                "mode": "simulation",
                "download_token": token,
                "download_url": f"/api/download/{urllib.parse.quote(token)}" if token else None,
                "product_name": entry.get("product_name"),
                "amount": entry.get("amount"),
                "currency": entry.get("currency", "IDR"),
                "google_drive_id": entry.get("google_drive_id"),
                "image_path": entry.get("image_path"),
            }
            return self.send_json(200, payload)

        if path == "/api/admin/logout":
            self.send_response(302)
            self.send_header('Location', '/MorgadAdmin')
            self.send_header('Set-Cookie', 'morgad_admin_session=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/')
            self.end_headers()
            return

        # 0. Route HTML Pages
        if path == "/categories" or path.startswith("/categories/"):
            cat_html_path = os.path.join(DIRECTORY, "categories.html")
            if os.path.exists(cat_html_path):
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                with open(cat_html_path, 'rb') as f:
                    content = f.read()
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return

        if path == "/jasa-tools":
            tools_html_path = os.path.join(DIRECTORY, "jasa-tools.html")
            if os.path.exists(tools_html_path):
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                with open(tools_html_path, 'rb') as f:
                    content = f.read()
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return

        if path == "/MorgadAdmin" or path.startswith("/MorgadAdmin/"):
            if not self.is_admin_authenticated():
                login_html_path = os.path.join(DIRECTORY, "admin-login.html")
                if os.path.exists(login_html_path):
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                    with open(login_html_path, 'rb') as f:
                        content = f.read()
                    self.send_header('Content-Length', str(len(content)))
                    self.end_headers()
                    self.wfile.write(content)
                    return
            page_name = "edit-produk.html" if path in {"/MorgadAdmin/edit-produk", "/MorgadAdmin/edit-produk.html"} else "admin.html"
            admin_html_path = os.path.join(DIRECTORY, page_name)
            if os.path.exists(admin_html_path):
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                with open(admin_html_path, 'rb') as f:
                    content = f.read()
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return

        if path in {"/admin", "/admin.html", "/admin-login.html"} or path.startswith("/admin/"):
            self.send_error(404, "Not Found")
            return

        # 1. API: List Products
        if path == "/api/admin/products":
            if not self.is_admin_authenticated():
                return self.send_json(401, {"success": False, "error": "Admin login required."})
            conn = db.get_db()
            products = [dict(row) for row in conn.execute("""
                SELECT id, name, slug, description, category, price, currency,
                      google_drive_id, file_size, version, status, image_path, stock_quantity, created_at, updated_at, cost_price
                FROM products ORDER BY created_at DESC
            """)]
            conn.close()
            for product in products:
                image_path = product.get("image_path") or ""
                normalized = resolve_product_image_url(image_path, product.get("id"))
                product["image_path"] = normalized
                product["image"] = normalized
                product["status"] = product.get("status") or "published"
                product.setdefault("cost_price", None)
            return self.send_json(200, {"success": True, "products": products})

        if path == "/api/admin/articles":
            if not self.is_admin_authenticated():
                return self.send_json(401, {"success": False, "error": "Admin login required."})
            conn = db.get_db()
            rows = [dict(row) for row in conn.execute("SELECT * FROM articles ORDER BY updated_at DESC")]
            conn.close()
            return self.send_json(200, {"success": True, "articles": rows})

        if path == "/api/articles":
            conn = db.get_db()
            slug = query.get("slug", [None])[0]
            if slug:
                row = conn.execute(
                    "SELECT * FROM articles WHERE slug = ? AND status = 'published' LIMIT 1",
                    (slug,),
                ).fetchone()
                conn.close()
                if not row:
                    return self.send_json(404, {"success": False, "error": "Artikel tidak ditemukan."})
                return self.send_json(200, {"success": True, "article": dict(row)})
            rows = [dict(row) for row in conn.execute(
                "SELECT id, slug, title, category, summary, image_url, published_at FROM articles WHERE status = 'published' ORDER BY published_at DESC, id DESC"
            )]
            conn.close()
            return self.send_json(200, {"success": True, "articles": rows})

        if path == "/api/products":
            conn = db.get_db()
            cursor = conn.cursor()
            category = query.get("category", [None])[0]
            if category:
                cursor.execute("SELECT id, name, slug, description, category, price, currency, file_size, version, image_path, stock_quantity, status, is_published FROM products WHERE category = ? AND status = 'published' AND (is_published IS NULL OR is_published = 1) AND (stock_quantity IS NULL OR stock_quantity > 0)", (category,))
            else:
                cursor.execute("SELECT id, name, slug, description, category, price, currency, file_size, version, image_path, stock_quantity, status, is_published FROM products WHERE status = 'published' AND (is_published IS NULL OR is_published = 1) AND (stock_quantity IS NULL OR stock_quantity > 0)")
            rows = [dict(r) for r in cursor.fetchall()]
            conn.close()
            for row in rows:
                image_path = row.get("image_path") or ""
                resolved = resolve_product_image_url(image_path, row.get("id"))
                row["image_path"] = resolved
                row["image"] = resolved
                row["status"] = row.get("status") or "published"
                row["is_published"] = row.get("is_published") or 1
            return self.send_json(200, {"status": "success", "products": rows})

        # 2. API: Order Status Lookup Without Login (Section 6, 7, 39)
        if path.startswith("/api/orders/") and path.endswith("/status"):
            parts = path.strip("/").split("/")
            order_ref = parts[2]
            email = query.get("email", [""])[0]

            conn = db.get_db()
            cursor = conn.cursor()
            cursor.execute("""
            SELECT o.*, p.name as product_name, da.download_count, da.max_downloads, da.expires_at, da.revoked
            FROM orders o
            JOIN products p ON o.product_id = p.id
            LEFT JOIN download_access da ON o.id = da.order_id
            WHERE o.order_number = ? OR o.id = ?
            """, (order_ref, order_ref))
            order = cursor.fetchone()
            conn.close()

            if not order:
                return self.send_json(404, {"error": "Order not found."})

            res_data = {
                "order_number": order["order_number"],
                "product_name": order["product_name"],
                "amount": order["amount"],
                "currency": order["currency"],
                "payment_status": order["payment_status"],
                "order_status": order["order_status"],
                "download_status": order["download_status"]
            }

            # Only return download token info if email matches
            if email and email.lower() == order["customer_email"].lower() and order["payment_status"] == "PAID":
                res_data["download_allowed"] = True
                res_data["download_count"] = order["download_count"]
                res_data["max_downloads"] = order["max_downloads"]
                res_data["expires_at"] = order["expires_at"]

            return self.send_json(200, {"status": "success", "order": res_data})

        # 3. API: Secure local ZIP download via the database-backed token.
        if path.startswith("/api/download/"):
            raw_token = path.split("/api/download/")[1].strip()
            client_ip = self.client_address[0] if self.client_address else "127.0.0.1"

            if raw_token in SIMULATED_DOWNLOAD_TOKENS:
                token_data = SIMULATED_DOWNLOAD_TOKENS[raw_token]
                if time.time() > token_data["expires_at"]:
                    SIMULATED_DOWNLOAD_TOKENS.pop(raw_token, None)
                    return self.send_json(410, {"error": "Download token expired."})
                if token_data.get("google_drive_id"):
                    return self.send_google_drive_file(token_data["google_drive_id"], token_data["product_name"])

            conn = db.get_db()
            token_row = conn.execute("""
                SELECT dt.token, dt.google_drive_id, p.name AS product_name, p.id AS product_id
                FROM download_tokens dt
                LEFT JOIN products p ON p.id = dt.product_id
                WHERE dt.token = ? AND dt.status = 'active'
                LIMIT 1
            """, (raw_token,)).fetchone()
            conn.close()
            if token_row and token_row["google_drive_id"]:
                return self.send_google_drive_file(token_row["google_drive_id"], token_row["product_name"] or "produk")

            try:
                claim = mayar.verify_and_claim_download(raw_token, client_ip)
                if claim.get("google_drive_id"):
                    return self.send_google_drive_file(claim["google_drive_id"], claim["product_name"])
                product_file_path = get_private_product_file_path(claim["file_path"])
                if not product_file_path or not os.path.isfile(product_file_path):
                    return self.send_error(404, "Product file was not found.")

                self.send_local_product_file(product_file_path)
                return
            except ValueError as e:
                return self.send_error(403, str(e))

        # 4. API: Admin Metrics & Live Stats
        if path == "/api/admin/stats":
            conn = db.get_db()
            cursor = conn.cursor()

            cursor.execute("SELECT COALESCE(SUM(amount), 0) as total_rev FROM orders WHERE payment_status = 'PAID'")
            total_rev = cursor.fetchone()["total_rev"]

            cursor.execute("SELECT COUNT(*) as total_orders FROM orders")
            total_orders = cursor.fetchone()["total_orders"]

            cursor.execute("SELECT COUNT(*) as paid_orders FROM orders WHERE payment_status = 'PAID'")
            paid_orders = cursor.fetchone()["paid_orders"]

            cursor.execute("SELECT COUNT(*) as total_products FROM products WHERE status = 'published'")
            total_products = cursor.fetchone()["total_products"]

            cursor.execute("""
            SELECT payment_status, COUNT(*) as count
            FROM orders
            GROUP BY payment_status
            """)
            status_dist = {r["payment_status"]: r["count"] for r in cursor.fetchall()}

            conn.close()

            return self.send_json(200, {
                "status": "success",
                "stats": {
                    "total_revenue": total_rev,
                    "total_orders": total_orders,
                    "paid_orders": paid_orders,
                    "active_products": total_products,
                    "status_breakdown": status_dist
                }
            })

        # 5. API: Admin Orders List
        if path == "/api/admin/orders":
            status_filter = query.get("status", [None])[0]
            conn = db.get_db()
            cursor = conn.cursor()

            if status_filter and status_filter.lower() != "all":
                cursor.execute("""
                SELECT o.*, p.name as product_name, da.download_count, da.max_downloads, da.revoked
                , l.license_key
                FROM orders o
                JOIN products p ON o.product_id = p.id
                LEFT JOIN download_access da ON o.id = da.order_id
                LEFT JOIN licenses l ON o.id = l.order_id
                WHERE LOWER(o.payment_status) = ?
                ORDER BY o.created_at DESC
                """, (status_filter.lower(),))
            else:
                cursor.execute("""
                SELECT o.*, p.name as product_name, da.download_count, da.max_downloads, da.revoked
                , l.license_key
                FROM orders o
                JOIN products p ON o.product_id = p.id
                LEFT JOIN download_access da ON o.id = da.order_id
                LEFT JOIN licenses l ON o.id = l.order_id
                ORDER BY o.created_at DESC
                """)

            orders = [dict(r) for r in cursor.fetchall()]
            conn.close()
            return self.send_json(200, {"status": "success", "orders": orders})

        # Fallback to Static File Serving
        return super().do_GET()

    def is_admin_authenticated(self):
        cookies = self.headers.get('Cookie', '')
        return 'morgad_admin_session=authenticated' in cookies

    def parse_multipart_form(self, raw_body):
        content_type = self.headers.get('Content-Type', '')
        message = BytesParser(policy=policy.default).parsebytes(
            b'Content-Type: ' + content_type.encode('latin-1') + b'\r\n\r\n' + raw_body
        )
        fields = {}
        uploads = {}
        for part in message.iter_parts():
            disposition = part.get('Content-Disposition', '')
            name = part.get_param('name', header='content-disposition')
            filename = part.get_param('filename', header='content-disposition')
            if not name:
                continue
            payload = part.get_payload(decode=True) or b''
            if filename:
                uploads[name] = {
                    'filename': os.path.basename(filename),
                    'content': payload,
                    'content_type': part.get_content_type(),
                }
            else:
                fields[name] = payload.decode('utf-8', errors='replace')
        return fields, uploads

    def handle_admin_product_upload(self):
        if not self.is_admin_authenticated():
            self.close_connection = True
            return self.send_json(401, {"success": False, "error": "Admin login required."})

        try:
            content_length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            content_length = 0
        if content_length <= 0:
            return self.send_json(400, {"success": False, "error": "File upload kosong atau tidak valid."})
        if content_length > MAX_PRODUCT_UPLOAD_BYTES:
            self.close_connection = True
            return self.send_json(413, {"success": False, "error": "Ukuran total upload maksimal 250 MB."})
        if not PRODUCT_UPLOAD_LOCK.acquire(blocking=False):
            self.close_connection = True
            return self.send_json(429, {"success": False, "error": "Upload lain sedang diproses. Tunggu hingga selesai sebelum mencoba lagi."})

        file_path = None
        image_file_path = None
        conn = None
        try:
            raw_body_bytes = self.rfile.read(content_length)
            if len(raw_body_bytes) != content_length:
                self.close_connection = True
                return self.send_json(400, {"success": False, "error": "Upload terputus sebelum selesai. Silakan coba lagi."})

            fields, uploads = self.parse_multipart_form(raw_body_bytes)
            title = fields.get('title', '').strip()
            category = fields.get('category', 'other').strip() or 'other'
            description = fields.get('description', '').strip()
            price = fields.get('price', '0').strip()
            google_drive_id = fields.get('google_drive_id', '').strip()
            image = uploads.get('image')
            image_extension = product_image_extension(image) if image else None
            try:
                stock_quantity = int(fields.get('stock_quantity', '0'))
            except ValueError:
                stock_quantity = -1
            if not title:
                return self.send_json(400, {"success": False, "error": "Nama produk wajib diisi."})
            if not re.fullmatch(r"[A-Za-z0-9_-]{10,200}", google_drive_id):
                return self.send_json(400, {"success": False, "error": "Google Drive File ID tidak valid. Masukkan ID, bukan seluruh URL."})
            if image is not None and image_extension is None:
                return self.send_json(400, {"success": False, "error": "Gambar produk wajib berupa JPG, PNG, atau WebP maksimal 5 MB."})
            if stock_quantity < 0 or stock_quantity > 1_000_000:
                return self.send_json(400, {"success": False, "error": "Stok harus antara 0 dan 1.000.000."})
            try:
                price_value = float(price)
            except ValueError:
                return self.send_json(400, {"success": False, "error": "Harga produk tidak valid."})
            if not math.isfinite(price_value) or price_value <= 0:
                return self.send_json(400, {"success": False, "error": "Harga produk tidak valid."})

            product_id = f"prod_{uuid.uuid4().hex[:12]}"
            file_path = f"google-drive://{google_drive_id}"
            image_path_value = DEFAULT_PRODUCT_IMAGE
            image_file_path = None
            if image is not None and image_extension:
                image_dir = os.path.join(DIRECTORY, 'assets', 'uploads', 'products')
                os.makedirs(image_dir, exist_ok=True)
                image_filename = f"{product_id}{image_extension}"
                image_file_path = os.path.join(image_dir, image_filename)
                with open(image_file_path, 'wb') as output:
                    output.write(image['content'])
                image_path_value = f"/assets/uploads/products/{image_filename}"

            now = datetime.now(timezone.utc).isoformat()
            conn = db.get_db()
            conn.execute("""
                INSERT INTO products (id, name, slug, description, category, price, currency, file_path, google_drive_id, image_path, stock_quantity, file_size, version, status, max_downloads, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, 'Google Drive', '1.0.0', 'published', ?, ?, ?)
            """, (product_id, title, product_id, description, category, price_value, file_path, google_drive_id, image_path_value, stock_quantity, 5, now, now))
            conn.commit()
            conn.close()
            conn = None
            return self.send_json(201, {"success": True, "product": {"id": product_id, "name": title, "google_drive_id": google_drive_id, "image": image_path_value}})
        except (OSError, sqlite3.Error) as error:
            if conn is not None:
                conn.rollback()
                conn.close()
                conn = None
            for path in (file_path, image_file_path):
                if path and os.path.exists(path):
                    os.remove(path)
            print(f"[Admin Product Upload] Failed: {error}")
            return self.send_json(500, {"success": False, "error": "Upload gagal disimpan. Tidak ada produk yang ditambahkan; coba lagi."})
        finally:
            if conn is not None:
                conn.close()
            PRODUCT_UPLOAD_LOCK.release()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path == "/api/admin/products" and self.headers.get('Content-Type', '').lower().startswith('multipart/form-data'):
            return self.handle_admin_product_upload()
        content_length = int(self.headers.get('Content-Length', 0))
        raw_body_bytes = self.rfile.read(content_length) if content_length > 0 else b"{}"
        raw_body = raw_body_bytes.decode('utf-8', errors='replace')
        client_ip = self.client_address[0] if self.client_address else "127.0.0.1"

        try:
            body = json.loads(raw_body)
        except Exception:
            body = {}

        if path in {"/api/admin/products", "/admin/addProduct"} and self.headers.get('Content-Type', '').lower().startswith('application/json'):
            if not self.is_admin_authenticated():
                return self.send_json(401, {"success": False, "error": "Admin login required."})
            if not isinstance(body, dict):
                return self.send_json(400, {"success": False, "error": "Data produk tidak valid."})

            action = body.get("action")
            if action == "create_product" or (not body.get("id") and body.get("name") and body.get("google_drive_id")):
                name = str(body.get("name", "")).strip()
                slug_raw = str(body.get("slug") or name).strip()
                slug = re.sub(r"-+", "-", re.sub(r"[^a-zA-Z0-9]+", "-", slug_raw)).strip("-").lower() or re.sub(r"-+", "-", re.sub(r"[^a-zA-Z0-9]+", "-", name.lower())).strip("-")
                category = str(body.get("category", "other")).strip() or "other"
                description = str(body.get("description", "")).strip()
                google_drive_id = str(body.get("google_drive_id", "")).strip()
                try:
                    price_value = float(body.get("price", 0) or 0)
                except (TypeError, ValueError):
                    return self.send_json(400, {"success": False, "error": "Harga produk tidak valid."})
                if not name or not re.fullmatch(r"[A-Za-z0-9_-]{10,200}", google_drive_id):
                    return self.send_json(400, {"success": False, "error": "Nama produk dan Google Drive File ID wajib valid."})
                if not math.isfinite(price_value) or price_value <= 0:
                    return self.send_json(400, {"success": False, "error": "Harga produk harus lebih besar dari 0."})
                try:
                    stock_quantity = int(body.get("stock_quantity", 0) or 0)
                except (TypeError, ValueError):
                    stock_quantity = 0
                if stock_quantity < 0 or stock_quantity > 1_000_000:
                    return self.send_json(400, {"success": False, "error": "Stok tidak valid."})

                product_id = f"prod_{uuid.uuid4().hex[:12]}"
                file_path = f"google-drive://{google_drive_id}"
                now = datetime.now(timezone.utc).isoformat()
                image_path = str(body.get("image_path") or DEFAULT_PRODUCT_IMAGE).strip() or DEFAULT_PRODUCT_IMAGE
                file_size = str(body.get("file_size") or "Google Drive").strip() or "Google Drive"

                conn = db.get_db()
                try:
                    cursor = conn.execute("""
                        INSERT INTO products (id, name, slug, description, category, price, currency, file_path, image_path, stock_quantity, google_drive_id, file_size, version, status, max_downloads, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, 'IDR', ?, ?, ?, ?, ?, '1.0.0', 'published', 5, ?, ?)
                    """, (product_id, name, slug, description, category, price_value, file_path, image_path, stock_quantity, google_drive_id, file_size, now, now))
                    conn.commit()
                    product = dict(conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone())
                    return self.send_json(201, {"success": True, "product": product})
                except sqlite3.IntegrityError as error:
                    conn.rollback()
                    return self.send_json(409, {"success": False, "error": f"Produk sudah ada atau slug duplikat: {error}"})
                finally:
                    conn.close()

            product_id = str(body.get("id", "")).strip()
            action = body.get("action")
            if not product_id:
                return self.send_json(400, {"success": False, "error": "ID produk wajib diisi."})
            conn = db.get_db()
            product = conn.execute("SELECT id, status FROM products WHERE id = ?", (product_id,)).fetchone()
            if not product:
                conn.close()
                return self.send_json(404, {"success": False, "error": "Produk tidak ditemukan."})

            now = datetime.now(timezone.utc).isoformat()
            if action == "update_product":
                name = str(body.get("name", "")).strip()
                slug = re.sub(r"-+", "-", re.sub(r"[^a-zA-Z0-9]+", "-", str(body.get("slug", "")).strip())).strip("-").lower()
                google_drive_id = str(body.get("google_drive_id", "")).strip()
                description = str(body.get("description", "")).strip()
                category = str(body.get("category", "")).strip()
                status = str(body.get("status", "")).strip().lower()
                try:
                    price = float(body.get("price"))
                except (TypeError, ValueError):
                    price = 0
                cost_price = body.get("cost_price")
                if cost_price is not None:
                    try:
                        cost_price = float(cost_price)
                    except (TypeError, ValueError):
                        cost_price = -1
                if not name or len(name) > 255 or not slug or len(slug) > 200 or not description or len(description) > 10_000 or not category or len(category) > 100:
                    conn.close()
                    return self.send_json(400, {"success": False, "error": "Kode, nama, kategori, dan deskripsi produk wajib valid."})
                if not re.fullmatch(r"[A-Za-z0-9_-]{10,200}", google_drive_id):
                    conn.close()
                    return self.send_json(400, {"success": False, "error": "Google Drive File ID tidak valid."})
                if not math.isfinite(price) or price <= 0 or status not in {"published", "draft", "archived"}:
                    conn.close()
                    return self.send_json(400, {"success": False, "error": "Harga atau status produk tidak valid."})
                if cost_price is not None and (not math.isfinite(cost_price) or cost_price < 0):
                    conn.close()
                    return self.send_json(400, {"success": False, "error": "Harga beli tidak valid."})
                stock_quantity = body.get("stock_quantity")
                if stock_quantity is not None:
                    try:
                        stock_quantity = int(stock_quantity)
                    except (TypeError, ValueError):
                        stock_quantity = -1
                    if stock_quantity < 0 or stock_quantity > 1_000_000:
                        conn.close()
                        return self.send_json(400, {"success": False, "error": "Stok harus antara 0 dan 1.000.000."})
                try:
                    conn.execute("UPDATE products SET name = ?, slug = ?, description = ?, category = ?, google_drive_id = ?, file_path = ?, cost_price = ?, price = ?, stock_quantity = ?, status = ?, updated_at = ? WHERE id = ?", (name, slug, description, category, google_drive_id, f"google-drive://{google_drive_id}", cost_price, price, stock_quantity, status, now, product_id))
                except sqlite3.IntegrityError:
                    conn.close()
                    return self.send_json(409, {"success": False, "error": "Kode produk sudah digunakan."})
            elif action == "update_description":
                description = str(body.get("description", "")).strip()
                if not description or len(description) > 10_000:
                    conn.close()
                    return self.send_json(400, {"success": False, "error": "Deskripsi wajib diisi (maksimal 10.000 karakter)."})
                conn.execute("UPDATE products SET description = ?, updated_at = ? WHERE id = ?", (description, now, product_id))
            elif action == "add_stock":
                try:
                    quantity = int(body.get("quantity", 0))
                except (TypeError, ValueError):
                    quantity = 0
                if quantity < 1 or quantity > 1_000_000:
                    conn.close()
                    return self.send_json(400, {"success": False, "error": "Jumlah stok harus antara 1 dan 1.000.000."})
                conn.execute("UPDATE products SET stock_quantity = COALESCE(stock_quantity, 0) + ?, updated_at = ? WHERE id = ?", (quantity, now, product_id))
            elif action == "set_stock":
                try:
                    quantity = int(body.get("quantity", -1))
                except (TypeError, ValueError):
                    quantity = -1
                if quantity < 0 or quantity > 1_000_000:
                    conn.close()
                    return self.send_json(400, {"success": False, "error": "Stok harus antara 0 dan 1.000.000."})
                conn.execute("UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?", (quantity, now, product_id))
            elif action == "delete":
                conn.execute("UPDATE products SET status = 'archived', is_published = 0, updated_at = ? WHERE id = ?", (now, product_id))
            else:
                conn.close()
                return self.send_json(400, {"success": False, "error": "Aksi produk tidak dikenal."})

            conn.commit()
            updated_product = dict(conn.execute("""
                SELECT id, name, slug, description, category, price, currency,
                        google_drive_id, file_size, version, status, image_path, stock_quantity, created_at, updated_at, cost_price
                FROM products WHERE id = ?
            """, (product_id,)).fetchone())
            conn.close()
            return self.send_json(200, {"success": True, "product": updated_product})

        if path == "/api/admin/articles":
            if not self.is_admin_authenticated():
                return self.send_json(401, {"success": False, "error": "Admin login required."})
            if not isinstance(body, dict):
                return self.send_json(400, {"success": False, "error": "Data artikel tidak valid."})

            if body.get("action") == "delete":
                try:
                    article_id = int(body.get("id"))
                except (TypeError, ValueError):
                    return self.send_json(400, {"success": False, "error": "ID artikel tidak valid."})
                conn = db.get_db()
                deleted = conn.execute("DELETE FROM articles WHERE id = ?", (article_id,)).rowcount
                conn.commit()
                conn.close()
                if not deleted:
                    return self.send_json(404, {"success": False, "error": "Artikel tidak ditemukan."})
                return self.send_json(200, {"success": True})

            title = str(body.get("title", "")).strip()
            requested_slug = str(body.get("slug", "")).strip().lower()
            slug_source = requested_slug or title.lower()
            slug = re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", slug_source)).strip("-")
            category = str(body.get("category", "Tips & Guides")).strip()
            summary = str(body.get("summary", "")).strip()
            content = str(body.get("content", "")).strip()
            image_url = str(body.get("image_url", "")).strip()
            status = str(body.get("status", "draft")).strip().lower()
            article_id = body.get("id")
            categories = {"Tips & Guides", "Inspiration", "Resources"}
            parsed_image_url = urllib.parse.urlparse(image_url)
            valid_image_url = (
                not image_url
                or (image_url.startswith("/") and not image_url.startswith("//"))
                or (parsed_image_url.scheme == "https" and bool(parsed_image_url.netloc))
            )

            if not title or len(title) > 180 or not slug or len(slug) > 200 or not content or len(content) > 100_000:
                return self.send_json(400, {"success": False, "error": "Judul, slug, dan isi artikel wajib valid."})
            if category not in categories or status not in {"draft", "published"}:
                return self.send_json(400, {"success": False, "error": "Kategori atau status artikel tidak valid."})
            if len(summary) > 500 or len(image_url) > 2048 or not valid_image_url:
                return self.send_json(400, {"success": False, "error": "Ringkasan atau URL gambar artikel tidak valid."})

            now = datetime.now(timezone.utc).isoformat()
            conn = db.get_db()
            try:
                if article_id is not None:
                    try:
                        article_id = int(article_id)
                    except (TypeError, ValueError):
                        return self.send_json(400, {"success": False, "error": "ID artikel tidak valid."})
                    existing = conn.execute("SELECT id, published_at FROM articles WHERE id = ?", (article_id,)).fetchone()
                    if not existing:
                        return self.send_json(404, {"success": False, "error": "Artikel tidak ditemukan."})
                    published_at = (existing["published_at"] or now) if status == "published" else None
                    conn.execute("""
                        UPDATE articles
                        SET slug = ?, title = ?, category = ?, summary = ?, content = ?, image_url = ?, status = ?, published_at = ?, updated_at = ?
                        WHERE id = ?
                    """, (slug, title, category, summary, content, image_url or None, status, published_at, now, article_id))
                else:
                    published_at = now if status == "published" else None
                    cursor = conn.execute("""
                        INSERT INTO articles (slug, title, category, summary, content, image_url, status, published_at, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (slug, title, category, summary, content, image_url or None, status, published_at, now, now))
                    article_id = cursor.lastrowid
                conn.commit()
                article = dict(conn.execute("SELECT * FROM articles WHERE id = ?", (article_id,)).fetchone())
            except sqlite3.IntegrityError:
                conn.rollback()
                return self.send_json(409, {"success": False, "error": "Slug artikel sudah digunakan."})
            finally:
                conn.close()
            return self.send_json(200, {"success": True, "article": article})

        # Verify and process paid DOKU notifications, then issue secure Google Drive token.
        if path in ("/webhook-doku", "/api/webhooks/doku", "/webhook-mayar"):
            order_data = body.get("order") if isinstance(body.get("order"), dict) else {}
            trans_data = body.get("transaction") if isinstance(body.get("transaction"), dict) else {}
            invoice_id = str(
                order_data.get("invoice_number")
                or body.get("invoice_id")
                or body.get("order_number")
                or body.get("order_id")
                or ""
            ).strip()

            status_raw = str(
                trans_data.get("status")
                or body.get("status")
                or body.get("event_type")
                or body.get("event")
                or "SUCCESS"
            ).strip().upper()
            is_success = status_raw in ("SUCCESS", "PAID", "COMPLETED", "SETTLED", "PAYMENT.PAID", "PAYMENT.SUCCESS")

            if (mayar.DOKU_SECRET_KEY or mayar.MAYAR_WEBHOOK_SECRET) and not mayar.verify_webhook_signature(dict(self.headers), raw_body, path):
                return self.send_json(401, {"error": "Invalid webhook signature."})

            if not is_success:
                return self.send_json(400, {"error": f"Webhook does not report a successful payment (status: {status_raw})."})

            conn = db.get_db()
            cursor = conn.cursor()
            order = cursor.execute("""
                SELECT o.*, p.name as product_name, p.google_drive_id, p.file_path, p.max_downloads as prod_max_downloads
                FROM orders o
                JOIN products p ON o.product_id = p.id
                WHERE o.order_number = ? OR o.id = ? OR o.payment_reference = ?
                LIMIT 1
            """, (invoice_id, invoice_id, invoice_id)).fetchone()

            now_iso = datetime.now(timezone.utc).isoformat()
            token = secrets.token_urlsafe(32)

            if order:
                drive_id = order["google_drive_id"]
                prod_name = order["product_name"]
                max_dl = order["prod_max_downloads"] or 5

                # 1. Update orders & payments in DB
                cursor.execute("""
                    UPDATE orders SET
                        payment_status = 'PAID',
                        order_status = 'COMPLETED',
                        download_status = 'READY',
                        paid_at = ?
                    WHERE id = ?
                """, (now_iso, order["id"]))

                cursor.execute("""
                    UPDATE payments SET
                        status = 'PAID',
                        paid_at = ?
                    WHERE order_id = ?
                """, (now_iso, order["id"]))

                # 2. Insert active download token with Google Drive ID
                cursor.execute("""
                    INSERT OR REPLACE INTO download_tokens (
                        id, token, order_id, product_id, invoice_id, google_drive_id, expires_at, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
                """, (
                    str(uuid.uuid4()),
                    token,
                    order["id"],
                    order["product_id"],
                    order["order_number"],
                    drive_id,
                    (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                    now_iso,
                ))

                # 3. Insert download access
                token_h = mayar.hash_token(token)
                cursor.execute("""
                    INSERT INTO download_access (
                        id, order_id, product_id, token_hash, expires_at, download_count, max_downloads, revoked, created_at
                    ) VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?)
                    ON CONFLICT(order_id) DO UPDATE SET
                        token_hash = excluded.token_hash,
                        expires_at = excluded.expires_at,
                        revoked = 0;
                """, (
                    str(uuid.uuid4()),
                    order["id"],
                    order["product_id"],
                    token_h,
                    (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                    max_dl,
                    now_iso,
                ))
                conn.commit()

                try:
                    mayar.process_mayar_webhook(body, client_ip)
                except Exception as ex:
                    print(f"[Webhook Audit Note] {ex}")

            elif invoice_id and invoice_id in SIMULATED_PAYMENTS:
                entry = SIMULATED_PAYMENTS[invoice_id]
                entry["status"] = "success"
                entry["paid_at"] = now_iso
                drive_id = entry.get("google_drive_id")
                prod_name = entry.get("product_name")

                cursor.execute("""
                    INSERT OR REPLACE INTO download_tokens (
                        id, token, order_id, product_id, invoice_id, google_drive_id, expires_at, status, created_at
                    ) VALUES (?, ?, NULL, ?, ?, ?, ?, 'active', ?)
                """, (
                    str(uuid.uuid4()),
                    token,
                    entry.get("product_id"),
                    invoice_id,
                    drive_id,
                    (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                    now_iso,
                ))
                conn.commit()
            else:
                conn.close()
                return self.send_json(404, {"error": f"Invoice '{invoice_id}' tidak ditemukan di database pesanan."})

            conn.close()

            # Update cache in-memory
            if invoice_id in SIMULATED_PAYMENTS:
                SIMULATED_PAYMENTS[invoice_id]["status"] = "success"
                SIMULATED_PAYMENTS[invoice_id]["paid_at"] = now_iso

            SIMULATED_DOWNLOAD_TOKENS[token] = {
                "invoice_id": invoice_id,
                "product_name": prod_name,
                "google_drive_id": drive_id,
                "expires_at": time.time() + 86400 * 7,
            }

            return self.send_json(200, {
                "status": "success",
                "invoice_id": invoice_id,
                "payment_status": "PAID",
                "download_token": token,
                "download_url": f"/api/download/{urllib.parse.quote(token)}",
                "google_drive_id": drive_id,
            })

        if path == "/api/check-status":
            invoice_id = urllib.parse.parse_qs(parsed.query).get("invoice_id", [""])[0].strip()
            if not invoice_id:
                return self.send_json(400, {"error": "invoice_id diperlukan."})

            conn = db.get_db()
            db_order = conn.execute("""
                SELECT o.id, o.order_number, o.payment_status, o.product_id,
                       p.google_drive_id, p.name AS product_name,
                       dt.token AS download_token
                FROM orders o
                LEFT JOIN products p ON p.id = o.product_id
                LEFT JOIN download_tokens dt ON (dt.invoice_id = o.order_number OR dt.order_id = o.id) AND dt.status = 'active'
                WHERE o.order_number = ? OR o.id = ? OR o.payment_reference = ?
                LIMIT 1
            """, (invoice_id, invoice_id, invoice_id)).fetchone()
            conn.close()

            if db_order:
                is_paid = db_order["payment_status"] == "PAID"
                token = db_order["download_token"]
                if not token and invoice_id in SIMULATED_DOWNLOAD_TOKENS:
                    token = next((t for t, v in SIMULATED_DOWNLOAD_TOKENS.items() if v.get("invoice_id") == invoice_id), None)

                return self.send_json(200, {
                    "status": "success",
                    "invoice_id": invoice_id,
                    "payment_status": "PAID" if is_paid else db_order["payment_status"],
                    "download_token": token if is_paid else None,
                    "download_url": f"/api/download/{urllib.parse.quote(token)}" if (is_paid and token) else None,
                    "google_drive_id": db_order["google_drive_id"],
                })

            entry = SIMULATED_PAYMENTS.get(invoice_id)
            if not entry:
                return self.send_json(404, {"error": "Invoice tidak ditemukan."})

            is_paid = entry["status"] in ("success", "paid", "PAID")
            token = next((t for t, value in SIMULATED_DOWNLOAD_TOKENS.items() if value.get("invoice_id") == invoice_id), None)
            return self.send_json(200, {
                "status": "success",
                "invoice_id": invoice_id,
                "payment_status": "PAID" if is_paid else entry["status"],
                "download_token": token if is_paid else None,
                "download_url": f"/api/download/{urllib.parse.quote(token)}" if (is_paid and token) else None,
                "google_drive_id": entry.get("google_drive_id"),
            })

        if path == "/api/admin/login":
            identifier = str(body.get("identifier", body.get("email", ""))).strip()
            password = str(body.get("password", ""))
            expected_identifier = os.environ.get("MORGAD_ADMIN_EMAIL", "morgadcyber@morgad.com")
            expected_username = os.environ.get("MORGAD_ADMIN_USERNAME", "morgadcyber")
            expected_password = os.environ.get("MORGAD_ADMIN_PASSWORD", "JasaMorgad21vp")
            valid_identifier = (
                hmac.compare_digest(identifier.lower(), expected_identifier.lower())
                or hmac.compare_digest(identifier.lower(), expected_username.lower())
                or hmac.compare_digest(identifier.lower(), "morgad admin")
            )
            valid_password = hmac.compare_digest(password, expected_password)
            if not (valid_identifier and valid_password):
                return self.send_json(401, {"success": False, "error": "Email atau password salah."})

            response = json.dumps({"success": True}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Set-Cookie', 'morgad_admin_session=authenticated; Max-Age=1800; HttpOnly; SameSite=Lax; Path=/')
            self.send_header('Content-Length', str(len(response)))
            self.end_headers()
            self.wfile.write(response)
            return

        # 1. API: Checkout | DOKU Checkout v1 (Production Non-SNAP)
        if path == "/api/checkout":
            if not isinstance(body, dict):
                return self.send_json(400, {"error": "JSON body required."})

            product_id = body.get("product_id") or body.get("productId") or body.get("id")
            customer_email = body.get("customer_email") or body.get("customerEmail") or body.get("email")

            if not product_id or not customer_email:
                return self.send_json(400, {"error": "Missing required fields: 'product_id' and 'customer_email'."})

            conn = db.get_db()
            product = conn.execute(
                """
                SELECT id, name, price, google_drive_id, image_path, currency,
                       COALESCE(status, 'published') AS status,
                       COALESCE(is_published, 1) AS is_published
                FROM products WHERE id = ? LIMIT 1
                """,
                (str(product_id),),
            ).fetchone()

            if not product:
                conn.close()
                return self.send_json(404, {"error": "Product not found or not published."})

            if product["status"] != "published" and product["is_published"] not in (1, True, "1"):
                conn.close()
                return self.send_json(404, {"error": "Product not found or not published."})

            try:
                price_value = float(product["price"])
            except (TypeError, ValueError):
                conn.close()
                return self.send_json(400, {"error": "Product price is invalid."})

            invoice_id = f"INV-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"
            order_id = f"ord_{secrets.token_hex(8)}"
            currency = product["currency"] or "IDR"
            amount_int = int(round(price_value))
            now_iso = datetime.now(timezone.utc).isoformat()
            customer_name = customer_email.split("@")[0]

            # DOKU Production Credentials & Signature
            doku_client_id = os.environ.get("DOKU_CLIENT_ID", "").strip()
            doku_secret_key = os.environ.get("DOKU_SECRET_KEY", "").strip()
            doku_base_url = os.environ.get("DOKU_BASE_URL", "https://doku.com").rstrip("/")
            endpoint_path = "/checkout/v1/payment"
            target_url = f"{doku_base_url}{endpoint_path}"
            app_url = os.environ.get("APP_URL", "http://localhost:3000").rstrip("/")
            callback_url = f"{app_url}/payment/success"

            doku_payload = {
                "order": {
                    "invoice_number": invoice_id,
                    "amount": amount_int,
                    "currency": currency,
                    "callback_url": callback_url
                },
                "customer": {
                    "name": customer_name,
                    "email": customer_email,
                    "phone": "6281234567890"
                }
            }
            payload_bytes = json.dumps(doku_payload, separators=(',', ':')).encode("utf-8")
            request_id = str(uuid.uuid4())
            timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

            # Signature Calculation Non-SNAP
            signature, digest = mayar.generate_doku_signature(
                doku_client_id or "MALLID-MORGAD",
                doku_secret_key or "SECRET-KEY",
                request_id,
                timestamp,
                endpoint_path,
                payload_bytes
            )

            checkout_url = None
            if doku_client_id and doku_secret_key:
                headers = {
                    "Client-Id": doku_client_id,
                    "Request-Id": request_id,
                    "Request-Timestamp": timestamp,
                    "Signature": signature,
                    "Content-Type": "application/json",
                }
                req = urllib.request.Request(target_url, data=payload_bytes, headers=headers, method="POST")
                try:
                    with urllib.request.urlopen(req, timeout=15) as resp:
                        resp_data = json.loads(resp.read().decode("utf-8"))
                        checkout_url = (
                            resp_data.get("response", {}).get("payment", {}).get("url")
                            or resp_data.get("payment", {}).get("url")
                            or resp_data.get("url")
                        )
                except urllib.error.HTTPError as err:
                    err_body = err.read().decode("utf-8", errors="replace")
                    print(f"[DOKU Production API] HTTP {err.code}: {err_body}")
                except Exception as e:
                    print(f"[DOKU API Connection Note] {e}")

            if not checkout_url:
                checkout_url = f"{doku_base_url}/checkout/v1/payment?invoice={invoice_id}"

            # Simpan order dan payment ke database SQLite
            conn.execute("""
                INSERT INTO orders (
                    id, order_number, product_id, customer_email, amount, currency,
                    payment_provider, payment_reference, payment_status, order_status, download_status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'doku', ?, 'PENDING', 'PENDING', 'NOT_AVAILABLE', ?)
            """, (order_id, invoice_id, product["id"], customer_email, price_value, currency, invoice_id, now_iso))

            conn.execute("""
                INSERT INTO payments (
                    id, order_id, provider, provider_reference, amount, currency, status, payment_channel, created_at
                ) VALUES (?, ?, 'doku', ?, ?, ?, 'PENDING', 'DOKU_CHECKOUT', ?)
            """, (f"pay_{secrets.token_hex(8)}", order_id, invoice_id, price_value, currency, now_iso))

            download_token = secrets.token_urlsafe(32)
            conn.execute("""
                INSERT OR REPLACE INTO download_tokens (
                    id, token, order_id, product_id, invoice_id, google_drive_id, expires_at, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            """, (
                str(uuid.uuid4()),
                download_token,
                order_id,
                product["id"],
                invoice_id,
                product["google_drive_id"],
                (datetime.now(timezone.utc) + timedelta(minutes=60)).isoformat(),
                now_iso,
            ))
            conn.commit()
            conn.close()

            payment_detail = f"DOKU_CHECKOUT|invoice={invoice_id}|amount={amount_int}|currency={currency}"
            SIMULATED_PAYMENTS[invoice_id] = {
                "status": "pending",
                "product_id": product["id"],
                "product_name": product["name"],
                "google_drive_id": product["google_drive_id"],
                "image_path": product["image_path"],
                "amount": float(price_value),
                "currency": currency,
                "customer_email": customer_email,
                "created_at": now_iso,
                "paymentDetail": payment_detail,
                "checkout_url": checkout_url,
            }
            SIMULATED_DOWNLOAD_TOKENS[download_token] = {
                "invoice_id": invoice_id,
                "product_name": product["name"],
                "google_drive_id": product["google_drive_id"],
                "expires_at": time.time() + 86400 * 7,
            }

            response = {
                "status": "success",
                "invoice_id": invoice_id,
                "order_number": invoice_id,
                "download_token": download_token,
                "download_url": f"/api/download/{urllib.parse.quote(download_token)}",
                "paymentDetail": payment_detail,
                "product_name": product["name"],
                "amount": float(price_value),
                "currency": currency,
                "google_drive_id": product["google_drive_id"],
                "image_path": product["image_path"] or "/assets/img/logo.png",
                "url": checkout_url,
                "checkout_url": checkout_url,
            }

            return self.send_json(200, response)

        # 2. API: Payment Webhook Endpoint (DOKU & legacy Mayar)
        if path in ("/api/webhooks/mayar", "/api/webhooks/doku", "/webhook-doku"):
            if not mayar.verify_webhook_signature(dict(self.headers), raw_body, path):
                return self.send_json(401, {"error": "Invalid webhook signature."})

            try:
                result = mayar.process_mayar_webhook(body, client_ip)
                return self.send_json(200, result)
            except ValueError as e:
                return self.send_json(400, {"error": str(e)})

        # 3. API: Resend Download Link (Section 35, 36)
        if path.startswith("/api/orders/") and path.endswith("/resend-download"):
            parts = path.strip("/").split("/")
            order_ref = parts[2]
            email = body.get("email", "").strip().lower()

            conn = db.get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM orders WHERE (order_number = ? OR id = ?) AND LOWER(customer_email) = ?", (order_ref, order_ref, email))
            order = cursor.fetchone()
            conn.close()

            if not order:
                return self.send_json(404, {"error": "Order not found or email does not match."})

            if order["payment_status"] != "PAID":
                return self.send_json(400, {"error": "Payment has not been completed for this order."})

            # Regenerate active token
            raw_token = mayar.secrets.token_urlsafe(32)
            token_h = mayar.hash_token(raw_token)
            expires_at = (datetime.now(timezone.utc) + mayar.timedelta(days=7)).isoformat()

            conn = db.get_db()
            conn.execute("""
            UPDATE download_access SET
                token_hash = ?,
                expires_at = ?,
                revoked = 0
            WHERE order_id = ?
            """, (token_h, expires_at, order["id"]))
            conn.commit()
            conn.close()

            return self.send_json(200, {
                "status": "success",
                "message": f"New download token generated and dispatched to {email}.",
                "download_url": f"/api/download/{raw_token}"
            })

        # 4. API: Admin Revoke Token
        if path.startswith("/api/admin/downloads/") and path.endswith("/revoke"):
            order_ref = path.split("/api/admin/downloads/")[1].replace("/revoke", "")
            conn = db.get_db()
            conn.execute("""
            UPDATE download_access SET revoked = 1
            WHERE order_id = (SELECT id FROM orders WHERE order_number = ? OR id = ?)
            """, (order_ref, order_ref))
            conn.execute("""
            INSERT INTO audit_logs (id, event_type, order_id, details, ip_address, created_at)
            VALUES (?, 'DOWNLOAD_REVOKED', ?, 'Admin revoked digital download token', ?, ?)
            """, (str(mayar.uuid.uuid4()), order_ref, client_ip, mayar.now_iso()))
            conn.commit()
            conn.close()
            return self.send_json(200, {"status": "success", "message": f"Download access revoked for #{order_ref}."})

        # 5. API: Admin Reset Quota
        if path.startswith("/api/admin/downloads/") and path.endswith("/reset"):
            order_ref = path.split("/api/admin/downloads/")[1].replace("/reset", "")
            conn = db.get_db()
            conn.execute("""
            UPDATE download_access SET download_count = 0, revoked = 0
            WHERE order_id = (SELECT id FROM orders WHERE order_number = ? OR id = ?)
            """, (order_ref, order_ref))
            conn.commit()
            conn.close()
            return self.send_json(200, {"status": "success", "message": f"Download quota reset to 0 for #{order_ref}."})

        # 6. API: Developer / Admin Webhook Simulator
        if path == "/api/admin/simulate-payment":
            order_ref = body.get("order_number") or body.get("order_id")
            conn = db.get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM orders WHERE order_number = ? OR id = ?", (order_ref, order_ref))
            order = cursor.fetchone()
            conn.close()

            if not order:
                return self.send_json(404, {"error": "Order not found."})

            simulated_event = {
                "event_id": f"sim_{mayar.secrets.token_hex(6)}",
                "event_type": "payment.paid",
                "order_number": order["order_number"],
                "amount": float(order["amount"]),
                "payment_reference": order["payment_reference"] or f"MYR-SIM-{mayar.secrets.token_hex(4).upper()}",
                "payment_channel": body.get("channel", "QRIS")
            }
            res = mayar.process_mayar_webhook(simulated_event, client_ip)
            return self.send_json(200, res)

        return self.send_json(404, {"error": "Not Found"})

class ThreadingHTTPServer(socketserver.ThreadingTCPServer):
    """Keep static/API requests responsive while another client downloads a file."""
    allow_reuse_address = True
    daemon_threads = True


if __name__ == '__main__':
    with ThreadingHTTPServer(("", PORT), PlatformRequestHandler) as httpd:
        print(f"Platform server running at http://localhost:{PORT}")
        print(f"Database file: {db.DB_PATH}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            httpd.server_close()
            sys.exit(0)
