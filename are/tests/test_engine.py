import json
import shutil
import sys
import tempfile
import unittest
from unittest import mock
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
FIX = Path(__file__).resolve().parent / "fixtures"

from engine import collect, collectors as c, evidence as ev  # noqa: E402
from ops import approvals as ap  # noqa: E402


class CollectorParsing(unittest.TestCase):
    def test_atlassian(self):
        rows = c.parse_atlassian_search((FIX / "atlassian_search.json").read_text())
        self.assertEqual([r["installs"] for r in rows], [1520, 12, None])
        self.assertEqual(rows[0]["vendor"], "Vendor A")
        s = c.summarize_listings(rows)
        self.assertEqual((s["listings"], s["with_installs"], s["total_installs"]), (3, 2, 1532))
        self.assertEqual(s["listings_over_1000_installs"], 1)
        self.assertEqual((s["paid_listings"], s["paid_installs"]), (1, 1520))

    def test_wordpress_strips_html_and_scales_rating(self):
        rows = c.parse_wordpress_search((FIX / "wordpress_search.json").read_text())
        self.assertEqual(rows[0]["name"], "Accessibility Checker")
        self.assertAlmostEqual(rows[0]["stars"], 4.4)

    def test_hn(self):
        r = c.parse_hn_search((FIX / "hn_search.json").read_text())
        self.assertEqual(r["hits"], 37)
        self.assertEqual(r["examples"][0], "https://news.ycombinator.com/item?id=123")

    def test_shopify_jsonld(self):
        r = c.parse_shopify_app((FIX / "shopify_app.html").read_text())
        self.assertEqual((r["reviews"], r["stars"]), (61, 4.9))
        self.assertIsNone(c.parse_shopify_app("<html></html>"))

    def test_relevance_filter_drops_offtopic_apps(self):
        rows = [{"name": "Access Agent for Jira"}, {"name": "Clarable Accessibility Checker"}, {"name": "WCAG Lens"}]
        self.assertEqual([r["name"] for r in c.relevant(rows, ["accessib", "wcag"])],
                         ["Clarable Accessibility Checker", "WCAG Lens"])
        self.assertEqual(len(c.relevant(rows, None)), 3)

    def test_version_payment_model(self):
        self.assertEqual(c.parse_atlassian_version('{"paymentModel": "atlassian"}'), "atlassian")

    def test_hn_query_is_exact(self):
        u = c.hn_search_url("VPAT")
        self.assertIn("typoTolerance=false", u)
        self.assertIn("%22VPAT%22", u)

    def test_urls_are_encoded(self):
        self.assertIn("text=alt+text", c.atlassian_search_url("alt text"))
        self.assertIn("numericFilters=created_at_i%3E100", c.hn_search_url("x", since_unix=100))


class CollectJobs(unittest.TestCase):
    def test_run_job_with_fake_fetcher_produces_valid_evidence(self):
        body = (FIX / "atlassian_search.json").read_text()
        recs, line = collect.run_job({"opportunity": "B03", "source": "atlassian", "query": "accessibility"},
                                     fetcher=lambda url: body)
        self.assertTrue(all(ev.validate(r) for r in recs))
        self.assertIn("1532 installs", line)

    def test_retry_then_give_up(self):
        calls = []

        def bad(url):
            calls.append(url)
            raise OSError("down")
        with mock.patch.object(collect.time, "sleep"), self.assertRaises(OSError):
            collect.fetch_with_retry("http://x", bad)
        self.assertEqual(len(calls), collect.MAX_RETRIES + 1)

    def test_config_is_valid(self):
        cfg = json.loads((ROOT / "research" / "collect.json").read_text())
        self.assertGreaterEqual(len(cfg["jobs"]), 20)
        for j in cfg["jobs"]:
            self.assertIn(j["source"], {"atlassian", "wordpress", "hn", "shopify_app"})


class EvidenceRules(unittest.TestCase):
    def test_rejects_missing_source(self):
        with self.assertRaises(ev.EvidenceError):
            ev.make("B01", "price", "x", 1, "", "api")

    def test_rejects_unknown_kind(self):
        with self.assertRaises(ev.EvidenceError):
            ev.make("B01", "vibes", "x", 1, "https://a", "api")

    def test_roundtrip(self):
        d = Path(tempfile.mkdtemp())
        try:
            ev.append(d / "e.jsonl", [ev.make("B01", "price", "p", 49, "https://a", "web_search")])
            self.assertEqual(ev.load(d / "e.jsonl")[0]["value"], 49)
        finally:
            shutil.rmtree(d)


class ApprovalGate(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        for sub in ("approvals", "finance", "ops"):
            shutil.copytree(ROOT / sub, self.tmp / "are" / sub, ignore=shutil.ignore_patterns("__pycache__"))
        (self.tmp / ".github" / "workflows").mkdir(parents=True)
        self.root = self.tmp / "are"

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def errors(self):
        return ap.check(self.root, self.tmp)

    def test_repo_state_passes(self):
        self.assertEqual(ap.check(), [])

    def test_unapproved_spend_fails(self):
        with open(self.root / "finance" / "ledger.csv", "a") as f:
            f.write("2026-11-01,ads,20,test,A-003,yes,inv-1\n")
        self.assertTrue(any("without approved" in e for e in self.errors()))

    def test_spend_over_cap_fails(self):
        data = json.loads((self.root / "approvals" / "approvals.json").read_text())
        data["approvals"].append({"id": "A-T", "date": "2026-11-01", "request": "t", "status": "approved",
                                  "spend_cap_usd": 10, "decided_by": "owner", "decided_at": "2026-11-01"})
        (self.root / "approvals" / "approvals.json").write_text(json.dumps(data))
        with open(self.root / "finance" / "ledger.csv", "a") as f:
            f.write("2026-11-01,domain,12,test,A-T,yes,inv-1\n")
        self.assertTrue(any("exceeds approved cap" in e for e in self.errors()))

    def test_agent_cannot_self_approve(self):
        data = json.loads((self.root / "approvals" / "approvals.json").read_text())
        data["approvals"][3].update(status="approved", decided_by="claude", decided_at="2026-11-01")
        (self.root / "approvals" / "approvals.json").write_text(json.dumps(data))
        self.assertTrue(any("must be owner" in e for e in self.errors()))

    def test_unapproved_schedule_fails(self):
        (self.tmp / ".github" / "workflows" / "x.yml").write_text("on:\n  schedule:\n    - cron: '0 0 * * *'\n")
        self.assertTrue(any("schedule" in e for e in self.errors()))

    def test_commented_schedule_is_fine(self):
        (self.tmp / ".github" / "workflows" / "x.yml").write_text("on:\n  # schedule:\n  workflow_dispatch:\n")
        self.assertEqual(self.errors(), [])


if __name__ == "__main__":
    unittest.main()
