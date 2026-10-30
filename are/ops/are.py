#!/usr/bin/env python3
"""ARE operating CLI. Deterministic, stdlib only, no network, no AI calls.

  python3 are/ops/are.py score            Rank opportunities (research/opportunities.csv)
  python3 are/ops/are.py ledger           Summarize finance/ledger.csv and check spend caps
  python3 are/ops/are.py can-spend 25.00  Exit 0 if a new spend fits the caps and kill switch is off
  python3 are/ops/are.py report 2026-W44  Write reports/weekly/<week>.md from ledger + metrics

Every money figure comes from finance/ledger.csv. Rows with verified=no are
reported separately and never counted as profit.
"""
import csv
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

WEIGHTS = {
    "intent": 0.20,
    "distribution": 0.20,
    "pain": 0.15,
    "margin_recurring": 0.15,
    "simplicity": 0.10,
    "automation": 0.10,
    "low_risk": 0.10,
}
# Unresearched ideas cannot outrank researched ones on optimism alone.
EVIDENCE_PENALTY = {"E": 0.0, "A": 0.15, "N": 0.30}

# Ledger categories. Revenue is positive, everything else negative in its effect.
REVENUE = {"revenue"}
REFUNDS = {"refund"}
COSTS = {"fee", "hosting", "domain", "ads", "ai_usage", "software", "support", "other_cost"}


def load_config(root=ROOT):
    return json.loads((root / "ops" / "config.json").read_text())


def score_row(row):
    base = sum(float(row[k]) * w for k, w in WEIGHTS.items())
    return round(base - EVIDENCE_PENALTY[row["evidence"]], 3)


def rank(path):
    with open(path, newline="") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        for k in WEIGHTS:
            v = float(r[k])
            if not 1 <= v <= 5:
                raise ValueError(f"{r['id']}: {k}={v} outside 1-5")
        r["score"] = score_row(r)
    # Ethics/legal/founder-rule exclusions are listed last regardless of score.
    return sorted(rows, key=lambda r: (r.get("excluded") != "yes", r["score"]), reverse=True)


def read_ledger(path):
    with open(path, newline="") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        r["amount"] = round(float(r["amount"]), 2)
        if r["category"] not in REVENUE | REFUNDS | COSTS:
            raise ValueError(f"unknown ledger category: {r['category']}")
        if r["verified"] not in ("yes", "no"):
            raise ValueError(f"verified must be yes/no: {r}")
    return rows


def summarize(rows, since=None, until=None):
    """Totals for verified rows in [since, until]. Amounts are stored as positive numbers."""
    s = {"revenue": 0.0, "refunds": 0.0, "costs": 0.0, "unverified_rows": 0}
    for r in rows:
        if since and r["date"] < since:
            continue
        if until and r["date"] > until:
            continue
        if r["verified"] != "yes":
            s["unverified_rows"] += 1
            continue
        if r["category"] in REVENUE:
            s["revenue"] += r["amount"]
        elif r["category"] in REFUNDS:
            s["refunds"] += r["amount"]
        else:
            s["costs"] += r["amount"]
    s["net_profit"] = s["revenue"] - s["refunds"] - s["costs"]
    return {k: round(v, 2) if isinstance(v, float) else v for k, v in s.items()}


def total_spend(rows):
    """All committed spend, verified or not - caps must be conservative."""
    return round(sum(r["amount"] for r in rows if r["category"] in COSTS), 2)


def can_spend(amount, rows, cfg):
    """Returns (ok, reason). Spend still needs a human approval record; this only enforces caps."""
    if cfg.get("kill_switch"):
        return False, "kill switch is ON - all spending halted"
    if amount <= 0:
        return False, "amount must be positive"
    spent = total_spend(rows)
    if spent + amount > cfg["total_spend_cap_usd"]:
        return False, f"would exceed total cap: {spent} + {amount} > {cfg['total_spend_cap_usd']}"
    if amount > cfg["single_spend_cap_usd"]:
        return False, f"exceeds single-spend cap {cfg['single_spend_cap_usd']}"
    return True, f"within caps (spent {spent} of {cfg['total_spend_cap_usd']})"


def week_bounds(iso_week):
    year, wk = iso_week.split("-W")
    start = date.fromisocalendar(int(year), int(wk), 1)
    end = date.fromisocalendar(int(year), int(wk), 7)
    return start.isoformat(), end.isoformat()


def read_hours(path, since, until):
    if not path.exists():
        return 0.0
    with open(path, newline="") as f:
        return round(sum(float(r["hours"]) for r in csv.DictReader(f) if since <= r["date"] <= until), 2)


def render_report(iso_week, root=ROOT):
    since, until = week_bounds(iso_week)
    rows = read_ledger(root / "finance" / "ledger.csv")
    cfg = load_config(root)
    wk = summarize(rows, since, until)
    life = summarize(rows)
    hours = read_hours(root / "finance" / "founder_hours.csv", since, until)
    metrics = json.loads((root / "analytics" / "metrics.json").read_text())
    lines = [
        f"# CEO weekly report - {iso_week} ({since} to {until})",
        "",
        "_Generated by `are/ops/are.py report`. Numbers below are from the ledger; only rows marked verified=yes count._",
        "",
        "## Money (verified only)",
        "| | This week | Lifetime |",
        "|---|---:|---:|",
        f"| Collected revenue | ${wk['revenue']:.2f} | ${life['revenue']:.2f} |",
        f"| Refunds | ${wk['refunds']:.2f} | ${life['refunds']:.2f} |",
        f"| Costs | ${wk['costs']:.2f} | ${life['costs']:.2f} |",
        f"| **Net profit** | **${wk['net_profit']:.2f}** | **${life['net_profit']:.2f}** |",
        "",
        f"Unverified ledger rows (excluded): {life['unverified_rows']}",
        f"Total committed spend: ${total_spend(rows):.2f} of ${cfg['total_spend_cap_usd']:.2f} cap. Kill switch: {'ON' if cfg['kill_switch'] else 'off'}.",
        f"Founder hours this week: {hours}",
        "",
        "## Funnel (from analytics/metrics.json)",
        "| Metric | Value | Source |",
        "|---|---:|---|",
    ]
    for m in metrics["metrics"]:
        val = "not measured" if m["value"] is None else m["value"]
        lines.append(f"| {m['name']} | {val} | {m['source']} |")
    lines += ["", "## What made money / what failed / next action", "_Fill in by hand; do not state anything the tables above do not support._", ""]
    return "\n".join(lines)


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    cmd = argv[1]
    if cmd == "score":
        for i, r in enumerate(rank(ROOT / "research" / "opportunities.csv"), 1):
            flag = "  EXCLUDED" if r.get("excluded") == "yes" else ""
            print(f"{i:>2}. {r['score']:.3f}  [{r['evidence']}] {r['id']} {r['name']}{flag}")
        return 0
    if cmd == "ledger":
        rows = read_ledger(ROOT / "finance" / "ledger.csv")
        cfg = load_config()
        print(json.dumps({"lifetime": summarize(rows), "committed_spend": total_spend(rows),
                          "cap": cfg["total_spend_cap_usd"], "kill_switch": cfg["kill_switch"]}, indent=2))
        return 0
    if cmd == "can-spend":
        ok, why = can_spend(float(argv[2]), read_ledger(ROOT / "finance" / "ledger.csv"), load_config())
        print(("OK: " if ok else "BLOCKED: ") + why)
        return 0 if ok else 1
    if cmd == "report":
        out = ROOT / "reports" / "weekly" / f"{argv[2]}-generated.md"
        out.write_text(render_report(argv[2]))
        print(f"wrote {out}")
        return 0
    print(f"unknown command: {cmd}")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
