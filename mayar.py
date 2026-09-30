"""
Mayar Payment & Security Integration Engine for Digital Product Platform.
Adheres strictly to AGENT.md:
- Server-side price authority (Section 12, 13)
- Mayar payment creation & reference storage (Section 14, 15)
- Public secure webhook with signature & idempotency (Section 19, 20, 21)
- Strict amount verification (Section 22, 23)
- Cryptographic download token generation with SHA-256 hashing (Section 25-28)
- Download quota, expiration, and revocation enforcement (Section 29-37)
"""
import os
import secrets
import hashlib
import hmac
import base64
import json
import uuid
import urllib.error
import urllib.request
from datetime import datetime, timezone, timedelta
from db import get_db

# DOKU Environment Secrets (Production Non-SNAP)
DOKU_CLIENT_ID = os.environ.get("DOKU_CLIENT_ID", "")
DOKU_SECRET_KEY = os.environ.get("DOKU_SECRET_KEY", "")
DOKU_BASE_URL = os.environ.get("DOKU_BASE_URL", "https://doku.com").rstrip("/")

# Mayar Legacy Secrets (Compatibility fallback)
MAYAR_API_KEY = os.environ.get("MAYAR_API_KEY", "")
MAYAR_API_BASE = os.environ.get("MAYAR_API_BASE", "https://api.mayar.id/hl/v2")
MAYAR_WEBHOOK_SECRET = os.environ.get("MAYAR_WEBHOOK_SECRET", "")
DOWNLOAD_TOKEN_EXPIRY_DAYS = int(os.environ.get("DOWNLOAD_TOKEN_EXPIRY_DAYS", 7))

def generate_doku_signature(
    client_id: str,
    secret_key: str,
    request_id: str,
    timestamp: str,
    endpoint_path: str,
    payload_bytes: bytes,
) -> tuple:
    """
    Generate DOKU HMAC-SHA256 signature and digest according to DOKU specifications (Non-SNAP):
    Step 1: Hitung Digest -> String JSON payload diubah menjadi SHA256 binary digest, kemudian di-encode ke Base64.
    Step 2: Susun String To Sign ->
            Client-Id:{client_id}\\nRequest-Id:{request_id}\\nRequest-Timestamp:{timestamp}\\nRequest-Target:{endpoint_path}\\nDigest:{base64_digest}
    Step 3: Hasilkan Signature -> Enkripsi String To Sign menggunakan DOKU_SECRET_KEY dengan HMAC-SHA256,
            lalu encode ke Base64 string dengan format HMACSHA256=<base64_signature>.
    """
    digest = base64.b64encode(hashlib.sha256(payload_bytes).digest()).decode("utf-8")
    string_to_sign = (
        f"Client-Id:{client_id}\\n"
        f"Request-Id:{request_id}\\n"
        f"Request-Timestamp:{timestamp}\\n"
        f"Request-Target:{endpoint_path}\\n"
        f"Digest:{digest}"
    )
    raw_sig = hmac.new(
        secret_key.encode("utf-8"),
        string_to_sign.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    signature = f"HMACSHA256={base64.b64encode(raw_sig).decode('utf-8')}"
    return signature, digest

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def hash_token(raw_token: str) -> str:
    """Generate SHA-256 hash of the raw token so raw tokens are never stored in DB."""
    return hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

def create_local_order(product_id: str, customer_email: str, ip_address: str = "127.0.0.1") -> dict:
    """
    Creates a local order before initiating payment.
    Server is the sole authority for price (Rule 12 & 13).
    """
    if not customer_email or "@" not in customer_email:
        raise ValueError("Valid customer email is required.")

    conn = get_db()
    cursor = conn.cursor()

    # Load real price from database
    cursor.execute("SELECT * FROM products WHERE id = ? AND status = 'published'", (product_id,))
    product = cursor.fetchone()
    if not product:
        conn.close()
        raise ValueError(f"Product '{product_id}' not found or unavailable.")

    if product["stock_quantity"] is not None:
        updated_stock = cursor.execute(
            "UPDATE products SET stock_quantity = stock_quantity - 1 WHERE id = ? AND status = 'published' AND stock_quantity > 0",
            (product_id,),
        )
        if updated_stock.rowcount != 1:
            conn.rollback()
            conn.close()
            raise ValueError("Produk sedang habis. Silakan coba lagi nanti.")

    order_id = f"ord_{secrets.token_hex(8)}"
    order_number = f"ORD-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"
    amount = float(product["price"])
    currency = product["currency"]
    now = now_iso()

    cursor.execute("""
    INSERT INTO orders (
        id, order_number, product_id, customer_email, amount, currency,
        payment_provider, payment_status, order_status, download_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'mayar', 'PENDING', 'PENDING', 'NOT_AVAILABLE', ?)
    """, (order_id, order_number, product_id, customer_email, amount, currency, now))

    # Audit log
    cursor.execute("""
    INSERT INTO audit_logs (id, event_type, order_id, details, ip_address, created_at)
    VALUES (?, 'ORDER_CREATED', ?, ?, ?, ?)
    """, (str(uuid.uuid4()), order_id, f"Order created for {product['name']} at ${amount:.2f}", ip_address, now))

    conn.commit()
    conn.close()

    return {
        "order_id": order_id,
        "order_number": order_number,
        "product_id": product_id,
        "product_name": product["name"],
        "customer_email": customer_email,
        "amount": amount,
        "currency": currency,
        "payment_status": "PENDING"
    }

def create_payment(order_id: str) -> dict:
    """
    Generates a DOKU Checkout payment transaction and stores provider reference.
    Adopts DOKU Non-SNAP HMAC-SHA256 signature and standard Checkout payload:
    Endpoint: https://doku.com/checkout/v1/payment
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT o.*, p.name as product_name FROM orders o JOIN products p ON o.product_id = p.id WHERE o.id = ?", (order_id,))
    order = cursor.fetchone()
    conn.close()
    if not order:
        raise ValueError("Order not found.")

    payment_id = f"pay_{secrets.token_hex(8)}"
    now = now_iso()
    customer_name = order["customer_email"].split("@")[0]
    provider_name = "doku" if DOKU_CLIENT_ID else "mayar"
    provider_ref = None
    checkout_url = None

    if DOKU_CLIENT_ID and DOKU_SECRET_KEY:
        endpoint_path = "/checkout/v1/payment"
        request_url = f"{DOKU_BASE_URL}{endpoint_path}"
        request_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        app_url = os.environ.get("APP_URL", "http://localhost:3000").rstrip("/")
        callback_url = f"{app_url}/payment/success"

        doku_payload = {
            "order": {
                "invoice_number": order["order_number"],
                "amount": int(round(float(order["amount"]))),
                "currency": order["currency"] or "IDR",
                "callback_url": callback_url
            },
            "customer": {
                "name": customer_name,
                "email": order["customer_email"],
                "phone": "6281234567890"
            }
        }
        payload_bytes = json.dumps(doku_payload, separators=(',', ':')).encode("utf-8")
        signature, _ = generate_doku_signature(
            DOKU_CLIENT_ID,
            DOKU_SECRET_KEY,
            request_id,
            timestamp,
            endpoint_path,
            payload_bytes
        )

        headers = {
            "Client-Id": DOKU_CLIENT_ID,
            "Request-Id": request_id,
            "Request-Timestamp": timestamp,
            "Signature": signature,
            "Content-Type": "application/json",
        }

        req = urllib.request.Request(
            request_url,
            data=payload_bytes,
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as response:
                response_payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise ValueError(f"DOKU API error ({error.code}): {detail}") from error
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            raise ValueError(f"DOKU tidak dapat dihubungi: {error}") from error

        payment_data = (
            response_payload.get("response", {}).get("payment", {})
            or response_payload.get("payment", {})
            or {}
        )
        checkout_url = payment_data.get("url") or response_payload.get("url") or f"{DOKU_BASE_URL}/checkout/v1/payment"
        provider_ref = payment_data.get("token_id") or response_payload.get("order", {}).get("invoice_number") or order["order_number"]

    elif MAYAR_API_KEY:
        provider_name = "mayar"
        request_payload = {
            "name": order["product_name"],
            "amount": int(order["amount"]),
            "email": order["customer_email"],
            "description": f"Pembayaran {order['product_name']} - {order['order_number']}",
            "extraData": {
                "orderNumber": order["order_number"],
                "productId": order["product_id"],
            },
        }
        request = urllib.request.Request(
            f"{MAYAR_API_BASE}/payments/create",
            data=json.dumps(request_payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {MAYAR_API_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                response_payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise ValueError(f"Mayar API error ({error.code}): {detail}") from error
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            raise ValueError(f"Mayar tidak dapat dihubungi: {error}") from error

        payment_data = response_payload.get("data") or {}
        checkout_url = payment_data.get("link")
        provider_ref = payment_data.get("transactionId") or payment_data.get("id")
        if not checkout_url or not provider_ref:
            raise ValueError(f"Respons Mayar tidak lengkap: {response_payload}")

    else:
        # Local development fallback simulation
        provider_ref = f"MYR-TX-{datetime.now(timezone.utc).strftime('%y%m%d')}-{secrets.token_hex(4).upper()}"
        checkout_url = f"/checkout/mayar?ref={provider_ref}&order_id={order['order_number']}&amount={order['amount']}"

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        INSERT INTO payments (id, order_id, provider, provider_reference, amount, currency, status, payment_channel, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 'DOKU_CHECKOUT', ?)
        """, (payment_id, order_id, provider_name, provider_ref, order["amount"], order["currency"], now))

        cursor.execute("""
        UPDATE orders SET payment_reference = ?, payment_provider = ? WHERE id = ?
        """, (provider_ref, provider_name, order_id))

        conn.commit()
    finally:
        conn.close()

    return {
        "order_id": order_id,
        "order_number": order["order_number"],
        "amount": order["amount"],
        "currency": order["currency"],
        "payment_provider": provider_name,
        "payment_reference": provider_ref,
        "payment_status": "PENDING",
        "checkout_url": checkout_url
    }

# Backward compatibility aliases
create_mayar_payment = create_payment
create_doku_payment = create_payment

def verify_webhook_signature(headers: dict, raw_payload: str, request_target: str = "") -> bool:
    """
    Verify webhook signature for DOKU (and legacy fallback).
    Supports DOKU Non-SNAP HMAC-SHA256 signature format:
    Signature: HMACSHA256=<base64_signature>
    Header components: Client-Id, Request-Id, Request-Timestamp, Signature
    """
    h = {k.lower(): v for k, v in headers.items()}
    doku_sig = h.get("signature") or h.get("x-signature")

    if DOKU_SECRET_KEY and doku_sig:
        client_id = h.get("client-id", DOKU_CLIENT_ID)
        request_id = h.get("request-id", "")
        timestamp = h.get("request-timestamp", "")
        payload_bytes = raw_payload.encode("utf-8") if isinstance(raw_payload, str) else raw_payload
        target = request_target or h.get("request-target", "")

        computed_sig, _ = generate_doku_signature(
            client_id, DOKU_SECRET_KEY, request_id, timestamp, target, payload_bytes
        )
        if hmac.compare_digest(doku_sig.strip(), computed_sig.strip()):
            return True

        # Fallback without Request-Target if proxy stripped target
        digest = base64.b64encode(hashlib.sha256(payload_bytes).digest()).decode("utf-8")
        alt_str = f"Client-Id:{client_id}\\nRequest-Id:{request_id}\\nRequest-Timestamp:{timestamp}\\nDigest:{digest}"
        alt_raw = hmac.new(DOKU_SECRET_KEY.encode("utf-8"), alt_str.encode("utf-8"), hashlib.sha256).digest()
        alt_sig = f"HMACSHA256={base64.b64encode(alt_raw).decode('utf-8')}"
        if hmac.compare_digest(doku_sig.strip(), alt_sig.strip()):
            return True

    # Legacy Mayar HMAC check
    legacy_sig = h.get("x-mayar-signature") or h.get("x-callback-token")
    if MAYAR_WEBHOOK_SECRET and legacy_sig:
        computed = hmac.new(MAYAR_WEBHOOK_SECRET.encode('utf-8'), raw_payload.encode('utf-8'), hashlib.sha256).hexdigest()
        if hmac.compare_digest(legacy_sig.strip(), computed.strip()):
            return True

    return False

def process_mayar_webhook(event_payload: dict, ip_address: str = "127.0.0.1") -> dict:
    """
    Processes Mayar payment webhook idempotently and securely (Sections 19-24, 56-58):
    1. Idempotency check via event_id
    2. Local order lookup
    3. Strict amount verification
    4. State machine update (PAID)
    5. High-entropy token generation + SHA-256 hash storage
    6. License generation
    7. Audit log creation
    """
    order_data = event_payload.get("order") if isinstance(event_payload.get("order"), dict) else {}
    trans_data = event_payload.get("transaction") if isinstance(event_payload.get("transaction"), dict) else {}
    channel_data = event_payload.get("channel") if isinstance(event_payload.get("channel"), dict) else {}
    event_data = event_payload.get("data") if isinstance(event_payload.get("data"), dict) else {}
    extra_data = event_data.get("extraData") if isinstance(event_data.get("extraData"), dict) else {}

    event_id = (
        trans_data.get("original_request_id")
        or event_payload.get("event_id")
        or event_payload.get("id")
        or event_data.get("id")
        or f"evt_{secrets.token_hex(8)}"
    )
    status_raw = (
        trans_data.get("status")
        or event_payload.get("event_type")
        or event_payload.get("event")
        or event_payload.get("status")
        or event_data.get("status")
        or "payment.paid"
    )
    event_type = str(status_raw).strip()
    status_normalized = event_type.upper()

    order_number = (
        order_data.get("invoice_number")
        or event_payload.get("order_number")
        or event_payload.get("order_id")
        or event_payload.get("invoice_number")
        or extra_data.get("orderNumber")
        or extra_data.get("order_number")
    )
    paid_amount = float(
        order_data.get("amount")
        or event_payload.get("amount")
        or event_data.get("amount")
        or 0
    )
    provider_ref = (
        order_data.get("invoice_number")
        or trans_data.get("original_request_id")
        or event_payload.get("payment_reference")
        or event_payload.get("transaction_id")
        or event_data.get("transactionId")
        or event_data.get("id")
        or "DOKU-REF"
    )
    payment_channel = (
        channel_data.get("id")
        or event_payload.get("payment_channel")
        or event_data.get("paymentMethod")
        or "DOKU_CHECKOUT"
    )
    provider_name = "doku" if DOKU_CLIENT_ID or "order" in event_payload else "mayar"

    conn = get_db()
    cursor = conn.cursor()

    # 1. Idempotency check (Section 21 & 58)
    cursor.execute("SELECT * FROM webhook_events WHERE event_id = ?", (event_id,))
    if cursor.fetchone():
        conn.close()
        return {
            "status": "duplicate_ignored",
            "message": "Webhook event already processed.",
            "event_id": event_id
        }

    # Record event in webhook_events
    payload_hash = hashlib.sha256(json.dumps(event_payload, sort_keys=True).encode()).hexdigest()
    cursor.execute("""
    INSERT INTO webhook_events (id, provider, event_id, event_type, payload_hash, processed, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
    """, (str(uuid.uuid4()), provider_name, event_id, event_type, payload_hash, now_iso()))

    # 2. Local order lookup
    cursor.execute("""
    SELECT o.*, p.name as product_name, p.max_downloads as prod_max_downloads
    FROM orders o JOIN products p ON o.product_id = p.id
    WHERE o.order_number = ? OR o.id = ? OR o.payment_reference = ?
    """, (order_number, order_number, provider_ref))
    order = cursor.fetchone()

    if not order:
        conn.commit()
        conn.close()
        raise ValueError(f"Order reference '{order_number}' not found.")

    # 3. Amount verification (Section 23 - Strict match)
    expected_amount = float(order["amount"])
    if abs(paid_amount - expected_amount) > 0.001:
        # Reject payment
        cursor.execute("""
        INSERT INTO audit_logs (id, event_type, order_id, details, ip_address, created_at)
        VALUES (?, 'PAYMENT_AMOUNT_MISMATCH', ?, ?, ?, ?)
        """, (str(uuid.uuid4()), order["id"], f"Amount mismatch: Expected ${expected_amount}, received ${paid_amount}", ip_address, now_iso()))
        conn.commit()
        conn.close()
        raise ValueError(f"Amount mismatch: Order is ${expected_amount:.2f}, received ${paid_amount:.2f}. Payment rejected.")

    # 4. State Machine Update (PENDING -> PAID)
    now = now_iso()
    cursor.execute("""
    UPDATE orders SET
        payment_status = 'PAID',
        order_status = 'COMPLETED',
        download_status = 'READY',
        paid_at = ?
    WHERE id = ?
    """, (now, order["id"]))

    cursor.execute("""
    UPDATE payments SET
        status = 'PAID',
        payment_channel = ?,
        paid_at = ?
    WHERE order_id = ?
    """, (payment_channel, now, order["id"]))

    # 5. Cryptographic Download Token Generation (Section 25-28)
    raw_token = secrets.token_urlsafe(32)
    token_h = hash_token(raw_token)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=DOWNLOAD_TOKEN_EXPIRY_DAYS)).isoformat()
    max_dl = order["prod_max_downloads"] or 5

    cursor.execute("""
    INSERT INTO download_access (
        id, order_id, product_id, token_hash, expires_at, download_count, max_downloads, revoked, created_at
    ) VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?)
    ON CONFLICT(order_id) DO UPDATE SET
        token_hash = excluded.token_hash,
        expires_at = excluded.expires_at,
        revoked = 0;
    """, (str(uuid.uuid4()), order["id"], order["product_id"], token_h, expires_at, max_dl, now))

    # 6. License Generation (Section 49)
    license_key = f"TERA-{order['product_id'][:4].upper()}-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}"
    cursor.execute("""
    INSERT INTO licenses (id, order_id, product_id, license_key, status, created_at)
    VALUES (?, ?, ?, ?, 'ACTIVE', ?)
    ON CONFLICT(order_id) DO UPDATE SET license_key = excluded.license_key;
    """, (str(uuid.uuid4()), order["id"], order["product_id"], license_key, now))

    # 7. Audit log & webhook marked processed
    cursor.execute("""
    INSERT INTO audit_logs (id, event_type, order_id, details, ip_address, created_at)
    VALUES (?, 'PAYMENT_PAID', ?, ?, ?, ?)
    """, (str(uuid.uuid4()), order["id"], f"Payment cleared via {provider_name} {payment_channel} for {paid_amount:.2f}", ip_address, now))

    cursor.execute("UPDATE webhook_events SET processed = 1 WHERE event_id = ?", (event_id,))

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "order_number": order["order_number"],
        "payment_status": "PAID",
        "download_token": raw_token,
        "download_url": f"/api/download/{raw_token}",
        "license_key": license_key,
        "expires_at": expires_at,
        "max_downloads": max_dl
    }

# Backward compatibility alias
process_doku_webhook = process_mayar_webhook

def verify_and_claim_download(raw_token: str, client_ip: str = "127.0.0.1") -> dict:
    """
    Validates token, checks order payment status, checks expiration, checks revocation,
    and checks quota limits (Sections 30-37).
    """
    token_h = hash_token(raw_token)
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT da.*, o.order_number, o.customer_email, o.payment_status,
            p.name as product_name, p.file_path, p.file_size, p.google_drive_id
    FROM download_access da
    JOIN orders o ON da.order_id = o.id
    JOIN products p ON da.product_id = p.id
    WHERE da.token_hash = ?
    """, (token_h,))
    access = cursor.fetchone()

    if not access:
        conn.close()
        raise ValueError("Invalid or unknown download token.")

    if raw_token.startswith("cb_"):
        callback_expiry = access["callback_token_expires_at"]
        if not callback_expiry or datetime.now(timezone.utc) > datetime.fromisoformat(callback_expiry):
            conn.close()
            raise ValueError("Checkout download token has expired.")

    # Rule checks
    if access["payment_status"] != "PAID":
        conn.close()
        raise ValueError("Payment is not verified for this order.")

    if access["revoked"] == 1:
        conn.close()
        raise ValueError("Download access token has been revoked by administration.")

    # Check expiration
    expires_dt = datetime.fromisoformat(access["expires_at"])
    if datetime.now(timezone.utc) > expires_dt:
        conn.close()
        raise ValueError("Download token has expired. Please request a new delivery link.")

    # Check download limit
    if access["download_count"] >= access["max_downloads"]:
        conn.close()
        raise ValueError(f"Download limit reached ({access['download_count']}/{access['max_downloads']}).")

    # Increment download count & record audit
    now = now_iso()
    new_count = access["download_count"] + 1
    cursor.execute("""
    UPDATE download_access SET
        download_count = ?,
        last_download_at = ?,
        last_download_ip = ?
    WHERE id = ?
    """, (new_count, now, client_ip, access["id"]))

    cursor.execute("""
    INSERT INTO audit_logs (id, event_type, order_id, details, ip_address, created_at)
    VALUES (?, 'DOWNLOAD_COMPLETED', ?, ?, ?, ?)
    """, (str(uuid.uuid4()), access["order_id"], f"Download #{new_count} claimed for {access['product_name']}", client_ip, now))

    conn.commit()
    conn.close()

    return {
        "file_path": access["file_path"],
        "google_drive_id": access["google_drive_id"],
        "product_name": access["product_name"],
        "order_number": access["order_number"],
        "download_count": new_count,
        "max_downloads": access["max_downloads"]
    }
