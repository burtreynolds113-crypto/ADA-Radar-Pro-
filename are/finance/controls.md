# Financial controls

- **Single source of truth:** `ledger.csv`. Columns: `date, category, amount, description, approval_id, verified, evidence`.
  - Amounts are positive numbers. The category decides whether a row is income or cost.
  - Categories: `revenue, refund, fee, hosting, domain, ads, ai_usage, software, support, other_cost`.
- **Verified** means it matches a Stripe payout, an invoice, or a bank line, and `evidence` names that document. Unverified rows are never counted as profit. They **are** counted against the spend caps.
- **Caps** (in `ops/config.json`):
  - Total spend: $250 lifetime until revenue is verified.
  - Any single spend: $100.
  - AI usage: $10/month.
- **Kill switch:** set `kill_switch: true` in `ops/config.json`. Every `can-spend` check then fails. Ads and payment links must also be paused manually; the agent has no API access to them.
- **Before any spend:** `python3 are/ops/are.py can-spend <amount>` must return OK, **and** an APPROVED entry must exist in `approvals/decisions.md`.
- **Weekly:** reconcile Stripe and ad invoices into the ledger, then run `python3 are/ops/are.py report <YYYY-Www>`.
- **Founder hours:** log them in `founder_hours.csv`. Target is ≤ 7 h/week once operating.
