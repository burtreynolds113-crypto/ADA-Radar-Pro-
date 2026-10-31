"""Evidence records: the only way a market fact enters the system.

Every record names where it came from and when, so any number in a report can
be traced back and re-checked. Records are append-only JSON lines.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

KINDS = {
    "payment_proof",   # someone demonstrably pays: published price + reviews/installs, verified MRR, sale listing
    "price",           # a competitor's published price point
    "distribution",    # installs, users, reviews in a channel we could also use
    "complaint",       # buyers describing the problem / dissatisfaction
    "competition",     # number or strength of competitors
    "regulation",      # a legal trigger that creates demand
}
METHODS = {"api", "web_search", "manual"}  # api = fetched by a collector; web_search = third-party summary


class EvidenceError(ValueError):
    pass


def make(opportunity, kind, metric, value, source_url, method, unit="", note="", retrieved_at=None):
    rec = {
        "opportunity": opportunity,
        "kind": kind,
        "metric": metric,
        "value": value,
        "unit": unit,
        "source_url": source_url,
        "method": method,
        "retrieved_at": retrieved_at or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "note": note,
    }
    validate(rec)
    return rec


def validate(rec):
    for field in ("opportunity", "kind", "metric", "source_url", "method", "retrieved_at"):
        if not rec.get(field):
            raise EvidenceError(f"missing {field}: {rec}")
    if rec["kind"] not in KINDS:
        raise EvidenceError(f"bad kind {rec['kind']}")
    if rec["method"] not in METHODS:
        raise EvidenceError(f"bad method {rec['method']}")
    if not str(rec["source_url"]).startswith(("http://", "https://")):
        raise EvidenceError(f"source_url must be a URL: {rec['source_url']}")
    return rec


def append(path, records):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a") as f:
        for r in records:
            f.write(json.dumps(validate(r), sort_keys=True) + "\n")


def load(path):
    path = Path(path)
    if not path.exists():
        return []
    out = []
    for i, line in enumerate(path.read_text().splitlines(), 1):
        if line.strip():
            try:
                out.append(validate(json.loads(line)))
            except (json.JSONDecodeError, EvidenceError) as e:
                raise EvidenceError(f"{path}:{i}: {e}") from e
    return out


def by_opportunity(records):
    out = {}
    for r in records:
        out.setdefault(r["opportunity"], []).append(r)
    return out
