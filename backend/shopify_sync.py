"""Shopify store sync via the public /products.json endpoint (no API key required)."""
import asyncio
import html
import re
from datetime import datetime, timezone

import httpx

UA = {"User-Agent": "Mozilla/5.0 (AtelierBuilder/1.0)", "Accept": "application/json"}
ALL_TYPES = ["necklace", "bracelet", "earrings"]
MAX_PAGES = 20


def normalize_domain(raw: str) -> str:
    d = raw.strip().lower()
    d = re.sub(r"^https?://", "", d).split("/")[0]
    return d


def _strip_html(s: str | None) -> str:
    text = re.sub(r"<[^>]+>", " ", s or "")
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def _transform(p: dict, domain: str) -> dict:
    variants = p.get("variants") or []
    prices = [float(v["price"]) for v in variants if v.get("price") is not None]
    compare = [float(v["compare_at_price"]) for v in variants if v.get("compare_at_price")]
    images = [i["src"] for i in (p.get("images") or []) if i.get("src")]
    tags = p.get("tags") or []
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]
    return {
        "id": f"shop-{p['id']}",
        "shopify_id": p["id"],
        "title": p.get("title", ""),
        "handle": p.get("handle", ""),
        "vendor": p.get("vendor", ""),
        "product_type": p.get("product_type") or "Other",
        "tags": tags,
        "description": _strip_html(p.get("body_html"))[:1200],
        "price": min(prices) if prices else 0.0,
        "compare_at_price": max(compare) if compare else None,
        "available": any(v.get("available", True) for v in variants) if variants else False,
        "image": images[0] if images else None,
        "images": images[:6],
        "url": f"https://{domain}/products/{p.get('handle', '')}",
        "domain": domain,
    }


async def _get(c: httpx.AsyncClient, url: str, params: dict | None = None) -> httpx.Response:
    """GET with backoff on Shopify's 429 rate limit."""
    for attempt in range(4):
        r = await c.get(url, params=params)
        if r.status_code != 429:
            return r
        await asyncio.sleep(float(r.headers.get("Retry-After") or 2 * (attempt + 1)))
    raise ValueError("The store is rate limiting requests. Please try again in a minute.")


async def fetch_store_meta(domain: str) -> dict:
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=UA) as c:
        r = await _get(c, f"https://{domain}/meta.json")
        if r.status_code != 200:
            return {"name": domain, "currency": "USD"}
        m = r.json()
        name = (m.get("name") or domain).split("|")[0].strip()
        return {"name": name, "currency": m.get("currency") or "USD"}


async def fetch_all_products(domain: str) -> list[dict]:
    out: list[dict] = []
    async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers=UA) as c:
        for page in range(1, MAX_PAGES + 1):
            r = await _get(c, f"https://{domain}/products.json", params={"limit": 250, "page": page})
            if r.status_code != 200:
                if page == 1:
                    raise ValueError("This store doesn't expose a public product list. Check the domain.")
                break
            try:
                batch = r.json().get("products", [])
            except ValueError:
                raise ValueError("This doesn't look like a Shopify store.")
            if not batch:
                break
            out.extend(_transform(p, domain) for p in batch)
            if len(batch) < 250:
                break
    return out


async def sync_store(db, domain: str) -> dict:
    meta = await fetch_store_meta(domain)
    products = await fetch_all_products(domain)
    now = datetime.now(timezone.utc).isoformat()
    for p in products:
        await db.store_products.update_one({"id": p["id"]}, {"$set": {**p, "synced_at": now}}, upsert=True)
    await db.store_products.delete_many({"$or": [{"domain": {"$ne": domain}}, {"synced_at": {"$ne": now}}]})
    conn = {"domain": domain, "name": meta["name"], "currency": meta["currency"],
            "product_count": len(products), "last_synced": now}
    await db.store_connection.update_one({"key": "default"}, {"$set": {**conn, "key": "default"}}, upsert=True)
    return conn


def product_as_addon(p: dict) -> dict:
    return {
        "id": p["id"], "name": p["title"], "shape": "image", "color": None, "image": p.get("image"),
        "price": p["price"], "types": ALL_TYPES, "source": "shopify", "url": p["url"],
    }
