"""Owner approval system.

approvals/approvals.json is the machine-readable source of truth; CI runs
`python -m ops.approvals check` on every push, so these rules are enforced, not
just documented:

  1. Every ledger cost row cites an APPROVED approval whose spend cap it fits within.
  2. ops/config.json cites an APPROVED approval for its caps (config_approval_id).
  3. A workflow may only contain an active `schedule:` trigger if an APPROVED
     approval lists that workflow file under `enables_workflows`.
  4. Only the owner may mark something approved: decided_by must be "owner" or
     name a standing instruction, and decided_at must be set.

  python -m ops.approvals list
  python -m ops.approvals check
"""
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT.parent
STATUSES = {"pending", "approved", "rejected", "expired", "superseded"}
COST_CATEGORIES = {"fee", "hosting", "domain", "ads", "ai_usage", "software", "support", "other_cost"}


def load(root=ROOT):
    return json.loads((root / "approvals" / "approvals.json").read_text())["approvals"]


def index(approvals):
    return {a["id"]: a for a in approvals}


def is_approved(approvals, approval_id):
    a = index(approvals).get(approval_id)
    return bool(a and a["status"] == "approved")


def validate_records(approvals):
    errors, seen = [], set()
    for a in approvals:
        aid = a.get("id", "?")
        if aid in seen:
            errors.append(f"{aid}: duplicate id")
        seen.add(aid)
        for f in ("id", "date", "request", "status", "spend_cap_usd"):
            if f not in a:
                errors.append(f"{aid}: missing {f}")
        if a.get("status") not in STATUSES:
            errors.append(f"{aid}: bad status {a.get('status')}")
        if a.get("status") == "approved":
            who = a.get("decided_by", "")
            if not (who == "owner" or who.startswith("standing instruction")):
                errors.append(f"{aid}: approved but decided_by is '{who}' (must be owner or a standing instruction)")
            if not a.get("decided_at"):
                errors.append(f"{aid}: approved without decided_at")
    return errors


def check_ledger(approvals, ledger_path):
    errors, spent = [], {}
    if not Path(ledger_path).exists():
        return errors
    with open(ledger_path, newline="") as f:
        for i, row in enumerate(csv.DictReader(f), 2):
            if row["category"] not in COST_CATEGORIES:
                continue
            aid = row.get("approval_id", "")
            if not is_approved(approvals, aid):
                errors.append(f"ledger line {i}: cost without approved approval_id ('{aid}')")
                continue
            spent[aid] = spent.get(aid, 0.0) + float(row["amount"])
    idx = index(approvals)
    for aid, total in spent.items():
        if total > float(idx[aid]["spend_cap_usd"]) + 1e-9:
            errors.append(f"{aid}: ledger spend {total:.2f} exceeds approved cap {idx[aid]['spend_cap_usd']}")
    return errors


def check_config(approvals, config_path):
    cfg = json.loads(Path(config_path).read_text())
    aid = cfg.get("config_approval_id")
    if not is_approved(approvals, aid):
        return [f"ops/config.json: config_approval_id '{aid}' is not an approved approval"]
    return []


SCHEDULE_RE = re.compile(r"^\s*schedule\s*:", re.M)


def check_workflows(approvals, workflows_dir):
    errors = []
    allowed = set()
    for a in approvals:
        if a["status"] == "approved":
            allowed.update(a.get("enables_workflows", []))
    d = Path(workflows_dir)
    if not d.exists():
        return errors
    for wf in sorted(d.glob("*.y*ml")):
        if SCHEDULE_RE.search(wf.read_text()) and wf.name not in allowed:
            errors.append(f"{wf.name}: active schedule trigger without an approved approval listing it")
    return errors


def check(root=ROOT, repo=REPO):
    approvals = load(root)
    return (validate_records(approvals)
            + check_ledger(approvals, root / "finance" / "ledger.csv")
            + check_config(approvals, root / "ops" / "config.json")
            + check_workflows(approvals, repo / ".github" / "workflows"))


def main(argv):
    cmd = argv[1] if len(argv) > 1 else "list"
    if cmd == "list":
        for a in load():
            print(f"{a['id']:6} {a['status']:10} cap ${a['spend_cap_usd']:>7}  {a['request']}")
        return 0
    if cmd == "check":
        errs = check()
        for e in errs:
            print("APPROVAL GATE FAIL:", e)
        print("approval gate: OK" if not errs else f"approval gate: {len(errs)} problem(s)")
        return 1 if errs else 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
