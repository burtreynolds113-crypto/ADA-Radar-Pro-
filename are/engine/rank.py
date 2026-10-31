"""Rank B2B opportunities by the owner's criteria.

Criteria (1-5, higher is better) and weights:
  profit 25% · competition (5 = little) 15% · distribution 25% · simplicity 10% ·
  maintenance (5 = low ongoing burden) 10% · automation 15%

Rules on top of the weighted score:
  - Evidence penalty: A (anecdotal) -0.15, N (not researched) -0.30.
  - Non-recurring products cap profit at 1 (the mandate favours recurring B2B).
  - `customers_for_50k`: paying customers needed at the stated ARPU for $50k/mo
    owner profit, assuming 80% contribution margin - a sanity check, not a forecast.
  - Excluded rows sort last.
  - `recommendable` requires payment_proof=yes: a top score without evidence that
    anyone pays for this exact product is a hypothesis to test, not a recommendation.

  python -m engine.rank research/opportunities_b2b.csv
"""
import csv
import math
import sys

WEIGHTS = {"profit": 0.25, "competition": 0.15, "distribution": 0.25, "simplicity": 0.10,
           "maintenance": 0.10, "automation": 0.15}
EVIDENCE_PENALTY = {"E": 0.0, "A": 0.15, "N": 0.30}


def score(row):
    vals = {k: float(row[k]) for k in WEIGHTS}
    for k, v in vals.items():
        if not 1 <= v <= 5:
            raise ValueError(f"{row['id']}: {k}={v} outside 1-5")
    if row["recurring"] != "yes":
        vals["profit"] = 1.0
    return round(sum(vals[k] * w for k, w in WEIGHTS.items()) - EVIDENCE_PENALTY[row["evidence"]], 3)


def customers_for_50k(arpu, margin=0.8):
    return math.ceil(50_000 / (float(arpu) * margin))


def rank(path):
    with open(path, newline="") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        r["score"] = score(r)
        r["customers_for_50k"] = customers_for_50k(r["arpu_usd"])
        r["recommendable"] = r["payment_proof"] == "yes" and r["excluded"] != "yes"
    return sorted(rows, key=lambda r: (r["excluded"] != "yes", r["score"]), reverse=True)


def best_recommendable(rows):
    return next((r for r in rows if r["recommendable"]), None)


def render(rows):
    out = ["| # | Score | ID | Opportunity | Channel | ARPU | Customers for $50k/mo | Evidence | Paying-customer proof |",
           "|---:|---:|---|---|---|---:|---:|---|---|"]
    for i, r in enumerate(rows, 1):
        name = r["name"] + (" **(excluded)**" if r["excluded"] == "yes" else "")
        out.append(f"| {i} | {r['score']:.2f} | {r['id']} | {name} | {r['channel']} | ${r['arpu_usd']} | "
                   f"{r['customers_for_50k']:,} | {r['evidence']} | {r['payment_proof']} |")
    return "\n".join(out)


if __name__ == "__main__":
    print(render(rank(sys.argv[1] if len(sys.argv) > 1 else "research/opportunities_b2b.csv")))
