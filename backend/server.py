from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import Annotated, Optional
from bson import ObjectId
from pydantic import BaseModel, Field, EmailStr, ConfigDict, BeforeValidator
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
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


class WaitlistEntry(BaseDocument):
    email: EmailStr
    business: Optional[str] = None
    source: str = "hero"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class WaitlistCreate(BaseModel):
    email: EmailStr
    business: Optional[str] = Field(default=None, max_length=120)
    source: str = Field(default="hero", max_length=30)


@api_router.get("/")
async def root():
    return {"message": "Karat API"}


@api_router.post("/waitlist")
async def join_waitlist(payload: WaitlistCreate):
    email = payload.email.lower()
    existing = await db.waitlist.find_one({"email": email})
    if existing:
        return {"ok": True, "already": True, "position": await db.waitlist.count_documents({"_id": {"$lte": existing["_id"]}})}
    entry = WaitlistEntry(email=email, business=payload.business, source=payload.source)
    await db.waitlist.insert_one(entry.to_mongo())
    count = await db.waitlist.count_documents({})
    return {"ok": True, "already": False, "position": count}


@api_router.get("/waitlist/count")
async def waitlist_count():
    return {"count": await db.waitlist.count_documents({})}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
