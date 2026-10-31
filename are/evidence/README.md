# Evidence snapshots

Each file holds raw records captured from one GitHub Actions run of `research-collect.yml`. The file name is the run ID, and the log is at
`https://github.com/burtreynolds113-crypto/ADA-Radar-Pro-/actions/runs/<run-id>`. Files are never edited after capture; corrections are listed here.

## Known defects in `2026-10-31-run-41150180633.jsonl` (fixed in the collector afterwards)
1. **Hacker News counts are invalid.** Algolia typo tolerance matched unrelated words; for example, "VPAT" returned 93,472 hits. The collector now uses exact quoted queries.
2. **Atlassian totals include off-topic apps.** Marketplace text search is fuzzy: "trust center" returned Gliffy and Zephyr. Only per-app rows read by name are usable. The collector now filters on name terms (`match`).
3. **Payment model is missing (`None`).** The search endpoint doesn't expose it; the collector now reads `/versions/latest`.

The B03 decision uses only per-app rows judged relevant by name, so it is unaffected by these defects.

## `2026-10-31-run-41150458512.jsonl`
First run with the corrected collector. No known defects. The Shopify handle `accesskit` returned no rating data, so that handle is probably wrong.
