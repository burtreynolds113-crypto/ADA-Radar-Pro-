// Build the publishable site: copy site/ -> dist/, fill placeholders from site.config.json,
// add analytics + a strict Content-Security-Policy, write CNAME. Refuses to build if any value
// is missing or malformed, so placeholders can never be published.
//   node build.mjs [--config site.config.json] [--out dist]
import { readFile, writeFile, mkdir, cp, rm, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

const RULES = {
  product_name: [/^[A-Za-z0-9][A-Za-z0-9 .\-]{1,38}$/, "2-40 letters, digits, spaces, dots or dashes"],
  site_domain: [/^(?=.{4,253}$)([a-z0-9-]+\.)+[a-z]{2,}$/, "a bare lowercase hostname like vendorready.com"],
  contact_email: [/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i, "an email address"],
  waitlist_form_action: [/^https:\/\/formspree\.io\/f\/[A-Za-z0-9]+$/, "a Formspree endpoint like https://formspree.io/f/abcd1234"],
  goatcounter_code: [/^[a-z0-9][a-z0-9-]{1,48}$/, "your GoatCounter site code (the part before .goatcounter.com)"],
};

export function validateConfig(cfg) {
  const errors = [];
  for (const [k, [re, hint]] of Object.entries(RULES)) {
    if (typeof cfg[k] !== "string" || !re.test(cfg[k])) errors.push(`${k}: expected ${hint}`);
  }
  return errors;
}

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function csp(cfg) {
  return [
    "default-src 'self'",
    "script-src 'self' https://gc.zgo.at",
    `connect-src 'self' https://${cfg.goatcounter_code}.goatcounter.com`,
    `img-src 'self' data: https://${cfg.goatcounter_code}.goatcounter.com`,
    "style-src 'self'",
    "form-action https://formspree.io",
    "base-uri 'none'",
    "object-src 'none'",
    // frame-ancestors is ignored in <meta> CSP and GitHub Pages cannot set headers; acceptable here
    // because the pages have no authenticated actions to clickjack.
  ].join("; ");
}

export function transform(html, cfg) {
  const head = `<meta http-equiv="Content-Security-Policy" content="${csp(cfg)}">
<script data-goatcounter="https://${cfg.goatcounter_code}.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
</head>`;
  const out = html
    .replaceAll("{{PRODUCT_NAME}}", esc(cfg.product_name))
    .replaceAll("{{CONTACT_EMAIL}}", `<a href="mailto:${esc(cfg.contact_email)}">${esc(cfg.contact_email)}</a>`)
    .replaceAll("{{WAITLIST_FORM_ACTION}}", esc(cfg.waitlist_form_action))
    .replace(/<!-- NOT PUBLISHED[\s\S]*?-->\n?/, "")
    .replace("</head>", head);
  const left = out.match(/\{\{[A-Z_]+\}\}/);
  if (left) throw new Error(`unfilled placeholder ${left[0]}`);
  return out;
}

async function htmlFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await htmlFiles(p)));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

export async function build(configPath, outDir) {
  const cfg = JSON.parse(await readFile(configPath, "utf8"));
  const errors = validateConfig(cfg);
  if (errors.length) throw new Error("site.config.json is not ready:\n  - " + errors.join("\n  - "));
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await cp(join(HERE, "site"), outDir, { recursive: true });
  for (const f of await htmlFiles(outDir)) await writeFile(f, transform(await readFile(f, "utf8"), cfg));
  await writeFile(join(outDir, "CNAME"), cfg.site_domain + "\n");
  await writeFile(join(outDir, "robots.txt"), "User-agent: *\nDisallow: /p/\n");
  return cfg;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
  try {
    const cfg = await build(arg("--config", join(HERE, "site.config.json")), arg("--out", join(HERE, "dist")));
    console.log(`built ${cfg.site_domain}`);
  } catch (e) {
    console.error(String(e.message || e));
    process.exit(1);
  }
}
