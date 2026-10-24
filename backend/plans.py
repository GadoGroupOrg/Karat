"""Plans: which AI tools each subscription tier includes and its monthly AI image allowance (set in the supplier console)."""
from datetime import datetime, timezone

AI_FEATURES = {"studio_photo": "AI studio photo", "angle_views": "Angle views", "sketch": "Sketch to render",
               "redesign": "Photo redesign", "try_on": "Virtual try-on"}
PLANS = ["trial", "starter", "pro", "enterprise", "founder"]

_db = None


def init(db):
    global _db
    _db = db


def month_start() -> str:
    return datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()


async def plan_settings() -> dict:
    """Every plan's AI tools + monthly limit (None = unlimited). Unset plans include everything, unlimited."""
    saved = {d["plan"]: d async for d in _db.raw.plan_settings.find({}, {"_id": 0})}
    return {p: {"ai": {k: bool(saved.get(p, {}).get("ai", {}).get(k, True)) for k in AI_FEATURES},
                "monthly_limit": saved.get(p, {}).get("monthly_limit")} for p in PLANS}


async def save_plan(plan: str, ai: dict, monthly_limit: int | None):
    await _db.raw.plan_settings.update_one({"plan": plan}, {"$set": {"plan": plan, "monthly_limit": monthly_limit,
                                           "ai": {k: bool(ai.get(k, True)) for k in AI_FEATURES}}}, upsert=True)


async def used_this_month(tenant_id: str) -> int:
    return await _db.raw.usage.count_documents({"tenant_id": tenant_id, "created_at": {"$gte": month_start()}})


async def policy(tenant: dict) -> dict:
    plan = tenant.get("plan") or "trial"
    s = (await plan_settings()).get(plan) or {"ai": {k: True for k in AI_FEATURES}, "monthly_limit": None}
    used = await used_this_month(tenant["id"])
    limit = s["monthly_limit"]
    return {"plan": plan, "allowed": s["ai"], "limit": limit, "used": used, "exhausted": limit is not None and used >= limit}
