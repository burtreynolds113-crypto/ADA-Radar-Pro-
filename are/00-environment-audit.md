# Environment audit — 2026-10-30

## Execution environment
- Cloud container (ephemeral). Anything not committed and pushed is lost.
- Node 22, Python 3.13, npm/pip, git, Chromium + Playwright preinstalled.
- Outbound HTTPS through a proxy. Package registries reachable.
- Branch: `claude/autonomous-revenue-engine-veeken`.

## Tools actually available to the agent
| Capability | Available? | Notes |
|---|---|---|
| Web search | Yes | Used for all research. Results are mostly vendor blogs (see `research/sources.md`). |
| Fetching arbitrary pages | Indirect (web-fetch sub-agent) | Not used this round. |
| GitHub (this repo only) | Yes | Commit/push to this branch. |
| Gmail, Google Drive | Connected | **Not used.** Sending email counts as external communication and needs approval. |
| Clarify (CRM + email campaigns), Vibe Prospecting (lead data) | Connected | **Will not be used.** Cold prospecting/outreach is outside the founder's rules. |
| Stripe / payments | **No** | No account or API key. Founder must create the account (identity verification is in their name). |
| Domain registrar, hosting/deploy, DNS | **No** | Founder action required. Free static hosting (Cloudflare Pages / GitHub Pages) is sufficient for the test. |
| Ad platforms, analytics, Search Console | **No** | Founder action required. |
| Marketplace data (Shopify install counts, Etsy sales, keyword volumes/CPC) | **No** | Only third-party estimates via search. No keyword volume or CPC data has been verified. |

**Implication:** the agent can research, write code, test, and prepare everything. Every action involving money, identity, publishing, or outbound messages needs the founder.

## Existing repository: "ADA Radar" (pre-existing upload)
An Express + SQLite + Clerk + Stripe skeleton for a website accessibility scanner subscription (plans: solo / agency / pro).

| Finding | Severity |
|---|---|
| `index.js` imports `./routes/billing.js` and `./routes/sites.js`, but `routes`, `client`, `scripts` are **empty files**, not directories. The app cannot start (verified: `ERR_MODULE_NOT_FOUND`). | Blocking |
| `@clerk/clerk-sdk-node` reached end of support on 2025-01-10 (npm deprecation notice). Replacement: `@clerk/express`. | High |
| `scanService.js` checks only 3 heuristics. The label check reports false positives (ignores `aria-label`, `aria-labelledby`, wrapping `<label>`, hidden and submit inputs). No JS rendering. | High (accuracy) |
| Score of 0–100 implies a compliance level the scan can't measure. That's an FTC-style claims risk (see S1). | High (legal) |
| No tests, no README, no `.env.example`, no error handling around `fetch`. Scanning user-supplied URLs server-side is an SSRF risk. | Medium |

**Decision:** leave the existing code untouched for now. The generic-scanner concept ranks 15th of 29 (no distribution channel; crowded at $9–$99/mo). If EXP-001 passes, the product will use `axe-core` (MPL-2.0, v4.14.0 verified on npm) in a headless browser, not the hand-rolled heuristics.

## New persistent project files (`are/`)
| Path | Purpose |
|---|---|
| `research/opportunities.csv`, `research/sources.md`, `research/methodology.md`, `research/shortlist.md` | Research, scoring inputs, evidence, top-5 with scenarios |
| `experiments/EXP-001-acr-kit-presale/` | Validation experiment spec + landing page (not deployed) |
| `approvals/decisions.md` | Approval queue and decision log |
| `finance/ledger.csv`, `finance/founder_hours.csv`, `finance/controls.md` | Single source of truth for money and time |
| `analytics/metrics.json` | Funnel metrics (all currently "not measured") |
| `ops/are.py`, `ops/config.json` | Deterministic CLI: scoring, ledger, spend caps, kill switch, weekly report |
| `tests/test_are.py` | 11 unit tests (passing) |
| `reports/weekly/` | CEO reports |

## Update 2026-10-31: GitHub and integration audit
| Item | Finding |
|---|---|
| GitHub identity | `burtreynolds113-crypto` (account created 2025-11-17) |
| Repositories | `ADA-Radar` and `ADA-Radar-Pro-`, **both public**, admin rights on both. Owner chose to make `ADA-Radar-Pro-` private (A-002); the agent cannot change visibility. |
| Write access | Push to `claude/autonomous-revenue-engine-veeken` works. Creating new repos is restricted to repos attached to this session. |
| GitHub Actions | No workflows existed. Added `ci.yml` (tests + approval gate), `research-collect.yml` (read-only data collection) and `weekly-report.yml` (manual; schedule needs A-003). Free minutes: public repos unlimited; private repos 2,000 min/month on GitHub Free. |
| Container network | **Blocked:** api.wordpress.org, hn.algolia.com, apps.shopify.com, marketplace.atlassian.com, trustmrr.com, capterra.com, indiehackers.com, api.stripe.com. **Allowed:** GitHub, npm/PyPI. Live market data therefore comes from Actions runners. Payments can't be called from this container. |
| Payments | No Stripe account or keys. Atlassian Marketplace (if B03) bills customers itself, so no processor is needed. |
| Hosting | None. Available free once approved: GitHub Pages (static), Atlassian Forge (for B03). |
| Analytics / support | None connected. Gmail is connected but unused (outbound email needs approval). |
| Budget | $250 total (A-000); $0 spent. |
