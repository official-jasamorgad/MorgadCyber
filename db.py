"""
Database Module for Digital Product Platform (AGENT.md compliance).
Implements SQLite schema, foreign keys, indexes, and seeded data.
"""
import sqlite3
import os
import zipfile
from datetime import datetime, timezone, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "morgad.db")
STORAGE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "storage", "private")
PRODUCTS_DIR = os.path.join(STORAGE_DIR, "products")
DEFAULT_PRODUCT_ID = "prod-1"
DEFAULT_PRODUCT_NAME = "autocad dile"
DEFAULT_PRODUCT_SLUG = "autocad-dile"
DEFAULT_PRODUCT_CATEGORY = "ARITEK TOOLS"
DEFAULT_PRODUCT_DRIVE_ID = "1IubrS3C-p_nZNv1iCFV2vFrfVA5vq3Xa"
DEFAULT_STOCK_QUANTITY = 50

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.execute("PRAGMA busy_timeout = 30000;")
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn

def _normalize_product_values(cursor):
    cursor.execute("UPDATE products SET stock_quantity = 50 WHERE stock_quantity IS NULL OR stock_quantity <= 0")
    cursor.execute("UPDATE products SET image_path = ? WHERE image_path IS NULL OR TRIM(image_path) = '' OR image_path = 'default.jpg'", ("/assets/img/logo.png",))
    cursor.execute("UPDATE products SET status = 'published' WHERE status IS NULL OR TRIM(status) = ''")
    cursor.execute("UPDATE products SET is_published = 1 WHERE is_published IS NULL OR is_published = 0")
    cursor.execute("UPDATE products SET currency = 'IDR' WHERE currency IS NULL OR TRIM(currency) = ''")
    cursor.execute("UPDATE products SET cost_price = NULL WHERE cost_price IS NOT NULL AND cost_price < 0")


def init_db():
    os.makedirs(STORAGE_DIR, exist_ok=True)
    if not os.path.exists(DB_PATH) or os.path.getsize(DB_PATH) == 0:
        open(DB_PATH, "ab").close()

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys = OFF")
        cursor.execute("DROP TABLE IF EXISTS products_legacy")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT,
            slug TEXT,
            price REAL,
            category TEXT,
            google_drive_id TEXT,
            image_path TEXT,
            is_published INTEGER DEFAULT 1,
            description TEXT,
            currency TEXT DEFAULT 'IDR',
            file_path TEXT,
            stock_quantity INTEGER DEFAULT 50,
            file_size TEXT,
            version TEXT DEFAULT '1.0.0',
            status TEXT DEFAULT 'published',
            cost_price REAL,
            max_downloads INTEGER DEFAULT 5,
            created_at TEXT,
            updated_at TEXT
        );
        """)

        product_columns = {row["name"] for row in cursor.execute("PRAGMA table_info(products)")}
        for column_name, column_sql in {
            "description": "TEXT",
            "category": "TEXT DEFAULT 'general'",
            "currency": "TEXT DEFAULT 'IDR'",
            "file_path": "TEXT",
            "image_path": "TEXT",
            "stock_quantity": f"INTEGER DEFAULT {DEFAULT_STOCK_QUANTITY}",
            "google_drive_id": "TEXT",
            "file_size": "TEXT",
            "version": "TEXT DEFAULT '1.0.0'",
            "status": "TEXT DEFAULT 'published'",
            "is_published": "INTEGER DEFAULT 1",
            "cost_price": "REAL",
            "max_downloads": "INTEGER DEFAULT 5",
            "created_at": "TEXT",
            "updated_at": "TEXT",
            "slug": "TEXT UNIQUE",
        }.items():
            if column_name not in product_columns:
                cursor.execute(f"ALTER TABLE products ADD COLUMN {column_name} {column_sql}")

        _normalize_product_values(cursor)
        conn.commit()
    finally:
        cursor.execute("PRAGMA foreign_keys = ON")
        conn.close()

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Tips & Guides',
        summary TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL,
        image_url TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        published_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            order_number TEXT UNIQUE NOT NULL,
            product_id TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'IDR',
            payment_provider TEXT DEFAULT 'doku',
            payment_reference TEXT,
            payment_status TEXT DEFAULT 'PENDING',
            order_status TEXT DEFAULT 'PENDING',
            download_status TEXT DEFAULT 'NOT_AVAILABLE',
            created_at TEXT NOT NULL,
            paid_at TEXT,
            FOREIGN KEY (product_id) REFERENCES products(id)
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            order_id TEXT,
            invoice_id TEXT,
            product_id TEXT,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'IDR',
            status TEXT DEFAULT 'pending',
            created_at TEXT NOT NULL,
            paid_at TEXT,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            provider TEXT DEFAULT 'doku',
            provider_reference TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'IDR',
            status TEXT NOT NULL,
            payment_channel TEXT,
            raw_reference TEXT,
            created_at TEXT NOT NULL,
            paid_at TEXT,
            FOREIGN KEY (order_id) REFERENCES orders(id)
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS download_access (
            id TEXT PRIMARY KEY,
            order_id TEXT UNIQUE NOT NULL,
            product_id TEXT NOT NULL,
            token_hash TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            callback_token_expires_at TEXT,
            download_count INTEGER DEFAULT 0,
            max_downloads INTEGER DEFAULT 5,
            revoked INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            last_download_at TEXT,
            last_download_ip TEXT,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS download_tokens (
            id TEXT PRIMARY KEY,
            token TEXT UNIQUE NOT NULL,
            order_id TEXT,
            product_id TEXT,
            invoice_id TEXT,
            google_drive_id TEXT,
            expires_at TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            created_at TEXT NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );
        """)

        download_columns = {row["name"] for row in cursor.execute("PRAGMA table_info(download_access)")}
        if "callback_token_expires_at" not in download_columns:
            cursor.execute("ALTER TABLE download_access ADD COLUMN callback_token_expires_at TEXT")

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS webhook_events (
            id TEXT PRIMARY KEY,
            provider TEXT DEFAULT 'doku',
            event_id TEXT UNIQUE NOT NULL,
            event_type TEXT NOT NULL,
            payload_hash TEXT NOT NULL,
            processed INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS licenses (
            id TEXT PRIMARY KEY,
            order_id TEXT UNIQUE NOT NULL,
            product_id TEXT NOT NULL,
            license_key TEXT UNIQUE NOT NULL,
            status TEXT DEFAULT 'ACTIVE',
            created_at TEXT NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id)
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            event_type TEXT NOT NULL,
            order_id TEXT,
            details TEXT,
            ip_address TEXT,
            created_at TEXT NOT NULL
        );
        """)

        conn.commit()
    finally:
        conn.close()
    print("Database schema verified.")


def ensure_default_product():
    """Create the required testing product if the DB is new or empty."""
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
        INSERT INTO products (
            id, name, slug, price, category, google_drive_id, image_path, is_published,
            status, currency, file_path, stock_quantity, file_size, version, max_downloads, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            slug = excluded.slug,
            price = excluded.price,
            category = excluded.category,
            google_drive_id = excluded.google_drive_id,
            image_path = excluded.image_path,
            is_published = excluded.is_published,
            status = excluded.status,
            currency = excluded.currency,
            file_path = excluded.file_path,
            stock_quantity = excluded.stock_quantity,
            file_size = excluded.file_size,
            version = excluded.version,
            max_downloads = excluded.max_downloads,
            updated_at = excluded.updated_at
    """, (
        DEFAULT_PRODUCT_ID,
        DEFAULT_PRODUCT_NAME,
        DEFAULT_PRODUCT_SLUG,
        10,
        DEFAULT_PRODUCT_CATEGORY,
        DEFAULT_PRODUCT_DRIVE_ID,
        "/assets/img/logo.png",
        1,
        "published",
        "IDR",
        f"google-drive://{DEFAULT_PRODUCT_DRIVE_ID}",
        DEFAULT_STOCK_QUANTITY,
        "Google Drive",
        "1.0.0",
        5,
        now,
        now,
    ))
    conn.execute("UPDATE products SET stock_quantity = 50 WHERE stock_quantity IS NULL OR stock_quantity <= 0")
    conn.execute("UPDATE products SET image_path = ? WHERE image_path IS NULL OR TRIM(image_path) = ''", ("/assets/img/logo.png",))
    conn.execute("UPDATE products SET status = 'published' WHERE status IS NULL OR TRIM(status) = ''")
    conn.execute("UPDATE products SET is_published = 1 WHERE is_published IS NULL OR is_published = 0")
    conn.commit()
    conn.close()
    print("Default product seeded: autocad dile")

def get_google_drive_id(product_id):
    """Return the configured Google Drive file ID for one product."""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT google_drive_id FROM products WHERE id = ? AND status = 'published'",
            (product_id,),
        ).fetchone()
        return row["google_drive_id"] if row else None
    finally:
        conn.close()

def get_product_file_path(product_id):
    """Return the stored local file path for a published product."""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT file_path FROM products WHERE id = ? AND status = 'published'",
            (product_id,),
        ).fetchone()
        return row["file_path"] if row else None
    finally:
        conn.close()

def create_private_master_files():
    """Create master ZIP archives in the private products directory."""
    os.makedirs(PRODUCTS_DIR, exist_ok=True)
    products_files = [
        ("viral_visual_pack_vol1.zip", "Viral Visual Pack Vol. 01 — 80+ 4K Cyberpunk & Viral Images"),
        ("premium_aesthetic_collection.zip", "Premium Aesthetic Collection — 110+ Pastel Architectural Assets"),
        ("creative_image_bundle.zip", "Creative Image Bundle — 95+ 3D Acrylic & Marble Fluid Swirls"),
        ("social_media_image_pack.zip", "Social Media Image Pack — 75+ High-Impact Wilderness Scenes"),
        ("cinematic_visual_collection.zip", "Cinematic Visual Collection — 120+ 4K Cinema DCI Scenes")
    ]

    for filename, description in products_files:
        filepath = os.path.join(PRODUCTS_DIR, filename)
        if not os.path.exists(filepath):
            with zipfile.ZipFile(filepath, 'w', zipfile.ZIP_DEFLATED) as zf:
                zf.writestr("README.txt", f"{description}\n\nLicensed via 1024 Tera Digital Marketplace.\nAuthorized for Commercial and Personal Use.\nSHA256 Verified Master File.\n")
                zf.writestr("LICENSE.txt", "COMMERCIAL DIGITAL ASSET LICENSE\n1024 Tera Hub — Unlimited Impressions, No Resale of Raw Files.")
                zf.writestr("MANIFEST.json", '{"format": "PNG/UHD", "color_space": "sRGB", "verified": true}')
            print(f"Created private master file: {filepath}")

def _seed_legacy_demo_catalog():
    """Seed the retired demo catalog for legacy local testing only."""
    create_private_master_files()
    conn = get_db()
    cursor = conn.cursor()

    now = datetime.now(timezone.utc).isoformat()

    catalog = [
        {
            "id": "prod-1",
            "name": "Viral Visual Pack Vol. 01",
            "slug": "viral-visual-pack-vol-01",
            "description": "High-impact viral images for maximum engagement. Specifically engineered with high-contrast color palettes and cyberpunk aesthetics.",
            "category": "viral",
            "price": 7.99,
            "file_path": os.path.join(PRODUCTS_DIR, "viral_visual_pack_vol1.zip"),
            "file_size": "1.2 GB",
            "version": "1.0.0",
            "max_downloads": 5
        },
        {
            "id": "prod-2",
            "name": "Premium Aesthetic Collection",
            "slug": "premium-aesthetic-collection",
            "description": "Curated high-quality aesthetic photos for creators. Soft pastel tones, architectural geometric arches, and soothing warm natural light.",
            "category": "photos",
            "price": 9.99,
            "file_path": os.path.join(PRODUCTS_DIR, "premium_aesthetic_collection.zip"),
            "file_size": "2.4 GB",
            "version": "1.2.0",
            "max_downloads": 5
        },
        {
            "id": "prod-3",
            "name": "Creative Image Bundle",
            "slug": "creative-image-bundle",
            "description": "A bundle of creative & modern images for any project. Multi-layered 3D fluid acrylic swirls, vibrant neon pigment blends.",
            "category": "creative",
            "price": 8.99,
            "file_path": os.path.join(PRODUCTS_DIR, "creative_image_bundle.zip"),
            "file_size": "1.8 GB",
            "version": "1.0.0",
            "max_downloads": 5
        },
        {
            "id": "prod-4",
            "name": "Social Media Image Pack",
            "slug": "social-media-image-pack",
            "description": "Perfectly sized images for all social platforms. Serene alpine wilderness reflections, rugged peaks, and moody nature photography.",
            "category": "viral",
            "price": 6.99,
            "file_path": os.path.join(PRODUCTS_DIR, "social_media_image_pack.zip"),
            "file_size": "950 MB",
            "version": "1.1.0",
            "max_downloads": 5
        },
        {
            "id": "prod-featured",
            "name": "Cinematic Visual Collection",
            "slug": "cinematic-visual-collection",
            "description": "A premium handpicked collection of cinematic visuals perfect for creators, designers and filmmakers.",
            "category": "featured",
            "price": 19.99,
            "file_path": os.path.join(PRODUCTS_DIR, "cinematic_visual_collection.zip"),
            "file_size": "3.6 GB",
            "version": "2.0.0",
            "max_downloads": 10
        },
        {
            "id": "rental_unlocktool_6h",
            "name": "Sewa Unlocktool 6 Jam",
            "slug": "sewa-unlocktool-6-jam",
            "description": "Sewa akses Unlocktool selama 6 jam untuk servis perangkat yang sah.",
            "category": "software",
            "price": 10000,
            "currency": "IDR",
            "file_path": os.path.join(PRODUCTS_DIR, "viral_visual_pack_vol1.zip"),
            "file_size": "rental-service.zip",
            "version": "1.0.0",
            "max_downloads": 1
        },
        {
            "id": "rental_unlocktool_12h",
            "name": "Sewa Unlocktool 12 Jam",
            "slug": "sewa-unlocktool-12-jam",
            "description": "Sewa akses Unlocktool selama 12 jam untuk servis perangkat yang sah.",
            "category": "software",
            "price": 15000,
            "currency": "IDR",
            "file_path": os.path.join(PRODUCTS_DIR, "viral_visual_pack_vol1.zip"),
            "file_size": "rental-service.zip",
            "version": "1.0.0",
            "max_downloads": 1
        },
        {
            "id": "rental_unlocktool_24h",
            "name": "Sewa Unlocktool 24 Jam",
            "slug": "sewa-unlocktool-24-jam",
            "description": "Sewa akses Unlocktool selama 24 jam untuk servis perangkat yang sah.",
            "category": "software",
            "price": 20000,
            "currency": "IDR",
            "file_path": os.path.join(PRODUCTS_DIR, "viral_visual_pack_vol1.zip"),
            "file_size": "rental-service.zip",
            "version": "1.0.0",
            "max_downloads": 1
        },
        {
            "id": "rental_dft_pro_24h",
            "name": "Sewa DFT Pro Tool 24 Jam",
            "slug": "sewa-dft-pro-tool-24-jam",
            "description": "Sewa akses DFT Pro Tool selama 24 jam untuk servis perangkat yang sah.",
            "category": "software",
            "price": 25000,
            "currency": "IDR",
            "file_path": os.path.join(PRODUCTS_DIR, "viral_visual_pack_vol1.zip"),
            "file_size": "rental-service.zip",
            "version": "1.0.0",
            "max_downloads": 1
        },
        {
            "id": "rental_dft_pro_48h",
            "name": "Sewa DFT Pro Tool 48 Jam",
            "slug": "sewa-dft-pro-tool-48-jam",
            "description": "Sewa akses DFT Pro Tool selama 48 jam untuk servis perangkat yang sah.",
            "category": "software",
            "price": 30000,
            "currency": "IDR",
            "file_path": os.path.join(PRODUCTS_DIR, "viral_visual_pack_vol1.zip"),
            "file_size": "rental-service.zip",
            "version": "1.0.0",
            "max_downloads": 1
        },
        {
            "id": "rental_tfm_24h",
            "name": "Sewa TFM Tool 24 Jam",
            "slug": "sewa-tfm-tool-24-jam",
            "description": "Sewa akses TFM Tool selama 24 jam untuk servis perangkat yang sah.",
            "category": "software",
            "price": 15000,
            "currency": "IDR",
            "file_path": os.path.join(PRODUCTS_DIR, "viral_visual_pack_vol1.zip"),
            "file_size": "rental-service.zip",
            "version": "1.0.0",
            "max_downloads": 1
        },
        {
            "id": "rental_cf_tool_24h",
            "name": "Sewa CF Tool Instan 24 Jam",
            "slug": "sewa-cf-tool-instan-24-jam",
            "description": "Sewa akses CF Tool Instan selama 24 jam untuk servis perangkat yang sah.",
            "category": "software",
            "price": 12000,
            "currency": "IDR",
            "file_path": os.path.join(PRODUCTS_DIR, "viral_visual_pack_vol1.zip"),
            "file_size": "rental-service.zip",
            "version": "1.0.0",
            "max_downloads": 1
        },
        {
            "id": "rental_android_multi_tool_24h",
            "name": "Android Multi Tool 24 Jam",
            "slug": "android-multi-tool-24-jam",
            "description": "Sewa akses Android Multi Tool selama 24 jam untuk servis perangkat yang sah.",
            "category": "software",
            "price": 11000,
            "currency": "IDR",
            "file_path": os.path.join(PRODUCTS_DIR, "viral_visual_pack_vol1.zip"),
            "file_size": "rental-service.zip",
            "version": "1.0.0",
            "max_downloads": 1
        }
    ]

    # Temporary catalog fixture: five pages with 40 products each.
    fixture_categories = ["viral", "photos", "creative", "digital_asset", "template", "software", "journal", "ebook"]
    fixture_images = [
        "cyberpunk-tunnel.svg",
        "pink-archway.svg",
        "fluid-swirl.svg",
        "mountain-lake.svg",
        "featured-city.svg",
    ]
    for index in range(200):
        page = index // 40 + 1
        item = index % 40 + 1
        product_number = index + 1
        category = fixture_categories[index % len(fixture_categories)]
        slug = f"temporary-product-{product_number:03d}"
        catalog.append({
            "id": f"fixture-{product_number:03d}",
            "name": f"Temporary Product {product_number:03d}",
            "slug": slug,
            "description": f"Produk fiktif sementara untuk halaman katalog {page}, item {item}. Silakan ubah detail ini nanti.",
            "category": category,
            "price": 49000 + (index % 12) * 10000,
            "file_path": os.path.join(PRODUCTS_DIR, "viral_visual_pack_vol1.zip"),
            "file_size": "50 MB",
            "version": "1.0.0",
            "max_downloads": 5,
        })

    for p in catalog:
        cursor.execute("""
        INSERT INTO products (id, name, slug, description, category, price, currency, file_path, file_size, version, status, max_downloads, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            price = excluded.price,
            currency = excluded.currency,
            file_path = excluded.file_path,
            updated_at = excluded.updated_at;
        """, (p["id"], p["name"], p["slug"], p["description"], p["category"], p["price"], p.get("currency", "USD"), p["file_path"], p["file_size"], p["version"], p["max_downloads"], now, now))

    conn.commit()
    conn.close()
    print("Catalog products successfully seeded into database.")

def seed_db():
    """Create the required product seed when the project starts without catalog data."""
    ensure_default_product()

if __name__ == "__main__":
    init_db()
    seed_db()
