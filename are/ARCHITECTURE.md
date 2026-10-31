# Venture operating system — architecture

Measure success by verified owner profit, not code. Every component below exists to:
- find evidence of paying demand,
- keep the owner in control of money, publishing, and outbound communication,
- report what is real.

```
                       ┌─────────────── GitHub Actions (open internet, free minutes) ───────────────┐
 research/collect.json │ research-collect.yml ──► engine/collect.py ──► run log + artifact (evidence)│
                       │ ci.yml ──► unit tests + approval gate (ops/approvals.py check)              │
                       │ weekly-report.yml ──► ops/are.py report + ops/finance.py dashboard (A-003)  │
                       └─────────────────────────────────────────────────────────────────────────────┘
        evidence/*.jsonl ──► engine/rank.py (opportunities_b2b.csv) ──► recommendation.md
        research/economics.json ──► engine/economics.py ──► milestones.md (customers/churn/CAC per milestone)
        Stripe CSV export ──► ops/finance.py import-stripe ──► finance/ledger.csv (verified only)
        finance/subscriptions.csv + ledger ──► ops/finance.py dashboard ──► MRR, churn, margin, owner profit
        approvals/approvals.json ◄── owner decisions; CI blocks unapproved spend, caps, and schedules
        ops/config.json ──► spend caps + kill switch (ops/are.py can-spend)
```

| Function | Component | Deterministic? | Status |
|---|---|---|---|
| Market research | `engine/collectors.py`, `engine/collect.py`, `research-collect.yml` | Yes | Built and tested; live runs happen on Actions |
| Evidence store | `engine/evidence.py` (append-only JSONL; every record needs a source URL and timestamp) | Yes | Built |
| Opportunity ranking | `engine/rank.py` (owner's criteria; no recommendation without payment proof) | Yes | Built |
| Milestone economics | `engine/economics.py` + `research/economics.json` | Yes | Built |
| Financial controls | `ops/are.py` (caps, kill switch), `ops/config.json` | Yes | Built |
| Financial reporting | `ops/finance.py` (Stripe import, MRR, churn, P&L, HTML dashboard) | Yes | Built; no real data yet |
| Approval system | `approvals/approvals.json` + `ops/approvals.py` enforced in CI | Yes | Built |
| CEO report | `ops/are.py report` + `weekly-report.yml` (manual until A-003) | Yes | Built |
| Product code | per-product folder after GO | — | Not started (blocked on Stage 1 / A-005) |
| Support assistance | FAQ plus AI-drafted replies that a human sends | AI only where it pays for itself | After first customers |

## What GitHub can and can't do here
- **Can:** store code and records; run tests and read-only jobs on Actions; host a static page via GitHub Pages (only with an approval); keep an audit trail through commits and run logs.
- **Can't:**
  - take payments (Stripe or the Atlassian Marketplace do that);
  - verify identity or tax status;
  - send marketing;
  - guarantee demand.
- **Secrets:** none are stored. When payments are approved, keys go in GitHub Actions secrets, scoped to the one workflow that needs them, and never in files.

## Safety rails
- No workflow has an active `schedule:` unless an approved record names it. CI fails otherwise.
- Every ledger cost must cite an approved approval whose cap it fits within. CI fails otherwise.
- The agent cannot mark approvals as approved: `decided_by` must be the owner or a quoted standing instruction. CI checks this field.
- Collectors are read-only, unauthenticated, rate-limited (1.5 s between requests), and retry at most twice.
