# Research methodology

1. **Seed list.** 32 opportunities that fit the founder's constraints (digital, self-serve, no inventory, no agency work, low upkeep). Three were flagged as excluded on legal, ethical, or founder-rule grounds. They are kept in the file so the reasoning stays visible.
2. **Evidence gathering.** Live web searches on 2026-10-30. For each candidate, the searches looked for proof that people **pay**: competitor prices, paid tiers, service quotes, marketplace review counts, and claimed customer counts. They also looked for saturation signals, regulatory triggers, and legal risk. Sources are in `sources.md`.
3. **Evidence grading.**
   - `E`: at least one external source on pricing or paid demand.
   - `A`: anecdotal or practitioner opinion only.
   - `N`: not researched this round. Scored on assumptions.

   `A` rows lose 0.15 and `N` rows lose 0.30 so unresearched ideas can't win on optimism.
4. **Scoring.** Each criterion is scored 1–5 by judgment against that evidence, then weighted (intent 20%, distribution 20%, pain 15%, margin/recurring 15%, simplicity 10%, automation 10%, low risk 10%). Computed by `python3 are/ops/are.py score`.
5. **Rules applied.**
   - Search popularity is never treated as willingness to pay.
   - Vendor-blog figures are labeled indicative.
   - Where sources conflict, both are recorded.
   - No figure in this repo is presented as our own market data until it comes from our Stripe or analytics.

## Limitations (read before trusting the ranking)
- **Judgment scores.** The top three are within 0.10 points of each other, so they're effectively tied. The tie-break is explained in `shortlist.md`.
- **Accessibility bias.** Research went deeper on accessibility because the existing repo is in that space. Non-accessibility ideas got fewer searches and more `A`/`N` grades.
- **Missing first-party data.** No keyword volume, CPC, or marketplace install data was available (no tool access). These are the biggest unknowns.
- **Vendor sources.** Most sources sell accessibility products and benefit from describing the market as urgent.
