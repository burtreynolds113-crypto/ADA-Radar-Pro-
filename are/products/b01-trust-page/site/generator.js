import { FIELDS, validate, encode, pageId, answerBank, toCsv, clean, track } from "./app.js";

const GROUPS = [
  ["About your company", ["company", "website", "product", "contact"]],
  ["Infrastructure and data", ["hosting", "regions", "enc_rest", "enc_transit", "backups", "restore_test", "retention"]],
  ["Access control", ["mfa", "sso", "access_review"]],
  ["Security program", ["training", "vuln_scan", "pentest", "ir_plan", "notify_hours"]],
  ["Certifications, documents and subprocessors", ["certs", "docs", "subprocessors"]],
];
const byId = Object.fromEntries(FIELDS.map((f) => [f.id, f]));
const $ = (s) => document.querySelector(s);

function fieldHtml(f) {
  const req = f.required ? ' <span aria-hidden="true">*</span>' : ' <span class="hint">(optional)</span>';
  const err = `<p class="err" id="${f.id}-err" hidden></p>`;
  if (f.type === "yesno" || f.type === "multi") {
    const type = f.type === "yesno" ? "radio" : "checkbox";
    const opts = f.type === "yesno" ? [["yes", "Yes"], ["no", "No"]] : f.options.map((o) => [o, o]);
    return `<fieldset class="field choices" id="${f.id}-group" aria-describedby="${f.id}-err"><legend>${f.label}${req}</legend>${err}
      ${opts.map(([v, l], i) => `<label><input type="${type}" name="${f.id}" value="${v}" id="${f.id}-${i}"> ${l}</label>`).join("")}</fieldset>`;
  }
  const common = `id="${f.id}" name="${f.id}" aria-describedby="${f.id}-err"${f.required ? " required" : ""}`;
  let control;
  if (f.type === "select") control = `<select ${common}><option value="">Choose…</option>${f.options.map((o) => `<option>${o}</option>`).join("")}</select>`;
  else if (f.type === "textarea") control = `<textarea ${common} maxlength="${f.max}" placeholder="Amazon Web Services | Hosting | United States"></textarea>`;
  else if (f.type === "number") control = `<input type="number" inputmode="numeric" min="${f.min}" max="${f.max}" ${common}>`;
  else control = `<input type="${f.type}" ${common} maxlength="${f.max || 200}"${f.type === "email" ? ' autocomplete="email"' : ""}${f.type === "url" ? ' placeholder="https://"' : ""}>`;
  return `<div class="field"><label for="${f.id}">${f.label}${req}</label>${err}${control}</div>`;
}

$("#fields").innerHTML = GROUPS.map(([title, ids]) =>
  `<fieldset><legend>${title}</legend>${ids.map((id) => fieldHtml(byId[id])).join("")}</fieldset>`).join("");

function read() {
  const fd = new FormData($("#tp-form"));
  const d = {};
  for (const f of FIELDS) {
    if (f.type === "multi") d[f.id] = fd.getAll(f.id);
    else d[f.id] = (fd.get(f.id) ?? "").toString().trim();
  }
  return d;
}

function showErrors(errors) {
  for (const f of FIELDS) {
    const msg = errors[f.id];
    const p = document.getElementById(`${f.id}-err`);
    p.hidden = !msg;
    p.textContent = msg || "";
    const el = document.getElementById(f.id) || document.getElementById(`${f.id}-group`);
    if (el) el.setAttribute("aria-invalid", msg ? "true" : "false");
  }
  const box = $("#errors");
  const ids = Object.keys(errors);
  box.hidden = ids.length === 0;
  $("#error-list").innerHTML = ids.map((id) => {
    const target = document.getElementById(id) ? id : `${id}-0`;
    return `<li><a href="#${target}">${errors[id]}</a></li>`;
  }).join("");
  if (ids.length) box.focus();
}

let lastData = null;

$("#tp-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = read();
  const errors = validate(data);
  showErrors(errors);
  if (Object.keys(errors).length) return;
  lastData = clean(data);
  const token = await encode(lastData);
  const url = new URL(`p/#${token}`, location.href).href;
  const id = await pageId(token);
  try { localStorage.setItem(`tp-own:${id}`, "1"); } catch { /* private mode */ }
  $("#share-link").value = url;
  $("#open").href = url;
  $("#result").hidden = false;
  $("#result").focus();
  track("page_created");
});

$("#copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("#share-link").value);
    $("#copy-status").textContent = "Link copied.";
  } catch {
    $("#share-link").select();
    $("#copy-status").textContent = "Select the link above and copy it.";
  }
  track("link_copied");
});

$("#csv").addEventListener("click", () => {
  if (!lastData) return;
  const blob = new Blob([toCsv(answerBank(lastData))], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${lastData.company.replace(/[^\w-]+/g, "-").toLowerCase()}-security-answers.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  track("csv_downloaded");
});

$("#paid-cta").addEventListener("click", () => {
  track("paid_interest_click");
  const form = $("#waitlist");
  if (form.getAttribute("action").startsWith("{{")) return; // waitlist not configured until approval
  form.hidden = false;
  $("#wl-email").focus();
});
$("#waitlist").addEventListener("submit", () => track("waitlist_submitted"));
