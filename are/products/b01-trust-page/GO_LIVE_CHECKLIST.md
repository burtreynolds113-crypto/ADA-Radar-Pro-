# B01 go-live checklist (approval A-005, spend cap $15)

Status: **waiting on owner steps 1–5.** The agent does the remaining steps once the values exist.

## Owner steps (about 45 minutes in total)
1. **Name check (10 min).** Recommended working name: **VendorReady** (no product with that name found by web search on 2026-10-31; TrustSheet is the backup). Search https://tmsearch.uspto.gov for the name in software classes (9 and 42). If it's taken, pick another and tell the agent.
2. **Domain (≈ $12).** Register it at any registrar (for example Cloudflare Registrar or Porkbun). Send the agent the domain and the **exact amount charged**; the agent records it in `finance/ledger.csv` under A-005.
3. **Free accounts:**
   - **GoatCounter** (https://www.goatcounter.com): create a site and note its code, the part before `.goatcounter.com`.
   - **Formspree** (https://formspree.io): create a form and note its endpoint, `https://formspree.io/f/xxxx`.
   - **Contact email:** a mailbox or alias you'll read for abuse reports and waitlist questions.
4. **Merge this branch into `main`.** GitHub only runs scheduled workflows (the weekly report, A-003) and offers the "Run workflow" button (deploy) for workflow files on the default branch. Until the merge, neither exists on GitHub. The agent can open a pull request if you ask; it won't open one unasked.
5. **GitHub settings** (the agent can't change these):
   - Settings → Pages → Build and deployment → Source: **GitHub Actions**.
   - After the first deploy: Settings → Pages → Custom domain → your domain, then tick **Enforce HTTPS**.
   - At your registrar, add DNS records for the apex domain: `A` → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153. Optionally add `CNAME www` → `burtreynolds113-crypto.github.io`.

Send the agent the values from steps 1–3: name, domain, cost, GoatCounter code, Formspree endpoint, contact email.

## Agent steps
6. Fill `site.config.json`, run the tests and the build, commit, push.
7. Run "Deploy B01 trust page (manual)" and check the live site with the e2e test against the real URL.
8. Fill the real name and URL into `LAUNCH_POSTS.md` and send the final text to the owner for **word-for-word approval**. Nothing is posted before that.
9. Record the launch date. The 60-day measurement window starts at the first approved post. Check GoatCounter weekly (in the weekly CEO report) against the pre-registered thresholds in `research/recommendation.md`.

## Conflict to resolve before the repo goes private (A-002)
GitHub Pages on a free account only works for **public** repos. When you make `ADA-Radar-Pro-` private, the site would go offline. Options:
- **(a) Recommended:** create a separate small **public** repo (for example `vendorready-site`) just for the website. Its code is visible to every visitor anyway, and it contains no business data. Attach it to a session and the agent moves the deploy there.
- **(b)** Upgrade to GitHub Pro (about $4/mo; check current price), which would need a new spend approval.
- **(c)** Host on Cloudflare Pages (free; needs a Cloudflare account).
