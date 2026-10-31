# Recommendation — updated 2026-10-31 after the first live data run

## Result of the B03 test (pre-registered, run 41150180633)
**B03, a Confluence Cloud accessibility checker, is REJECTED.** These are the Cloud accessibility apps found by reading the "accessibility", "WCAG" and "alt text" results app by app:

| App | Cloud installs |
|---|---:|
| Accessible Web for Jira | 38 |
| Remediator — VPAT documents from Jira | 3 |
| Clarable Accessibility Checker | 2 |
| AccessLens — WCAG Accessibility Checker for Confluence | 0 |

- **Verdict:** at most 43 installs in total, even if all were paying. The FAIL threshold was under 50. B26 (Jira Service Management help-center accessibility) is in the same category and is rejected with it.
- **Search noise:** the other high-install apps returned for "accessibility" were access-management tools (for example "Access Agent", 312 installs), not accessibility. The collector now filters by name.
- **What this shows:** the marketplace can deliver installs for workflow tools. Checklist apps reach 4,500–30,000 Cloud installs. But no one is installing accessibility checkers on Cloud. The regulatory deadlines haven't produced marketplace demand.
- **Cost of this lesson:** $0 and no product code.

## New lead: B01, a lightweight trust center plus security-questionnaire answer library for B2B SaaS companies under 50 people
It is the highest-ranked opportunity with evidence that people pay. Ranking: 3.25, tied with B02 and B04. B01 wins the tie on ARPU and on the $50K path: about 633 customers at $99, versus 1,276 for B02 and 4,167 for B04.

| Factor | Evidence | Status |
|---|---|---|
| People pay | Incumbents charge $5k–$20k/yr: SafeBase from about $5k, Conveyor $9.6k, Vanta averages about $20k plus a $6k trust-center add-on [S26, S27] | Third-party pricing data |
| Underserved segment | Tiny companies get a security questionnaire before they can afford Vanta; complaints say $7.5k+ is too much under 20 staff [S45] | Plausible, not measured |
| Competition at the low end | Free tiers: TrustCloud (<20 staff), ShieldPage, Cyberbase, Orbiq [S26] | **Real risk.** Price alone won't win; the questionnaire answer library has to be the paid value |
| Distribution | (1) Product-led: every customer's public trust page is read by their prospects' security reviewers, who work at B2B companies themselves. (2) SEO on questionnaire and security-page searches | **Unproven, the key risk** |
| Payments | Stripe (needs owner account) | Not set up |

## B01 distribution-plausibility test (before building the paid product)
Thresholds were set before any data.

### Stage 1: $0, agent-only, no publishing
1. **Build the free tool in the repo, unpublished.** A static generator: answer about 20 questions and get a hosted trust page (subprocessors, security practices, policies list, contact) plus a reusable answer bank exported to CSV.
2. **List the incumbents' published free-tier limits.** This sets exactly what the paid tier must add.

### Stage 2: needs approval A-005, cap $15
| # | Action | Who | Cost |
|---|---|---|---|
| 1 | Register one domain | Owner | ≈ $12 |
| 2 | Publish the free generator on GitHub Pages | Agent | $0 |
| 3 | Put the paid tier ($49/mo questionnaire answer library) behind a waitlist that asks for a card via a Stripe payment link in **test mode**. This measures intent to pay without charging anyone. | Agent; owner creates Stripe account | $0 |
| 4 | Make 3 permission-based launch posts (Show HN, Indie Hackers, one relevant subreddit following its self-promotion rules). Exact text approved by you first. | Agent drafts, owner approves | $0 |

**Pass/fail, 60 days after publishing:**
- **PASS:** ≥ 100 trust pages created, ≥ 15% of pages getting views from someone other than their creator (the product-led loop working), and ≥ 5 people entering a card for the paid tier.
- **WEAK:** 30–99 pages, or 1–4 card entries. Change the positioning once and re-run 30 days.
- **FAIL:** < 30 pages, or 0 card entries. Reject B01. Next candidates are B02 and B04, which already have marketplace proof that people pay.

### Known uncertainty
- A new domain has almost no search traffic for 3–6 months, so in a 60-day window the launch posts and the product-led loop must carry the test. Weak SEO numbers in this window aren't a reason to kill B01.
- A test-mode card entry shows intent, not payment. The first live charge needs its own approval (A-006).

## Not recommended
Everything else in `ranking_b2b.md`. Shopify and WordPress accessibility categories have proven paying users (for example, Access Pro has 96 reviews and B2B Wholesale Hub has 703, from the run log) but are crowded and need thousands of $10–$25 customers to reach $50K/mo.
