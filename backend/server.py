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
from typing import Dict, List, Optional, Annotated
import hashlib
import json
from fastapi import File, Form, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
import render_service
from datetime import datetime, timezone

from catalog_data import TYPES, METALS, ADDONS
from shopify_sync import normalize_domain, sync_store, product_as_addon

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()


@app.get("/health", include_in_schema=False)
@app.head("/health", include_in_schema=False)
async def health():
    return {"status": "ok"}


api_router = APIRouter(prefix="/api")

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


class QuoteCreate(BaseModel):
    design: DesignSpec
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    note: str = Field(default="", max_length=500)


class Quote(BaseDocument):
    design: DesignSpec
    name: str
    email: str
    note: str = ""
    price: int
    status: str = "new"
    created_at: str


async def get_catalog() -> dict:
    types = await db.product_types.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    metals = await db.metals.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    addons = await db.addons.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    store_products = await db.store_products.find({"available": True}, {"_id": 0}).to_list(5000)
    addons += [product_as_addon(p) for p in store_products]
    store = await db.store_connection.find_one({"key": "default"}, {"_id": 0, "key": 0})
    return {"types": types, "metals": metals, "addons": addons, "store": store}


def compute_price(catalog: dict, d: DesignSpec) -> int:
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
    metal_part = t["base_price"] + style["price"] + size["price"]
    metal_factor, addon_factor = metal["multiplier"], 1.0
    for g in t.get("option_groups", []):
        oid = d.options.get(g["id"], g["default"])
        o = next((x for x in g["options"] if x["id"] == oid), None)
        if not o:
            raise HTTPException(400, f"Invalid {g['label']}")
        metal_part += o.get("price", 0)
        metal_factor *= o.get("metal_factor", 1.0)
        addon_factor *= o.get("addon_factor", 1.0)
    total = metal_part * metal_factor + sum(a["price"] for a in addons) * addon_factor
    if d.engraving.strip() and t["engraving_max"] > 0:
        total += t["engraving_price"]
    return int(round(total))


@api_router.get("/")
async def root():
    return {"message": "Atelier jewelry builder API"}


@api_router.get("/catalog")
async def catalog():
    return await get_catalog()


@api_router.post("/price")
async def price(design: DesignSpec):
    return {"price": compute_price(await get_catalog(), design)}


def design_hash(d: DesignSpec) -> str:
    spec = d.model_dump(exclude={"name"})
    spec["addonIds"] = sorted(spec["addonIds"])
    return hashlib.sha256(json.dumps(spec, sort_keys=True).encode()).hexdigest()[:32]


class Render(BaseDocument):
    hash: str
    design: DesignSpec
    storage_path: str
    created_at: str


@api_router.post("/renders")
async def create_render(design: str = Form(...), force: str = Form("false"), snapshot: Optional[UploadFile] = File(None)):
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
    return {"id": h, "image_url": f"/api/renders/{h}/image?v={doc.created_at[:19]}", "cached": False}


@api_router.get("/renders/{h}/image")
async def render_image(h: str):
    doc = await db.renders.find_one({"hash": h})
    if not doc:
        raise HTTPException(404, "Render not found")
    data, ctype = await run_in_threadpool(render_service.get_object, doc["storage_path"])
    return Response(content=data, media_type=ctype, headers={"Cache-Control": "public, max-age=31536000, immutable"})


@api_router.post("/quotes", response_model=Quote, response_model_by_alias=False)
async def create_quote(payload: QuoteCreate):
    p = compute_price(await get_catalog(), payload.design)
    quote = Quote(
        design=payload.design, name=payload.name.strip(), email=payload.email,
        note=payload.note.strip(), price=p,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    res = await db.quotes.insert_one(quote.to_mongo())
    quote.id = str(res.inserted_id)
    return quote


@api_router.get("/quotes", response_model=List[Quote], response_model_by_alias=False)
async def list_quotes():
    docs = await db.quotes.find().sort("created_at", -1).to_list(500)
    return [Quote.from_mongo(d) for d in docs]


class StoreConnect(BaseModel):
    domain: str = Field(min_length=3, max_length=200)


@api_router.get("/store")
async def get_store():
    return {"store": await db.store_connection.find_one({"key": "default"}, {"_id": 0, "key": 0})}


@api_router.post("/store/connect")
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


@api_router.post("/store/sync")
async def resync_store():
    conn = await db.store_connection.find_one({"key": "default"})
    if not conn:
        raise HTTPException(404, "No store connected")
    try:
        return {"store": await sync_store(db, conn["domain"])}
    except Exception as e:
        logger.exception("store sync failed")
        raise HTTPException(502, f"Sync failed: {e}")


@api_router.delete("/store")
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
