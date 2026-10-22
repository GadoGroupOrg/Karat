"""Shopify app: OAuth install, mandatory webhooks, and a downloadable theme app extension package."""
import base64
import hashlib
import hmac
import io
import os
import re
import secrets
import zipfile
from datetime import datetime, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, Response
from pydantic import BaseModel

import auth
import platform_admin
import tenancy
from auth import get_current_admin
from shopify_sync import sync_store

SCOPES = "read_products"
API_VERSION = "2025-10"
SHOP_RE = re.compile(r"^[a-z0-9][a-z0-9-]*\.myshopify\.com$")

_db = None
public = APIRouter(prefix="/api/shopify")
dash = APIRouter(prefix="/api/dashboard/shopify", dependencies=[Depends(get_current_admin)])


def init(db):
    global _db
    _db = db


def creds() -> tuple[str, str]:
    return os.environ.get("SHOPIFY_API_KEY", ""), os.environ.get("SHOPIFY_API_SECRET", "")


def base_url(request: Request) -> str:
    proto = request.headers.get("x-forwarded-proto", request.url.scheme).split(",")[0].strip()
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc
    return f"{proto}://{host.split(',')[0].strip()}"


def urls(base: str) -> dict:
    return {"app_url": f"{base}/api/shopify/app", "redirect_url": f"{base}/api/shopify/callback",
            "webhooks_url": f"{base}/api/shopify/webhooks", "builder_origin": base}


def valid_query_hmac(params: dict, secret: str) -> bool:
    given = params.get("hmac", "")
    msg = "&".join(f"{k}={v}" for k, v in sorted(params.items()) if k not in ("hmac", "signature"))
    digest = hmac.new(secret.encode(), msg.encode(), hashlib.sha256).hexdigest()
    return bool(given) and hmac.compare_digest(digest, given)


def require_configured() -> tuple[str, str]:
    key, secret = creds()
    if not key or not secret:
        raise HTTPException(503, "Shopify app is not configured yet. Add SHOPIFY_API_KEY and SHOPIFY_API_SECRET.")
    return key, secret


def checked_shop(params: dict, secret: str) -> str:
    shop = (params.get("shop") or "").lower()
    if not SHOP_RE.match(shop):
        raise HTTPException(400, "Invalid shop domain")
    if not valid_query_hmac(params, secret):
        raise HTTPException(401, "Invalid Shopify signature")
    return shop


@public.get("/app")
async def app_home(request: Request):
    """App URL Shopify opens from the merchant's admin. Installs if needed, else opens the jeweler dashboard."""
    key, secret = require_configured()
    params = dict(request.query_params)
    shop = checked_shop(params, secret)
    doc = await _db.shopify_shops.find_one({"shop": shop, "uninstalled_at": None})
    if not doc:
        return await install(request)
    owner = await _db.admins.find_one({"tenant_id": doc["tenant_id"], "role": "owner", "active": True}, sort=[("created_at", 1)])
    if not owner:
        raise HTTPException(404, "No dashboard account is linked to this store")
    return RedirectResponse(f"{base_url(request)}/admin?sso={platform_admin.sso_token(owner)}")


@public.get("/install")
async def install(request: Request):
    key, secret = require_configured()
    params = dict(request.query_params)
    shop = checked_shop(params, secret)
    state = secrets.token_urlsafe(24)
    await _db.shopify_states.insert_one({"state": state, "shop": shop, "created_at": datetime.now(timezone.utc)})
    return RedirectResponse(authorize_url(request, key, shop, state))


def authorize_url(request: Request, key: str, shop: str, state: str) -> str:
    q = urlencode({"client_id": key, "scope": SCOPES, "redirect_uri": urls(base_url(request))["redirect_url"], "state": state})
    return f"https://{shop}/admin/oauth/authorize?{q}"


@public.get("/callback")
async def callback(request: Request):
    key, secret = require_configured()
    params = dict(request.query_params)
    shop = checked_shop(params, secret)
    st = await _db.shopify_states.find_one_and_delete({"state": params.get("state", ""), "shop": shop})
    if not st:
        raise HTTPException(401, "Install session expired. Please try installing again.")
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(f"https://{shop}/admin/oauth/access_token",
                         json={"client_id": key, "client_secret": secret, "code": params.get("code", "")})
    if r.status_code != 200:
        raise HTTPException(502, "Shopify didn't accept the install. Please try again.")
    tok = r.json()
    tenant = await tenant_for_install(shop, tok["access_token"], st.get("tenant_id"))
    now = datetime.now(timezone.utc).isoformat()
    await _db.shopify_shops.update_one({"shop": shop}, {"$set": {"shop": shop, "access_token": tok["access_token"], "tenant_id": tenant["id"],
                                       "scope": tok.get("scope", ""), "installed_at": now, "uninstalled_at": None}}, upsert=True)
    with tenancy.use(tenant):
        try:
            await sync_store(_db, shop)
        except Exception:
            pass  # the jeweler can re-sync from Admin; the install itself succeeded
    return RedirectResponse(f"https://{shop}/admin/apps/{key}")


async def tenant_for_install(shop: str, access_token: str, state_tenant: str | None) -> dict:
    """Existing link > business that started the connect from its dashboard > a brand-new business for this store."""
    doc = await _db.shopify_shops.find_one({"shop": shop})
    for tid in ((doc or {}).get("tenant_id"), state_tenant):
        if tid and (t := await tenancy.get_by_id(tid)):
            return t
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.get(f"https://{shop}/admin/api/{API_VERSION}/shop.json", headers={"X-Shopify-Access-Token": access_token})
    info = r.json().get("shop", {}) if r.status_code == 200 else {}
    email = (info.get("email") or "").lower().strip()
    existing = email and await _db.admins.find_one({"email": email, "role": {"$in": ["owner", "staff"]}})
    if existing:
        return await tenancy.get_by_id(existing["tenant_id"])
    t = await tenancy.create_tenant(info.get("name") or shop.split(".")[0], owner_email=email or None, source="shopify")
    if email:
        await auth.create_user(t["id"], email, secrets.token_urlsafe(16), info.get("shop_owner") or "Store owner", "owner")
    return t


@public.post("/webhooks")
async def webhooks(request: Request):
    _, secret = require_configured()
    body = await request.body()
    digest = base64.b64encode(hmac.new(secret.encode(), body, hashlib.sha256).digest()).decode()
    if not hmac.compare_digest(digest, request.headers.get("x-shopify-hmac-sha256", "")):
        raise HTTPException(401, "Invalid webhook signature")
    topic = request.headers.get("x-shopify-topic", "")
    shop = request.headers.get("x-shopify-shop-domain", "")
    payload = await request.json() if body else {}
    if topic == "app/uninstalled":
        await _db.shopify_shops.update_one({"shop": shop}, {"$set": {"uninstalled_at": datetime.now(timezone.utc).isoformat()},
                                                           "$unset": {"access_token": ""}})
    elif topic == "shop/redact":
        await _db.shopify_shops.delete_one({"shop": shop})
    elif topic == "customers/redact":
        email = ((payload.get("customer") or {}).get("email") or "").lower()
        doc = await _db.shopify_shops.find_one({"shop": shop})
        t = doc and await tenancy.get_by_id(doc.get("tenant_id", ""))
        if email and t:
            with tenancy.use(t):
                await _db.customers.delete_one({"email": email})
                await _db.quotes.delete_many({"email": email})
    # customers/data_request: we hold only what the customer typed into the builder; the jeweler exports it from Admin.
    return {"ok": True}


# ---------- Theme app extension package ----------
def _files(origin: str, client_id: str, slug: str) -> dict[str, str]:
    u = urls(origin)
    builder = f"""{{% assign atelier_page = block.settings.page %}}
{{% assign src = '{origin}/' | append: atelier_page | append: '?embed=1&store={slug}' %}}
{{% if block.settings.type != blank %}}{{% assign src = src | append: '&type=' | append: block.settings.type %}}{{% endif %}}
<div class="atelier-builder" style="max-width:{{{{ block.settings.max_width }}}}px;margin:0 auto;">
  <iframe src="{{{{ src }}}}" title="Jewelry builder" loading="lazy" allow="camera; clipboard-write"
    style="width:100%;height:{{{{ block.settings.height }}}}px;border:0;border-radius:12px;display:block;"></iframe>
</div>

{{% schema %}}
{{
  "name": "Jewelry Builder",
  "target": "section",
  "settings": [
    {{ "type": "select", "id": "page", "label": "Opens to", "default": "build",
      "options": [{{ "value": "build", "label": "Builder" }}, {{ "value": "shop", "label": "Shop + Try-on" }}, {{ "value": "", "label": "Full app" }}] }},
    {{ "type": "select", "id": "type", "label": "Start with", "default": "",
      "options": [{{ "value": "", "label": "Choose in builder" }}, {{ "value": "ring", "label": "Bridal" }}, {{ "value": "fashion-ring", "label": "Fashion rings" }},
        {{ "value": "pendant", "label": "Pendants" }}, {{ "value": "tennis", "label": "Tennis" }}, {{ "value": "necklace", "label": "Necklace" }},
        {{ "value": "bracelet", "label": "Bracelet" }}, {{ "value": "earrings", "label": "Earrings" }}] }},
    {{ "type": "range", "id": "height", "label": "Height", "min": 500, "max": 1200, "step": 20, "unit": "px", "default": 820 }},
    {{ "type": "range", "id": "max_width", "label": "Max width", "min": 600, "max": 1600, "step": 20, "unit": "px", "default": 1200 }}
  ]
}}
{{% endschema %}}
"""
    tryon = f"""<button type="button" class="atelier-tryon-btn" onclick="document.getElementById('atelier-tryon-{{{{ block.id }}}}').showModal()"
  style="width:100%;min-height:48px;margin:8px 0;border-radius:999px;border:1px solid {{{{ block.settings.color }}}};background:transparent;color:{{{{ block.settings.color }}}};font:inherit;font-weight:600;cursor:pointer;">
  {{{{ block.settings.label }}}}
</button>
<dialog id="atelier-tryon-{{{{ block.id }}}}" style="width:min(480px,96vw);height:min(860px,92vh);padding:0;border:0;border-radius:16px;overflow:hidden;">
  <form method="dialog" style="position:absolute;top:8px;right:8px;z-index:2;margin:0;">
    <button aria-label="Close" style="width:44px;height:44px;border-radius:22px;border:0;background:#fff;font-size:20px;cursor:pointer;">&times;</button>
  </form>
  <iframe data-src="{origin}/try-on/shop-{{{{ product.id }}}}?embed=1&store={slug}" title="Virtual try-on" allow="camera"
    style="width:100%;height:100%;border:0;"></iframe>
</dialog>
<script>
  (function () {{
    var d = document.getElementById('atelier-tryon-{{{{ block.id }}}}'), f = d.querySelector('iframe');
    d.addEventListener('click', function (e) {{ if (e.target === d) d.close(); }});
    new MutationObserver(function () {{ if (d.open && !f.src) f.src = f.dataset.src; }}).observe(d, {{ attributes: true, attributeFilter: ['open'] }});
  }})();
</script>

{{% schema %}}
{{
  "name": "Virtual Try-On button",
  "target": "section",
  "enabled_on": {{ "templates": ["product"] }},
  "settings": [
    {{ "type": "text", "id": "label", "label": "Button text", "default": "Try it on" }},
    {{ "type": "color", "id": "color", "label": "Button color", "default": "#1a1a1a" }}
  ]
}}
{{% endschema %}}
"""
    app_toml = f"""# Generated by your Atelier admin. Fill in client_id if it is empty, then run `shopify app deploy`.
client_id = "{client_id}"
name = "Atelier Jewelry Builder"
application_url = "{u['app_url']}"
embedded = false

[access_scopes]
scopes = "{SCOPES}"

[auth]
redirect_urls = ["{u['redirect_url']}"]

[webhooks]
api_version = "{API_VERSION}"

  [[webhooks.subscriptions]]
  topics = ["app/uninstalled"]
  uri = "{u['webhooks_url']}"

  [[webhooks.subscriptions]]
  compliance_topics = ["customers/data_request", "customers/redact", "shop/redact"]
  uri = "{u['webhooks_url']}"
"""
    ext_toml = """name = "Atelier Builder"
type = "theme"
"""
    readme = f"""# Atelier Jewelry Builder: Shopify app

Business: {slug}\nBuilder address baked into this package: {origin}
If you redeploy the builder to a new address, download a fresh package from Admin > Website & Shopify.

## Deploy
1. Install Node.js 20+ and the Shopify CLI: `npm install -g @shopify/cli`
2. In this folder run `shopify app config link` and pick your app (this fills client_id).
3. Run `shopify app deploy` and confirm the release.

## Add to the store
Online Store > Themes > Customize:
- Any page: Add section > Apps > "Jewelry Builder".
- Product template: Add block > Apps > "Virtual Try-On button".
"""
    return {"shopify.app.toml": app_toml, "README.md": readme,
            "extensions/atelier-builder/shopify.extension.toml": ext_toml,
            "extensions/atelier-builder/blocks/builder.liquid": builder,
            "extensions/atelier-builder/blocks/try-on-button.liquid": tryon,
            "extensions/atelier-builder/locales/en.default.json": "{}\n"}


@public.get("/package.zip")
async def package(request: Request):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for name, text in _files(base_url(request), creds()[0], tenancy.current()["slug"]).items():
            z.writestr(f"atelier-shopify-app/{name}", text)
    return Response(buf.getvalue(), media_type="application/zip",
                    headers={"Content-Disposition": "attachment; filename=atelier-shopify-app.zip"})


@dash.get("")
async def status(request: Request):
    key, secret = creds()
    shops = await _db.shopify_shops.find({"tenant_id": tenancy.tid()}, {"_id": 0, "access_token": 0}).to_list(50)
    return {"configured": bool(key and secret), "scopes": SCOPES, **urls(base_url(request)), "shops": shops}


class ConnectIn(BaseModel):
    shop: str


@dash.post("/connect")
async def connect(body: ConnectIn, request: Request):
    """Start an install from this business's dashboard so the store links to it (not a new business)."""
    key, _ = require_configured()
    shop = body.shop.strip().lower().removeprefix("https://").split("/")[0]
    if not shop.endswith(".myshopify.com"):
        shop = f"{shop}.myshopify.com"
    if not SHOP_RE.match(shop):
        raise HTTPException(400, "Enter your store's myshopify.com address")
    state = secrets.token_urlsafe(24)
    await _db.shopify_states.insert_one({"state": state, "shop": shop, "tenant_id": tenancy.tid(), "created_at": datetime.now(timezone.utc)})
    return {"authorize_url": authorize_url(request, key, shop, state)}
