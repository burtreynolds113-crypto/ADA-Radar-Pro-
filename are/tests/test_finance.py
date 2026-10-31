import csv
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from ops import are, finance  # noqa: E402

SUBS = [
    {"customer_id": "c1", "plan": "pro", "mrr_usd": 99.0, "started": "2026-01-10", "ended": ""},
    {"customer_id": "c2", "plan": "pro", "mrr_usd": 99.0, "started": "2026-01-20", "ended": "2026-02-15"},
    {"customer_id": "c3", "plan": "team", "mrr_usd": 199.0, "started": "2026-02-03", "ended": ""},
]


class ChurnAndMrr(unittest.TestCase):
    def test_month_boundaries(self):
        self.assertEqual(finance.month_end("2026-02"), "2026-02-28")
        self.assertEqual(finance.month_end("2026-12"), "2026-12-31")
        self.assertEqual(finance.prev_month_end("2026-01"), "2025-12-31")

    def test_february(self):
        m = finance.month_metrics("2026-02", SUBS, [])
        self.assertEqual(m["mrr"], 298.0)          # c1 + c3; c2 churned
        self.assertEqual(m["customers"], 2)
        self.assertEqual(m["new_customers"], 1)
        self.assertEqual(m["churned"], 1)
        self.assertEqual(m["logo_churn"], 0.5)     # 1 of 2 active at start

    def test_no_customers_means_undefined_churn(self):
        self.assertIsNone(finance.month_metrics("2025-12", SUBS, [])["logo_churn"])

    def test_profit_and_margin_use_verified_rows_only(self):
        ledger = [
            {"date": "2026-02-03", "category": "revenue", "amount": 199.0, "verified": "yes"},
            {"date": "2026-02-03", "category": "fee", "amount": 6.07, "verified": "yes"},
            {"date": "2026-02-09", "category": "revenue", "amount": 500.0, "verified": "no"},
        ]
        m = finance.month_metrics("2026-02", SUBS, ledger)
        self.assertEqual(m["owner_profit"], 192.93)
        self.assertAlmostEqual(m["net_margin"], 0.9695, places=4)


class StripeImport(unittest.TestCase):
    ROWS = [
        {"id": "txn_1", "Type": "charge", "Amount": "99.00", "Fee": "3.17", "Created (UTC)": "2026-03-01 10:00", "Description": "Pro"},
        {"id": "txn_2", "Type": "refund", "Amount": "-99.00", "Fee": "0", "Created (UTC)": "2026-03-05 10:00", "Description": "Refund"},
        {"id": "txn_3", "Type": "payout", "Amount": "-500.00", "Fee": "0", "Created (UTC)": "2026-03-06 10:00", "Description": ""},
    ]

    def test_mapping(self):
        rows = finance.stripe_rows_to_ledger(self.ROWS, "A-009")
        cats = [(r[1], r[2]) for r in rows]
        self.assertEqual(cats, [("revenue", "99.00"), ("fee", "3.17"), ("refund", "99.00")])
        self.assertEqual(rows[1][4], "A-009")
        self.assertTrue(all(r[5] == "yes" for r in rows))

    def test_import_is_idempotent(self):
        d = Path(tempfile.mkdtemp())
        try:
            src, ledger = d / "stripe.csv", d / "ledger.csv"
            with open(src, "w", newline="") as f:
                w = csv.DictWriter(f, fieldnames=list(self.ROWS[0]))
                w.writeheader()
                w.writerows(self.ROWS)
            ledger.write_text(",".join(finance.LEDGER_FIELDS) + "\n")
            self.assertEqual(finance.import_stripe(src, ledger), 3)
            self.assertEqual(finance.import_stripe(src, ledger), 0)
            self.assertEqual(are.summarize(are.read_ledger(ledger))["net_profit"], -3.17)
        finally:
            shutil.rmtree(d)


class Dashboard(unittest.TestCase):
    def test_renders_with_empty_books(self):
        out = finance.render_dashboard(ROOT, today="2026-10-31")
        self.assertIn("Company financial dashboard", out)
        self.assertIn("<table>", out)


if __name__ == "__main__":
    unittest.main()
