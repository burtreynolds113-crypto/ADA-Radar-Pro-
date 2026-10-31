/**
 * Rewired by TrueBrain: NeuroProfile client portal (Google Apps Script)
 * Pages (one web app URL):
 *   ?page=intake&c=CODE&t=TOKEN   client intake (public link, token-gated)
 *   ?page=console                 clinician console (TrueBrain Workspace accounts only)
 *   ?page=report&c=CODE&t=TOKEN   client report (shown only after approval)
 * Storage: one Google Sheet + one Drive folder in the owner's Drive (HIPAA Included Functionality under the Workspace BAA).
 * Run setup() once from the editor before deploying.
 */
const CFG = {
  BRAND: 'Rewired by TrueBrain',
  ALLOWED_DOMAIN: 'thetrubrain.com',   // console + staff functions limited to this domain
  ALERT_EMAILS: '',                    // comma-separated; blank = script owner
  SHEET_NAME: 'Rewired NeuroProfile – Client Data (PHI)',
  FOLDER_NAME: 'Rewired NeuroProfile – Approved Reports (PHI)',
  APP_URL: ''                          // set after deploying the Rewired app shell, e.g. 'https://rewired-app.netlify.app' (no trailing slash)
};

/* ---------------- setup ---------------- */
function setup() {
  const props = PropertiesService.getScriptProperties();
  let ss;
  if (props.getProperty('SHEET_ID')) ss = SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
  else { ss = SpreadsheetApp.create(CFG.SHEET_NAME); props.setProperty('SHEET_ID', ss.getId()); }
  const want = {
    Clients: ['code','label','token','created','intake_status','intake_updated','submitted_at','urgent','report_status','report_file_id','approved_at','approved_by'],
    Intakes: ['code','updated','status','json'],
    Audit:   ['time','actor','action','code','detail'],
    Security:['time','event','severity','account','username','code','detail']
  };
  Object.keys(want).forEach(name => {
    let sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) { sh.appendRow(want[name]); sh.setFrozenRows(1); }
  });
  const s1 = ss.getSheetByName('Sheet1'); if (s1 && ss.getSheets().length > 1) ss.deleteSheet(s1);
  if (!props.getProperty('FOLDER_ID')) props.setProperty('FOLDER_ID', DriveApp.createFolder(CFG.FOLDER_NAME).getId());
  Logger.log('Setup done. Sheet: ' + ss.getUrl());
}

/* ---------------- routing ---------------- */
function doGet(e) {
  const p = (e && e.parameter) || {};
  const page = p.page || 'intake';
  if (page === 'console') {
    if (!isStaff_()) { sec_('console_access_denied', 'warn', '', ''); return simplePage_('Access restricted', 'Sign in with your ' + CFG.ALLOWED_DOMAIN + ' account to open the console.'); }
    return HtmlService.createHtmlOutputFromFile('Console').setTitle('NeuroProfile Console – ' + CFG.BRAND)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  if (page === 'status') {   // tiny JSON for the app shell: statuses only, no health data
    const r = findClient_(p.c);
    const out = (!r || r.token !== p.t) ? { ok: false } : { ok: true, intake: r.intake_status, report: r.report_status };
    if (!out.ok) sec_('invalid_status_check', 'warn', '', p.c || '');
    return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
  }
  if (page === 'report') {
    const row = findClient_(p.c);
    if (!row || row.token !== p.t) { sec_('invalid_report_link', 'warn', '', p.c || ''); return simplePage_('Link not valid', 'Please check the link you were sent.'); }
    if (row.report_status !== 'approved' || !row.report_file_id) return simplePage_('Your report is being reviewed', 'Your clinician will let you know as soon as it is ready.');
    const html = DriveApp.getFileById(row.report_file_id).getBlob().getDataAsString();
    audit_('client', 'report_viewed', p.c, ''); sec_('report_viewed', 'info', '', p.c);
    return HtmlService.createHtmlOutput(html).setTitle('Your NeuroProfile Report – ' + CFG.BRAND)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return HtmlService.createHtmlOutputFromFile('Intake').setTitle(CFG.BRAND + ' – Intake')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ---------------- client (token-gated) ---------------- */
function loadIntake(code, token) {
  const row = findClient_(code);
  if (!row || row.token !== token) { sec_('invalid_intake_link', 'warn', '', code || ''); return { ok: false, error: 'This link is not valid. Please check the link you were sent.' }; }
  if (row.intake_status === 'submitted') return { ok: true, submitted: true, brand: CFG.BRAND };
  const it = findIntake_(code);
  return { ok: true, brand: CFG.BRAND, draft: it ? JSON.parse(it.json || '{}') : {} };
}
function saveDraft(code, token, data) {
  const row = findClient_(code);
  if (!row || row.token !== token || row.intake_status === 'submitted') return { ok: false };
  upsertIntake_(code, 'draft', data);
  updateClient_(code, { intake_status: 'draft', intake_updated: new Date() });
  return { ok: true };
}
function submitIntake(code, token, data) {
  const row = findClient_(code);
  if (!row || row.token !== token) return { ok: false, error: 'Link not valid.' };
  if (row.intake_status === 'submitted') return { ok: true };
  const urgent = Number(data && data.phq8) > 0;  // PHQ-9 item 9
  upsertIntake_(code, 'submitted', data);
  updateClient_(code, { intake_status: 'submitted', submitted_at: new Date(), urgent: urgent ? 'YES' : '' });
  audit_('client', 'intake_submitted', code, urgent ? 'URGENT: PHQ-9 item 9 > 0' : '');
  const to = CFG.ALERT_EMAILS || Session.getEffectiveUser().getEmail();
  const subj = (urgent ? '[URGENT – safety review] ' : '') + 'NeuroProfile intake completed: ' + code;
  const body = (urgent
      ? 'URGENT: the client answered the self-harm question above "Not at all". Follow your clinic\'s suicide-risk protocol today (same-day clinician review; 988 Suicide & Crisis Lifeline).\n\n'
      : '') + 'Client code ' + code + ' has completed their intake.\nOpen the console to review: ' + ScriptApp.getService().getUrl() + '?page=console\n\n(No health details are included in this email.)';
  MailApp.sendEmail(to, subj, body);
  return { ok: true, urgent: urgent };
}

/* ---------------- staff (domain-gated) ---------------- */
function whoami(session) { requireStaff_(session); return { email: Session.getActiveUser().getEmail(), baseUrl: ScriptApp.getService().getUrl(), brand: CFG.BRAND }; }
function createClient(session, label) {
  requireStaff_(session);
  const code = makeCode_(), token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  sheet_('Clients').appendRow([code, String(label || '').slice(0, 80), token, new Date(), 'sent', '', '', '', 'none', '', '', '']);
  audit_(actor_(), 'client_created', code, '');
  return clientOut_(findClient_(code));
}
function listClients(session) {
  requireStaff_(session);
  return rows_('Clients').map(clientOut_).reverse();
}
function getIntake(session, code) {
  requireStaff_(session);
  const it = findIntake_(code);
  audit_(actor_(), 'intake_opened', code, '');
  return it ? { status: it.status, updated: String(it.updated), data: JSON.parse(it.json || '{}') } : null;
}
function approveReport(session, code, html) {
  requireStaff_(session);
  const row = findClient_(code); if (!row) throw new Error('Unknown client');
  const folder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('FOLDER_ID'));
  if (row.report_file_id) { try { DriveApp.getFileById(row.report_file_id).setTrashed(true); } catch (e) {} }
  const file = folder.createFile(code + ' – NeuroProfile report.html', html, MimeType.HTML);
  updateClient_(code, { report_status: 'approved', report_file_id: file.getId(), approved_at: new Date(), approved_by: actor_() });
  audit_(actor_(), 'report_approved', code, file.getId());
  return clientOut_(findClient_(code));
}
function revokeReport(session, code) {
  requireStaff_(session);
  updateClient_(code, { report_status: 'revoked' });
  audit_(actor_(), 'report_revoked', code, '');
  return clientOut_(findClient_(code));
}

/* ---------------- staff login (Google account + username/password) ---------------- */
/** Run ONCE from the Apps Script editor: type your username and a NEW password below, run, then erase them and save. */
function setStaffLogin() {
  const USERNAME = '';   // e.g. Hooten113
  const PASSWORD = '';   // choose a new password; erase this line's value after running
  if (!USERNAME || PASSWORD.length < 10) throw new Error('Fill in USERNAME and a PASSWORD of 10+ characters, run, then erase them.');
  const salt = Utilities.getUuid();
  const props = PropertiesService.getScriptProperties();
  props.setProperty('LOGIN_USER', USERNAME.toLowerCase());
  props.setProperty('LOGIN_SALT', salt);
  props.setProperty('LOGIN_HASH', hash_(PASSWORD, salt));
  sec_('login_credentials_set', 'info', actor_(), USERNAME);
  Logger.log('Login saved. Now erase USERNAME and PASSWORD from this function and save the file.');
}
function verifyLogin(username, password) {
  const acct = actor_(), cache = CacheService.getScriptCache(), lockKey = 'lock_' + acct, failKey = 'fail_' + acct;
  if (!isStaff_()) { sec_('login_denied_wrong_account', 'warn', acct, username); return { ok: false, error: 'Sign in to Google with your ' + CFG.ALLOWED_DOMAIN + ' account first.' }; }
  if (cache.get(lockKey)) { sec_('login_blocked_locked', 'high', acct, username); return { ok: false, error: 'Too many attempts. Try again in 15 minutes.' }; }
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('LOGIN_HASH')) return { ok: false, error: 'Login not set up yet. Run setStaffLogin() in the script editor.' };
  const good = String(username || '').toLowerCase() === p.getProperty('LOGIN_USER') && hash_(String(password || ''), p.getProperty('LOGIN_SALT')) === p.getProperty('LOGIN_HASH');
  if (!good) {
    const n = Number(cache.get(failKey) || 0) + 1; cache.put(failKey, String(n), 900);
    sec_('login_failed', n >= 3 ? 'high' : 'warn', acct, username, 'attempt ' + n);
    if (n >= 5) { cache.put(lockKey, '1', 900); sec_('account_locked_15min', 'high', acct, username);
      MailApp.sendEmail(CFG.ALERT_EMAILS || Session.getEffectiveUser().getEmail(), '[Security] NeuroProfile console locked after failed logins',
        '5 failed login attempts from account ' + acct + ' at ' + new Date() + '. The console is locked for 15 minutes. If this wasn\'t you, change the password with setStaffLogin().'); }
    Utilities.sleep(800);
    return { ok: false, error: 'Username or password is incorrect.' };
  }
  cache.remove(failKey);
  const token = Utilities.getUuid() + Utilities.getUuid();
  cache.put('sess_' + token, acct, 6 * 3600);
  sec_('login_success', 'info', acct, username);
  return { ok: true, session: token };
}
function logout(session) { CacheService.getScriptCache().remove('sess_' + session); sec_('logout', 'info', actor_(), ''); return true; }
function hash_(pw, salt) {
  let h = salt + '|' + pw;
  for (let i = 0; i < 2000; i++) h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + salt));
  return h;
}

/* ---------------- helpers ---------------- */
function isStaff_() { const em = (Session.getActiveUser().getEmail() || '').toLowerCase(); return !!em && em.endsWith('@' + CFG.ALLOWED_DOMAIN); }
function requireStaff_(session) {
  if (!isStaff_()) { sec_('staff_call_denied', 'warn', '', ''); throw new Error('Not authorized'); }
  const c = CacheService.getScriptCache(), who = c.get('sess_' + session);
  if (!session || who !== actor_()) throw new Error('SESSION_EXPIRED');
  c.put('sess_' + session, who, 6 * 3600);   // sliding 6-hour session
}
function actor_() { return Session.getActiveUser().getEmail() || 'unknown'; }
function ss_() { return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID')); }
function sheet_(n) { return ss_().getSheetByName(n); }
function rows_(n) {
  const v = sheet_(n).getDataRange().getValues(); const h = v.shift();
  return v.map((r, i) => { const o = { _row: i + 2 }; h.forEach((k, j) => o[k] = r[j]); return o; });
}
function findClient_(code) { if (!code) return null; return rows_('Clients').find(r => r.code === code) || null; }
function findIntake_(code) { return rows_('Intakes').find(r => r.code === code) || null; }
function updateClient_(code, patch) {
  const sh = sheet_('Clients'), h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], row = findClient_(code);
  Object.keys(patch).forEach(k => { const c = h.indexOf(k); if (c >= 0) sh.getRange(row._row, c + 1).setValue(patch[k]); });
}
function upsertIntake_(code, status, data) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = sheet_('Intakes'), it = findIntake_(code), json = JSON.stringify(data || {}).slice(0, 49000);
    if (it) sh.getRange(it._row, 2, 1, 3).setValues([[new Date(), status, json]]);
    else sh.appendRow([code, new Date(), status, json]);
  } finally { lock.releaseLock(); }
}
function clientOut_(r) {
  if (!r) return null;
  const base = ScriptApp.getService().getUrl();
  return { code: r.code, label: r.label, created: String(r.created), intake_status: r.intake_status, submitted_at: String(r.submitted_at || ''),
    urgent: r.urgent === 'YES', report_status: r.report_status, approved_at: String(r.approved_at || ''),
    intakeUrl: CFG.APP_URL ? CFG.APP_URL + '/?c=' + r.code + '&t=' + r.token : base + '?page=intake&c=' + r.code + '&t=' + r.token,
    reportUrl: CFG.APP_URL ? CFG.APP_URL + '/?c=' + r.code + '&t=' + r.token + '&view=report' : base + '?page=report&c=' + r.code + '&t=' + r.token };
}
function makeCode_() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = 'RW-';
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return findClient_(s) ? makeCode_() : s;
}
function sec_(event, severity, account, username, code, detail) {
  try { sheet_('Security').appendRow([new Date(), event, severity, account || actor_() || '(anonymous)', username || '', code || '', detail || '']); } catch (e) {}
}
function audit_(actor, action, code, detail) { try { sheet_('Audit').appendRow([new Date(), actor, action, code, detail]); } catch (e) {} }
function simplePage_(title, msg) {
  return HtmlService.createHtmlOutput('<div style="font-family:system-ui;max-width:520px;margin:15vh auto;padding:24px;text-align:center"><h2 style="color:#0f5c63">'
    + title + '</h2><p style="color:#41525e">' + msg + '</p><p style="font-size:12px;color:#888">' + CFG.BRAND + '</p></div>').setTitle(title);
}
