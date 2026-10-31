# Rewired by TrueBrain: project context for Claude Code

## What this is
Rewired is an installable web app (PWA) for a brain-health clinic that uses WAVi ERP/EEG scans. It has two parts:

- **portal/**: a Google Apps Script web app (`Code.gs`, `Intake.html`, `Console.html`). It holds **all** client data, in a Google Sheet and Drive folder covered by the clinic's Google Workspace BAA. Deploy it with Apps Script, not Netlify.
- **app/**: a static shell (`index.html`, `console.html`) installed to phones as two home-screen icons. It **holds no client data**. It only stores the client's link code and token in localStorage and frames or opens portal pages.

```
Client phone ──▶ app/index.html ──(fetch ?page=status)──▶ Apps Script ──▶ Sheet / Drive (PHI)
                     └─(iframe ?page=intake | report)──▶ Apps Script
Clinician  ──▶ app/console.html ──(opens top-level ?page=console)──▶ Apps Script (Google sign-in + console login)
```

## Hard rules (never break)
1. **No PHI in the app shell.** No names, answers, scores or reports in `app/`, in localStorage beyond `{c,t}`, in the service worker cache, or in analytics. Never add analytics or third-party scripts.
2. **No secrets in code.** The staff login is set only by running `setStaffLogin()` in the Apps Script editor; it stores a salted hash in Script Properties. Never write a username/password into any file, commit, or prompt output.
3. **CSP is strict** (`app/_headers`): `script-src 'self'`. All JS lives in external files. No inline `<script>` and no `onclick=` attributes.
4. **The service worker caches only same-origin shell files.** It must never cache `script.google.com` or `googleusercontent.com` responses.
5. **Reports are clinician-gated.** The status endpoint returns only `{ok, intake, report}`. A report renders only after Approve & release in the console.
6. **Safety.** Keep the 988 crisis line visible. Keep the PHQ-9 item 9 lock and the urgent email flag in `Code.gs`.
7. **Not a diagnostic device.** Copy says "brain function profile", never "diagnosis".

## Design system
- Paper `#EEF3F1`, grid `#D3E0DB`, ink `#17222D`, brand teal `#0E5E66`, P300 amber `#E8A33D`.
- Brain Types: Performer `#0E7C74`, Wired `#C2365B`, Scattered `#C9800F`, Foggy `#5F64B0`, Burnout `#5E7A8C`.
- Type: Bricolage Grotesque (display, 800) and Atkinson Hyperlegible (body, for readability).
- Signature visual: the live three-channel EEG trace (`trace.js`) on chart-paper grid. Respect `prefers-reduced-motion`.
- Writing: active voice, sentence case, short sentences, plain words.

## Patterns borrowed from top-ranked apps
| App | Pattern | Where it shows up |
|---|---|---|
| Oura, WHOOP | One at-a-glance status screen | Client home: timeline plus a single headline |
| Headspace, Calm | One action per screen, gentle onboarding | One primary button per state |
| Tide Guide, Moonlitt (2026 Apple Design Awards) | One signature visual, done well | The EEG trace |
| Harvee (2026 ADA finalist) | Privacy-first by design | No data in the shell, clear privacy copy |
| Rise | Energy-schedule framing | 90-day check-in step, report "how this shows up day to day" |

## Local development
```bash
cd app && python3 -m http.server 8080      # then open http://localhost:8080
```
With `EXEC_URL` blank in `app/config.js`, the app runs in **demo mode** against `portal/Intake.html`, using a localStorage stand-in for the backend. Serve from the kit root (`python3 -m http.server 8080` in `kit/`, open `/app/`) so `../portal/` resolves.

## Acceptance checklist
- [ ] Lighthouse PWA installable; manifests valid; icons 192/512/maskable present
- [ ] Client home works at 360 px wide and on desktop; tap targets at least 44 px
- [ ] Opening `index.html?c=X&t=Y` saves the link and strips it from the address bar
- [ ] Status states render: not started, draft, submitted, approved, invalid link, offline
- [ ] Console opens top-level (not framed) and works on iOS Safari
- [ ] No inline scripts; CSP shows no violations in DevTools
- [ ] Service worker caches no cross-origin responses
- [ ] Keyboard focus visible; reduced motion honoured; contrast at least 4.5:1
