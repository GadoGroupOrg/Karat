"""End-customer identity (contact form, email/password, Google) + the jeweler's access rules per action."""
import os
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Literal, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from auth import get_current_admin, hash_password, verify_password, DUMMY_HASH

ACTIONS = {
    "prices": "See prices", "studio_photo": "AI studio photo", "angles": "Angle views", "try_on": "Virtual try-on",
    "sketch": "Sketch-to-render", "save_design": "Save designs", "quote": "Request a quote",
}
Level = Literal["none", "form", "account"]
RANK = {"none": 0, "form": 1, "account": 2}
SESSION_DAYS = 30
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

_db = None
public = APIRouter(prefix="/api")
dash = APIRouter(prefix="/api/dashboard", dependencies=[Depends(get_current_admin)])


def init(db):
    global _db
    _db = db


def now():
    return datetime.now(timezone.utc)


async def ensure_indexes():
    await _db.customers.create_index("email", unique=True)
    await _db.customers.create_index("user_id", unique=True)
    await _db.customer_sessions.create_index("session_token", unique=True)
    await _db.customer_sessions.create_index("expires_at", expireAfterSeconds=0)
    await _db.customer_designs.create_index([("user_id", 1), ("id", 1)], unique=True)


# ---------- Access rules ----------
async def get_rules() -> dict:
    doc = await _db.access_rules.find_one({"key": "default"}, {"_id": 0}) or {}
    rules = {a: doc.get("rules", {}).get(a, "none") for a in ACTIONS}
    return {"rules": rules, "questions": doc.get("questions", []), "actions": ACTIONS}


async def customer_from_request(request: Request) -> Optional[dict]:
    token = request.headers.get("x-customer-token") or ""
    auth = request.headers.get("authorization") or ""
    if not token and auth.lower().startswith("bearer "):
        token = auth[7:]
    if not token:
        return None
    s = await _db.customer_sessions.find_one({"session_token": token}, {"_id": 0})
    if not s:
        return None
    exp = s["expires_at"] if s["expires_at"].tzinfo else s["expires_at"].replace(tzinfo=timezone.utc)
    if exp < now():
        return None
    c = await _db.customers.find_one({"user_id": s["user_id"]}, {"_id": 0, "password_hash": 0})
    if not c:
        return None
    return {**c, "level": s["level"]}


async def require(action: str, request: Request) -> Optional[dict]:
    """Raise 403 'gate:<level>' if the jeweler requires more than the visitor has given."""
    need = (await get_rules())["rules"].get(action, "none")
    cust = await customer_from_request(request)
    have = cust["level"] if cust else "none"
    if RANK[have] < RANK[need]:
        raise HTTPException(403, f"gate:{need}")
    return cust


@public.get("/access")
async def access():
    r = await get_rules()
    return {"rules": r["rules"], "questions": r["questions"]}


class Question(BaseModel):
    id: str = Field(min_length=1, max_length=40)
    label: str = Field(min_length=1, max_length=120)
    required: bool = False


class RulesIn(BaseModel):
    rules: Dict[str, Level]
    questions: List[Question] = Field(default=[], max_length=10)


@dash.get("/access")
async def admin_access():
    return await get_rules()


@dash.put("/access")
async def save_access(body: RulesIn):
    if not set(body.rules) <= set(ACTIONS):
        raise HTTPException(400, "Unknown action")
    await _db.access_rules.update_one({"key": "default"}, {"$set": {"rules": body.rules, "questions": [q.model_dump() for q in body.questions],
                                       "updated_at": now().isoformat()}}, upsert=True)
    return await get_rules()


@dash.get("/customers")
async def list_customers(q: str = ""):
    filt = {}
    if q.strip():
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        filt = {"$or": [{"name": rx}, {"email": rx}, {"phone": rx}]}
    items = await _db.customers.find(filt, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    for c in items:
        c["leads"] = await _db.quotes.count_documents({"email": c["email"]})
        c["designs"] = await _db.customer_designs.count_documents({"user_id": c["user_id"]})
    return {"customers": items, "total": len(items)}


@dash.get("/customers/{user_id}/designs")
async def customer_designs_admin(user_id: str):
    docs = await _db.customer_designs.find({"user_id": user_id}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return {"designs": [d["data"] for d in docs]}


# ---------- Customer identity ----------
def out(c: dict, level: str) -> dict:
    return {"user_id": c["user_id"], "email": c["email"], "name": c.get("name", ""), "phone": c.get("phone", ""),
            "picture": c.get("picture"), "kind": c.get("kind"), "level": level}


async def new_session(user_id: str, level: str) -> str:
    token = secrets.token_urlsafe(32)
    await _db.customer_sessions.insert_one({"session_token": token, "user_id": user_id, "level": level,
                                            "created_at": now(), "expires_at": now() + timedelta(days=SESSION_DAYS)})
    return token


async def upsert(email: str, fields: dict, kind: str) -> dict:
    email = email.lower().strip()
    existing = await _db.customers.find_one({"email": email})
    if existing:
        upd = {k: v for k, v in fields.items() if v not in (None, "")}
        if kind == "account":
            upd["kind"] = "account"
        upd["last_seen"] = now().isoformat()
        await _db.customers.update_one({"email": email}, {"$set": upd})
        return await _db.customers.find_one({"email": email}, {"_id": 0})
    doc = {"user_id": f"cust_{uuid.uuid4().hex[:12]}", "email": email, "kind": kind, "created_at": now().isoformat(),
           "last_seen": now().isoformat(), **{k: v for k, v in fields.items() if v is not None}}
    await _db.customers.insert_one(doc)
    doc.pop("_id", None)
    return doc


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    phone: str = Field(default="", max_length=40)
    answers: Dict[str, str] = {}


@public.post("/customers/contact")
async def contact(body: ContactIn):
    qs = (await get_rules())["questions"]
    for q in qs:
        if q["required"] and not (body.answers.get(q["id"]) or "").strip():
            raise HTTPException(400, f"Please answer: {q['label']}")
    answers = {q["id"]: {"label": q["label"], "answer": body.answers.get(q["id"], "")[:500]} for q in qs if body.answers.get(q["id"])}
    c = await upsert(str(body.email), {"name": body.name.strip(), "phone": body.phone.strip(), "answers": answers}, "contact")
    return {"session_token": await new_session(c["user_id"], "form"), "user": out(c, "form")}


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    phone: str = Field(default="", max_length=40)


@public.post("/customers/register")
async def register(body: RegisterIn):
    email = str(body.email).lower()
    ex = await _db.customers.find_one({"email": email})
    if ex and ex.get("password_hash"):
        raise HTTPException(409, "An account with this email already exists. Please sign in.")
    c = await upsert(email, {"name": body.name.strip(), "phone": body.phone.strip(), "password_hash": hash_password(body.password)}, "account")
    return {"session_token": await new_session(c["user_id"], "account"), "user": out(c, "account")}


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


@public.post("/customers/login")
async def login(body: LoginIn):
    c = await _db.customers.find_one({"email": str(body.email).lower()})
    if not verify_password(body.password, (c or {}).get("password_hash") or DUMMY_HASH) or not c:
        raise HTTPException(401, "Invalid email or password")
    await _db.customers.update_one({"user_id": c["user_id"]}, {"$set": {"last_seen": now().isoformat()}})
    return {"session_token": await new_session(c["user_id"], "account"), "user": out(c, "account")}


class GoogleIn(BaseModel):
    session_id: str = Field(min_length=1, max_length=500)


@public.post("/auth/session")
async def google_session(body: GoogleIn):
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": body.session_id})
    if r.status_code != 200:
        raise HTTPException(401, "Google sign-in failed. Please try again.")
    data = r.json()
    c = await upsert(data["email"], {"name": data.get("name", ""), "picture": data.get("picture"), "google": True}, "account")
    return {"session_token": await new_session(c["user_id"], "account"), "user": out(c, "account")}


@public.get("/customers/me")
async def me(request: Request):
    c = await customer_from_request(request)
    if not c:
        raise HTTPException(401, "Not signed in")
    return out(c, c["level"])


async def signed_in(request: Request) -> dict:
    c = await customer_from_request(request)
    if not c:
        raise HTTPException(401, "Not signed in")
    return c


@public.get("/customers/designs")
async def my_designs(request: Request):
    c = await signed_in(request)
    docs = await _db.customer_designs.find({"user_id": c["user_id"]}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return {"designs": [d["data"] for d in docs]}


@public.put("/customers/designs/{design_id}")
async def save_my_design(design_id: str, body: dict, request: Request):
    c = await signed_in(request)
    if len(design_id) > 40 or len(str(body)) > 20_000:
        raise HTTPException(400, "Design is too large")
    await _db.customer_designs.update_one({"user_id": c["user_id"], "id": design_id},
                                          {"$set": {"data": {**body, "id": design_id}, "updated_at": now().isoformat()}}, upsert=True)
    return {"ok": True}


@public.delete("/customers/designs/{design_id}")
async def delete_my_design(design_id: str, request: Request):
    c = await signed_in(request)
    await _db.customer_designs.delete_one({"user_id": c["user_id"], "id": design_id})
    return {"ok": True}


@public.get("/customers/quotes")
async def my_quotes(request: Request):
    c = await signed_in(request)
    docs = await _db.quotes.find({"$or": [{"customer_id": c["user_id"]}, {"email": c["email"]}]}).sort("created_at", -1).to_list(200)
    return {"quotes": [{"id": str(q["_id"]), "kind": q.get("kind", "design"), "price": q.get("price", 0), "status": q.get("status", "new"),
                        "created_at": q["created_at"], "image_url": q.get("image_url"), "note": q.get("note", ""),
                        "title": (q.get("design") or {}).get("name") or (q.get("product") or {}).get("title") or "Custom design",
                        "product_image": (q.get("product") or {}).get("image")} for q in docs]}


@public.post("/customers/logout")
async def logout(request: Request):
    token = request.headers.get("x-customer-token") or ""
    if token:
        await _db.customer_sessions.delete_one({"session_token": token})
    return {"ok": True}
