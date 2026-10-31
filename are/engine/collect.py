#!/usr/bin/env python3
"""Run the read-only collectors listed in research/collect.json.

  python3 -m engine.collect --config research/collect.json --out evidence-run.jsonl

Designed for GitHub Actions (open internet). Prints every evidence record
between BEGIN/END markers so results are auditable from the run log, and
writes a markdown summary to $GITHUB_STEP_SUMMARY when present.
Failures are recorded and skipped; there are at most 2 retries per request.
"""
import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from engine import collectors as c
from engine import evidence as ev

MAX_RETRIES = 2


def fetch_with_retry(url, fetcher):
    last = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            return fetcher(url)
        except Exception as e:  # network errors, HTTP errors
            last = e
            time.sleep(2 ** attempt)
    raise last


def run_job(job, fetcher, now=None):
    """One config job -> (evidence records, summary line). Pure apart from `fetcher`."""
    opp, src, q = job["opportunity"], job["source"], job["query"]
    recs = []
    if src == "atlassian":
        url = c.atlassian_search_url(q)
        found = c.parse_atlassian_search(fetch_with_retry(url, fetcher))
        listings = c.relevant(found, job.get("match"))
        for l in listings[:15]:  # payment model is only on the version resource
            if l["key"] and l["payment_model"] is None:
                try:
                    l["payment_model"] = c.parse_atlassian_version(fetch_with_retry(c.atlassian_version_url(l["key"]), fetcher))
                except Exception:
                    l["payment_model"] = None
        s = c.summarize_listings(listings)
        recs.append(ev.make(opp, "competition", f"atlassian_cloud_listings:{q}", s["listings"], url, "api", "apps"))
        recs.append(ev.make(opp, "distribution", f"atlassian_cloud_total_installs:{q}", s["total_installs"], url, "api", "installs",
                            note=json.dumps({"top": s["top_installs"], "over_1000": s["listings_over_1000_installs"]})))
        recs.append(ev.make(opp, "payment_proof", f"atlassian_paid_cloud_installs:{q}", s["paid_installs"], url, "api", "installs",
                            note=f"{s['paid_listings']} paid listings; installs include active trials"))
        for l in sorted(listings, key=lambda x: x.get("installs") or 0, reverse=True)[:5]:
            recs.append(ev.make(opp, "distribution", f"atlassian_app_installs:{l['key']}", l["installs"], l["url"] or url, "api",
                                "installs", note=f"{l['name']} | {l['payment_model']} | reviews={l['reviews']} stars={l['stars']}"))
        line = (f"{opp} atlassian '{q}' ({len(found)} raw, {len(listings)} relevant): {s['listings']} cloud apps, {s['total_installs']} installs "
                f"({s['paid_listings']} paid apps, {s['paid_installs']} paid installs), top {s['top_installs'][:3]}")
    elif src == "wordpress":
        url = c.wordpress_search_url(q)
        listings = c.parse_wordpress_search(fetch_with_retry(url, fetcher))
        s = c.summarize_listings(listings)
        recs.append(ev.make(opp, "competition", f"wordpress_plugins:{q}", s["listings"], url, "api", "plugins"))
        recs.append(ev.make(opp, "distribution", f"wordpress_total_installs:{q}", s["total_installs"], url, "api", "installs",
                            note=json.dumps({"top": s["top_installs"], "over_1000": s["listings_over_1000_installs"]})))
        line = f"{opp} wordpress '{q}': {s['listings']} plugins, {s['total_installs']} active installs, top {s['top_installs'][:3]}"
    elif src == "hn":
        since = (now or time.time()) - 365 * 86400
        url = c.hn_search_url(q, since_unix=since)
        r = c.parse_hn_search(fetch_with_retry(url, fetcher))
        recs.append(ev.make(opp, "complaint", f"hn_comments_12mo:{q}", r["hits"], url, "api", "comments",
                            note=" ".join(r["examples"])))
        line = f"{opp} hn '{q}': {r['hits']} comments in last 12 months"
    elif src == "shopify_app":
        url = c.shopify_app_url(q)
        r = c.parse_shopify_app(fetch_with_retry(url, fetcher))
        if r is None:
            line = f"{opp} shopify '{q}': no rating data found"
        else:
            recs.append(ev.make(opp, "payment_proof" if job.get("paid") else "distribution", f"shopify_reviews:{q}",
                                r["reviews"], url, "api", "reviews", note=f"{r['name']} stars={r['stars']}"))
            line = f"{opp} shopify '{q}': {r['reviews']} reviews, {r['stars']} stars"
    else:
        raise ValueError(f"unknown source {src}")
    return recs, line


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--delay", type=float, default=1.5)
    args = ap.parse_args(argv)

    jobs = json.loads(Path(args.config).read_text())["jobs"]
    fetcher = lambda url: c.polite_fetch(url, args.delay)  # noqa: E731
    all_recs, lines, errors = [], [], []
    for job in jobs:
        try:
            recs, line = run_job(job, fetcher)
            all_recs += recs
            lines.append(line)
        except Exception as e:
            errors.append(f"{job}: {type(e).__name__}: {e}")
    ev.append(args.out, all_recs)

    print("=== BEGIN EVIDENCE JSONL ===")
    for r in all_recs:
        print(json.dumps(r, sort_keys=True))
    print("=== END EVIDENCE JSONL ===")
    stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    md = [f"## Research collection {stamp}", "", f"{len(all_recs)} evidence records, {len(errors)} failed jobs", ""]
    md += [f"- {l}" for l in lines]
    if errors:
        md += ["", "### Failures"] + [f"- {e}" for e in errors]
    text = "\n".join(md)
    print(text)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as f:
            f.write(text + "\n")
    # Partial data is still useful; fail the run only if nothing worked.
    return 0 if all_recs or not jobs else 1


if __name__ == "__main__":
    sys.exit(main())
