# B01 trust page generator (Stage 1 build, NOT PUBLISHED)

A free tool that turns 22 answers into a shareable security overview page and a starter questionnaire answer bank (CSV). It exists to test distribution for B01 (`../../research/recommendation.md`).

## How it works
- `site/index.html` + `generator.js`: the form. On submit, the answers are validated, cleaned to known fields, compressed (deflate-raw) and base64url-encoded into `p/#<token>`.
- `site/p/`: the viewer. It decodes the token, validates it again, and renders with every value escaped. It is `noindex` and `no-referrer`.
- `site/app.js`: shared logic (schema, validation, encoding, rendering, answer bank, CSV with formula-injection guard).
- **No backend, no cookies, no stored customer data.** The URL fragment never reaches a server.

## Metrics (after approval A-005 installs GoatCounter)
| Event | Meaning |
|---|---|
| `event/page_created` | A trust page was generated |
| `view/visitor/<pageId>` | Someone other than the creator viewed a page (creator marked in their own browser's localStorage). Distinct ids ÷ pages created = share rate |
| `view/creator/<pageId>` | The creator previewed their own page |
| `event/csv_downloaded`, `event/link_copied` | Activation |
| `event/paid_interest_click`, `event/waitlist_submitted` | Paid intent (no payment is taken) |

## Placeholders to fill at launch (A-005)
`{{PRODUCT_NAME}}` (working name; needs a trademark/name check), `{{WAITLIST_FORM_ACTION}}`, `{{CONTACT_EMAIL}}`, and the GoatCounter script tag.

## Tests
```bash
node --test tests/app.test.mjs                              # 10 unit tests
npm install --no-save axe-core@4.14.0
NODE_PATH=$(npm root -g) node tests/e2e.mjs                 # browser e2e + axe (light & dark)
```
CI runs both in the `trust-page` job.
