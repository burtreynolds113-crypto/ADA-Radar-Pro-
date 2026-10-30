# Approval queue & decision log

Rules:
- The agent never spends, publishes, activates live payments, creates accounts, or sends external messages without an **APPROVED** entry here.
- An approval covers only what it names.
- Spend is also enforced by `ops/are.py can-spend`.

| ID | Date | Request | Spend cap | Status | Decided by |
|---|---|---|---|---|---|
| A-001 | 2026-10-30 | Run EXP-001 (ACR Kit paid pre-order test) | $115 | **PENDING** | — |

## A-001 — details
**Approving authorizes exactly these actions, and nothing else:**

| # | Action | Cost |
|---|---|---|
| 1 | **Founder** registers one domain | ≈ $10–15/yr; registrar price varies, so record the actual amount |
| 2 | **Founder** creates a Stripe account and one Payment Link: $79, one-time, live mode. Agent supplies the exact settings. | $0 fixed; ~2.9% + $0.30 per sale |
| 3 | Agent deploys `experiments/EXP-001.../landing/` to free static hosting (Cloudflare Pages or GitHub Pages) with cookieless analytics | $0 |
| 4 | **Founder** creates a Google Ads account. Agent prepares one search campaign: intent keywords only, $5/day, hard stop at $100 or 21 days. Abort before spending if Keyword Planner median CPC > $5. | ≤ $100 |
| 5 | Agent reports results against the pre-registered go/no-go criteria. No further spend without a new approval. | — |

**Not authorized:**
- Any email, DM, community post, or outreach.
- Testimonials or any claims beyond the landing page as written.
- Any spend above $115.

**Founder time required:** about 2–3 hours, for identity verification on Stripe and Google Ads plus the domain purchase.

**Alternative (B): organic-only.** Same steps without Google Ads; $15 spend. The agent writes a worked-example VPAT guide page for SEO. Expect 60–90 days before there's enough traffic to judge.

**Alternative (C): decline.** The agent moves to O02 (Shopify app), which needs about 2 weeks of build before any market signal.
