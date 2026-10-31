# Rewired by TrueBrain: app kit

Two home-screen apps, one secure backend.

- **Rewired** (dark icon): clients see their status, fill in the questionnaire and read their approved report.
- **Console** (teal icon): you create client links, review intakes, import WAVi PDFs and approve reports, from any device.

## Folders
| Folder | What it is | Where it runs |
|---|---|---|
| `portal/` | Backend and pages; holds all client data | Google Apps Script (your Workspace, under the BAA) |
| `app/` | Installable shell; holds no client data | Netlify or GitHub Pages |
| `tools/` | Icon generator (`python3 tools/make_icons.py`) | Your machine |

## Quick start
1. Deploy `portal/` with `portal/SETUP.md`.
2. Open this folder in Claude Code and paste the prompts in `PROMPTS.md`, in order.
3. Install both icons on your phone: open the live URL in Safari or Chrome and choose **Add to Home Screen**. The console is at `/console.html`.

## Try it now (demo mode)
```bash
python3 -m http.server 8080
```
Open http://localhost:8080/portal/Intake.html once to create a preview client, then http://localhost:8080/app/ to see the client app. The console demo is at http://localhost:8080/app/console.html.

Read `CLAUDE.md` before changing anything. It lists the privacy and safety rules the app must keep.
