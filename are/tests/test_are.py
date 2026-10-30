import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "ops"))
import are  # noqa: E402


def ledger_rows(*rows):
    return [{"date": d, "category": c, "amount": a, "verified": v} for d, c, a, v in rows]


class ScoringTests(unittest.TestCase):
    def test_weights_sum_to_one(self):
        self.assertAlmostEqual(sum(are.WEIGHTS.values()), 1.0)

    def test_perfect_score_is_five(self):
        row = {k: "5" for k in are.WEIGHTS}
        row["evidence"] = "E"
        self.assertEqual(are.score_row(row), 5.0)

    def test_unresearched_ideas_are_penalized(self):
        row = {k: "4" for k in are.WEIGHTS}
        e, n = dict(row, evidence="E"), dict(row, evidence="N")
        self.assertGreater(are.score_row(e), are.score_row(n))

    def test_real_file_ranks_and_validates(self):
        ranked = are.rank(are.ROOT / "research" / "opportunities.csv")
        self.assertGreaterEqual(len(ranked), 30)
        included = [r for r in ranked if r["excluded"] == "no"]
        self.assertEqual(included, sorted(included, key=lambda r: r["score"], reverse=True))
        self.assertTrue(all(r["excluded"] == "yes" for r in ranked[len(included):]))


class FinanceTests(unittest.TestCase):
    cfg = {"kill_switch": False, "total_spend_cap_usd": 250.0, "single_spend_cap_usd": 100.0}

    def test_unverified_revenue_never_counts(self):
        rows = ledger_rows(("2026-11-01", "revenue", 79.0, "no"), ("2026-11-01", "fee", 2.59, "yes"))
        s = are.summarize(rows)
        self.assertEqual(s["revenue"], 0.0)
        self.assertEqual(s["net_profit"], -2.59)
        self.assertEqual(s["unverified_rows"], 1)

    def test_net_profit_subtracts_refunds_and_costs(self):
        rows = ledger_rows(("2026-11-01", "revenue", 158.0, "yes"), ("2026-11-02", "refund", 79.0, "yes"),
                           ("2026-11-02", "ads", 50.0, "yes"))
        self.assertEqual(are.summarize(rows)["net_profit"], 29.0)

    def test_cap_counts_unverified_spend(self):
        rows = ledger_rows(("2026-11-01", "ads", 200.0, "no"))
        ok, _ = are.can_spend(60.0, rows, self.cfg)
        self.assertFalse(ok)

    def test_kill_switch_blocks_everything(self):
        ok, why = are.can_spend(1.0, [], dict(self.cfg, kill_switch=True))
        self.assertFalse(ok)
        self.assertIn("kill switch", why)

    def test_single_spend_cap(self):
        self.assertFalse(are.can_spend(150.0, [], self.cfg)[0])
        self.assertTrue(are.can_spend(99.0, [], self.cfg)[0])

    def test_week_filter(self):
        rows = ledger_rows(("2026-10-25", "revenue", 10.0, "yes"), ("2026-10-27", "revenue", 20.0, "yes"))
        since, until = are.week_bounds("2026-W44")
        self.assertEqual((since, until), ("2026-10-26", "2026-11-01"))
        self.assertEqual(are.summarize(rows, since, until)["revenue"], 20.0)

    def test_report_renders_from_repo_state(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            for d in ("finance", "ops", "analytics"):
                shutil.copytree(are.ROOT / d, tmp / d)
            text = are.render_report("2026-W44", root=tmp)
            self.assertIn("Net profit", text)
            self.assertIn("not measured", text)
        finally:
            shutil.rmtree(tmp)


if __name__ == "__main__":
    unittest.main()
