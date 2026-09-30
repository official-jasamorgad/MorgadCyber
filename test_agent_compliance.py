"""
Automated Test Suite for AGENT.md Compliance.
Validates all core security, business rules, and Definition of Done (Section 168).
"""
import unittest
import os
import hashlib
import json
import uuid
from datetime import datetime, timezone, timedelta
import db
import mayar
import server

TEST_PRODUCTS = {
    "test-prod-1": ("Test Product 1", 7.99),
    "test-prod-2": ("Test Product 2", 9.99),
    "test-prod-3": ("Test Product 3", 8.99),
    "test-prod-4": ("Test Product 4", 6.99),
}

def seed_test_products():
    db.create_private_master_files()
    now = datetime.now(timezone.utc).isoformat()
    conn = db.get_db()
    for product_id, (name, price) in TEST_PRODUCTS.items():
        conn.execute(
            """INSERT OR REPLACE INTO products
            (id, name, slug, description, category, price, currency, file_path, file_size, version, status, max_downloads, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'software', ?, 'USD', ?, '1 MB', '1.0.0', 'published', 5, ?, ?)""",
            (product_id, name, product_id, "Test fixture", price,
             os.path.join(db.PRODUCTS_DIR, "viral_visual_pack_vol1.zip"), now, now),
        )
    conn.commit()
    conn.close()

class TestAgentCompliance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db.init_db()
        seed_test_products()

    @classmethod
    def tearDownClass(cls):
        conn = db.get_db()
        try:
            conn.execute("PRAGMA foreign_keys = OFF")
            product_ids = tuple(TEST_PRODUCTS)
            placeholders = ",".join("?" for _ in product_ids)
            order_ids = [row[0] for row in conn.execute(
                f"SELECT id FROM orders WHERE product_id IN ({placeholders})", product_ids
            )]
            if order_ids:
                order_placeholders = ",".join("?" for _ in order_ids)
                conn.execute(f"DELETE FROM download_tokens WHERE order_id IN ({order_placeholders})", order_ids)
                conn.execute(f"DELETE FROM download_access WHERE order_id IN ({order_placeholders})", order_ids)
                conn.execute(f"DELETE FROM licenses WHERE order_id IN ({order_placeholders})", order_ids)
                conn.execute(f"DELETE FROM payments WHERE order_id IN ({order_placeholders})", order_ids)
                conn.execute(f"DELETE FROM transactions WHERE order_id IN ({order_placeholders})", order_ids)
                conn.execute(f"DELETE FROM orders WHERE id IN ({order_placeholders})", order_ids)
            conn.execute(f"DELETE FROM products WHERE id IN ({placeholders})", product_ids)
            conn.commit()
        finally:
            conn.execute("PRAGMA foreign_keys = ON")
            conn.close()

    def test_00_resolve_uploaded_product_image_from_storage(self):
        """Uploaded product files on disk must be recovered even when the DB row still points at the default logo."""
        product_id = "prod_uploaded_regression_case"
        upload_dir = os.path.join(server.DIRECTORY, "assets", "uploads", "products")
        os.makedirs(upload_dir, exist_ok=True)
        image_path = os.path.join(upload_dir, f"{product_id}.png")
        with open(image_path, "wb") as fh:
            fh.write(b"PNGDATA")
        try:
            resolved = server.resolve_product_image_url("/assets/img/logo.png", product_id)
            self.assertEqual(resolved, f"/assets/uploads/products/{product_id}.png")
        finally:
            if os.path.exists(image_path):
                os.remove(image_path)

    def test_00b_seed_only_when_catalog_is_empty(self):
        """Startup must not recreate the default product after the admin clears the catalog."""
        conn = db.get_db()
        try:
            conn.execute("PRAGMA foreign_keys = OFF")
            conn.execute("DELETE FROM download_tokens")
            conn.execute("DELETE FROM download_access")
            conn.execute("DELETE FROM licenses")
            conn.execute("DELETE FROM payments")
            conn.execute("DELETE FROM transactions")
            conn.execute("DELETE FROM orders")
            conn.execute("DELETE FROM products")
            conn.commit()
        finally:
            conn.execute("PRAGMA foreign_keys = ON")
            conn.close()

        server.ensure_required_product_seed()
        conn = db.get_db()
        try:
            count = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
            self.assertEqual(count, 0, "Catalog should remain empty after admin deletion and restart")
        finally:
            conn.close()
            seed_test_products()

    def test_01_server_side_price_authority(self):
        """Rule 12 & 13: Price must always come from database, never trusted from client."""
        # Attempt to create order for prod-1 ($7.99)
        order = mayar.create_local_order("test-prod-1", "buyer@test.com")
        self.assertEqual(order["amount"], 7.99, "Server must enforce real DB price")
        self.assertEqual(order["payment_status"], "PENDING", "Initial payment status must be PENDING")

    def test_02_local_order_before_payment(self):
        """Rule 10 & 14: Order must be created locally before Mayar payment creation."""
        order = mayar.create_local_order("test-prod-2", "buyer2@test.com")
        payment = mayar.create_mayar_payment(order["order_id"])

        self.assertIn("payment_reference", payment)
        self.assertTrue(payment["payment_reference"].startswith("MYR-TX-"))
        self.assertIn("checkout_url", payment)

    def test_03_webhook_amount_verification(self):
        """Rule 22 & 23: Strict amount verification. Reject payment if amount does not match order."""
        order = mayar.create_local_order("test-prod-1", "tamper@test.com")
        payment = mayar.create_mayar_payment(order["order_id"])

        tampered_event = {
            "event_id": f"evt_tamper_{uuid.uuid4()}",
            "event_type": "payment.paid",
            "order_number": order["order_number"],
            "amount": 1.00,  # Tampered: real price is $7.99
            "payment_reference": payment["payment_reference"]
        }

        # Should raise ValueError and reject
        with self.assertRaises(ValueError):
            mayar.process_mayar_webhook(tampered_event)

        # Verify order in DB is STILL PENDING
        conn = db.get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT payment_status FROM orders WHERE id = ?", (order["order_id"],))
        status = cursor.fetchone()["payment_status"]
        conn.close()
        self.assertEqual(status, "PENDING", "Order must not be marked PAID if amount is tampered")

    def test_04_webhook_idempotency(self):
        """Rule 21 & 58: Webhook must be idempotent. Duplicate webhook event must be ignored."""
        order = mayar.create_local_order("test-prod-3", "idempotent@test.com")
        payment = mayar.create_mayar_payment(order["order_id"])
        event_id = f"evt_dup_{uuid.uuid4()}"

        event = {
            "event_id": event_id,
            "event_type": "payment.paid",
            "order_number": order["order_number"],
            "amount": 8.99,
            "payment_reference": payment["payment_reference"]
        }

        # First call
        res1 = mayar.process_mayar_webhook(event)
        self.assertEqual(res1["status"], "success")

        # Second call with same event_id
        res2 = mayar.process_mayar_webhook(event)
        self.assertEqual(res2["status"], "duplicate_ignored")

    def test_05_cryptographic_token_hashing(self):
        """Rule 27 & 28: Raw token must never be stored in database; only SHA-256 hash."""
        order = mayar.create_local_order("test-prod-4", "tokenhash@test.com")
        payment = mayar.create_mayar_payment(order["order_id"])

        event = {
            "event_id": f"evt_hash_{uuid.uuid4()}",
            "event_type": "payment.paid",
            "order_number": order["order_number"],
            "amount": 6.99,
            "payment_reference": payment["payment_reference"]
        }
        res = mayar.process_mayar_webhook(event)
        raw_token = res["download_token"]

        conn = db.get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT token_hash FROM download_access WHERE order_id = ?", (order["order_id"],))
        stored_hash = cursor.fetchone()["token_hash"]
        conn.close()

        expected_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
        self.assertEqual(stored_hash, expected_hash, "DB must store SHA-256 hash of token")
        self.assertNotEqual(stored_hash, raw_token, "DB must never store raw token plaintext")

    def test_06_authorized_download_and_quota_limit(self):
        """Rule 31, 37: Validate token, grant file, increment download count, and enforce quota limit."""
        order = mayar.create_local_order("test-prod-1", "quota@test.com")
        payment = mayar.create_mayar_payment(order["order_id"])

        event = {
            "event_id": f"evt_quota_{uuid.uuid4()}",
            "event_type": "payment.paid",
            "order_number": order["order_number"],
            "amount": 7.99,
            "payment_reference": payment["payment_reference"]
        }
        res = mayar.process_mayar_webhook(event)
        raw_token = res["download_token"]

        # Max downloads is 5
        for i in range(1, 6):
            claim = mayar.verify_and_claim_download(raw_token)
            self.assertEqual(claim["download_count"], i)
            self.assertTrue(os.path.exists(claim["file_path"]))

        # 6th attempt must be rejected (quota exceeded)
        with self.assertRaises(ValueError) as ctx:
            mayar.verify_and_claim_download(raw_token)
        self.assertIn("Download limit reached", str(ctx.exception))

    def test_07_token_revocation(self):
        """Rule 31, 43: Revoked download token must immediately deny access."""
        order = mayar.create_local_order("test-prod-1", "revoke@test.com")
        payment = mayar.create_mayar_payment(order["order_id"])

        event = {
            "event_id": f"evt_rev_{uuid.uuid4()}",
            "event_type": "payment.paid",
            "order_number": order["order_number"],
            "amount": 7.99,
            "payment_reference": payment["payment_reference"]
        }
        res = mayar.process_mayar_webhook(event)
        raw_token = res["download_token"]

        # Revoke access in DB
        conn = db.get_db()
        conn.execute("UPDATE download_access SET revoked = 1 WHERE order_id = ?", (order["order_id"],))
        conn.commit()
        conn.close()

        with self.assertRaises(ValueError) as ctx:
            mayar.verify_and_claim_download(raw_token)
        self.assertIn("revoked", str(ctx.exception).lower())

    def test_08_token_expiration(self):
        """Rule 29: Expired token must be denied access."""
        order = mayar.create_local_order("test-prod-1", "expired@test.com")
        payment = mayar.create_mayar_payment(order["order_id"])

        event = {
            "event_id": f"evt_exp_{uuid.uuid4()}",
            "event_type": "payment.paid",
            "order_number": order["order_number"],
            "amount": 7.99,
            "payment_reference": payment["payment_reference"]
        }
        res = mayar.process_mayar_webhook(event)
        raw_token = res["download_token"]

        # Set expiration to past
        past_date = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        conn = db.get_db()
        conn.execute("UPDATE download_access SET expires_at = ? WHERE order_id = ?", (past_date, order["order_id"]))
        conn.commit()
        conn.close()

        with self.assertRaises(ValueError) as ctx:
            mayar.verify_and_claim_download(raw_token)
        self.assertIn("expired", str(ctx.exception).lower())

    def test_09_private_storage_isolation(self):
        """Private product ZIPs live under products/, alongside other uploaded assets."""
        products_dir = os.path.join(os.path.dirname(__file__), "storage", "private", "products")
        self.assertTrue(os.path.isdir(products_dir), "Private products directory does not exist")
        zip_files = [name for name in os.listdir(products_dir) if name.lower().endswith(".zip")]
        self.assertTrue(zip_files, "Private storage must contain product ZIP archives")
        for filename in zip_files:
            self.assertTrue(os.path.isfile(os.path.join(products_dir, filename)))

    def test_10_audit_logging(self):
        """Rule 62: System must record audit log events."""
        conn = db.get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM audit_logs WHERE event_type IN ('ORDER_CREATED', 'PAYMENT_PAID', 'DOWNLOAD_COMPLETED')")
        count = cursor.fetchone()["count"]
        conn.close()
        self.assertGreater(count, 0, "Audit logs must record order, payment, and download events")

    def test_11_product_schema_includes_cost_price_for_admin(self):
        """Ensure admin product queries can read cost_price without crashing."""
        conn = db.get_db()
        columns = [row[1] for row in conn.execute('PRAGMA table_info(products)')]
        conn.close()
        self.assertIn('cost_price', columns, 'products table must expose cost_price for admin product forms')

if __name__ == "__main__":
    unittest.main(verbosity=2)
