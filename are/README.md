# Venture operating system

The operating system for an AI-operated software company: research, ranking, unit economics, approvals, finance, and reporting.
Start with [ARCHITECTURE.md](ARCHITECTURE.md), then [research/recommendation.md](research/recommendation.md), then [approvals/approvals.json](approvals/approvals.json).

```bash
cd are
python -m unittest discover -s tests                     # all tests
python -m engine.rank research/opportunities_b2b.csv     # B2B ranking (34 opportunities)
python -m engine.economics research/economics.json       # milestone requirements
python -m engine.collect --config research/collect.json --out ev.jsonl   # live data (needs internet; runs on Actions)
python -m ops.approvals check                            # approval gate (also runs in CI)
python -m ops.finance dashboard --out dashboard.html     # financial dashboard
python ops/are.py can-spend 25                           # spend cap + kill switch check
python ops/are.py report 2026-W44                        # weekly CEO report
```

## Status (2026-10-31)
- **Verified money:** $0 revenue, $0 spent, $0 profit.
- **Lead hypothesis:** B03, a Confluence Cloud accessibility checker. It needs a passing marketplace data test (Stage 1) before any build.
- **Fallback:** B01, a trust center plus questionnaire library.
- **Pending owner decisions:**
  - A-003: weekly schedule
  - A-005: B03 Stage 2

  Also pending: switching the repo to private (A-002, owner action).

The first round's files (`research/opportunities.csv`, EXP-001) are kept for the record. EXP-001 was superseded because a one-time $149 product can't credibly reach $50k/month.
