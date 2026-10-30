# Autonomous Revenue Engine (ARE)

The operating system for this venture: research, experiments, approvals, finance, and reports.

Start with the latest CEO report in `reports/weekly/`, then `approvals/decisions.md`.

```bash
python3 are/ops/are.py score              # rank opportunities
python3 are/ops/are.py ledger             # verified P&L + spend vs cap
python3 are/ops/are.py can-spend 25       # pre-spend check (caps + kill switch)
python3 are/ops/are.py report 2026-W45    # generate the weekly CEO report
python3 -m unittest discover -s are/tests # tests
```

## Current state (2026-10-30)
- **Lead candidate:** O01, ACR Kit, a self-serve VPAT/ACR builder for small B2B SaaS.
- **Next step:** EXP-001 paid pre-order test. Blocked on approval A-001.
- **Money:** $0 revenue, $0 spend.

## Operating functions (Phase 7 plan; deterministic first, AI only where it earns its cost)
| Function | Mechanism | Status |
|---|---|---|
| Research & market intel | Scored CSV + `are.py score`; re-run quarterly | Built |
| Financial reconciliation | `ledger.csv` + `are.py ledger/report`; Stripe CSV import later | Built (manual entry) |
| Risk & spend control | `config.json` caps + kill switch + `can-spend` | Built |
| CEO reporting | `are.py report` weekly | Built |
| Approval queue | `approvals/decisions.md` | Built |
| Product dev & testing | CI tests per product | After GO |
| Growth analysis | metrics.json from analytics/Stripe exports | After launch |
| Support assistance | FAQ + AI-drafted replies, human-sent | After first customers |
