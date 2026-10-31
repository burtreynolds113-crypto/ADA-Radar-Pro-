/* Rewired console launcher. Opens the Apps Script console top-level (Google sign-in can't run inside an embedded frame on iOS Safari). */
(function () {
  const CFG = window.REWIRED_CONFIG || {}, EXEC = (CFG.EXEC_URL || '').trim();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
  const consoleUrl = EXEC ? EXEC + '?page=console' : (CFG.DEMO_PORTAL || '').replace(/Intake\.html$/, 'Console.html');
  const tiles = [
    { cls: 'primary', title: 'Open console', sub: 'Clients, intake links, reports, approvals', href: consoleUrl },
    CFG.SHEET_URL ? { title: 'Security and audit log', sub: 'Your private Google Sheet: Security and Audit tabs', href: CFG.SHEET_URL } : null,
    { title: 'Install on this device', sub: /iphone|ipad/i.test(navigator.userAgent) ? 'In Safari, tap Share, then Add to Home Screen' : 'Use your browser menu: Install app or Add to Home screen', href: null }
  ].filter(Boolean);
  document.getElementById('tiles').innerHTML = tiles.map(t => t.href
    ? `<a class="tile ${t.cls || ''}" href="${t.href}" rel="noopener"><b>${t.title}</b><span>${t.sub}</span></a>`
    : `<div class="tile"><b>${t.title}</b><span>${t.sub}</span></div>`).join('');
  if (!EXEC) document.getElementById('tiles').insertAdjacentHTML('afterbegin', '<div class="tile" style="background:#F8E3E6"><b>Demo mode</b><span>Set EXEC_URL in config.js to connect your live console.</span></div>');
})();
