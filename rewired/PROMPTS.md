# Prompts to paste into Claude Code

Open this folder in Claude Code (`claude` in the `kit` folder), then paste these one at a time. Wait for each to finish.

## 1. Get oriented
> Read CLAUDE.md, then run the app locally in demo mode from the kit root and tell me the URLs for the client app and the console. Check every acceptance item you can test locally and report what passes.

## 2. Deploy the portal (once)
Follow `portal/SETUP.md` yourself in the Apps Script editor (about 15 minutes). Run `setup()`, then fill in `setStaffLogin()` with a **new** password, run it, and erase the values. Deploy as a web app and copy the `/exec` URL.

> Here is my Apps Script web app URL: PASTE_EXEC_URL. Put it in app/config.js as EXEC_URL. My Sheet URL is PASTE_SHEET_URL; put it in SHEET_URL. Don't change anything else.

## 3. Put the app online
> Deploy the app folder to Netlify as a new site (use the Netlify CLI; app/_headers must be applied). Give me the live URL. If Netlify isn't set up, walk me through `npx netlify-cli deploy --dir=app --prod`.

Prefer GitHub Pages instead?
> Create a GitHub repo named rewired-app, push the app folder as the site root, and turn on GitHub Pages. Note that GitHub Pages ignores _headers, so add the CSP as a meta tag in index.html and console.html.

## 4. Connect the portal to the app
> My app is live at PASTE_APP_URL. Set CFG.APP_URL in portal/Code.gs to that URL (no trailing slash) and remind me to paste the updated Code.gs into Apps Script and deploy a new version.

After this, client links you copy from the console open the installable app.

## 5. Custom domain (optional)
> Help me point app.thetrubrain.com at the Netlify site and confirm HTTPS works.

## 6. Polish (optional)
> Run Lighthouse on the live client app on mobile settings. Fix anything under 90 in Accessibility, Best Practices or PWA without adding third-party scripts or breaking the hard rules in CLAUDE.md.

> Add a gentle, opt-in reminder: when the report status is approved, show a one-time "Your report is ready" banner on next open. No push service, no new data stored beyond a seen flag.
