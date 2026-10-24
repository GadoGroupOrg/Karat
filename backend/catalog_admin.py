"""Merchant catalog control: which builders/options are offered, and which image each slot shows."""
import copy
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from pydantic import BaseModel, Field

import plans
import render_service
import tenancy
from auth import get_current_admin

# Curated stock library (Unsplash licence: free for commercial use).
_U = "https://images.unsplash.com/photo-{}?crop=entropy&cs=srgb&fm=jpg&q=80&w=1000"
STOCK = [
    {"id": "hero-hands", "label": "Gold rings on hands", "tags": ["home", "ring"], "url": _U.format("1549439602-43ebca2327af")},
    {"id": "ring-solitaire", "label": "Solitaire engagement ring", "tags": ["ring", "band", "setting"], "url": _U.format("1626122780071-c09d403b8e32")},
    {"id": "necklace-fine", "label": "Fine gold necklace", "tags": ["necklace"], "url": _U.format("1680690653166-1618c3bcdf51")},
    {"id": "bracelet-stack", "label": "Gold bracelet stack", "tags": ["bracelet"], "url": _U.format("1633810543462-77c4a3b13f07")},
    {"id": "earrings-gold", "label": "Gold earrings", "tags": ["earrings"], "url": _U.format("1671644730555-916aa8d8157f")},
]
DEFAULT_STOREFRONT = {
    "home:hero": STOCK[0]["url"], "type:ring": STOCK[1]["url"], "type:band": STOCK[1]["url"],
    "type:fashion-ring": STOCK[0]["url"], "type:pendant": STOCK[2]["url"], "type:tennis": STOCK[3]["url"],
    "type:necklace": STOCK[2]["url"], "type:bracelet": STOCK[3]["url"], "type:earrings": STOCK[4]["url"],
}
# Option groups the merchant can switch on/off, with where their options live in the catalog.
TOGGLE_GROUPS = [
    ("setting", "Engagement ring settings", "ring", "styles"),
    ("shape", "Stone shapes", "ring", "shape"),
    ("band", "Engagement ring bands", "ring", "band"),
    ("centre_stone", "Centre & feature stones", "ring", "addons"),
    ("accent_stone", "Halo, pavé & accent stones", "ring", "accent_stone"),
    ("band_style", "Wedding band styles", "band", "styles"),
]
# Image slot group key used for each option list (matches AI option-image keys).
IMAGE_GROUPS = {"setting", "shape", "band", "band_style"}
BRIDAL = ("ring", "band")


def style_key(type_id: str) -> str:
    return {"ring": "setting", "band": "band_style"}.get(type_id, f"style.{type_id}")


def toggle_groups(full: dict) -> list:
    """Bridal groups + one style group per other builder (built-in and custom styles)."""
    extra = [(style_key(t["id"]), f"{t['name']} styles", t["id"], "styles") for t in full["types"] if t["id"] not in BRIDAL]
    return TOGGLE_GROUPS + extra


def has_images(key: str) -> bool:
    return key in IMAGE_GROUPS or key.startswith("style.")

_db = None
_get_catalog = None
public = APIRouter(prefix="/api")
dash = APIRouter(prefix="/api/dashboard", dependencies=[Depends(get_current_admin)])


def init(db, get_catalog):
    global _db, _get_catalog
    _db, _get_catalog = db, get_catalog


async def require_feature(key: str):
    """Server-side guard so a store's switched-off tool can't be used via direct links or API calls."""
    cfg = await load_config()
    if not cfg["features"].get(key, True):
        ai = cfg["ai"] if key in plans.AI_FEATURES else None
        if ai and ai["exhausted"] and ai["allowed"].get(key):
            raise HTTPException(403, "This store has used this month's AI allowance")
        raise HTTPException(403, "This feature is turned off for this store")


FEATURES = {  # builder features each store can switch on/off (all on by default)
    "prices": "Price estimates", "three_d": "Live 3D view", "studio_photo": "AI studio photo", "angle_views": "Angle views",
    "sketch": "Sketch on design", "redesign": "Redesign a customer photo", "hidden_halo": "Hidden halo add-on",
    "two_tone": "Two-tone head metal", "stacking": "Stacking bands", "inscription": "Engraving & inscription preview",
    "notes": "Notes for your jeweller", "try_on": "Virtual try-on",
    "protect_designs": "Design protection",
}


async def load_config() -> dict:
    doc = await _db.catalog_config.find_one({"key": "default"}, {"_id": 0}) or {}
    own = {k: bool(doc.get("features", {}).get(k, True)) for k in FEATURES}
    ai = await plans.policy(tenancy.current())
    # Effective switch = jeweller's choice AND included in their plan AND monthly AI allowance not used up.
    feats = {k: own[k] and (k not in plans.AI_FEATURES or (ai["allowed"][k] and not ai["exhausted"])) for k in FEATURES}
    return {"disabled_types": doc.get("disabled_types", []), "disabled": doc.get("disabled", {}), "features": feats,
            "own_features": own, "ai": ai}


def _lock(k: str, ai: dict) -> Optional[str]:
    if k not in plans.AI_FEATURES:
        return None
    return "plan" if not ai["allowed"][k] else "limit" if ai["exhausted"] else None


async def load_slots() -> Dict[str, dict]:
    return {d["key"]: d async for d in _db.image_slots.find({}, {"_id": 0})}


def slot_url(slot: dict) -> Optional[str]:
    if slot.get("source") == "brand":
        return f"/api/slot-images/{slot['key']}?v={slot['updated_at'][:19]}&{tenancy.store_qs()}"
    if slot.get("source") == "stock":
        return slot.get("url")
    return None


def apply_slots(catalog: dict, slots: Dict[str, dict]):
    """Brand / stock overrides win over the AI studio images attached by get_catalog."""
    for t in catalog["types"]:
        if t["id"] == "ring":
            pairs = [("setting", t["styles"])] + [(g["id"], g["options"]) for g in t["option_groups"]]
        else:
            pairs = [(style_key(t["id"]), t["styles"])]
        for group, opts in pairs:
            for o in opts:
                s = slots.get(f"{group}:{o['id']}")
                if s and slot_url(s):
                    o["image"] = slot_url(s)


def apply_config(catalog: dict, cfg: dict) -> dict:
    """Remove builders/options the merchant switched off (public catalog only; pricing keeps everything)."""
    c = copy.deepcopy(catalog)
    off = {k: set(v) for k, v in cfg["disabled"].items()}
    c["types"] = [t for t in c["types"] if t["id"] not in cfg["disabled_types"]]

    def keep(group: str, opts: list) -> list:
        kept = [o for o in opts if o["id"] not in off.get(group, set())]
        return kept or opts[:1]  # never leave a picker empty

    for t in c["types"]:
        if t["id"] == "ring":
            t["styles"] = keep("setting", t["styles"])
            for g in t["option_groups"]:
                key = {"shape": "shape", "second_shape": "shape", "band": "band", "accent_stone": "accent_stone",
                       "second_stone": "centre_stone", "side_left": "centre_stone", "side_right": "centre_stone"}.get(g["id"])
                if key:
                    g["options"] = keep(key, g["options"])
                    if not any(o["id"] == g["default"] for o in g["options"]):
                        g["default"] = g["options"][0]["id"]
        elif t["id"] == "band":
            t["styles"] = keep("band_style", t["styles"])
            for g in t["option_groups"]:
                if g["id"] == "accent_stone":
                    g["options"] = keep("accent_stone", g["options"])
                    if not any(o["id"] == g["default"] for o in g["options"]):
                        g["default"] = g["options"][0]["id"]
        else:
            t["styles"] = keep(style_key(t["id"]), t["styles"])
    centre_off = off.get("centre_stone", set())
    ring_stones = [a for a in c["addons"] if a["id"].startswith("ring-")]
    if any(a["id"].removeprefix("ring-") not in centre_off for a in ring_stones):
        c["addons"] = [a for a in c["addons"] if not (a["id"].startswith("ring-") and a["id"].removeprefix("ring-") in centre_off)]
    return c


async def storefront_images() -> dict:
    slots = await load_slots()
    out = {}
    for k, default in DEFAULT_STOREFRONT.items():
        out[k] = slot_url(slots[k]) if k in slots and slot_url(slots[k]) else default
    return out


@public.get("/storefront")
async def storefront():
    cfg = await load_config()
    return {"images": await storefront_images(), "disabled_types": cfg["disabled_types"], "features": cfg["features"]}


@public.get("/slot-images/{key}")
async def slot_image(key: str):
    doc = await _db.image_slots.find_one({"key": key, "source": "brand"})
    if not doc:
        raise HTTPException(404, "Image not found")
    data, ctype = await run_in_threadpool(render_service.get_object, doc["storage_path"])
    return Response(content=data, media_type=ctype, headers={"Cache-Control": "public, max-age=31536000, immutable"})


def _options(full: dict, type_id: str, where: str) -> list:
    t = next((x for x in full["types"] if x["id"] == type_id), None)
    if not t:
        return []
    if where == "styles":
        return t["styles"]
    if where == "addons":
        return [{"id": a["id"].removeprefix("ring-"), "name": a["name"], "color": a.get("color")}
                for a in full["addons"] if a["id"].startswith("ring-")]
    g = next((x for x in t["option_groups"] if x["id"] == where), None)
    return g["options"] if g else []


@dash.get("/catalog")
async def admin_catalog():
    full = await _get_catalog()
    cfg, slots = await load_config(), await load_slots()
    apply_slots(full, slots)
    off = cfg["disabled"]
    groups = []
    for key, label, type_id, where in toggle_groups(full):
        opts = []
        img = has_images(key)
        for o in _options(full, type_id, where):
            slot = slots.get(f"{key}:{o['id']}") if img else None
            opts.append({"id": o["id"], "name": o["name"], "color": o.get("color"), "custom": o.get("custom", False),
                         "enabled": o["id"] not in off.get(key, []),
                         "image": o.get("image") if img else None,
                         "image_source": (slot or {}).get("source", "ai" if o.get("image") else "none") if img else None})
        groups.append({"key": key, "label": label, "type": type_id, "has_images": img, "can_add": where == "styles", "options": opts})
    types = [{"id": t["id"], "name": t["name"], "group": t.get("group"), "enabled": t["id"] not in cfg["disabled_types"]}
             for t in full["types"]]
    sf = await storefront_images()
    labels = {"home:hero": "Home hero"} | {f"type:{t['id']}": f"{t['name']} tile" for t in full["types"]}
    storefront_slots = [{"key": k, "label": labels.get(k, k), "image": v,
                         "image_source": slots.get(k, {}).get("source", "default")} for k, v in sf.items()]
    return {"types": types, "groups": groups, "storefront": storefront_slots, "stock": STOCK,
            "features": [{"id": k, "label": v, "enabled": cfg["own_features"][k], "locked": _lock(k, cfg["ai"])} for k, v in FEATURES.items()],
            "ai": cfg["ai"]}


class FeaturesIn(BaseModel):
    features: Dict[str, bool]


@dash.put("/catalog/features")
async def save_features(body: FeaturesIn):
    feats = {k: v for k, v in body.features.items() if k in FEATURES}
    await _db.catalog_config.update_one({"key": "default"}, {"$set": {**{f"features.{k}": v for k, v in feats.items()},
                                                                       "updated_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    return {"features": (await load_config())["features"]}


class TogglesIn(BaseModel):
    disabled_types: List[str] = []
    disabled: Dict[str, List[str]] = {}


@dash.put("/catalog/toggles")
async def save_toggles(body: TogglesIn):
    full = await _get_catalog()
    type_ids = {t["id"] for t in full["types"]}
    if not set(body.disabled_types) <= type_ids:
        raise HTTPException(400, "Unknown builder")
    if len(set(body.disabled_types)) >= len(type_ids):
        raise HTTPException(400, "Keep at least one builder switched on")
    valid = {k for k, *_ in toggle_groups(full)}
    if not set(body.disabled) <= valid:
        raise HTTPException(400, "Unknown option group")
    await _db.catalog_config.update_one({"key": "default"}, {"$set": {"disabled_types": body.disabled_types,
                                         "disabled": body.disabled, "updated_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    return {"ok": True}


def _valid_slot(key: str) -> str:
    group = key.split(":", 1)[0]
    if key not in DEFAULT_STOREFRONT and not has_images(group):
        raise HTTPException(400, "Unknown image slot")
    return key


class SlotIn(BaseModel):
    source: Literal["stock", "default"]
    url: Optional[str] = Field(default=None, max_length=500)


@dash.put("/images/{key}")
async def set_slot(key: str, body: SlotIn):
    key = _valid_slot(key)
    if body.source == "default":
        await _db.image_slots.delete_one({"key": key})
        return {"ok": True}
    if not any(s["url"] == body.url for s in STOCK):
        raise HTTPException(400, "Pick a photo from the stock library")
    await _db.image_slots.update_one({"key": key}, {"$set": {"key": key, "source": "stock", "url": body.url,
                                      "updated_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    return {"ok": True}


@dash.post("/images/{key}")
async def upload_slot(key: str, image: UploadFile = File(...)):
    key = _valid_slot(key)
    data = await image.read()
    ctype = image.content_type or ""
    if not ctype.startswith("image/"):
        raise HTTPException(400, "Please upload an image")
    if not data or len(data) > 10_000_000:
        raise HTTPException(400, "Image must be under 10 MB")
    path = f"{render_service.APP_NAME}/brand-images/{key.replace(':', '-')}-{uuid.uuid4()}"
    await run_in_threadpool(render_service.put_object, path, data, ctype)
    await _db.image_slots.update_one({"key": key}, {"$set": {"key": key, "source": "brand", "storage_path": path,
                                      "updated_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    return {"ok": True}


class CustomStyleIn(BaseModel):
    type: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=60)
    description: str = Field(default="", max_length=200)
    price: float = Field(ge=0, le=100000)


@dash.post("/custom-styles")
async def add_custom_style(body: CustomStyleIn):
    full = await _get_catalog()
    if body.type not in {t["id"] for t in full["types"]}:
        raise HTTPException(400, "Unknown builder")
    if body.type in BRIDAL:
        raise HTTPException(400, "Bridal settings are managed in the price sheet")
    sid = f"custom-{uuid.uuid4().hex[:8]}"
    await _db.custom_styles.insert_one({"id": sid, "type": body.type, "name": body.name.strip(), "description": body.description.strip(),
                                        "price": round(body.price), "created_at": datetime.now(timezone.utc).isoformat()})
    return {"id": sid, "key": f"{style_key(body.type)}:{sid}"}


@dash.delete("/custom-styles/{sid}")
async def delete_custom_style(sid: str):
    res = await _db.custom_styles.delete_one({"id": sid})
    if not res.deleted_count:
        raise HTTPException(404, "Style not found")
    return {"ok": True}
