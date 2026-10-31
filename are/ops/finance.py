"""Finance: subscriptions, churn, monthly P&L, Stripe import, HTML dashboard.

Sources of truth:
  finance/ledger.csv         money in and out (only verified=yes rows count as profit)
  finance/subscriptions.csv  one row per subscription: customer_id,plan,mrr_usd,started,ended,channel,evidence

  python -m ops.finance summary
  python -m ops.finance import-stripe <balance_transactions.csv> [--approval A-xxx]
  python -m ops.finance dashboard --out dashboard.html

Owner profit here = verified revenue - refunds - all costs (pre income tax).
No estimates are ever written to the ledger.
"""
import argparse
import csv
import html
import json
import sys
from datetime import date
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from ops import are  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
LEDGER_FIELDS = ["date", "category", "amount", "description", "approval_id", "verified", "evidence"]


# --- subscriptions & churn -------------------------------------------------

def load_subscriptions(path):
    path = Path(path)
    if not path.exists():
        return []
    with open(path, newline="") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        r["mrr_usd"] = float(r["mrr_usd"])
        r["ended"] = r.get("ended") or ""
    return rows


def active_on(subs, day):
    """Subscriptions active at the end of `day` (ISO date string)."""
    return [s for s in subs if s["started"] <= day and (not s["ended"] or s["ended"] > day)]


def month_end(ym):
    y, m = map(int, ym.split("-"))
    nxt = date(y + (m == 12), m % 12 + 1, 1)
    return date.fromordinal(nxt.toordinal() - 1).isoformat()


def prev_month_end(ym):
    y, m = map(int, ym.split("-"))
    return date.fromordinal(date(y, m, 1).toordinal() - 1).isoformat()


def months_between(first, last):
    y, m = map(int, first.split("-"))
    out = []
    while f"{y:04d}-{m:02d}" <= last:
        out.append(f"{y:04d}-{m:02d}")
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return out


def month_metrics(ym, subs, ledger_rows):
    start, end = prev_month_end(ym), month_end(ym)
    at_start = active_on(subs, start)
    at_end = active_on(subs, end)
    churned = [s for s in at_start if s["ended"] and start < s["ended"] <= end]
    money = are.summarize(ledger_rows, f"{ym}-01", end)
    rev = money["revenue"]
    return {
        "month": ym,
        "mrr": round(sum(s["mrr_usd"] for s in at_end), 2),
        "customers": len({s["customer_id"] for s in at_end}),
        "new_customers": len([s for s in subs if f"{ym}-01" <= s["started"] <= end]),
        "churned": len(churned),
        "logo_churn": round(len(churned) / len(at_start), 4) if at_start else None,
        "revenue": rev,
        "refunds": money["refunds"],
        "costs": money["costs"],
        "owner_profit": money["net_profit"],
        "net_margin": round(money["net_profit"] / rev, 4) if rev else None,
    }


def all_months(subs, ledger_rows, today=None):
    dates = [r["date"] for r in ledger_rows] + [s["started"] for s in subs]
    last = (today or date.today().isoformat())[:7]
    first = min(dates)[:7] if dates else last
    return [month_metrics(m, subs, ledger_rows) for m in months_between(first, last)]


# --- Stripe import -----------------------------------------------------------

# Stripe dashboard "Balance transactions" export headers. Override with --map if they differ.
STRIPE_COLUMNS = {"id": "id", "type": "Type", "amount": "Amount", "fee": "Fee", "created": "Created (UTC)",
                  "description": "Description"}
REVENUE_TYPES = {"charge", "payment"}
REFUND_TYPES = {"refund", "payment_refund"}


def _num(s):
    return float(str(s).replace(",", "") or 0)


def stripe_rows_to_ledger(rows, approval_id="", cols=STRIPE_COLUMNS):
    out = []
    for r in rows:
        typ = r[cols["type"]].strip().lower()
        day = r[cols["created"]][:10]
        tid = r[cols["id"]]
        amt, fee = _num(r[cols["amount"]]), _num(r.get(cols["fee"], 0))
        desc = (r.get(cols["description"]) or typ)[:80]
        if typ in REVENUE_TYPES:
            out.append([day, "revenue", f"{amt:.2f}", desc, "", "yes", f"stripe:{tid}"])
        elif typ in REFUND_TYPES:
            out.append([day, "refund", f"{abs(amt):.2f}", desc, "", "yes", f"stripe:{tid}"])
        else:
            continue  # payouts, transfers, adjustments: not P&L events
        if fee:
            # Processing fees are an operating cost authorised by the approval that turned on payments.
            out.append([day, "fee", f"{abs(fee):.2f}", f"Stripe fee {tid}", approval_id, "yes", f"stripe-fee:{tid}"])
    return out


def import_stripe(csv_path, ledger_path, approval_id="", cols=STRIPE_COLUMNS):
    existing = set()
    if Path(ledger_path).exists():
        with open(ledger_path, newline="") as f:
            existing = {r["evidence"] for r in csv.DictReader(f)}
    with open(csv_path, newline="") as f:
        new = [r for r in stripe_rows_to_ledger(list(csv.DictReader(f)), approval_id, cols) if r[6] not in existing]
    with open(ledger_path, "a", newline="") as f:
        csv.writer(f).writerows(new)
    return len(new)


# --- dashboard -------------------------------------------------------------

def _money(v):
    if v is None:
        return "—"
    sign = "-" if v < 0 else ""
    v = abs(v)
    if v >= 10000:
        return f"{sign}${v/1000:.1f}K"
    return f"{sign}${v:,.0f}" if v >= 100 or v == int(v) else f"{sign}${v:,.2f}"


def _pct(v):
    return "—" if v is None else f"{v*100:.1f}%"


def mrr_svg(months, width=640, height=180):
    """Single-series bar chart (one hue; title names it, so no legend). <title> gives hover values."""
    if not months:
        return ""
    pad_l, pad_b, pad_t = 48, 24, 12
    vmax = max([m["mrr"] for m in months] + [1])
    n = len(months)
    slot = (width - pad_l) / n
    bw = max(4, min(28, slot - 2))
    parts = [f'<svg viewBox="0 0 {width} {height}" role="img" aria-labelledby="mrr-title" class="chart">',
             '<title id="mrr-title">Monthly recurring revenue by month (table below)</title>',
             f'<line x1="{pad_l}" y1="{height-pad_b}" x2="{width}" y2="{height-pad_b}" class="axis"/>',
             f'<text x="{pad_l-6}" y="{pad_t+4}" class="tick" text-anchor="end">{_money(vmax)}</text>',
             f'<text x="{pad_l-6}" y="{height-pad_b}" class="tick" text-anchor="end">$0</text>']
    for i, m in enumerate(months):
        h = (height - pad_b - pad_t) * m["mrr"] / vmax
        x = pad_l + i * slot + (slot - bw) / 2
        y = height - pad_b - h
        r = min(4, bw / 2, h)
        d = (f"M{x:.1f},{height-pad_b} V{y+r:.1f} Q{x:.1f},{y:.1f} {x+r:.1f},{y:.1f} "
             f"H{x+bw-r:.1f} Q{x+bw:.1f},{y:.1f} {x+bw:.1f},{y+r:.1f} V{height-pad_b} Z") if h > 0 else ""
        parts.append(f'<g class="bar"><rect x="{pad_l+i*slot:.1f}" y="{pad_t}" width="{slot:.1f}" '
                     f'height="{height-pad_b-pad_t}" class="hit"/>'
                     + (f'<path d="{d}" class="fill"/>' if d else "")
                     + f'<title>{m["month"]}: MRR {_money(m["mrr"])}, {m["customers"]} customers</title></g>')
        if n <= 12 or i % max(1, n // 6) == 0:
            parts.append(f'<text x="{pad_l+i*slot+slot/2:.1f}" y="{height-6}" class="tick" text-anchor="middle">{m["month"][2:]}</text>')
    parts.append("</svg>")
    return "".join(parts)


def render_dashboard(root=ROOT, today=None):
    ledger = are.read_ledger(root / "finance" / "ledger.csv")
    subs = load_subscriptions(root / "finance" / "subscriptions.csv")
    cfg = are.load_config(root)
    months = all_months(subs, ledger, today)
    cur = months[-1]
    life = are.summarize(ledger)
    trailing = [m for m in months[-3:] if m["logo_churn"] is not None]
    churn3 = round(sum(m["logo_churn"] for m in trailing) / len(trailing), 4) if trailing else None
    tiles = [
        ("MRR", _money(cur["mrr"]), f"{cur['customers']} paying customers"),
        ("Owner profit this month", _money(cur["owner_profit"]), "verified ledger, pre-tax"),
        ("Lifetime owner profit", _money(life["net_profit"]), f"revenue {_money(life['revenue'])} · refunds {_money(life['refunds'])}"),
        ("Logo churn (3-mo avg)", _pct(churn3), "customers lost / customers at month start"),
        ("Net margin this month", _pct(cur["net_margin"]), "owner profit / collected revenue"),
        ("Spend vs cap", f"{_money(are.total_spend(ledger))} / {_money(cfg['total_spend_cap_usd'])}",
         "kill switch ON" if cfg["kill_switch"] else "kill switch off"),
    ]
    tile_html = "".join(f'<div class="tile"><div class="label">{html.escape(l)}</div><div class="value">{html.escape(v)}</div>'
                        f'<div class="sub">{html.escape(s)}</div></div>' for l, v, s in tiles)
    head = ["Month", "MRR", "Customers", "New", "Churned", "Logo churn", "Revenue", "Refunds", "Costs", "Owner profit", "Net margin"]
    body = "".join(
        "<tr>" + "".join(f"<td>{html.escape(str(x))}</td>" for x in [
            m["month"], _money(m["mrr"]), m["customers"], m["new_customers"], m["churned"], _pct(m["logo_churn"]),
            _money(m["revenue"]), _money(m["refunds"]), _money(m["costs"]), _money(m["owner_profit"]), _pct(m["net_margin"])]) + "</tr>"
        for m in reversed(months))
    unverified = f"<p class='warn'>⚠ {life['unverified_rows']} unverified ledger row(s) excluded from profit.</p>" if life["unverified_rows"] else ""
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Company financial dashboard</title>
<style>
:root {{ --surface:#fcfcfb; --ink:#0b0b0b; --ink2:#52514e; --rule:#d9d8d4; --series:#2a78d6; }}
@media (prefers-color-scheme: dark) {{ :root {{ --surface:#1a1a19; --ink:#f0efec; --ink2:#c3c2b7; --rule:#3a3a38; --series:#3987e5; }} }}
body {{ margin:0; padding:24px; background:var(--surface); color:var(--ink); font:15px/1.5 system-ui, sans-serif; }}
h1 {{ font-size:20px; margin:0 0 4px; }} .meta {{ color:var(--ink2); margin:0 0 20px; }}
.tiles {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:12px; margin-bottom:24px; }}
.tile {{ border:1px solid var(--rule); border-radius:8px; padding:12px 14px; }}
.label {{ color:var(--ink2); font-size:13px; }} .value {{ font-size:24px; font-weight:600; }} .sub {{ color:var(--ink2); font-size:12px; }}
.chart {{ width:100%; max-width:720px; height:auto; }} .axis {{ stroke:var(--rule); stroke-width:1; }}
.tick {{ fill:var(--ink2); font-size:11px; }} .fill {{ fill:var(--series); }} .hit {{ fill:transparent; }}
.bar:hover .hit {{ fill:var(--rule); opacity:.35; }}
table {{ border-collapse:collapse; width:100%; font-variant-numeric:tabular-nums; }}
th, td {{ text-align:right; padding:6px 8px; border-bottom:1px solid var(--rule); }} th:first-child, td:first-child {{ text-align:left; }}
th {{ color:var(--ink2); font-weight:600; }} .warn {{ color:var(--ink); }}
</style></head><body>
<h1>Company financial dashboard</h1>
<p class="meta">Generated {html.escape(today or date.today().isoformat())} from finance/ledger.csv and finance/subscriptions.csv. Verified figures only.</p>
{unverified}
<section class="tiles" aria-label="Key figures">{tile_html}</section>
<h2>Monthly recurring revenue</h2>
{mrr_svg(months[-24:])}
<h2>Monthly P&amp;L and retention</h2>
<table><thead><tr>{''.join(f'<th scope="col">{h}</th>' for h in head)}</tr></thead><tbody>{body}</tbody></table>
</body></html>
"""


def main(argv=None):
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("summary")
    imp = sub.add_parser("import-stripe")
    imp.add_argument("csv")
    imp.add_argument("--approval", default="")
    imp.add_argument("--map", help="JSON object overriding Stripe column names")
    d = sub.add_parser("dashboard")
    d.add_argument("--out", default=str(ROOT / "finance" / "dashboard.html"))
    a = ap.parse_args(argv)
    if a.cmd == "summary":
        ledger = are.read_ledger(ROOT / "finance" / "ledger.csv")
        subs = load_subscriptions(ROOT / "finance" / "subscriptions.csv")
        print(json.dumps(all_months(subs, ledger)[-1], indent=2))
    elif a.cmd == "import-stripe":
        cols = dict(STRIPE_COLUMNS, **json.loads(a.map)) if a.map else STRIPE_COLUMNS
        n = import_stripe(a.csv, ROOT / "finance" / "ledger.csv", a.approval, cols)
        print(f"imported {n} new ledger rows (duplicates skipped)")
    elif a.cmd == "dashboard":
        Path(a.out).write_text(render_dashboard())
        print(f"wrote {a.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
