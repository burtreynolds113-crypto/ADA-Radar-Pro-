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
- **Confirmed by the corrected collector (run 41150458512):** relevant accessibility apps on Cloud have **2 paid installs** (Clarable, paid via Atlassian). Accessible Web for Jira (38) and Continuous Accessibility (0) are free. "Alt Text" (63 paid) is a Markdown editor, not an accessibility tool.
- **Side finding (same run):** the Marketplace does carry paid demand in crowded workflow categories.
  - Status-page apps: 24,204 paid Cloud installs across 12 paid apps.
  - Checklist apps: 22,345 across 12.
  - Compliance apps: 1,501 across 14.

  Recorded for future candidates; it doesn't change the B03 verdict.

## New lead: B01, a lightweight trust center plus security-questionnaire answer library for B2B SaaS companies under 50 people
It is the highest-ranked opportunity with evidence that people pay. Ranking: 3.25, tied with B02 and B04. B01 wins the tie on ARPU and on the $50K path: about 633 customers at $99, versus 1,276 for B02 and 4,167 for B04.

| Factor | Evidence | Status |
|---|---|---|
| People pay | Incumbents charge $5k–$20k/yr: SafeBase from about $5k, Conveyor $9.6k, Vanta averages about $20k plus a $6k trust-center add-on [S26, S27] | Third-party pricing data |
| Community signal | Exact-match Hacker News comments in the last 12 months: "trust center" 26, "security questionnaire" 5, "VPAT" 3 (run 41150458512). HN is not where these buyers talk, so this is weak either way | Measured, low weight |
| Underserved segment | Tiny companies get a security questionnaire before they can afford Vanta; complaints say $7.5k+ is too much under 20 staff [S45] | Plausible, not measured |
| Competition at the low end | Free tiers: TrustCloud (<20 staff), ShieldPage, Cyberbase, Orbiq [S26] | **Real risk.** Price alone won't win; the questionnaire answer library has to be the paid value |
| Distribution | (1) Product-led: every customer's public trust page is read by their prospects' security reviewers, who work at B2B companies themselves. (2) SEO on questionnaire and security-page searches | **Unproven, the key risk** |
| Payments | Stripe (needs owner account) | Not set up |

## B01 distribution-plausibility test

### Stage 1: DONE 2026-10-31 ($0, nothing published)
- **Built:** `products/b01-trust-page/`, a static generator. 22 questions produce a shareable trust page that lives entirely in its link (no server-side data) plus a starter answer bank of 22 questions as CSV.
- **Tests:** 10 unit tests, and an end-to-end browser test that fills the form, opens the share link, blocks an XSS attempt, checks the CSV download, and finds 0 axe-core accessibility violations in light and dark mode.
- **Low-end competition:** recorded in `products/b01-trust-page/COMPETITION.md`. Free trust pages are common, and $29–$50 questionnaire tools exist (VendorSafe, Attestly, ResponseHub). B01's competition score was lowered from 2 to 1, which **moves B01 from 1st to 4th (3.10 vs 3.25 for B02 and B04)**.
- **Why still B01:** it needs far fewer customers for $50K/mo (~632, against 1,276 for B02 and 4,167 for B04), and its test is already built and capped at $15. This is a judgment call for the owner; the alternative is to switch to B02 or B04 now.

### Stage 2: needs approval A-005, cap $15
| # | Action | Who | Cost |
|---|---|---|---|
| 1 | Register one domain (after a quick trademark/name check of the working name) | Owner | ≈ $12 |
| 2 | Publish `site/` on GitHub Pages with that domain | Agent | $0 |
| 3 | Install a cookieless counter (GoatCounter hosted, free tier) for page_created / view_by_visitor / paid_interest_click / waitlist_submitted | Agent; owner creates account | $0 |
| 4 | Turn on the waitlist form (Formspree free tier, 50 submissions/mo). It collects email and questionnaire volume only and takes no payment. | Owner creates account | $0 |
| 5 | Make 3 permission-based launch posts (Show HN, Indie Hackers, one subreddit within its self-promotion rules). Exact text approved by the owner first. | Agent drafts, owner approves | $0 |

**Correction to the earlier plan:** I had planned to count card entries through a Stripe payment link in test mode. Test mode only accepts Stripe's test cards, so real buyers couldn't enter a card. Paid intent is now measured by disclosed waitlist signups. The page says plainly that the paid plan isn't available and no payment is taken. A first real charge needs its own approval (A-006).

**Pass/fail, 60 days after publishing** (set before launch):
- **PASS:**
  - ≥ 100 pages created (`page_created`);
  - ≥ 15% of created pages receive at least one visitor view (`view/visitor/<id>`), which shows the product-led loop works;
  - ≥ 10 waitlist signups, with ≥ 3 saying they get 2 or more questionnaires a month.
- **WEAK:** 30–99 pages, or 3–9 signups. Change the positioning once and re-run for 30 days.
- **FAIL:** < 30 pages, or < 3 signups. Reject B01, then run the same kind of test for B02 or B04.

The signup bar is higher than the earlier "5 card entries" because a waitlist signup costs the visitor less than entering a card.

### Known uncertainty
- A new domain gets almost no search traffic for 3–6 months, so the launch posts and the share loop must carry a 60-day test.
- A trust page on our domain could be used to impersonate a company. Mitigations: a "self-reported, not verified" banner, `noindex`, `no-referrer`, escaped text, http(s)-only links, and no logos or images. Abuse reports go to the contact address.

## Not recommended
Everything else in `ranking_b2b.md`. Shopify and WordPress accessibility categories have proven paying users (for example, Access Pro has 96 reviews and B2B Wholesale Hub has 703, from the run log) but are crowded and need thousands of $10–$25 customers to reach $50K/mo.
