from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict, EmailStr
from typing import List, Optional, Annotated
from datetime import datetime, timezone

from catalog_data import TYPES, METALS, ADDONS

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
    return {"types": types, "metals": metals, "addons": addons}


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
    total = (t["base_price"] + style["price"] + size["price"]) * metal["multiplier"]
    total += sum(a["price"] for a in addons)
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
    logger.info("Catalog seeded")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
