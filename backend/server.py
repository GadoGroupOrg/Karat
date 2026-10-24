from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import re
import logging
from pathlib import Path
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict, EmailStr
from typing import Dict, List, Literal, Optional, Annotated
import auth
import catalog_admin
import customers
import dashboard
import shopify_app
import tenancy
import platform_admin
import hashlib
import json
from fastapi import File, Form, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
import render_service
from datetime import datetime, timezone

from catalog_data import TYPES, METALS, ADDONS, STONES, RING_SETTINGS, RING_BANDS, RING_SHAPES, ACCENT_SHAPES
import pricing
import asyncio
import secrets
import time
from collections import defaultdict, deque
from fastapi import Depends, Header, Request
from shopify_sync import normalize_domain, sync_store, product_as_addon

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = tenancy.ScopedDB(client[os.environ['DB_NAME']])
tenancy.init(db)
platform_admin.init(db)
auth.init(db)
dashboard.init(db)
customers.init(db)
shopify_app.init(db)

app = FastAPI(dependencies=[Depends(tenancy.resolve_tenant)])


@app.get("/health", include_in_schema=False)
@app.head("/health", include_in_schema=False)
async def health():
    return {"status": "ok"}


api_router = APIRouter(prefix="/api")


async def log_usage(kind: str):
    await db.usage.insert_one({"kind": kind, "created_at": datetime.now(timezone.utc).isoformat()})

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    def to_mongo(self) -> dict:
        data = self.model_dump(by_alias=True, exclude={"id"})
        return data

    @classmethod
    def from_mongo(cls, doc: dict):
        return cls.model_validate(doc)


class DesignSpec(BaseModel):
    type: str
    styleId: str
    metalId: str
    sizeId: str
    addonIds: List[str] = []
    engraving: str = ""
    name: str = ""
    options: Dict[str, str] = {}
    notes: str = Field(default="", max_length=1000)


class QuoteCreate(BaseModel):
    design: Optional[DesignSpec] = None
    product_id: Optional[str] = None
    tryon_id: Optional[str] = None
    sketch_id: Optional[str] = None
    render_url: Optional[str] = Field(default=None, max_length=300)
    source: Literal["app", "embed"] = "app"
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    phone: str = Field(default="", max_length=40)
    note: str = Field(default="", max_length=500)


class Quote(BaseDocument):
    kind: str = "design"
    design: Optional[DesignSpec] = None
    product: Optional[dict] = None
    sketch: Optional[dict] = None
    customer_id: Optional[str] = None
    name: str
    email: str
    phone: str = ""
    note: str = ""
    price: int
    image_url: Optional[str] = None
    source: str = "app"
    status: str = "new"
    notes: List[dict] = []
    created_at: str


async def get_catalog() -> dict:
    types = await db.product_types.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    metals = await db.metals.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    addons = await db.addons.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    store_products = await db.store_products.find({"available": True}, {"_id": 0}).to_list(5000)
    addons += [product_as_addon(p) for p in store_products]
    store = await db.store_connection.find_one({"key": "default"}, {"_id": 0, "key": 0})
    images = {d["key"]: d["created_at"] async for d in db.option_images.find({}, {"_id": 0, "key": 1, "created_at": 1})}

    def attach(group: str, opts: list):
        for o in opts:
            k = f"{group}:{o['id']}"
            if k in images:
                o["image"] = f"/api/option-images/{k}?v={images[k][:19]}"

    for t in types:
        if t["id"] == "ring":
            attach("setting", t["styles"])
            for g in t.get("option_groups", []):
                attach(g["id"], g["options"])
        elif t["id"] == "band":
            attach("band_style", t["styles"])
    custom = await db.custom_styles.find({}, {"_id": 0}).to_list(500)
    for t in types:
        t["styles"] = t["styles"] + [{k: c[k] for k in ("id", "name", "description", "price")} | {"custom": True}
                                     for c in custom if c["type"] == t["id"]]
        if t["id"] not in ("ring", "band"):
            attach(f"style.{t['id']}", t["styles"])
    sheet = pricing.merge_defaults(await db.price_sheet.find_one({"key": "default"}, {"_id": 0}))
    return {"types": types, "metals": metals, "addons": addons, "store": store,
            "pricing": {"gold_karat": "18k", "currency": "USD"}, "sheet": sheet}


def public_catalog(c: dict) -> dict:
    """Strip supplier costs: the ring is priced only through /api/price."""
    c = {k: v for k, v in c.items() if k != "sheet"}
    for t in c["types"]:
        if t["id"] == "band":
            for s in t["styles"]:
                s.pop("price", None); s.pop("weight", None)
        if t["id"] == "ring":
            for s in t["styles"]:
                s.pop("price", None); s.pop("grams", None)
            for g in t["option_groups"]:
                for o in g["options"]:
                    for k in ("price", "grams", "addon_factor", "accent_factor"):
                        o.pop(k, None)
    for a in c["addons"]:
        if "ring" in a["types"]:
            a.pop("price", None)
    return c


def compute_breakdown(catalog: dict, d: DesignSpec) -> dict:
    t = next((x for x in catalog["types"] if x["id"] == d.type), None)
    if not t:
        raise HTTPException(400, "Unknown jewelry type")
    style = next((s for s in t["styles"] if s["id"] == d.styleId), None)
    size = next((s for s in t["sizes"] if s["id"] == d.sizeId), None)
    metal = next((m for m in catalog["metals"] if m["id"] == d.metalId), None)
    if not style or not size or not metal:
        raise HTTPException(400, "Invalid style, size or metal")
    addons = [a for a in catalog["addons"] if a["id"] in d.addonIds and d.type in a["types"]]
    if len(addons) > t["max_addons"]:
        raise HTTPException(400, "Too many add-ons")
    for g in t.get("option_groups", []):
        if not any(x["id"] == d.options.get(g["id"], g["default"]) for x in g["options"]):
            raise HTTPException(400, f"Invalid {g['label']}")
    if t["id"] == "ring":
        return pricing.ring_quote(catalog["sheet"], catalog, d, t, style, size, addons)
    if t["id"] == "band":
        return pricing.wedding_band_quote(catalog["sheet"], d, t, style, size)
    labor = t["base_price"] + style["price"] + size["price"] + sum(
        next((x.get("price", 0) for x in g["options"] if x["id"] == d.options.get(g["id"], g["default"])), 0)
        for g in t.get("option_groups", []))
    lines = [{"label": "Piece", "amount": labor * metal["multiplier"]}]
    for a in addons:
        lines.append({"label": a["name"], "amount": a["price"]})
    if d.engraving.strip() and t["engraving_max"] > 0:
        lines.append({"label": "Engraving", "amount": t["engraving_price"]})
    for ln in lines:
        ln["amount"] = int(round(ln["amount"]))
    return {"lines": lines, "total": sum(ln["amount"] for ln in lines), "gold_grams": 0}


def compute_price(catalog: dict, d: DesignSpec) -> int:
    return compute_breakdown(catalog, d)["total"]


@api_router.get("/")
async def root():
    return {"message": "Atelier jewelry builder API"}


@api_router.get("/catalog")
async def catalog():
    c = await get_catalog()
    catalog_admin.apply_slots(c, await catalog_admin.load_slots())
    return public_catalog(catalog_admin.apply_config(c, await catalog_admin.load_config()))


# ---------- Merchant admin (PIN-gated) ----------
_failed: dict = defaultdict(deque)
PIN_WINDOW, PIN_MAX_FAILURES = 300, 5


async def merchant_pin(request: Request, x_merchant_pin: Optional[str] = Header(default=None),
                       authorization: Optional[str] = Header(default=None)):
    if authorization and authorization.lower().startswith("bearer ") and await auth.admin_from_token(authorization[7:]):
        return True  # admin_from_token switched the request to the admin's business
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "?")
    now, q = time.monotonic(), _failed[ip]
    while q and now - q[0] >= PIN_WINDOW:
        q.popleft()
    if len(q) >= PIN_MAX_FAILURES:
        raise HTTPException(429, "Too many attempts. Try again in a few minutes.")
    if not x_merchant_pin or not secrets.compare_digest(x_merchant_pin, os.environ["MERCHANT_PIN"]):
        q.append(now)
        raise HTTPException(401, "Invalid merchant PIN")
    return True


class SheetText(BaseModel):
    csv: str = Field(min_length=1, max_length=500_000)


admin = APIRouter(prefix="/api/admin", dependencies=[Depends(merchant_pin)])


@admin.get("/verify")
async def admin_verify():
    return {"ok": True}


@admin.get("/price-sheet")
async def admin_sheet():
    c = await get_catalog()
    s = c["sheet"]
    s.pop("_id", None)
    return {"sheet": s, "bracket_labels": pricing.BRACKET_LABELS,
            "gold_cost_per_gram": round(pricing.gold_cost_per_gram(s), 2),
            "names": {
                "stones": {i: n for i, n, _, _ in STONES},
                "setting": {x["id"]: x["name"] for x in RING_SETTINGS},
                "band": {x["id"]: x["name"] for x in RING_BANDS},
                "shape": {i: n for i, n, _ in RING_SHAPES},
                "accent_shape": {i: n for i, n, _, _ in ACCENT_SHAPES},
            }}


@admin.put("/price-sheet")
async def admin_save_sheet(body: dict):
    sheet = pricing.merge_defaults(body.get("sheet"))
    sheet["key"] = "default"
    sheet["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.price_sheet.replace_one({"key": "default"}, sheet, upsert=True)
    return {"ok": True, "updated_at": sheet["updated_at"]}


@admin.post("/gold/refresh")
async def admin_gold_refresh():
    try:
        return await pricing.refresh_gold(db)
    except Exception:
        raise HTTPException(502, "Gold price feed unavailable. Use manual mode.")


@admin.get("/price-sheet.csv")
async def admin_sheet_csv():
    c = await get_catalog()
    return Response(pricing.to_csv(c["sheet"]), media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=atelier-price-sheet.csv"})


@admin.post("/price-sheet/csv")
async def admin_import_csv(body: SheetText):
    c = await get_catalog()
    try:
        sheet, n = pricing.from_csv(body.csv, c["sheet"])
    except Exception:
        raise HTTPException(400, "Couldn't read that CSV. Use the exported template.")
    if n == 0:
        raise HTTPException(400, "No price rows found in the CSV.")
    sheet["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.price_sheet.replace_one({"key": "default"}, sheet, upsert=True)
    return {"ok": True, "rows": n}


@admin.post("/quote-preview")
async def admin_quote_preview(design: DesignSpec):
    return compute_breakdown(await get_catalog(), design)


async def gold_refresh_loop():
    while True:
        try:
            await pricing.refresh_gold(db)
            logger.info("Gold spot refreshed")
        except Exception:
            logger.warning("Gold spot refresh failed")
        await asyncio.sleep(3 * 3600)


@api_router.post("/price")
async def price(design: DesignSpec):
    b = compute_breakdown(await get_catalog(), design)
    b.pop("admin", None)  # costs & margins are merchant-only
    return {"price": b["total"], **b}


@api_router.get("/option-images/{key}")
async def option_image(key: str):
    doc = await db.option_images.find_one({"key": key})
    if not doc:
        raise HTTPException(404, "Image not found")
    data, ctype = await run_in_threadpool(render_service.get_object, doc["storage_path"])
    return Response(content=data, media_type=ctype, headers={"Cache-Control": "public, max-age=31536000, immutable"})


def design_hash(d: DesignSpec) -> str:
    spec = d.model_dump(exclude={"name", "notes"})
    spec["addonIds"] = sorted(spec["addonIds"])
    return hashlib.sha256(json.dumps(spec, sort_keys=True).encode()).hexdigest()[:32]


class Render(BaseDocument):
    hash: str
    design: DesignSpec
    storage_path: str
    created_at: str


@api_router.post("/renders")
async def create_render(request: Request, design: str = Form(...), force: str = Form("false"), snapshot: Optional[UploadFile] = File(None)):
    await catalog_admin.require_feature("studio_photo")
    await customers.require("studio_photo", request)
    try:
        spec = DesignSpec.model_validate_json(design)
    except Exception:
        raise HTTPException(400, "Invalid design")
    catalog = await get_catalog()
    compute_price(catalog, spec)  # validates the spec
    h = design_hash(spec)
    cached = await db.renders.find_one({"hash": h})
    if cached and force != "true":
        return {"id": h, "image_url": f"/api/renders/{h}/image?v={cached['created_at'][:19]}", "cached": True}
    snap = await snapshot.read() if snapshot else None
    if snap and len(snap) > 6_000_000:
        snap = None
    try:
        png, mime = await render_service.generate_render(catalog, spec.model_dump(), snap)
        path = render_service.storage_path()
        await run_in_threadpool(render_service.put_object, path, png, mime)
    except Exception as e:
        logger.exception("render failed")
        status = getattr(getattr(e, "response", None), "status_code", None)
        if status == 402:
            raise HTTPException(402, "Render credits exhausted. Please top up your balance.")
        raise HTTPException(502, "Couldn't create the studio render. Please try again.")
    doc = Render(hash=h, design=spec, storage_path=path, created_at=datetime.now(timezone.utc).isoformat())
    await db.renders.update_one({"hash": h}, {"$set": doc.to_mongo()}, upsert=True)
    await log_usage("render")
    return {"id": h, "image_url": f"/api/renders/{h}/image?v={doc.created_at[:19]}", "cached": False}


@api_router.get("/renders/{h}/image")
async def render_image(h: str):
    doc = await db.renders.find_one({"hash": h})
    if not doc:
        raise HTTPException(404, "Render not found")
    data, ctype = await run_in_threadpool(render_service.get_object, doc["storage_path"])
    return Response(content=data, media_type=ctype, headers={"Cache-Control": "public, max-age=31536000, immutable"})


@api_router.get("/renders/{h}/angles/{angle}")
async def get_angle(h: str, angle: str):
    doc = await db.render_angles.find_one({"hash": h, "angle": angle, "v": render_service.ANGLE_VERSION})
    return {"image_url": f"/api/renders/{h}/angles/{angle}/image?v={doc['created_at'][:19]}" if doc else None}


@api_router.post("/renders/{h}/angles/{angle}")
async def create_angle(h: str, angle: str, request: Request):
    if angle not in render_service.ANGLES:
        raise HTTPException(400, "Unknown angle")
    base = await db.renders.find_one({"hash": h})
    if not base:
        raise HTTPException(404, "Render not found")
    cached = await db.render_angles.find_one({"hash": h, "angle": angle, "v": render_service.ANGLE_VERSION})
    if cached:
        return {"image_url": f"/api/renders/{h}/angles/{angle}/image?v={cached['created_at'][:19]}", "cached": True}
    await catalog_admin.require_feature("angle_views")
    await customers.require("angles", request)
    try:
        data, _ = await run_in_threadpool(render_service.get_object, base["storage_path"])
        try:
            facts = render_service.design_facts(await get_catalog(), base["design"])
        except Exception:
            facts = ""  # design options changed since the render; fall back to the photo alone
        img, mime = await render_service.generate_angle(data, angle, facts)
        path = render_service.storage_path()
        await run_in_threadpool(render_service.put_object, path, img, mime)
    except Exception as e:
        logger.exception("angle failed")
        if getattr(getattr(e, "response", None), "status_code", None) == 402:
            raise HTTPException(402, "Render credits exhausted. Please top up your balance.")
        raise HTTPException(502, "Couldn't create this view. Please try again.")
    created = datetime.now(timezone.utc).isoformat()
    await db.render_angles.update_one({"hash": h, "angle": angle}, {"$set": {"storage_path": path, "created_at": created, "v": render_service.ANGLE_VERSION}}, upsert=True)
    await log_usage("angle")
    return {"image_url": f"/api/renders/{h}/angles/{angle}/image?v={created[:19]}", "cached": False}


@api_router.get("/renders/{h}/angles/{angle}/image")
async def angle_image(h: str, angle: str):
    doc = await db.render_angles.find_one({"hash": h, "angle": angle})
    if not doc:
        raise HTTPException(404, "View not found")
    data, ctype = await run_in_threadpool(render_service.get_object, doc["storage_path"])
    return Response(content=data, media_type=ctype, headers={"Cache-Control": "public, max-age=31536000, immutable"})


def _composite(base: bytes, strokes: list) -> bytes:
    import io
    from PIL import Image as PILImage, ImageDraw
    img = PILImage.open(io.BytesIO(base)).convert("RGB")
    w, h = img.size
    draw = ImageDraw.Draw(img)
    for st in strokes[:200]:
        pts = [(float(x) * w, float(y) * h) for x, y in st.get("points", [])[:2000]]
        width = max(3, int(float(st.get("w", 0.008)) * w))
        if len(pts) == 1:
            x, y = pts[0]
            draw.ellipse([x - width, y - width, x + width, y + width], fill=(230, 20, 40))
        elif pts:
            draw.line(pts, fill=(230, 20, 40), width=width, joint="curve")
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


def _square(data: bytes) -> bytes:
    """Pad an uploaded photo to a square (the editor shows it 'contain' in a square, so strokes line up)."""
    import io
    from PIL import Image as PILImage
    img = PILImage.open(io.BytesIO(data)).convert("RGB")
    side = max(img.size)
    out = PILImage.new("RGB", (side, side), (246, 243, 238))
    out.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    out.thumbnail((1536, 1536))
    buf = io.BytesIO()
    out.save(buf, "PNG")
    return buf.getvalue()


@api_router.post("/sketches")
async def create_sketch(request: Request, design: str = Form(""), strokes: str = Form("[]"), note: str = Form(""),
                        render_id: str = Form(""), snapshot: Optional[UploadFile] = File(None), parent_id: str = Form("")):
    """Sketch over a builder design, or (no design) over the customer's own uploaded jewelry photo."""
    await catalog_admin.require_feature("sketch" if design else "redesign")
    await customers.require("sketch", request)
    try:
        spec = DesignSpec.model_validate_json(design) if design else None
        lines = json.loads(strokes)
        assert isinstance(lines, list) and (lines or note.strip())
    except Exception:
        raise HTTPException(400, "Draw on the photo or describe the change first")
    catalog = await get_catalog()
    if spec:
        compute_price(catalog, spec)
    elif not snapshot and not parent_id:
        raise HTTPException(400, "Upload a photo of the jewelry first")
    base, parent = None, None
    if parent_id:  # refine a previous render: the last result becomes the new base
        parent = await db.sketches.find_one({"id": parent_id})
        if not parent:
            raise HTTPException(404, "Previous version not found")
        base, _ = await run_in_threadpool(render_service.get_object, parent["storage_path"])
    if render_id:
        r = await db.renders.find_one({"hash": render_id})
        if r:
            base, _ = await run_in_threadpool(render_service.get_object, r["storage_path"])
    if base is None and snapshot:
        base = await snapshot.read()
        if len(base) > 12_000_000:
            raise HTTPException(413, "Photo is too large (max 12 MB)")
        if not spec:
            try:
                base = await run_in_threadpool(_square, base)
            except Exception:
                raise HTTPException(400, "Please upload a photo (JPG or PNG)")
    if not base:
        raise HTTPException(400, "No design image to sketch on")
    try:
        comp = await run_in_threadpool(_composite, base, lines)
        desc = render_service.build_prompt(catalog, spec.model_dump(), False, 0)[:1500] if spec else ""
        img, mime = await render_service.generate_sketch(comp, note[:500], desc)
        sid = secrets.token_hex(16)
        path, cpath = render_service.storage_path(), render_service.storage_path()
        await run_in_threadpool(render_service.put_object, path, img, mime)
        await run_in_threadpool(render_service.put_object, cpath, comp, "image/png")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("sketch failed")
        if getattr(getattr(e, "response", None), "status_code", None) == 402:
            raise HTTPException(402, "Render credits exhausted. Please top up your balance.")
        raise HTTPException(502, "Couldn't render your sketch. Please try again.")
    await log_usage("sketch")
    await db.sketches.insert_one({"id": sid, "design": spec.model_dump() if spec else None,
                                  "uploaded": bool(parent.get("uploaded")) if parent else not spec,
                                  "parent_id": parent_id or None, "round": (parent.get("round", 1) + 1) if parent else 1,
                                  "note": note[:500], "storage_path": path,
                                  "sketch_path": cpath, "created_at": datetime.now(timezone.utc).isoformat()})
    return {"id": sid, "image_url": f"/api/sketches/{sid}/image", "sketch_url": f"/api/sketches/{sid}/image?which=sketch",
            "round": (parent.get("round", 1) + 1) if parent else 1}


@api_router.get("/sketches/{sid}/image")
async def sketch_image(sid: str, which: str = "result"):
    doc = await db.sketches.find_one({"id": sid})
    if not doc:
        raise HTTPException(404, "Sketch not found")
    data, ctype = await run_in_threadpool(render_service.get_object, doc["sketch_path" if which == "sketch" else "storage_path"])
    return Response(content=data, media_type=ctype, headers={"Cache-Control": "public, max-age=31536000, immutable"})


@api_router.post("/tryons")
async def create_tryon(request: Request, product_id: str = Form(...), photo: UploadFile = File(...)):
    await catalog_admin.require_feature("try_on")
    await customers.require("try_on", request)
    product = await db.store_products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")
    data = await photo.read()
    if not data:
        raise HTTPException(400, "Photo is empty")
    if len(data) > 12_000_000:
        raise HTTPException(413, "Photo is too large (max 12 MB)")
    if not (photo.content_type or "").startswith("image/"):
        raise HTTPException(400, "Please upload an image")
    try:
        img, mime = await render_service.generate_tryon(data, product)
        path = render_service.tryon_path()
        await run_in_threadpool(render_service.put_object, path, img, mime)
    except Exception as e:
        logger.exception("try-on failed")
        if getattr(getattr(e, "response", None), "status_code", None) == 402:
            raise HTTPException(402, "Try-on credits exhausted. Please top up your balance.")
        raise HTTPException(502, "Couldn't create the try-on. Please try another photo.")
    tid = secrets.token_hex(16)
    await log_usage("tryon")
    await db.tryons.insert_one({"id": tid, "product_id": product_id, "storage_path": path,
                                "created_at": datetime.now(timezone.utc).isoformat()})
    return {"id": tid, "image_url": f"/api/tryons/{tid}/image", "product_id": product_id}


@api_router.get("/tryons/{tid}/image")
async def tryon_image(tid: str):
    doc = await db.tryons.find_one({"id": tid})
    if not doc:
        raise HTTPException(404, "Try-on not found")
    data, ctype = await run_in_threadpool(render_service.get_object, doc["storage_path"])
    return Response(content=data, media_type=ctype, headers={"Cache-Control": "public, max-age=31536000, immutable"})


@api_router.post("/quotes", response_model=Quote, response_model_by_alias=False)
async def create_quote(payload: QuoteCreate, request: Request):
    cust = await customers.require("quote", request)
    payload.email = payload.email.lower()
    product = None
    if payload.design:
        p = compute_price(await get_catalog(), payload.design)
    elif payload.sketch_id:
        p = 0  # redesign of the customer's own photo: priced by the jeweler
    elif payload.product_id:
        sp = await db.store_products.find_one({"id": payload.product_id}, {"_id": 0})
        if not sp:
            raise HTTPException(404, "Product not found")
        product = {k: sp.get(k) for k in ("id", "title", "price", "image", "url", "product_type")}
        p = int(round(sp.get("price") or 0))
    else:
        raise HTTPException(400, "A design or product is required")
    image_url = None
    if payload.render_url and re.match(r"^/api/renders/[a-f0-9]{32}/image", payload.render_url):
        image_url = payload.render_url
    if payload.tryon_id and await db.tryons.find_one({"id": payload.tryon_id, "product_id": payload.product_id}):
        image_url = f"/api/tryons/{payload.tryon_id}/image"
    sketch = None
    sk = await db.sketches.find_one({"id": payload.sketch_id}) if payload.sketch_id else None
    if payload.sketch_id and not sk:
        raise HTTPException(404, "Sketch not found")
    if sk:
        image_url = f"/api/sketches/{payload.sketch_id}/image"
        sketch = {"id": sk["id"], "note": sk.get("note", ""), "sketch_url": f"/api/sketches/{sk['id']}/image?which=sketch",
                  "uploaded": bool(sk.get("uploaded")), "round": sk.get("round", 1)}
    quote = Quote(
        design=payload.design, product=product, kind="sketch" if sketch else "design" if payload.design else "product", sketch=sketch,
        customer_id=cust["user_id"] if cust else None,
        name=payload.name.strip(), email=payload.email, phone=payload.phone.strip(),
        note=payload.note.strip(), price=p, image_url=image_url, source=payload.source,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    res = await db.quotes.insert_one(quote.to_mongo())
    quote.id = str(res.inserted_id)
    return quote


class StoreConnect(BaseModel):
    domain: str = Field(min_length=3, max_length=200)


@api_router.get("/store")
async def get_store():
    return {"store": await db.store_connection.find_one({"key": "default"}, {"_id": 0, "key": 0})}


@api_router.post("/store/connect", dependencies=[Depends(merchant_pin)])
async def connect_store(body: StoreConnect):
    domain = normalize_domain(body.domain)
    if "." not in domain:
        raise HTTPException(400, "Enter a full store domain, e.g. yourstore.myshopify.com")
    try:
        return {"store": await sync_store(db, domain)}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.exception("store connect failed")
        raise HTTPException(502, f"Couldn't reach {domain}: {type(e).__name__}")


@api_router.post("/store/sync", dependencies=[Depends(merchant_pin)])
async def resync_store():
    conn = await db.store_connection.find_one({"key": "default"})
    if not conn:
        raise HTTPException(404, "No store connected")
    try:
        return {"store": await sync_store(db, conn["domain"])}
    except Exception as e:
        logger.exception("store sync failed")
        raise HTTPException(502, f"Sync failed: {e}")


@api_router.delete("/store", dependencies=[Depends(merchant_pin)])
async def disconnect_store():
    await db.store_connection.delete_many({})
    await db.store_products.delete_many({})
    return {"store": None}


@api_router.get("/store/products")
async def store_products(q: str = "", product_type: str = ""):
    filt: dict = {}
    if q.strip():
        filt["title"] = {"$regex": re.escape(q.strip()), "$options": "i"}
    if product_type:
        filt["product_type"] = product_type
    items = await db.store_products.find(filt, {"_id": 0}).sort("title", 1).to_list(5000)
    types = sorted(await db.store_products.distinct("product_type"))
    return {"products": items, "product_types": types}


@api_router.get("/store/products/{pid}")
async def store_product(pid: str):
    p = await db.store_products.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Product not found")
    return p


app.include_router(api_router)
app.include_router(admin)
app.include_router(auth.router)
app.include_router(dashboard.public)
app.include_router(dashboard.dash)
app.include_router(catalog_admin.public)
app.include_router(catalog_admin.dash)
app.include_router(customers.public)
app.include_router(customers.dash)
app.include_router(shopify_app.public)
app.include_router(shopify_app.dash)
app.include_router(auth.team)
app.include_router(platform_admin.public)
app.include_router(platform_admin.dash)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def seed_catalog():
    for coll, items in (("product_types", TYPES), ("metals", METALS), ("addons", ADDONS)):
        for i, item in enumerate(items):
            await db[coll].update_one({"id": item["id"]}, {"$set": {**item, "order": i}}, upsert=True)
        await db[coll].delete_many({"id": {"$nin": [x["id"] for x in items]}})
    try:
        await run_in_threadpool(render_service.init_storage)
    except Exception:
        logger.exception("Object storage init failed")
    logger.info("Catalog seeded")
    gado = await tenancy.migrate()
    await auth.seed_admins(gado)
    catalog_admin.init(db, get_catalog)
    await customers.ensure_indexes()
    asyncio.create_task(gold_refresh_loop())
    with tenancy.use(gado):
        if not await db.price_sheet.find_one({"key": "default"}):
            await db.price_sheet.insert_one(pricing.default_sheet())
        default_domain = os.environ.get("SHOPIFY_STORE_DOMAIN")
        if default_domain and not await db.store_connection.find_one({"key": "default"}):
            try:
                conn = await sync_store(db, normalize_domain(default_domain))
                logger.info("Synced %s products from %s", conn["product_count"], conn["domain"])
            except Exception:
                logger.exception("Initial store sync failed")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
