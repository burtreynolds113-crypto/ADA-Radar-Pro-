// Trust page generator - shared logic (browser + Node tests). No network, no storage server-side.
// A trust page lives entirely in its share link: JSON -> deflate-raw -> base64url in the URL fragment.
// The fragment is never sent to any server, so we hold no customer data.

export const SCHEMA_VERSION = 1;
export const MAX_LINK_CHARS = 6000;

// Field definitions drive the form, validation, the page, and the answer bank.
export const FIELDS = [
  { id: "company", label: "Company name", type: "text", required: true, max: 80 },
  { id: "website", label: "Company website", type: "url", required: true, max: 200 },
  { id: "product", label: "What your product does (one sentence)", type: "text", required: true, max: 200 },
  { id: "contact", label: "Security contact email", type: "email", required: true, max: 120 },
  { id: "hosting", label: "Primary hosting provider", type: "select", options: ["AWS", "Google Cloud", "Microsoft Azure", "Other / self-managed"], required: true },
  { id: "regions", label: "Where customer data is stored", type: "select", options: ["United States", "European Union", "United Kingdom", "Canada", "Australia", "Multiple regions"], required: true },
  { id: "enc_rest", label: "Customer data encrypted at rest", type: "yesno", required: true },
  { id: "enc_transit", label: "All traffic encrypted in transit (TLS 1.2+)", type: "yesno", required: true },
  { id: "mfa", label: "MFA required for all employee access to production and admin tools", type: "yesno", required: true },
  { id: "sso", label: "SAML/OIDC single sign-on available to customers", type: "select", options: ["Yes, all plans", "Yes, some plans", "No"], required: true },
  { id: "backups", label: "Backup frequency", type: "select", options: ["Continuous / point-in-time", "Daily", "Weekly", "No backups"], required: true },
  { id: "restore_test", label: "Backup restores tested in the last 12 months", type: "yesno", required: true },
  { id: "access_review", label: "Production access reviews", type: "select", options: ["Quarterly", "Twice a year", "Annually", "Not yet"], required: true },
  { id: "training", label: "Security awareness training for all staff, at least yearly", type: "yesno", required: true },
  { id: "vuln_scan", label: "Automated vulnerability / dependency scanning", type: "yesno", required: true },
  { id: "pentest", label: "Most recent third-party penetration test", type: "select", options: ["Within 12 months", "More than 12 months ago", "Never"], required: true },
  { id: "ir_plan", label: "Documented incident response plan", type: "yesno", required: true },
  { id: "notify_hours", label: "Breach notification commitment to customers (hours)", type: "number", min: 1, max: 720, required: false },
  { id: "certs", label: "Certifications and attestations", type: "multi", options: ["SOC 2 Type I", "SOC 2 Type II", "ISO 27001", "SOC 2 in progress", "ISO 27001 in progress", "None yet"], required: true },
  { id: "docs", label: "Documents available on request", type: "multi", options: ["Information security policy", "Privacy policy", "Data processing agreement (DPA)", "Business continuity plan", "Penetration test summary", "Insurance certificate"], required: false },
  { id: "retention", label: "Customer data deleted after contract end (days, blank if not defined)", type: "number", min: 0, max: 3650, required: false },
  { id: "subprocessors", label: "Subprocessors, one per line: Name | purpose | location", type: "textarea", required: false, max: 2000 },
];

const BY_ID = Object.fromEntries(FIELDS.map((f) => [f.id, f]));

// ---------- validation ----------

export function isHttpUrl(s) {
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function validate(data) {
  const errors = {};
  for (const f of FIELDS) {
    const v = data[f.id];
    const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
    if (empty) {
      if (f.required) errors[f.id] = `${f.label} is required.`;
      continue;
    }
    if (f.max && typeof v === "string" && v.length > f.max) errors[f.id] = `${f.label}: at most ${f.max} characters.`;
    if (f.type === "url" && !isHttpUrl(v)) errors[f.id] = `${f.label}: enter a full address starting with https://`;
    if (f.type === "email" && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v)) errors[f.id] = `${f.label}: enter a valid email address.`;
    if (f.type === "yesno" && !["yes", "no"].includes(v)) errors[f.id] = `${f.label}: choose yes or no.`;
    if ((f.type === "select") && !f.options.includes(v)) errors[f.id] = `${f.label}: choose an option.`;
    if (f.type === "multi" && (!Array.isArray(v) || v.some((x) => !f.options.includes(x)))) errors[f.id] = `${f.label}: invalid choice.`;
    if (f.type === "number") {
      const n = Number(v);
      if (!Number.isFinite(n) || n < f.min || n > f.max) errors[f.id] = `${f.label}: enter a number from ${f.min} to ${f.max}.`;
    }
  }
  const certs = data.certs || [];
  if (certs.includes("None yet") && certs.length > 1) errors.certs = "“None yet” can't be combined with other certifications.";
  return errors;
}

// Keep only known fields; this is what goes into the link.
export function clean(data) {
  const out = { v: SCHEMA_VERSION, updated: data.updated || new Date().toISOString().slice(0, 10) };
  for (const f of FIELDS) {
    const v = data[f.id];
    if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) continue;
    out[f.id] = f.type === "number" ? Number(v) : v;
  }
  return out;
}

// ---------- encoding ----------

function b64urlFromBytes(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bytesFromB64url(s) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export async function encode(data) {
  const json = new TextEncoder().encode(JSON.stringify(clean(data)));
  if (typeof CompressionStream === "function") {
    return "z" + b64urlFromBytes(await pipe(json, new CompressionStream("deflate-raw")));
  }
  return "j" + b64urlFromBytes(json);
}

export async function decode(token) {
  if (!token || token.length > MAX_LINK_CHARS) throw new Error("Link is missing or too long.");
  const kind = token[0];
  let bytes = bytesFromB64url(token.slice(1));
  if (kind === "z") bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
  else if (kind !== "j") throw new Error("Unknown link format.");
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (data.v !== SCHEMA_VERSION) throw new Error("Unsupported page version.");
  const errors = validate(data);
  if (Object.keys(errors).length) throw new Error("This link contains invalid data.");
  return data;
}

// Short, stable identifier for analytics (counts distinct pages without storing their content).
export async function pageId(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return b64urlFromBytes(new Uint8Array(digest)).slice(0, 10);
}

// ---------- rendering (all user text escaped) ----------

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const YES = (v) => (v === "yes" ? "Yes" : "No");

export function parseSubprocessors(text) {
  return String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 50)
    .map((l) => {
      const [name = "", purpose = "", location = ""] = l.split("|").map((x) => x.trim());
      return { name, purpose, location };
    });
}

export function controls(d) {
  // [section, label, value] - shared by the page and the answer bank so they never disagree.
  return [
    ["Infrastructure", "Hosting provider", d.hosting],
    ["Infrastructure", "Data location", d.regions],
    ["Data protection", "Encryption at rest", YES(d.enc_rest)],
    ["Data protection", "Encryption in transit (TLS 1.2+)", YES(d.enc_transit)],
    ["Data protection", "Backups", d.backups],
    ["Data protection", "Restore tested in last 12 months", YES(d.restore_test)],
    ["Data protection", "Data deleted after contract end", d.retention !== undefined ? `Within ${d.retention} days` : "Not specified"],
    ["Access control", "MFA for employee access", YES(d.mfa)],
    ["Access control", "Customer single sign-on", d.sso],
    ["Access control", "Production access reviews", d.access_review],
    ["Security program", "Staff security training (yearly)", YES(d.training)],
    ["Security program", "Vulnerability scanning", YES(d.vuln_scan)],
    ["Security program", "Third-party penetration test", d.pentest],
    ["Security program", "Incident response plan", YES(d.ir_plan)],
    ["Security program", "Breach notification commitment", d.notify_hours ? `Within ${d.notify_hours} hours` : "Not specified"],
  ];
}

export function renderPage(d) {
  const site = isHttpUrl(d.website) ? d.website : "";
  const sections = {};
  for (const [sec, label, value] of controls(d)) (sections[sec] ||= []).push([label, value]);
  const subs = parseSubprocessors(d.subprocessors);
  const certs = (d.certs || []).join(", ");
  return `
<header class="tp-head">
  <p class="tp-badge" role="note"><strong>Self-reported.</strong> ${esc(d.company)} published this information on ${esc(d.updated)}. It has not been verified by an auditor or by this site.</p>
  <h1>${esc(d.company)} security overview</h1>
  <p>${esc(d.product)}</p>
  <p>Website: ${site ? `<a href="${esc(site)}" rel="nofollow noopener noreferrer">${esc(site)}</a>` : "—"} · Security contact: <a href="mailto:${esc(d.contact)}">${esc(d.contact)}</a></p>
</header>
<section aria-labelledby="tp-certs"><h2 id="tp-certs">Certifications and attestations</h2><p>${esc(certs)}</p></section>
${Object.entries(sections).map(([sec, rows], i) => `
<section aria-labelledby="tp-s${i}"><h2 id="tp-s${i}">${esc(sec)}</h2>
<table><tbody>${rows.map(([l, v]) => `<tr><th scope="row">${esc(l)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table></section>`).join("")}
<section aria-labelledby="tp-docs"><h2 id="tp-docs">Documents available on request</h2>
${(d.docs || []).length ? `<ul>${d.docs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "<p>None listed.</p>"}
<p>Request documents from <a href="mailto:${esc(d.contact)}">${esc(d.contact)}</a>.</p></section>
<section aria-labelledby="tp-subs"><h2 id="tp-subs">Subprocessors</h2>
${subs.length ? `<table><thead><tr><th scope="col">Name</th><th scope="col">Purpose</th><th scope="col">Location</th></tr></thead><tbody>${subs.map((s) => `<tr><td>${esc(s.name)}</td><td>${esc(s.purpose)}</td><td>${esc(s.location)}</td></tr>`).join("")}</tbody></table>` : "<p>None listed.</p>"}
</section>`;
}

// ---------- answer bank (free tier: starter answers for common questionnaire questions) ----------

export function answerBank(d) {
  const c = d.company;
  const has = (x) => (d.certs || []).includes(x);
  const certLine = (d.certs || []).includes("None yet")
    ? `${c} does not currently hold a third-party security certification.`
    : `${c} holds or is pursuing: ${(d.certs || []).join(", ")}.`;
  const rows = [
    ["Company", "Describe your product or service.", d.product],
    ["Company", "Who is your security point of contact?", `Security questions can be sent to ${d.contact}.`],
    ["Compliance", "Do you hold a SOC 2 report?", has("SOC 2 Type II") ? "Yes, a SOC 2 Type II report is available under NDA." : has("SOC 2 Type I") ? "Yes, a SOC 2 Type I report is available under NDA." : has("SOC 2 in progress") ? "A SOC 2 audit is in progress." : "No."],
    ["Compliance", "Are you ISO 27001 certified?", has("ISO 27001") ? "Yes." : has("ISO 27001 in progress") ? "Certification is in progress." : "No."],
    ["Compliance", "List your security certifications.", certLine],
    ["Hosting", "Where is your application hosted?", `${c} is hosted on ${d.hosting}.`],
    ["Hosting", "Where is customer data stored?", `Customer data is stored in: ${d.regions}.`],
    ["Encryption", "Is customer data encrypted at rest?", d.enc_rest === "yes" ? "Yes, customer data is encrypted at rest." : "No."],
    ["Encryption", "Is data encrypted in transit?", d.enc_transit === "yes" ? "Yes, all traffic uses TLS 1.2 or higher." : "No."],
    ["Access", "Is MFA enforced for employees?", d.mfa === "yes" ? "Yes, MFA is required for all employee access to production systems and administrative tools." : "No."],
    ["Access", "Do you support SSO for customers?", d.sso],
    ["Access", "How often are access rights reviewed?", d.access_review === "Not yet" ? "Formal access reviews are not yet in place." : `Production access is reviewed ${d.access_review.toLowerCase()}.`],
    ["Business continuity", "How often are backups taken?", d.backups],
    ["Business continuity", "Are backup restores tested?", d.restore_test === "yes" ? "Yes, restores have been tested in the last 12 months." : "No."],
    ["People", "Do employees receive security awareness training?", d.training === "yes" ? "Yes, all staff complete security awareness training at least yearly." : "No."],
    ["Vulnerability management", "Do you perform vulnerability scanning?", d.vuln_scan === "yes" ? "Yes, automated vulnerability and dependency scanning is in place." : "No."],
    ["Vulnerability management", "When was your last penetration test?", d.pentest === "Within 12 months" ? "A third-party penetration test was performed within the last 12 months; a summary is available on request." : d.pentest === "Never" ? "No third-party penetration test has been performed yet." : "The most recent third-party penetration test was more than 12 months ago."],
    ["Incident response", "Do you have an incident response plan?", d.ir_plan === "yes" ? "Yes, a documented incident response plan is in place." : "No."],
    ["Incident response", "How quickly will you notify customers of a breach?", d.notify_hours ? `Within ${d.notify_hours} hours of confirmation.` : "No specific commitment is defined."],
    ["Data", "What happens to customer data after termination?", d.retention !== undefined ? `Customer data is deleted within ${d.retention} days of contract end.` : "No retention period is defined."],
    ["Data", "Do you use subprocessors?", parseSubprocessors(d.subprocessors).length ? parseSubprocessors(d.subprocessors).map((s) => `${s.name} (${s.purpose}, ${s.location})`).join("; ") : "No subprocessors listed."],
    ["Documents", "Which security documents can you share?", (d.docs || []).length ? d.docs.join(", ") : "None listed."],
  ];
  return rows;
}

export function csvCell(s) {
  let v = String(s ?? "");
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; // block spreadsheet formula injection
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(rows) {
  return [["Category", "Question", "Answer"], ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

// ---------- analytics (no-op until a cookieless counter is approved and installed) ----------

export function track(name, path) {
  try {
    if (typeof window !== "undefined" && window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: path || `event/${name}`, title: name, event: true });
    }
  } catch { /* analytics must never break the product */ }
}
