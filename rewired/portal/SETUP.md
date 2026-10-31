# Rewired by TrueBrain: NeuroProfile portal setup (about 15 minutes)

Everything runs inside your TrueBrain Google Workspace (Apps Script, Sheets, Drive, Gmail), which is covered by your Google BAA. You'll end up with one web address that serves three pages:

| Page | Who | Address |
|---|---|---|
| Client intake | Clients, via a private link you send | `…/exec?page=intake&c=CODE&t=TOKEN` (the console makes this for you) |
| Clinician console | You and staff only | `…/exec?page=console` |
| Client report | Clients, only after you approve | `…/exec?page=report&c=CODE&t=TOKEN` |

## 1. Create the project
1. Signed in as **breynolds@thetrubrain.com**, go to **script.google.com**, then **New project**. Name it "Rewired NeuroProfile".
2. Delete the starter code in `Code.gs` and paste in the whole `Code.gs` file from this package.
3. Click **+**, then **HTML**, and name the file `Intake` (no `.html`; Google adds it). Paste in `Intake.html`.
4. Click **+**, then **HTML**, and name the file `Console`. Paste in `Console.html`.
5. Click **Save**.

## 2. Run setup (once)
1. In the function menu at the top, choose **setup**, then click **Run**. Approve the permissions; they're all inside your own account: Sheets, Drive, email, and reading your sign-in.
2. Your Drive now has:
   - **Rewired NeuroProfile – Client Data (PHI)**: a Sheet with these tabs:
     - *Clients*: codes, statuses and private labels.
     - *Intakes*: client answers.
     - *Audit*: who opened, approved or revoked what.
     - *Security*: logins, failures, lockouts, bad links and report views.
   - **Rewired NeuroProfile – Approved Reports (PHI)**: a folder where each approved report is saved.

## 3. Set your console login
1. In `Code.gs`, find `setStaffLogin()`. Type your username and a **new** password (10+ characters) between the quotes:
   `const USERNAME = 'Hooten113';`  `const PASSWORD = 'your-new-password';`
2. Choose **setStaffLogin** in the function menu and click **Run**.
3. **Erase both values again** (back to `''`) and click **Save**. Only a salted, one-way fingerprint is stored, in Project Settings, under Script Properties. The password itself is never kept.
4. To change it later, repeat these three steps.

## 4. Deploy
1. Click **Deploy**, then **New deployment**, then the gear icon, then **Web app**.
2. **Execute as:** Me (breynolds@thetrubrain.com).
3. **Who has access:** Anyone. Clients need to open their link without a Google account. The console still requires a TrueBrain Google sign-in plus your username and password.
4. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
5. Bookmark `YOUR_URL?page=console` on your phone and laptop. That's your login from any device.

## 5. Daily use
1. **Console → Clients → Create intake link.** Copy the link and text or email it to the client.
2. You get an email when the client submits. It contains the code only, never health details. If they answered the self-harm question above "Not at all", the subject starts **[URGENT – safety review]**.
3. **Open in platform** loads their answers. Drop in their WAVi PDF, fill in the pre-scan state, and review the report.
4. **Approve & release** saves the client view to Drive and copies the client's report link. Until you approve, the client sees "Your report is being reviewed."
5. **Revoke** takes a released report offline immediately.

## Security notes
- The console requires both a **TrueBrain Google account** (turn on 2-Step Verification in Google Admin) and the **username and password**.
- Sessions last 6 hours of activity. **5 wrong passwords lock the console for 15 minutes** and email you.
- Client links use long random tokens. Wrong or tampered links are refused and logged.
- Review the **Security** tab weekly. Watch for `login_failed`, `account_locked_15min` and `invalid_intake_link` spikes.
- Keep the Sheet and folder private. Don't share them outside TrueBrain staff.
- After you change the code, use **Deploy → Manage deployments → Edit → New version** so the same URL keeps working.

## Try it first without Google
Open `Console.html` in a browser on your laptop. It runs in **demo mode**: any username and password works, and data stays only in that browser. Create a client, open the intake link it gives you, fill it in, and you'll see the whole flow.
