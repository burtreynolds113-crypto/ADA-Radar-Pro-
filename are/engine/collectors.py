"""Read-only collectors for public marketplace / community APIs.

Each collector = URL builder + pure parser. Parsers are unit-tested against
fixtures; fetching happens only in `collect.py` (run on GitHub Actions, where
outbound internet is available). No authentication, no writes, polite delays.
"""
import json
import re
import time
import urllib.parse
import urllib.request

USER_AGENT = "ARE-research-bot/0.1 (read-only market research; contact via repo owner)"


def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json, text/html"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="replace")


def polite_fetch(url, delay=1.5):
    time.sleep(delay)
    return fetch(url)


# --- Atlassian Marketplace ---------------------------------------------------

def atlassian_search_url(text, hosting="cloud", limit=50):
    q = urllib.parse.urlencode({"text": text, "hosting": hosting, "limit": limit, "withTotalCount": "true"})
    return f"https://marketplace.atlassian.com/rest/2/addons?{q}"


def _dig(d, *path, default=None):
    for p in path:
        if not isinstance(d, dict) or p not in d:
            return default
        d = d[p]
    return d


def parse_atlassian_search(body):
    """Return list of {name, key, installs, users, reviews, stars, vendor, url}."""
    data = json.loads(body)
    out = []
    for a in _dig(data, "_embedded", "addons", default=[]) or []:
        dist = _dig(a, "_embedded", "distribution", default={}) or {}
        rev = _dig(a, "_embedded", "reviews", default={}) or {}
        key = a.get("key", "")
        out.append({
            "name": a.get("name", ""),
            "key": key,
            "installs": dist.get("totalInstalls"),
            "users": dist.get("totalUsers"),
            "reviews": rev.get("count"),
            "stars": rev.get("averageStars"),
            "vendor": _dig(a, "_embedded", "vendor", "name", default=""),
            # "atlassian" = paid via Atlassian, "free", or "vendor" (paid via vendor). None if not exposed.
            "payment_model": _dig(a, "_embedded", "version", "paymentModel", default=None),
            "url": f"https://marketplace.atlassian.com/apps/{key}" if key else "",
        })
    return out


# --- WordPress.org plugin directory ----------------------------------------

def wordpress_search_url(text, per_page=50):
    q = urllib.parse.urlencode({
        "action": "query_plugins",
        "request[search]": text,
        "request[per_page]": per_page,
        "request[fields][active_installs]": 1,
    })
    return f"https://api.wordpress.org/plugins/info/1.2/?{q}"


def parse_wordpress_search(body):
    data = json.loads(body)
    out = []
    for p in data.get("plugins", []) or []:
        out.append({
            "name": re.sub(r"<[^>]+>", "", p.get("name", "")),
            "key": p.get("slug", ""),
            "installs": p.get("active_installs"),
            "reviews": p.get("num_ratings"),
            "stars": (p.get("rating") or 0) / 20 if p.get("rating") is not None else None,
            "url": f"https://wordpress.org/plugins/{p.get('slug', '')}/",
        })
    return out


# --- Hacker News (Algolia) - complaint / pain mentions ---------------------

def hn_search_url(query, since_unix=None, tags="comment"):
    # Quoted phrase + no typo tolerance: otherwise "VPAT" matches "VAT", "PAT", ...
    params = {"query": f'"{query}"', "tags": tags, "hitsPerPage": 5, "typoTolerance": "false",
              "advancedSyntax": "true"}
    if since_unix:
        params["numericFilters"] = f"created_at_i>{int(since_unix)}"
    return "https://hn.algolia.com/api/v1/search?" + urllib.parse.urlencode(params)


def parse_hn_search(body):
    data = json.loads(body)
    return {
        "hits": data.get("nbHits", 0),
        "examples": [
            f"https://news.ycombinator.com/item?id={h.get('objectID')}" for h in (data.get("hits") or [])[:5]
        ],
    }


# --- Shopify App Store - JSON-LD aggregate rating on an app page -----------

def shopify_app_url(handle):
    return f"https://apps.shopify.com/{urllib.parse.quote(handle)}"


def parse_shopify_app(html):
    """Extract rating + review count from schema.org JSON-LD. Returns None if absent."""
    for block in re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S):
        try:
            data = json.loads(block)
        except json.JSONDecodeError:
            continue
        for item in data if isinstance(data, list) else [data]:
            agg = item.get("aggregateRating") if isinstance(item, dict) else None
            if agg:
                return {
                    "name": item.get("name", ""),
                    "reviews": int(agg.get("ratingCount") or agg.get("reviewCount") or 0),
                    "stars": float(agg.get("ratingValue") or 0),
                }
    return None


def relevant(listings, terms):
    """Keep listings whose name contains any term (case-insensitive). Marketplace text search is
    fuzzy: 'accessibility' also returns access-management apps, which must not count as demand."""
    if not terms:
        return listings
    t = [x.lower() for x in terms]
    return [l for l in listings if any(x in (l.get("name") or "").lower() for x in t)]


def atlassian_version_url(key):
    return f"https://marketplace.atlassian.com/rest/2/addons/{urllib.parse.quote(key)}/versions/latest"


def parse_atlassian_version(body):
    """Returns 'atlassian' (paid via Atlassian), 'free', 'vendor', or None."""
    return json.loads(body).get("paymentModel")


def summarize_listings(listings):
    """Channel-level stats used for distribution and competition scoring."""
    installs = sorted([l["installs"] for l in listings if isinstance(l.get("installs"), (int, float))], reverse=True)
    return {
        "listings": len(listings),
        "with_installs": len(installs),
        "total_installs": sum(installs),
        "top_installs": installs[:5],
        "listings_over_1000_installs": sum(1 for i in installs if i >= 1000),
        "listings_under_100_installs": sum(1 for i in installs if i < 100),
        "paid_listings": sum(1 for l in listings if l.get("payment_model") in ("atlassian", "vendor")),
        "paid_installs": sum(l["installs"] or 0 for l in listings if l.get("payment_model") in ("atlassian", "vendor")),
    }
