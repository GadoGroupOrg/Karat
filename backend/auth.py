"""Business (tenant) dashboard auth: email + password, bcrypt + JWT. Owners sign up; owners add staff."""
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field

import tenancy

JWT_ALG = "HS256"
JWT_ISSUER = "atelier-admin"
TOKEN_HOURS = 12
MAX_FAILURES = 5
LOCK_MINUTES = 15

_db = None
security = HTTPBearer(auto_error=False)
router = APIRouter(prefix="/api/auth")


def init(db):
    global _db
    _db = db


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def _pw(password: str) -> bytes:
    b = password.encode()
    if len(b) > 72:
        raise ValueError("password too long")
    return b


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_pw(password), bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, stored: str) -> bool:
    try:
        return bcrypt.checkpw(_pw(password), stored.encode())
    except (ValueError, TypeError):
        return False


DUMMY_HASH = hash_password("dummy-password-for-timing")
now = lambda: datetime.now(timezone.utc)  # noqa: E731


async def _seed(email_var: str, password_var: str, **fields):
    email = (os.environ.get(email_var) or "").lower().strip()
    password = os.environ.get(password_var) or ""
    if email and password:
        await _db.admins.update_one({"email": email}, {"$setOnInsert": {
            "id": str(uuid.uuid4()), "email": email, "password_hash": hash_password(password), "active": True,
            "created_at": now().isoformat(), **fields}}, upsert=True)


async def seed_admins(gado: dict):
    await _db.admins.create_index("email", unique=True)
    await _db.admins.create_index("tenant_id")
    await _db.login_attempts.create_index("locked_until", expireAfterSeconds=0)
    await _seed("ADMIN_EMAIL", "ADMIN_PASSWORD", name="Store owner", role="owner", tenant_id=gado["id"])
    await _seed("PLATFORM_ADMIN_EMAIL", "PLATFORM_ADMIN_PASSWORD", name="Platform admin", role="platform", tenant_id=None)


def make_token(admin: dict, actor: str | None = None, hours: float = TOKEN_HOURS) -> str:
    t = now()
    claims = {"sub": admin["id"], "role": "admin" if admin["role"] != "platform" else "platform", "iss": JWT_ISSUER,
              "iat": t, "exp": t + timedelta(hours=hours)}
    if actor:
        claims["act"] = actor
    return jwt.encode(claims, _secret(), algorithm=JWT_ALG)


def decode(token: str) -> dict | None:
    try:
        return jwt.decode(token, _secret(), algorithms=[JWT_ALG], issuer=JWT_ISSUER,
                          options={"require": ["sub", "iss", "iat", "exp"]})
    except jwt.InvalidTokenError:
        return None


async def admin_from_token(token: str) -> dict | None:
    """Business user for a dashboard token; also switches the request to that user's business."""
    claims = decode(token)
    if not claims or claims.get("role") != "admin":
        return None
    admin = await _db.admins.find_one({"id": claims["sub"], "active": True}, {"_id": 0, "password_hash": 0})
    if not admin or admin.get("role") not in ("owner", "staff"):
        return None
    tenant = await tenancy.get_by_id(admin["tenant_id"])
    if not tenant or (tenant["status"] != "active" and not claims.get("act")):
        return None
    tenancy.set_tenant(tenant)
    return {**admin, "tenant": tenant, "impersonator": claims.get("act")}


async def get_current_admin(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(401, "Not authenticated")
    admin = await admin_from_token(credentials.credentials)
    if not admin:
        raise HTTPException(401, "Session expired. Please sign in again.")
    return admin


async def require_owner(admin: dict = Depends(get_current_admin)) -> dict:
    if admin["role"] != "owner":
        raise HTTPException(403, "Only the account owner can do this")
    return admin


def session_out(admin: dict, tenant: dict, token: str) -> dict:
    return {"access_token": token, "token_type": "bearer", "expires_in": TOKEN_HOURS * 3600, **me_out(admin, tenant)}


def me_out(admin: dict, tenant: dict, impersonator: str | None = None) -> dict:
    return {"admin": {"id": admin["id"], "email": admin["email"], "name": admin.get("name", ""), "role": admin["role"]},
            "tenant": {"id": tenant["id"], "slug": tenant["slug"], "name": tenant["name"], "status": tenant["status"],
                       "plan": tenant.get("plan", "trial")},
            "impersonating": bool(impersonator)}


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


async def check_password(email: str, password: str, request: Request) -> dict:
    """Shared brute-force-protected credential check. Returns the admin doc."""
    t = now()
    attempt = await _db.login_attempts.find_one({"_id": email})
    locked = attempt and attempt.get("locked_until")
    if locked and locked.replace(tzinfo=timezone.utc) > t:
        raise HTTPException(429, "Too many attempts. Try again in 15 minutes.")
    admin = await _db.admins.find_one({"email": email, "active": True})
    if not verify_password(password, admin["password_hash"] if admin else DUMMY_HASH):
        upd = await _db.login_attempts.find_one_and_update(
            {"_id": email}, {"$inc": {"failed": 1}, "$set": {"last_ip": request.client.host if request.client else None}},
            upsert=True, return_document=True)
        if upd.get("failed", 0) >= MAX_FAILURES:
            await _db.login_attempts.update_one({"_id": email}, {"$set": {"locked_until": t + timedelta(minutes=LOCK_MINUTES), "failed": 0}})
        raise HTTPException(401, "Invalid email or password")
    await _db.login_attempts.delete_one({"_id": email})
    return admin


@router.post("/login")
async def login(body: LoginIn, request: Request):
    admin = await check_password(str(body.email).lower().strip(), body.password, request)
    if admin.get("role") == "platform":
        raise HTTPException(403, "Platform admins sign in at /platform")
    tenant = await tenancy.get_by_id(admin["tenant_id"])
    if not tenant or tenant["status"] != "active":
        raise HTTPException(403, "This account is paused. Please contact support.")
    return session_out(admin, tenant, make_token(admin))


class SignupIn(BaseModel):
    business_name: str = Field(min_length=2, max_length=80)
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


async def create_user(tenant_id: str, email: str, password: str, name: str, role: str) -> dict:
    email = email.lower().strip()
    if await _db.admins.find_one({"email": email}):
        raise HTTPException(409, "An account with this email already exists")
    doc = {"id": str(uuid.uuid4()), "email": email, "password_hash": hash_password(password), "name": name.strip(),
           "role": role, "tenant_id": tenant_id, "active": True, "created_at": now().isoformat()}
    await _db.admins.insert_one(dict(doc))
    return doc


@router.post("/signup")
async def signup(body: SignupIn):
    if await _db.admins.find_one({"email": str(body.email).lower().strip()}):
        raise HTTPException(409, "An account with this email already exists")
    tenant = await tenancy.create_tenant(body.business_name, owner_email=str(body.email).lower().strip())
    admin = await create_user(tenant["id"], str(body.email), body.password, body.name, "owner")
    return session_out(admin, tenant, make_token(admin))


@router.get("/me")
async def me(admin: dict = Depends(get_current_admin)):
    return me_out(admin, admin["tenant"], admin.get("impersonator"))


class PasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)


@router.post("/password")
async def change_password(body: PasswordIn, admin: dict = Depends(get_current_admin)):
    doc = await _db.admins.find_one({"id": admin["id"]})
    if not verify_password(body.current_password, doc["password_hash"]):
        raise HTTPException(400, "Current password is incorrect")
    await _db.admins.update_one({"id": admin["id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    return {"ok": True}


# ---------- Team (owner manages staff) ----------
team = APIRouter(prefix="/api/dashboard/team", dependencies=[Depends(get_current_admin)])


def user_out(u: dict) -> dict:
    return {k: u.get(k) for k in ("id", "email", "name", "role", "created_at")}


@team.get("")
async def list_team(admin: dict = Depends(get_current_admin)):
    users = await _db.admins.find({"tenant_id": admin["tenant_id"], "active": True}).sort("created_at", 1).to_list(100)
    return {"users": [user_out(u) for u in users], "me": admin["id"]}


class MemberIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: Literal["owner", "staff"] = "staff"


@team.post("")
async def add_member(body: MemberIn, owner: dict = Depends(require_owner)):
    return user_out(await create_user(owner["tenant_id"], str(body.email), body.password, body.name, body.role))


async def _member(uid: str, owner: dict) -> dict:
    u = await _db.admins.find_one({"id": uid, "tenant_id": owner["tenant_id"], "active": True})
    if not u:
        raise HTTPException(404, "Team member not found")
    return u


@team.delete("/{uid}")
async def remove_member(uid: str, owner: dict = Depends(require_owner)):
    if uid == owner["id"]:
        raise HTTPException(400, "You can't remove yourself")
    await _member(uid, owner)
    await _db.admins.delete_one({"id": uid})
    return {"ok": True}


@team.post("/{uid}/reset-password")
async def reset_member_password(uid: str, owner: dict = Depends(require_owner)):
    await _member(uid, owner)
    temp = secrets.token_urlsafe(9)
    await _db.admins.update_one({"id": uid}, {"$set": {"password_hash": hash_password(temp)}})
    return {"temporary_password": temp}
