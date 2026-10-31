/* Rewired client app. Stores only the client's code + link token on this device. All answers and reports stay in the clinic's Google Workspace. */
(function () {
  const CFG = window.REWIRED_CONFIG || {};
  const EXEC = (CFG.EXEC_URL || '').trim();
  const DEMO = !EXEC && CFG.DEMO_PORTAL;
  const KEY = 'rewired_link_v1';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = { get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }, set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }, clear() { try { localStorage.removeItem(KEY); } catch (e) {} } };

  window.RewiredTrace($('sig'));
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');

  // 1) Capture a private link (?c=&t=) and remove it from the address bar.
  const q = new URLSearchParams(location.search);
  if (q.get('c') && q.get('t')) {
    store.set({ c: q.get('c'), t: q.get('t'), saved: Date.now() });
    history.replaceState(null, '', location.pathname);
  }
  const wantReport = q.get('view') === 'report';
  const link = store.get();

  const intakeUrl = l => DEMO ? `${CFG.DEMO_PORTAL}?c=${encodeURIComponent(l.c)}&t=${encodeURIComponent(l.t)}` : `${EXEC}?page=intake&c=${encodeURIComponent(l.c)}&t=${encodeURIComponent(l.t)}`;
  const reportUrl = l => DEMO ? `${CFG.DEMO_PORTAL}?page=report&c=${encodeURIComponent(l.c)}&t=${encodeURIComponent(l.t)}` : `${EXEC}?page=report&c=${encodeURIComponent(l.c)}&t=${encodeURIComponent(l.t)}`;

  async function status(l) {
    if (DEMO) {
      try { const d = JSON.parse(localStorage.getItem('np_demo_v1')); const c = d.clients.find(x => x.code === l.c && x.token === l.t); return c ? { ok: true, intake: c.intake_status, report: c.report_status } : { ok: false }; }
      catch (e) { return { ok: false }; }
    }
    if (!EXEC) return { ok: false, config: true };
    const r = await fetch(`${EXEC}?page=status&c=${encodeURIComponent(l.c)}&t=${encodeURIComponent(l.t)}`, { cache: 'no-store', credentials: 'omit' });
    return r.json();
  }

  function openFrame(title, url) { $('frameTitle').textContent = title; $('frameEl').src = url; $('frame').classList.add('on'); $('frameBack').focus(); }
  $('frameBack').onclick = () => { $('frame').classList.remove('on'); $('frameEl').src = 'about:blank'; if (link) render(); };

  // Install prompt: Android/desktop via beforeinstallprompt, iOS via instructions.
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; const b = document.getElementById('installBtn'); if (b) b.hidden = false; });
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  function installCard() {
    if (standalone) return '';
    return `<div class="install"><b>Keep Rewired on your home screen.</b> Check your scan and report status anytime.
      ${isIOS ? '<div style="margin-top:6px">In Safari, tap Share, then <b>Add to Home Screen</b>.</div>' : '<div><button id="installBtn" hidden>Add to home screen</button></div>'}</div>`;
  }
  function wireInstall() { const b = document.getElementById('installBtn'); if (!b) return; if (deferred) b.hidden = false; b.onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; b.hidden = true; }; }

  function stepsHTML(s) {
    const intakeDone = s.intake === 'submitted', reportDone = s.report === 'approved';
    const st = (done, now) => done ? 'done' : now ? 'now' : '';
    return `<ol class="steps">
      <li class="${st(intakeDone, !intakeDone)}"><b>Questionnaire</b><span>${intakeDone ? 'Sent to your clinician' : s.intake === 'draft' ? 'In progress. Your answers are saved.' : 'About 10 minutes'}</span></li>
      <li class="${st(reportDone, intakeDone && !reportDone)}"><b>Brain scan</b><span>${reportDone ? 'Complete' : intakeDone ? 'Your clinician will confirm a time' : '40 minutes, at home or in clinic'}</span></li>
      <li class="${st(reportDone, false)}"><b>Your report</b><span>${reportDone ? 'Ready to read' : 'Reviewed and approved by your clinician first'}</span></li>
      <li><b>90-day check-in</b><span>A follow-up scan shows what changed</span></li></ol>`;
  }

  async function render() {
    const v = $('view');
    if (!link) {
      v.innerHTML = `<h1 class="big">Your brain has a signature.</h1>
        <p class="lead">Open the private link your Rewired by TrueBrain clinician sent you by text or email to get started.</p>${installCard()}`;
      wireInstall(); return;
    }
    $('refresh').hidden = false;
    v.innerHTML = `<h1 class="big">Your NeuroProfile</h1><div class="panel"><p class="hint" style="margin:0">Checking your status…</p></div>`;
    let s;
    try { s = await status(link); } catch (e) { s = { ok: false, net: true }; }
    if (!s.ok) {
      v.innerHTML = `<h1 class="big">Your NeuroProfile</h1><div class="err">${s.config ? 'This app isn’t connected yet. Ask your clinician for the latest link.' : s.net ? 'You appear to be offline. Pull to refresh or tap Refresh when you’re connected.' : 'This link is no longer valid. Ask your clinician to send a new one.'}</div>
        <button class="ghost" id="forget">Use a different link</button>`;
      $('forget').onclick = () => { store.clear(); location.reload(); }; return;
    }
    const intakeDone = s.intake === 'submitted', reportDone = s.report === 'approved';
    const action = !intakeDone
      ? `<button class="cta" id="go">${s.intake === 'draft' ? 'Continue my questionnaire' : 'Start my questionnaire'}</button>`
      : reportDone ? `<button class="cta alt" id="go">Open my report</button>`
      : `<button class="cta" disabled>Report in review</button><p class="hint">We’ll let you know as soon as your clinician approves it.</p>`;
    v.innerHTML = `<h1 class="big">${reportDone ? 'Your report is ready.' : intakeDone ? 'You’re all set for now.' : 'Let’s get started.'}</h1>
      <div class="panel">${stepsHTML(s)}${action}</div>${installCard()}
      <p class="hint">Not an emergency service. If you’re in crisis, call or text 988, or call 911.</p>`;
    wireInstall();
    const go = $('go');
    if (go) go.onclick = () => reportDone ? openFrame('Your report', reportUrl(link)) : openFrame('Questionnaire', intakeUrl(link));
    if (wantReport && reportDone && !render.opened) { render.opened = true; openFrame('Your report', reportUrl(link)); }
  }
  $('refresh').onclick = render;
  document.addEventListener('visibilitychange', () => { if (!document.hidden && link && !$('frame').classList.contains('on')) render(); });
  render();
})();
