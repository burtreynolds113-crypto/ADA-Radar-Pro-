import { test } from "node:test";
import assert from "node:assert/strict";
import * as app from "../site/app.js";

export const SAMPLE = {
  company: "Acme Analytics", website: "https://acme.example", product: "Dashboards for logistics teams.",
  contact: "security@acme.example", hosting: "AWS", regions: "United States", enc_rest: "yes", enc_transit: "yes",
  mfa: "yes", sso: "Yes, some plans", backups: "Daily", restore_test: "no", access_review: "Quarterly",
  training: "yes", vuln_scan: "yes", pentest: "Never", ir_plan: "yes", notify_hours: "72",
  certs: ["SOC 2 in progress"], docs: ["Privacy policy", "Data processing agreement (DPA)"], retention: "30",
  subprocessors: "Amazon Web Services | Hosting | United States\nStripe | Payments | United States",
};

test("sample is valid and has 22 fields", () => {
  assert.equal(app.FIELDS.length, 22);
  assert.deepEqual(app.validate(SAMPLE), {});
});

test("required, url, email and option checks", () => {
  const e = app.validate({ ...SAMPLE, company: "", website: "javascript:alert(1)", contact: "nope", hosting: "Mars", certs: ["Made up"] });
  for (const k of ["company", "website", "contact", "hosting", "certs"]) assert.ok(e[k], k);
});

test("'None yet' cannot be combined with a certification", () => {
  assert.ok(app.validate({ ...SAMPLE, certs: ["None yet", "ISO 27001"] }).certs);
});

test("encode/decode round trip keeps only known fields", async () => {
  const token = await app.encode({ ...SAMPLE, evil: "<script>" });
  assert.match(token, /^[zj][A-Za-z0-9_-]+$/);
  const d = await app.decode(token);
  assert.equal(d.company, "Acme Analytics");
  assert.equal(d.notify_hours, 72);
  assert.equal(d.evil, undefined);
  assert.ok(token.length < 1200, `link token is ${token.length} chars`);
});

test("decode rejects tampered, oversized and invalid links", async () => {
  await assert.rejects(app.decode("zAAAA"));
  await assert.rejects(app.decode("x" + "a".repeat(10)));
  await assert.rejects(app.decode("j" + "a".repeat(app.MAX_LINK_CHARS)));
  const bad = await app.encode({ ...SAMPLE, website: "javascript:alert(1)" });
  await assert.rejects(app.decode(bad), /invalid data/);
});

test("rendering escapes all user text", () => {
  const d = app.clean({ ...SAMPLE, company: '<img src=x onerror="alert(1)">', subprocessors: "<b>x</b> | y | z" });
  const html = app.renderPage(d);
  assert.ok(!html.includes("<img"));
  assert.ok(!html.includes("<b>x"));
  assert.ok(html.includes("&lt;img"));
  assert.ok(html.includes("Self-reported"));
});

test("page and answer bank agree on facts", () => {
  const d = app.clean(SAMPLE);
  const rows = app.answerBank(d);
  const soc2 = rows.find((r) => r[1] === "Do you hold a SOC 2 report?");
  assert.equal(soc2[2], "A SOC 2 audit is in progress.");
  const pen = rows.find((r) => r[1].startsWith("When was your last penetration test"));
  assert.match(pen[2], /No third-party penetration test/);
  assert.ok(rows.length >= 20);
});

test("CSV escapes quotes and blocks formula injection", () => {
  assert.equal(app.csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(app.csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(app.csvCell("-1+2"), "'-1+2");
  const csv = app.toCsv([["a", "b", "c"]]);
  assert.ok(csv.startsWith("Category,Question,Answer\r\n"));
});

test("subprocessor parsing caps rows and splits columns", () => {
  const rows = app.parseSubprocessors(Array(80).fill("A | B | C").join("\n"));
  assert.equal(rows.length, 50);
  assert.deepEqual(rows[0], { name: "A", purpose: "B", location: "C" });
});

test("pageId is short and stable", async () => {
  const a = await app.pageId("ztoken"), b = await app.pageId("ztoken");
  assert.equal(a, b);
  assert.equal(a.length, 10);
});
