"""Multi-tenant scoping: every business (tenant) only ever reads/writes its own documents.

`ScopedDB` wraps the Motor database. Collections in SCOPED automatically get `tenant_id` added to every
filter, inserted document and aggregation; other collections (platform-wide catalog, caches, auth) pass through.
The current tenant lives in a contextvar set per request by `resolve_tenant` / the admin auth dependency.
"""
import re
import uuid
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import datetime, timezone

from fastapi import HTTPException, Request

SCOPED = {
    "catalog_config", "branding", "price_sheet", "store_connection", "access_rules", "image_slots",
    "store_products", "custom_styles", "quotes", "customers", "customer_sessions", "customer_designs", "usage",
}
DEFAULT_SLUG = "gado"
_current: ContextVar[dict | None] = ContextVar("tenant", default=None)


def current() -> dict | None:
    return _current.get()


def tid() -> str:
    t = _current.get()
    if not t:
        raise RuntimeError("No tenant in context")
    return t["id"]


def store_qs() -> str:
    """Query-string suffix so plain image URLs (no headers) resolve to the right business."""
    t = _current.get()
    return f"store={t['slug']}" if t else ""


def set_tenant(t: dict | None):
    _current.set({"id": t["id"], "slug": t["slug"], "name": t.get("name", ""), "status": t.get("status", "active"),
                  "plan": t.get("plan") or "trial"} if t else None)


@contextmanager
def use(t: dict):
    token = _current.set({"id": t["id"], "slug": t["slug"], "name": t.get("name", ""), "status": t.get("status", "active"),
                  "plan": t.get("plan") or "trial"})
    try:
        yield
    finally:
        _current.reset(token)


class ScopedCollection:
    def __init__(self, coll):
        self._c = coll

    def _f(self, f=None):
        return {**(f or {}), "tenant_id": tid()}

    @staticmethod
    def _p(a, kw):
        """Hide tenant_id from exclusion projections so API responses don't leak it."""
        proj = a[0] if a else kw.get("projection")
        if isinstance(proj, dict) and proj and all(v == 0 for v in proj.values()):
            proj = {**proj, "tenant_id": 0}
            if a:
                a = (proj, *a[1:])
            else:
                kw["projection"] = proj
        return a, kw

    def find(self, filter=None, *a, **kw):
        a, kw = self._p(a, kw)
        return self._c.find(self._f(filter), *a, **kw)

    async def find_one(self, filter=None, *a, **kw):
        a, kw = self._p(a, kw)
        return await self._c.find_one(self._f(filter), *a, **kw)

    async def count_documents(self, filter=None, **kw):
        return await self._c.count_documents(self._f(filter), **kw)

    async def distinct(self, key, filter=None, **kw):
        return await self._c.distinct(key, self._f(filter), **kw)

    async def insert_one(self, doc, **kw):
        doc["tenant_id"] = tid()
        return await self._c.insert_one(doc, **kw)

    async def update_one(self, filter, update, **kw):
        return await self._c.update_one(self._f(filter), update, **kw)

    async def update_many(self, filter, update, **kw):
        return await self._c.update_many(self._f(filter), update, **kw)

    async def replace_one(self, filter, doc, **kw):
        return await self._c.replace_one(self._f(filter), {**doc, "tenant_id": tid()}, **kw)

    async def delete_one(self, filter, **kw):
        return await self._c.delete_one(self._f(filter), **kw)

    async def delete_many(self, filter, **kw):
        return await self._c.delete_many(self._f(filter), **kw)

    async def find_one_and_update(self, filter, update, **kw):
        return await self._c.find_one_and_update(self._f(filter), update, **kw)

    async def find_one_and_delete(self, filter, **kw):
        return await self._c.find_one_and_delete(self._f(filter), **kw)

    def aggregate(self, pipeline, **kw):
        return self._c.aggregate([{"$match": {"tenant_id": tid()}}, *pipeline], **kw)

    async def create_index(self, *a, **kw):
        return await self._c.create_index(*a, **kw)


class ScopedDB:
    def __init__(self, raw):
        self.raw = raw

    def __getattr__(self, name):
        coll = self.raw[name]
        return ScopedCollection(coll) if name in SCOPED else coll

    def __getitem__(self, name):
        return self.__getattr__(name)


_db: ScopedDB | None = None


def init(db: ScopedDB):
    global _db
    _db = db


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:40] or "store"


async def unique_slug(name: str) -> str:
    base = slugify(name)
    slug, n = base, 1
    while await _db.raw.tenants.find_one({"slug": slug}):
        n += 1
        slug = f"{base}-{n}"
    return slug


async def create_tenant(name: str, **extra) -> dict:
    """New business with its own price sheet and brand name; everything else falls back to defaults."""
    import pricing  # local import avoids a cycle (pricing imports nothing from here)
    t = {"id": str(uuid.uuid4()), "slug": await unique_slug(name), "name": name.strip(), "status": "active",
         "plan": "trial", "created_at": now_iso(), **extra}
    await _db.raw.tenants.insert_one(dict(t))
    with use(t):
        await _db.price_sheet.insert_one(pricing.default_sheet())
        await _db.branding.update_one({"key": "default"}, {"$set": {"store_name": t["name"], "updated_at": now_iso()}}, upsert=True)
    return t


async def get_by_slug(slug: str) -> dict | None:
    return await _db.raw.tenants.find_one({"slug": slug.lower()}, {"_id": 0})


async def get_by_id(tenant_id: str) -> dict | None:
    return await _db.raw.tenants.find_one({"id": tenant_id}, {"_id": 0})


async def migrate():
    """One-time: existing single-store data becomes the first business (Gado)."""
    raw = _db.raw
    await raw.tenants.create_index("slug", unique=True)
    await raw.tenants.create_index("id", unique=True)
    gado = await get_by_slug(DEFAULT_SLUG)
    if not gado:
        gado = {"id": str(uuid.uuid4()), "slug": DEFAULT_SLUG, "name": "Gado Jewellers", "status": "active",
                "plan": "founder", "created_at": now_iso()}
        await raw.tenants.insert_one(dict(gado))
    for name in SCOPED:
        await raw[name].update_many({"tenant_id": {"$exists": False}}, {"$set": {"tenant_id": gado["id"]}})
    await raw.admins.update_many({"tenant_id": {"$exists": False}, "role": {"$ne": "platform"}},
                                 {"$set": {"tenant_id": gado["id"], "role": "owner"}})
    await raw.shopify_shops.update_many({"tenant_id": {"$exists": False}}, {"$set": {"tenant_id": gado["id"]}})
    # unique keys are now per business
    info = await raw.customers.index_information()
    if "email_1" in info:
        await raw.customers.drop_index("email_1")
    await raw.customers.create_index([("tenant_id", 1), ("email", 1)], unique=True)
    for name in ("quotes", "customers", "usage", "store_products", "customer_designs"):
        await raw[name].create_index("tenant_id")
    return gado


OPEN_PATHS = ("/api/auth/", "/api/platform", "/api/shopify/webhooks", "/api/shopify/callback", "/api/shopify/app",
              "/api/shopify/install")


async def resolve_tenant(request: Request):
    """App-wide dependency: pick the business from the X-Tenant header or ?store= (default: the first business)."""
    slug = (request.headers.get("x-tenant") or request.query_params.get("store") or DEFAULT_SLUG).strip().lower()
    t = await get_by_slug(slug)
    if not t:
        raise HTTPException(404, "Store not found")
    set_tenant(t)
    path = request.url.path
    if t["status"] != "active" and not path.startswith("/api/dashboard") and not path.startswith(OPEN_PATHS):
        raise HTTPException(403, "This store is currently unavailable")
