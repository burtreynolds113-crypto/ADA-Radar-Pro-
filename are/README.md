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
- **B03 (Confluence accessibility checker) rejected** by its pre-registered marketplace test: real Cloud installs ≤ 43 (run 41150180633).
- **Lead:** B01, a trust center plus questionnaire answer library for small SaaS. Stage 1 (free generator, unpublished) is next; Stage 2 needs A-005.
- **Approved 2026-10-31:** A-003 (weekly report, now scheduled) and A-005 (B01 Stage 2). Go-live is waiting on the owner steps in `products/b01-trust-page/GO_LIVE_CHECKLIST.md`.

  Also pending: switching the repo to private (A-002, owner action).

The first round's files (`research/opportunities.csv`, EXP-001) are kept for the record. EXP-001 was superseded because a one-time $149 product can't credibly reach $50k/month.
