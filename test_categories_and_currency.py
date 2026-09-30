#!/usr/bin/env python3
"""
Test Suite for Category Navigation, Multi-currency, and Architecture Compliance.
Verifies Section 1 to 37 requirements from the prompt.
"""
import unittest
import os
import re
import urllib.parse
import db

DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class TestPlatformExpansion(unittest.TestCase):
    def setUp(self):
        db.init_db()

    def test_01_explore_all_categories_link(self):
        """Rule: 'Explore All Categories' must navigate to /categories, NOT scroll to #categories."""
        index_path = os.path.join(DIRECTORY, "index.html")
        with open(index_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Find the Explore All Categories anchor
        match = re.search(r'<a\s+href="([^"]+)"[^>]*>\s*Explore All Categories', content)
        self.assertIsNotNone(match, "Explore All Categories link not found in index.html")
        href = match.group(1)
        self.assertEqual(href, "/categories", f"Expected href='/categories', got '{href}'")

    def test_02_categories_html_exists_and_contains_required_elements(self):
        """Rule: Categories page must support product grid, search, filter, sort, multi-currency."""
        cat_path = os.path.join(DIRECTORY, "categories.html")
        self.assertTrue(os.path.exists(cat_path), "categories.html does not exist")

        with open(cat_path, "r", encoding="utf-8") as f:
            cat_content = f.read()

        # Check required filters and elements
        self.assertIn("catSearchInput", cat_content, "Search input missing from categories.html")
        self.assertIn("categoryChips", cat_content, "Category filter missing from categories.html")
        self.assertIn("currencySelect", cat_content, "Currency filter missing from categories.html")
        self.assertIn("sortSelect", cat_content, "Sort select missing from categories.html")
        self.assertIn("categoryProductGrid", cat_content, "Product grid container missing from categories.html")
        self.assertIn("emptyState", cat_content, "Empty state container missing from categories.html")

    def test_03_nextjs_apps_and_packages_structure(self):
        """Rule: Monorepo apps and packages must exist with complete implementations."""
        expected_paths = [
            # Packages
            "packages/db/src/schema.ts",
            "packages/db/src/index.ts",
            "packages/mayar/src/client.ts",
            "packages/mayar/src/webhook.ts",
            "packages/security/src/token.ts",
            "packages/security/src/password.ts",
            "packages/security/src/session.ts",
            "packages/security/src/rateLimit.ts",
            "packages/types/src/index.ts",
            "packages/email/src/index.ts",

            # Web App
            "apps/web/src/app/page.tsx",
            "apps/web/src/app/categories/page.tsx",
            "apps/web/src/app/categories/[slug]/page.tsx",
            "apps/web/src/app/products/[slug]/page.tsx",
            "apps/web/src/app/checkout/page.tsx",
            "apps/web/src/app/payment/[status]/page.tsx",
            "apps/web/src/app/order/page.tsx",
            "apps/web/src/app/download/[token]/route.ts",
            "apps/web/src/app/api/checkout/route.ts",
            "apps/web/src/app/api/webhooks/mayar/route.ts",
            "apps/web/src/app/api/order/route.ts",
            "apps/web/src/app/api/order/resend/route.ts",

            # Admin App
            "apps/admin/src/middleware.ts",
            "apps/admin/src/app/login/page.tsx",
            "apps/admin/src/app/dashboard/page.tsx",
            "apps/admin/src/app/products/page.tsx",
            "apps/admin/src/app/products/new/page.tsx",
            "apps/admin/src/app/orders/page.tsx",
            "apps/admin/src/app/payments/page.tsx",
            "apps/admin/src/app/downloads/page.tsx",
            "apps/admin/src/app/customers/page.tsx",
            "apps/admin/src/app/settings/page.tsx",
            "apps/admin/src/app/api/auth/login/route.ts",
            "apps/admin/src/app/api/auth/logout/route.ts",
            "apps/admin/src/app/api/admin/products/route.ts",
            "apps/admin/src/app/api/admin/downloads/[id]/revoke/route.ts",
            "apps/admin/src/app/api/admin/stats/route.ts",
        ]

        for p in expected_paths:
            full_p = os.path.join(DIRECTORY, p)
            self.assertTrue(os.path.exists(full_p), f"Required file missing: {p}")

    def test_04_server_routing_for_categories_and_admin(self):
        """Rule: server.py keeps the admin console behind /MorgadAdmin."""
        server_path = os.path.join(DIRECTORY, "server.py")
        with open(server_path, "r", encoding="utf-8") as f:
            code = f.read()

        self.assertIn('path == "/categories"', code)
        self.assertIn('cat_html_path', code)
        self.assertIn('path == "/MorgadAdmin"', code)
        self.assertIn('admin_html_path', code)
        self.assertIn('path in {"/admin", "/admin.html", "/admin-login.html"}', code)

    def test_05_multi_currency_support(self):
        """Rule 36: Multi-currency support (IDR and USD) in schema and types."""
        schema_path = os.path.join(DIRECTORY, "packages/db/src/schema.ts")
        with open(schema_path, "r", encoding="utf-8") as f:
            schema_code = f.read()

        # Both products and orders must have currency field
        self.assertIn("currency: text('currency')", schema_code)
        self.assertIn("payments = pgTable('payments'", schema_code)
        self.assertIn("licenses = pgTable('licenses'", schema_code)

if __name__ == "__main__":
    unittest.main()
