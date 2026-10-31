import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from engine import economics as ec, rank  # noqa: E402

MODEL = {"arpu_monthly": 100, "platform_fee_pct": 0.0, "payment_pct": 0.0, "payment_fixed": 0.0,
         "variable_cost_per_customer": 0, "cac": 0, "monthly_churn": {"base": 0.05, "high": 0.1},
         "fixed_costs": {m: 0 for m in ("M1", "M2", "M3", "M4", "M5", "M6")}}


class Economics(unittest.TestCase):
    def test_simple_case(self):
        self.assertEqual(ec.customers_needed(50_000, MODEL, 0, 0.05), 500)

    def test_fixed_costs_and_cac_raise_requirement(self):
        m = dict(MODEL, cac=200)  # each customer must fund 0.05*200 = $10/mo of replacement acquisition
        self.assertEqual(ec.customers_needed(1_000, m, 80, 0.05), 12)  # 1080 / 90

    def test_unreachable_when_cac_exceeds_contribution(self):
        self.assertIsNone(ec.customers_needed(1_000, dict(MODEL, cac=5_000), 0, 0.05))

    def test_fees_reduce_contribution(self):
        m = dict(MODEL, platform_fee_pct=0.17, payment_pct=0.029, payment_fixed=0.30, variable_cost_per_customer=3)
        self.assertAlmostEqual(ec.contribution(m), 100 * (1 - 0.199) - 3.30)

    def test_table_has_all_milestones_and_gates(self):
        t = ec.milestone_table(MODEL)
        self.assertEqual([r["id"] for r in t["rows"]], ["M1", "M2", "M3", "M4", "M5", "M6"])
        self.assertTrue(all(r["gate"] for r in t["rows"]))

    def test_real_assumptions_file_renders(self):
        import json
        models = json.load(open(ROOT / "research" / "economics.json"))["models"]
        self.assertIn("M6", ec.render(models))


class Ranking(unittest.TestCase):
    def setUp(self):
        self.rows = rank.rank(ROOT / "research" / "opportunities_b2b.csv")

    def test_at_least_30_opportunities(self):
        self.assertGreaterEqual(len(self.rows), 30)

    def test_weights(self):
        self.assertAlmostEqual(sum(rank.WEIGHTS.values()), 1.0)

    def test_excluded_last_and_never_recommendable(self):
        flags = [r["excluded"] == "yes" for r in self.rows]
        self.assertEqual(flags, sorted(flags))
        self.assertFalse(any(r["recommendable"] for r in self.rows if r["excluded"] == "yes"))

    def test_recommendation_requires_payment_proof(self):
        best = rank.best_recommendable(self.rows)
        self.assertEqual(best["payment_proof"], "yes")

    def test_non_recurring_profit_capped(self):
        row = {k: "5" for k in rank.WEIGHTS}
        row.update(id="X", recurring="no", evidence="E")
        self.assertAlmostEqual(rank.score(row), 5 - 4 * 0.25)
