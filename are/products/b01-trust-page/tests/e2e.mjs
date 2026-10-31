// End-to-end: serve the site locally, fill the form like a user, open the share link,
// check content, XSS safety and accessibility (axe-core). Usage: node tests/e2e.mjs
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const axeSource = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
const ROOT = process.env.E2E_ROOT || new URL("../site/", import.meta.url).pathname;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

const server = createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (p.endsWith("/")) p += "index.html";
  try {
    const body = await readFile(join(ROOT, p));
    res.writeHead(200, { "content-type": TYPES[extname(p)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end("not found"); }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/`;

async function axe(page, label) {
  await page.evaluate(axeSource); // CDP evaluation is not subject to the page CSP
  const r = await page.evaluate(() => axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] }));
  const v = r.violations.map((x) => `${x.id} (${x.nodes.length})`);
  assert.deepEqual(v, [], `${label} axe violations: ${v.join(", ")}`);
}

const browser = await chromium.launch();
try {
  for (const scheme of ["light", "dark"]) {
    const page = await browser.newPage({ colorScheme: scheme });
    const cspErrors = [];
    page.on("console", (m) => { if (/Content Security Policy/i.test(m.text())) cspErrors.push(m.text()); });
    await page.goto(base);
    await page.route("https://gc.zgo.at/**", (r) => r.abort()); // no third-party calls in tests
    await axe(page, `generator (${scheme})`);

    // Empty submit shows an error summary that receives focus.
    await page.click("button[type=submit]");
    assert.equal(await page.isVisible("#errors"), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), "errors");
    await axe(page, `generator with errors (${scheme})`);
    if (scheme === "dark") { await page.close(); continue; }

    // Fill it in, including an XSS attempt in the company name.
    await page.fill("#company", '<img src=x onerror="window.pwned=1">Acme');
    await page.fill("#website", "https://acme.example");
    await page.fill("#product", "Dashboards for logistics teams.");
    await page.fill("#contact", "security@acme.example");
    for (const [id, v] of [["hosting", "AWS"], ["regions", "United States"], ["sso", "No"], ["backups", "Daily"],
      ["access_review", "Quarterly"], ["pentest", "Within 12 months"]]) await page.selectOption(`#${id}`, v);
    for (const id of ["enc_rest", "enc_transit", "mfa", "restore_test", "training", "vuln_scan", "ir_plan"]) await page.check(`#${id}-0`);
    await page.check("#certs-1"); // SOC 2 Type II
    await page.fill("#subprocessors", "AWS | Hosting | United States");
    await page.click("button[type=submit]");
    await page.waitForSelector("#result:not([hidden])");
    const link = await page.inputValue("#share-link");
    assert.match(link, /\/p\/#z/);
    await axe(page, "generator with result");

    // CSV download works.
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#csv")]);
    assert.match(dl.suggestedFilename(), /security-answers\.csv$/);

    // Viewer renders the content safely.
    const viewer = await browser.newPage();
    await viewer.goto(link);
    await viewer.waitForSelector("h1");
    const h1 = await viewer.textContent("h1");
    assert.ok(h1.includes('<img src=x onerror="window.pwned=1">Acme security overview'), h1);
    assert.equal(await viewer.evaluate(() => window.pwned), undefined);
    assert.ok((await viewer.textContent("main")).includes("SOC 2 Type II"));
    assert.ok((await viewer.textContent("main")).includes("Self-reported"));
    await axe(viewer, "viewer");

    // Broken link shows a readable error.
    await viewer.goto(base + "p/#zBROKEN");
    await viewer.waitForSelector("h1");
    assert.match(await viewer.textContent("h1"), /can't be displayed/);
    assert.deepEqual(cspErrors.filter((e) => !/axe|gc\.zgo\.at/.test(e)), [], "CSP violations");
    await page.close();
  }
  console.log("e2e: all checks passed");
} finally {
  await browser.close();
  server.close();
}
