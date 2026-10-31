import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateConfig, transform, build } from "../build.mjs";

const GOOD = { product_name: "VendorReady", site_domain: "vendorready.example", contact_email: "hello@vendorready.example",
  waitlist_form_action: "https://formspree.io/f/abc123", goatcounter_code: "vendorready" };

test("empty repo config is rejected (cannot publish placeholders)", async () => {
  const cfg = JSON.parse(await readFile(new URL("../site.config.json", import.meta.url), "utf8"));
  assert.equal(validateConfig(cfg).length, 5);
});

test("valid config passes; bad values are named", () => {
  assert.deepEqual(validateConfig(GOOD), []);
  const e = validateConfig({ ...GOOD, waitlist_form_action: "https://evil.example/f/x", site_domain: "https://x.com" });
  assert.equal(e.length, 2);
});

test("transform fills placeholders, escapes, adds CSP and analytics", () => {
  const html = "<head><!-- NOT PUBLISHED. x --></head><p>{{PRODUCT_NAME}} {{CONTACT_EMAIL}}</p><form action=\"{{WAITLIST_FORM_ACTION}}\">";
  const out = transform(html, { ...GOOD, product_name: "A & B" });
  assert.ok(out.includes("A &amp; B"));
  assert.ok(out.includes('mailto:hello@vendorready.example'));
  assert.ok(out.includes("Content-Security-Policy"));
  assert.ok(out.includes("https://vendorready.goatcounter.com/count"));
  assert.ok(!out.includes("NOT PUBLISHED"));
  assert.ok(!out.includes("{{"));
});

test("transform refuses unknown leftover placeholders", () => {
  assert.throws(() => transform("<head></head>{{SOMETHING_NEW}}", GOOD), /unfilled placeholder/);
});

test("full build writes site, CNAME and robots", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tp-"));
  try {
    await writeFile(join(dir, "c.json"), JSON.stringify(GOOD));
    await build(join(dir, "c.json"), join(dir, "dist"));
    assert.equal((await readFile(join(dir, "dist", "CNAME"), "utf8")).trim(), "vendorready.example");
    const idx = await readFile(join(dir, "dist", "index.html"), "utf8");
    const view = await readFile(join(dir, "dist", "p", "index.html"), "utf8");
    for (const h of [idx, view]) assert.ok(!h.includes("{{") && h.includes("Content-Security-Policy"));
    assert.match(await readFile(join(dir, "dist", "robots.txt"), "utf8"), /Disallow: \/p\//);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
