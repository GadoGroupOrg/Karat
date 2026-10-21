"""Email + password admin auth (bcrypt + JWT). No public signup: admins are seeded from env."""
import os
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field

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


async def seed_admin():
    await _db.admins.create_index("email", unique=True)
    await _db.login_attempts.create_index("locked_until", expireAfterSeconds=0)
    email = (os.environ.get("ADMIN_EMAIL") or "").lower().strip()
    password = os.environ.get("ADMIN_PASSWORD") or ""
    if not email or not password:
        return
    await _db.admins.update_one(
        {"email": email},
        {"$setOnInsert": {"id": str(uuid.uuid4()), "email": email, "password_hash": hash_password(password),
                          "name": "Store owner", "role": "admin", "active": True,
                          "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )


def make_token(admin: dict) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": admin["id"], "role": "admin", "iss": JWT_ISSUER, "iat": now,
                       "exp": now + timedelta(hours=TOKEN_HOURS)}, _secret(), algorithm=JWT_ALG)


async def admin_from_token(token: str) -> dict | None:
    try:
        claims = jwt.decode(token, _secret(), algorithms=[JWT_ALG], issuer=JWT_ISSUER,
                            options={"require": ["sub", "iss", "iat", "exp"]})
    except jwt.InvalidTokenError:
        return None
    if claims.get("role") != "admin":
        return None
    return await _db.admins.find_one({"id": claims["sub"], "active": True}, {"_id": 0, "password_hash": 0})


async def get_current_admin(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(401, "Not authenticated")
    admin = await admin_from_token(credentials.credentials)
    if not admin:
        raise HTTPException(401, "Session expired. Please sign in again.")
    return admin


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


@router.post("/login")
async def login(body: LoginIn, request: Request):
    email = str(body.email).lower().strip()
    now = datetime.now(timezone.utc)
    attempt = await _db.login_attempts.find_one({"_id": email})
    locked = attempt and attempt.get("locked_until")
    if locked and locked.replace(tzinfo=timezone.utc) > now:
        raise HTTPException(429, "Too many attempts. Try again in 15 minutes.")
    admin = await _db.admins.find_one({"email": email, "active": True})
    if not verify_password(body.password, admin["password_hash"] if admin else DUMMY_HASH):
        upd = await _db.login_attempts.find_one_and_update(
            {"_id": email}, {"$inc": {"failed": 1}, "$set": {"last_ip": request.client.host if request.client else None}},
            upsert=True, return_document=True)
        if upd.get("failed", 0) >= MAX_FAILURES:
            await _db.login_attempts.update_one({"_id": email}, {"$set": {"locked_until": now + timedelta(minutes=LOCK_MINUTES), "failed": 0}})
        raise HTTPException(401, "Invalid email or password")
    await _db.login_attempts.delete_one({"_id": email})
    return {"access_token": make_token(admin), "token_type": "bearer", "expires_in": TOKEN_HOURS * 3600,
            "admin": {"id": admin["id"], "email": admin["email"], "name": admin.get("name", "")}}


@router.get("/me")
async def me(admin: dict = Depends(get_current_admin)):
    return {"id": admin["id"], "email": admin["email"], "name": admin.get("name", "")}
