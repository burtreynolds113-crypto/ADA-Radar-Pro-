# Recommendation — 2026-10-31

## Short version
**Lead hypothesis: B03, a Confluence Cloud accessibility checker sold through the Atlassian Marketplace.**
It is **not yet recommended for build.** It ranks first (4.05), but there is no evidence yet that anyone pays for this exact product. The engine's rule is that a recommendation requires payment proof (`engine/rank.py`), so B03 must first pass the distribution test below. If it fails, the fallback is **B01**, the highest-ranked opportunity with payment proof: a lightweight trust center plus security-questionnaire library for small SaaS.

## Why B03 leads on paper
| Factor | Evidence | Status |
|---|---|---|
| Distribution | Buyers search the Atlassian Marketplace inside the product; Atlassian bills, invoices, and handles tax [S32] | Verified mechanism |
| Margin | 0% revenue share on the first $1M lifetime Forge revenue, then about 17% [S31] | Verified terms |
| Payments setup | None: no Stripe, no sales-tax or VAT handling | Verified mechanism |
| Competition (Cloud) | Built-in checker is WCAG 2.0 and early access; two main apps are Server/DC only; one Cloud checker showed 1 install [S28] | Third-party snapshot |
| Demand trigger | DOJ Title II deadlines for public bodies and universities: Apr 2027 / Apr 2028 [S2] | Verified (law firms) |
| ARPU | $150/mo assumed. Cloud pricing follows the customer's user tier [S32] | **Unverified** |
| Willingness to pay | That 1-install competitor is a warning sign | **Unproven — the test below decides** |
| Path to $50K/mo | ~445 customers at $150 with 2%/mo churn (`milestones.md`). That is 0.15% of Atlassian's 300k+ customers, but the share with accessibility obligations is unknown | **Unproven** |

## Distribution-plausibility test (must pass before any build)

### Stage 1: marketplace data ($0, read-only, authorized as A-004)
`research-collect.yml` queries the Atlassian Marketplace API for Cloud apps matching "accessibility", "WCAG" and "alt text". Results go to the public run log and `evidence/`.

Thresholds, fixed before seeing the data:

| Result | Paid Cloud installs across those queries* | Action |
|---|---|---|
| **PASS** | ≥ 500 total, **or** any single paid app ≥ 200 | Proceed to Stage 2 |
| **WEAK** | 50–499 | Re-scope to higher-ed/public sector plus JSM portals (B26), re-run, and decide with the owner |
| **FAIL** | < 50 | Reject B03; run the same test pattern for B01 (SEO/PLG) |

\*Installs of apps paid via Atlassian or the vendor. Installs include active free trials, so this is an upper bound on payers.

### Stage 2: a marketplace listing as the demand test (needs approval A-005)
On a marketplace, the listing is the distribution channel, so the smallest valid test is a minimal app that customers can find and try.
- **MVP scope:** scan a Confluence space for images without alt text, heading-order problems, non-descriptive links, and tables without headers. Show a per-page report and a CSV export. Nothing else.
- **Pricing:** paid via Atlassian, with a 30-day free trial.
- **Pass criteria (60 days after listing):**
  - ≥ 30 trial installs
  - ≥ 3 paid conversions
  - uninstall rate in the first 7 days < 50%
- **Fail:** fewer than 10 trial installs in 60 days. Delist and record the loss.
- **Kill rule:** if Stage 2 fails, owner time already spent is the only loss. No further spend.

## Approval requested: A-005
| # | Action | Who | Cost |
|---|---|---|---|
| 1 | After Stage 1 PASS: build the Forge MVP above in this repo, with tests and no publication | Agent | $0 |
| 2 | Create a free Atlassian developer account and a Marketplace partner (vendor) profile | Owner | $0 (≈1 h) |
| 3 | Install the app into a free Confluence Cloud developer site for testing | Agent + owner | $0 |
| 4 | **Not included:** publishing the listing or entering tax/payout details. Each needs its own approval (A-006) with the final listing copy shown to you | — | — |

## Fallback: B01 trust center + questionnaire library
- **Evidence:** incumbents charge $5k–$20k/yr [S26, S27], so payment proof exists.
- **Risks:**
  - Free trust-center tiers are multiplying [S26].
  - There is no marketplace, so customers come only from SEO and from customers' public trust pages (product-led).
- **Required scale:** ~633 customers at $99 for $50K/mo (`milestones.md`).
- **Test pattern if chosen:**
  - A $0 public "trust page generator" with a paid tier.
  - Stripe in test mode until a separate approval.
  - Pass if ≥ 2% of free pages convert to paid within 60 days.
