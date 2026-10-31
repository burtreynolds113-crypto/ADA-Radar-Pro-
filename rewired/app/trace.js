/* Rewired signature trace: a light, three-channel EEG strip with a marked P300. */
window.RewiredTrace = function (canvas, opts) {
  const o = Object.assign({ color: '#0E5E66', ink: '#17222D', grid: '#E1EAE6', label: '#6B7A84', channels: ['Fz', 'Cz', 'Pz'] }, opts || {});
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now(); let drawn = reduce ? 1 : 0;
  const ph = [0, 1.7, 3.1], gain = [.85, 1, 1.12];
  function size() { const r = canvas.getBoundingClientRect(), d = window.devicePixelRatio || 1; canvas.width = r.width * d; canvas.height = r.height * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
  size(); window.addEventListener('resize', size);
  function sig(tt, i) {
    let v = Math.sin(2 * Math.PI * 10.2 * tt + ph[i]) + .25 * Math.sin(2 * Math.PI * 5.6 * tt + ph[i] * .7) + .16 * Math.sin(2 * Math.PI * 19 * tt + ph[i]);
    v *= .42 * gain[i];
    const p = 1.6, x = ((tt % p) + p) % p, d = x - .3;
    return v + 1.4 * gain[i] * Math.exp(-(d * d) / (2 * .035 * .035)) - .4 * gain[i] * Math.exp(-((x - .1) ** 2) / (2 * .02 * .02));
  }
  function frame(now) {
    const time = reduce ? 0 : (now - t0) / 1000, w = canvas.clientWidth, h = canvas.clientHeight, n = o.channels.length, rowH = h / n, secs = w / 160;
    ctx.clearRect(0, 0, w, h); ctx.strokeStyle = o.grid; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, h); ctx.stroke(); }
    drawn = Math.min(1, drawn + .015);
    o.channels.forEach((name, i) => {
      const y0 = rowH * (i + .5);
      ctx.fillStyle = o.label; ctx.font = '12px "Atkinson Hyperlegible", sans-serif'; ctx.fillText(name, 14, y0 - rowH * .25);
      ctx.strokeStyle = i === 1 ? o.color : o.ink; ctx.lineWidth = i === 1 ? 2.2 : 1.2; ctx.beginPath();
      for (let x = 44; x < w * drawn; x += 1.5) { const y = y0 - sig((x / w) * secs + time, i) * rowH * .38; x === 44 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    });
    if (!reduce || drawn < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};
