"""Platform (software supplier) console: manage every business account."""
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field

import auth
import tenancy

_db = None
public = APIRouter(prefix="/api/platform")


def init(db):
    global _db
    _db = db


async def get_platform_admin(credentials: HTTPAuthorizationCredentials | None = Depends(auth.security)) -> dict:
    claims = auth.decode(credentials.credentials) if credentials else None
    admin = claims and claims.get("role") == "platform" and await _db.admins.find_one(
        {"id": claims["sub"], "role": "platform", "active": True}, {"_id": 0, "password_hash": 0})
    if not admin:
        raise HTTPException(401, "Please sign in to the platform console")
    return admin


dash = APIRouter(prefix="/api/platform", dependencies=[Depends(get_platform_admin)])


@public.post("/login")
async def login(body: auth.LoginIn, request: Request):
    admin = await auth.check_password(str(body.email).lower().strip(), body.password, request)
    if admin.get("role") != "platform":
        raise HTTPException(403, "This login is for the platform team only")
    return {"access_token": auth.make_token(admin), "admin": {"id": admin["id"], "email": admin["email"], "name": admin.get("name", "")}}


@dash.get("/me")
async def me(admin: dict = Depends(get_platform_admin)):
    return {"admin": {"id": admin["id"], "email": admin["email"], "name": admin.get("name", "")}}


async def _stats(t: dict, month_start: str) -> dict:
    raw, q = _db.raw, {"tenant_id": t["id"]}
    owner = await raw.admins.find_one({**q, "role": "owner", "active": True}, sort=[("created_at", 1)])
    shop = await raw.shopify_shops.find_one({**q, "uninstalled_at": None})
    usage = {k: await raw.usage.count_documents({**q, "kind": k, "created_at": {"$gte": month_start}})
             for k in ("render", "angle", "sketch", "tryon")}
    return {**t, "owner_email": owner["email"] if owner else None, "owner_id": owner["id"] if owner else None,
            "team": await raw.admins.count_documents({**q, "active": True}),
            "leads": await raw.quotes.count_documents(q), "customers": await raw.customers.count_documents(q),
            "shopify_shop": shop["shop"] if shop else None, "ai_usage_month": usage, "ai_total_month": sum(usage.values())}


@dash.get("/tenants")
async def tenants(q: Optional[str] = None):
    filt = {"$or": [{"name": {"$regex": q, "$options": "i"}}, {"slug": {"$regex": q, "$options": "i"}}]} if q else {}
    items = await _db.raw.tenants.find(filt, {"_id": 0}).sort("created_at", -1).to_list(500)
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    rows = [await _stats(t, month_start) for t in items]
    return {"tenants": rows, "total": len(rows),
            "totals": {"active": sum(r["status"] == "active" for r in rows), "ai_month": sum(r["ai_total_month"] for r in rows),
                       "leads": sum(r["leads"] for r in rows)}}


class TenantIn(BaseModel):
    business_name: str = Field(min_length=2, max_length=80)
    owner_name: str = Field(min_length=1, max_length=80)
    owner_email: EmailStr


@dash.post("/tenants")
async def create_tenant(body: TenantIn):
    email = str(body.owner_email).lower().strip()
    if await _db.admins.find_one({"email": email}):
        raise HTTPException(409, "An account with this email already exists")
    t = await tenancy.create_tenant(body.business_name, owner_email=email)
    temp = secrets.token_urlsafe(9)
    await auth.create_user(t["id"], email, temp, body.owner_name, "owner")
    return {"tenant": t, "temporary_password": temp}


class TenantPatch(BaseModel):
    status: Optional[Literal["active", "paused"]] = None
    plan: Optional[Literal["trial", "starter", "pro", "enterprise", "founder"]] = None
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)


async def _tenant(tid: str) -> dict:
    t = await tenancy.get_by_id(tid)
    if not t:
        raise HTTPException(404, "Business not found")
    return t


@dash.patch("/tenants/{tid}")
async def update_tenant(tid: str, body: TenantPatch):
    await _tenant(tid)
    upd = body.model_dump(exclude_none=True)
    if upd:
        await _db.raw.tenants.update_one({"id": tid}, {"$set": upd})
    return await _tenant(tid)


async def _owner(tid: str) -> dict:
    owner = await _db.raw.admins.find_one({"tenant_id": tid, "role": "owner", "active": True}, sort=[("created_at", 1)])
    if not owner:
        raise HTTPException(404, "This business has no owner account")
    return owner


@dash.post("/tenants/{tid}/impersonate")
async def impersonate(tid: str, admin: dict = Depends(get_platform_admin)):
    t, owner = await _tenant(tid), await _owner(tid)
    await _db.raw.audit_events.insert_one({"id": str(uuid.uuid4()), "action": "impersonate", "actor": admin["email"],
                                           "tenant_id": tid, "target": owner["email"],
                                           "created_at": datetime.now(timezone.utc).isoformat()})
    return auth.session_out(owner, t, auth.make_token(owner, actor=admin["id"], hours=1))


@dash.post("/tenants/{tid}/reset-owner-password")
async def reset_owner_password(tid: str):
    owner = await _owner(tid)
    temp = secrets.token_urlsafe(9)
    await _db.raw.admins.update_one({"id": owner["id"]}, {"$set": {"password_hash": auth.hash_password(temp)}})
    return {"email": owner["email"], "temporary_password": temp}


def sso_token(owner: dict) -> str:
    """Short-lived dashboard token used to hop from Shopify admin into the browser dashboard."""
    return auth.make_token(owner, hours=timedelta(minutes=10).total_seconds() / 3600)
