# EXP-001 — ACR Kit paid pre-order test

**Status:** DRAFT — blocked on approval **A-001** (`approvals/decisions.md`).
Nothing below has been published, purchased, or sent.

## Hypothesis
Small B2B SaaS teams that a prospect has just asked for a VPAT/ACR will pay
**$79 (founding pre-order; list $149)** for a self-serve tool that produces an
honest, evidence-backed ACR in VPAT 2.5Rev format within a few days.

## Definition
| | |
|---|---|
| Customer | Founder, CTO or PM at a 5–100 person B2B SaaS company with no accessibility specialist on staff. |
| Problem | A deal is blocked until they send a VPAT/ACR. Consultants quote ~$550–$4,450+ and weeks [S10]; the free OpenACR editor and ITI template [S12] are blank forms that don't tell them what to test or how to word results. |
| Purchase trigger | "Please provide your VPAT / Accessibility Conformance Report" in a procurement or security questionnaire [S13]. |
| Price | $149 per report (one product, one edition). Founding pre-order $79, fully refundable any time before delivery; automatic refund if not delivered by the stated date. |
| Advantage | (1) Automated axe-core scan of the customer's key screens, mapped to WCAG criteria (automation finds ~57% of issues by volume [S6]); (2) plain-English manual test steps for every remaining criterion; (3) honest-by-default conformance wording — the tool never pre-fills "Supports"; (4) export to VPAT 2.5Rev (WCAG / 508 / INT) .docx. |
| What it is NOT | Not a certification (none exists [S12]), not legal advice, not a compliance guarantee, not an overlay. The customer attests to their own results. |
| Discovery channel (test) | Google Search ads on purchase-intent queries ("VPAT template", "how to create a VPAT", "VPAT for SaaS", "accessibility conformance report template"). |
| Discovery channel (durable) | SEO guides with worked VPAT examples; optional public hosted ACR page per customer with an unobtrusive "made with" link (product-led); SaaS directories. |

## Measurement
All numbers recorded in `analytics/metrics.json`; money in `finance/ledger.csv`.

| Metric | Source of truth |
|---|---|
| Qualified visitors | Ad platform clicks on intent keywords + analytics |
| Checkout started | Stripe |
| **Paid pre-orders (primary)** | Stripe — succeeded payments only |
| Refunds | Stripe |
| Cost per paid pre-order | ad spend ÷ paid pre-orders |

Clicks, email signups and survey answers are recorded but are **not** a go signal.

## Go / no-go (decided before launch; 21-day window, ≤ $100 ads)
- **GO → Phase 4 build:** ≥ 3 paid pre-orders **and** cost per pre-order ≤ $35.
- **ITERATE ONCE:** 1–2 paid pre-orders, or ≥ 2% checkout-start rate with 0 payments. One copy/price revision, max $50 more ads, needs a new approval.
- **NO-GO → kill, refund nothing owed, pivot to O02 (Shopify audit app):** 0 paid pre-orders after ≥ 250 qualified visitors.
- **INCONCLUSIVE:** < 250 qualified visitors when budget is spent (e.g., CPC too high). Do not spend more; switch to organic-only guide page and re-evaluate in 60 days.

## Known uncertainty
- **CPC is unknown.** Consultancies bid on VPAT terms; if CPC is > ~$4, $100 buys < 25 clicks and the test is inconclusive. Mitigation: check Keyword Planner estimates (free) before enabling spend; abort if median CPC > $5.
- Pre-order buyers may differ from post-launch buyers.
- Buyers' procurement teams may reject self-produced ACRs. Self-produced ACRs are normal practice (ITI doesn't review reports [S12]), but this must be confirmed by buyer behavior.
- Liability: a signed ACR can be evidence in litigation. The product must push conservative wording and record the customer's own attestation.

## Delivery commitment if GO
Build the minimum product (Phase 4) within 21 days of the GO decision. If not delivered by the date shown on the landing page, every pre-order is refunded automatically.
