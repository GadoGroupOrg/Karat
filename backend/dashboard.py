"""Desktop admin: lead inbox + white-label branding + embeddable widget script."""
import re
import uuid
from datetime import datetime, timezone
from typing import Dict, Literal, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from pydantic import BaseModel, Field

import render_service
import tenancy
from auth import get_current_admin

STATUSES = ["new", "contacted", "quoted", "won", "lost"]
HEX = r"^#[0-9A-Fa-f]{6}$"
DISPLAY_FONTS = ["playfair", "cormorant", "dmserif", "bodoni"]
TEXT_FONTS = ["satoshi", "inter", "jost", "montserrat"]
DEFAULT_BRANDING = {
    "store_name": "Atelier", "tagline": "Fine jewelry, made yours", "logo_path": None,
    "colors": {"brand": "#C5A059", "ink": "#1A1A18", "surface": "#FCFCFA"},
    "display_font": "playfair", "text_font": "satoshi", "updated_at": None,
}

_db = None
public = APIRouter(prefix="/api")
dash = APIRouter(prefix="/api/dashboard", dependencies=[Depends(get_current_admin)])


def init(db):
    global _db
    _db = db


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def lead_out(d: dict) -> dict:
    lid = str(d.pop("_id"))
    d = {**d, "id": lid}
    d.setdefault("status", "new")
    d.setdefault("notes", [])
    d.setdefault("kind", "design" if d.get("design") else "product")
    return d


def _oid(lid: str) -> ObjectId:
    if not ObjectId.is_valid(lid):
        raise HTTPException(404, "Lead not found")
    return ObjectId(lid)


# ---------- Leads ----------
@dash.get("/leads")
async def list_leads(status: str = "", q: str = "", tag: str = "", assignee: str = ""):
    filt: dict = {}
    if status == "new":
        filt = {"$or": [{"status": "new"}, {"status": {"$exists": False}}]}
    elif status in STATUSES:
        filt = {"status": status}
    if tag:
        filt = {"$and": [filt, {"tags": tag}]}
    if assignee:
        filt = {"$and": [filt, {"assignee_id": None if assignee == "none" else assignee}]}
    if q.strip():
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        filt = {"$and": [filt, {"$or": [{"name": rx}, {"email": rx}, {"phone": rx}, {"design.name": rx}, {"product.title": rx}]}]}
    items = [lead_out(d) async for d in _db.quotes.find(filt).sort("created_at", -1).limit(500)]
    counts = {s: 0 for s in STATUSES}
    async for row in _db.quotes.aggregate([{"$group": {"_id": {"$ifNull": ["$status", "new"]}, "n": {"$sum": 1}}}]):
        counts[row["_id"]] = row["n"]
    pipeline_value = 0
    async for row in _db.quotes.aggregate([{"$match": {"status": {"$nin": ["lost", "won"]}}}, {"$group": {"_id": None, "v": {"$sum": "$price"}}}]):
        pipeline_value = row["v"]
    tags = sorted(t for t in await _db.quotes.distinct("tags") if t)
    return {"leads": items, "counts": counts, "total": sum(counts.values()), "open_value": pipeline_value, "tags": tags}


class LeadBulk(BaseModel):
    ids: list[str] = Field(min_length=1, max_length=500)
    action: Literal["status", "delete", "assign", "tag", "untag"]
    status: Optional[Literal["new", "contacted", "quoted", "won", "lost"]] = None
    assignee_id: Optional[str] = None  # None = unassign
    tag: Optional[str] = Field(default=None, min_length=1, max_length=40)


@dash.post("/leads/bulk")
async def bulk_leads(body: LeadBulk, admin: dict = Depends(get_current_admin)):
    filt = {"_id": {"$in": [ObjectId(i) for i in body.ids if ObjectId.is_valid(i)]}}
    note = lambda text: {"id": str(uuid.uuid4()), "text": text, "system": True, "author": admin["email"], "created_at": now()}  # noqa: E731
    if body.action == "delete":
        r = await _db.quotes.delete_many(filt)
        return {"ok": True, "count": r.deleted_count}
    if body.action == "status":
        if not body.status:
            raise HTTPException(400, "Choose a status")
        upd = {"$set": {"status": body.status, "updated_at": now()}, "$push": {"notes": note(f"Status changed to {body.status.title()}")}}
    elif body.action == "assign":
        who = None
        if body.assignee_id:
            who = await _db.admins.find_one({"id": body.assignee_id, "tenant_id": admin["tenant_id"], "active": True})
            if not who:
                raise HTTPException(404, "Team member not found")
        text = f"Assigned to {who.get('name') or who['email']}" if who else "Unassigned"
        upd = {"$set": {"assignee_id": body.assignee_id or None, "updated_at": now()}, "$push": {"notes": note(text)}}
    else:
        tag = (body.tag or "").strip()
        if not tag:
            raise HTTPException(400, "Enter a tag")
        upd = {"$addToSet": {"tags": tag}} if body.action == "tag" else {"$pull": {"tags": tag}}
        upd["$set"] = {"updated_at": now()}
    r = await _db.quotes.update_many(filt, upd)
    return {"ok": True, "count": r.modified_count}


@dash.get("/leads/{lid}")
async def get_lead(lid: str):
    d = await _db.quotes.find_one({"_id": _oid(lid)})
    if not d:
        raise HTTPException(404, "Lead not found")
    return lead_out(d)


class LeadPatch(BaseModel):
    status: Literal["new", "contacted", "quoted", "won", "lost"]


@dash.patch("/leads/{lid}")
async def update_lead(lid: str, body: LeadPatch, admin: dict = Depends(get_current_admin)):
    d = await _db.quotes.find_one_and_update(
        {"_id": _oid(lid)},
        {"$set": {"status": body.status, "updated_at": now()},
         "$push": {"notes": {"id": str(uuid.uuid4()), "text": f"Status changed to {body.status.title()}", "system": True,
                             "author": admin["email"], "created_at": now()}}},
        return_document=True)
    if not d:
        raise HTTPException(404, "Lead not found")
    return lead_out(d)


BRIEF_KEYS = (
    "ring_size", "finger_notes", "metal_spec", "due_date", "budget",
    # centre stone (GIA 4Cs + report)
    "cs_type", "cs_shape", "center_stone_mm", "carat", "cs_color", "cs_clarity", "cs_cut", "cs_lab", "cs_report", "cs_origin",
    # head: prongs, halo, hidden halo, gallery, gallery rail, bridge, cathedral
    "prong_count", "prong_style", "halo_spec", "hidden_halo_spec", "gallery_style", "gallery_rail", "bridge", "cathedral",
    "setting_height_mm",
    # shoulders, accents, shank, sizing area
    "shoulder_style", "accent_spec", "accent_setting", "shank_style", "band_width_mm", "band_thickness_mm", "profile_fit",
    "sizing_area", "finish", "engraving", "crafting_notes")


class BriefIn(BaseModel):
    brief: Dict[str, str]


@dash.put("/leads/{lid}/brief")
async def update_brief(lid: str, body: BriefIn, admin: dict = Depends(get_current_admin)):
    """Workshop brief: sizing specs and anything important for crafting the piece."""
    brief = {k: v.strip()[:1000] for k, v in body.brief.items() if k in BRIEF_KEYS and v.strip()}
    d = await _db.quotes.find_one_and_update(
        {"_id": _oid(lid)},
        {"$set": {"brief": brief, "brief_updated_at": now(), "brief_updated_by": admin["email"], "updated_at": now()},
         "$push": {"notes": {"id": str(uuid.uuid4()), "text": "Crafting brief updated", "system": True,
                             "author": admin["email"], "created_at": now()}}},
        return_document=True)
    if not d:
        raise HTTPException(404, "Lead not found")
    return lead_out(d)


class NoteIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


@dash.post("/leads/{lid}/notes")
async def add_note(lid: str, body: NoteIn, admin: dict = Depends(get_current_admin)):
    note = {"id": str(uuid.uuid4()), "text": body.text.strip(), "system": False, "author": admin["email"], "created_at": now()}
    d = await _db.quotes.find_one_and_update({"_id": _oid(lid)}, {"$push": {"notes": note}, "$set": {"updated_at": now()}},
                                             return_document=True)
    if not d:
        raise HTTPException(404, "Lead not found")
    return lead_out(d)


# ---------- Branding ----------
async def get_branding() -> dict:
    doc = await _db.branding.find_one({"key": "default"}, {"_id": 0, "key": 0}) or {}
    b = {**DEFAULT_BRANDING, **doc, "colors": {**DEFAULT_BRANDING["colors"], **(doc.get("colors") or {})}}
    b["logo_url"] = f"/api/branding/logo?v={(b.get('updated_at') or '')[:19]}&{tenancy.store_qs()}" if b.get("logo_path") else None
    b.pop("logo_path", None)
    return b


@public.get("/branding")
async def branding():
    return await get_branding()


@public.get("/branding/logo")
async def branding_logo():
    doc = await _db.branding.find_one({"key": "default"})
    if not doc or not doc.get("logo_path"):
        raise HTTPException(404, "No logo")
    data, ctype = await run_in_threadpool(render_service.get_object, doc["logo_path"])
    return Response(content=data, media_type=ctype, headers={"Cache-Control": "public, max-age=86400"})


class Colors(BaseModel):
    brand: str = Field(pattern=HEX)
    ink: str = Field(pattern=HEX)
    surface: str = Field(pattern=HEX)


class BrandingIn(BaseModel):
    store_name: str = Field(min_length=1, max_length=60)
    tagline: str = Field(default="", max_length=120)
    colors: Colors
    display_font: Literal["playfair", "cormorant", "dmserif", "bodoni"]
    text_font: Literal["satoshi", "inter", "jost", "montserrat"]


@dash.put("/branding")
async def save_branding(body: BrandingIn):
    await _db.branding.update_one({"key": "default"}, {"$set": {**body.model_dump(), "updated_at": now()}}, upsert=True)
    return await get_branding()


@dash.post("/branding/logo")
async def upload_logo(logo: UploadFile = File(...)):
    data = await logo.read()
    ctype = logo.content_type or ""
    if not ctype.startswith("image/"):
        raise HTTPException(400, "Please upload an image (PNG, JPG, SVG or WebP)")
    if not data or len(data) > 5_000_000:
        raise HTTPException(400, "Logo must be under 5 MB")
    ext = {"image/png": "png", "image/jpeg": "jpg", "image/svg+xml": "svg", "image/webp": "webp"}.get(ctype, "img")
    path = f"{render_service.APP_NAME}/branding/logo-{uuid.uuid4()}.{ext}"
    await run_in_threadpool(render_service.put_object, path, data, ctype)
    await _db.branding.update_one({"key": "default"}, {"$set": {"logo_path": path, "updated_at": now()}}, upsert=True)
    return await get_branding()


@dash.delete("/branding/logo")
async def remove_logo():
    await _db.branding.update_one({"key": "default"}, {"$set": {"logo_path": None, "updated_at": now()}}, upsert=True)
    return await get_branding()


# ---------- Embeddable widget ----------
EMBED_JS = r"""(function(){
  var s=document.currentScript; if(!s) return;
  var origin=new URL(s.src).origin, mode=s.getAttribute('data-mode')||'popup', page=s.getAttribute('data-page')||'build';
  var label=s.getAttribute('data-label')||'Design your own', color=s.getAttribute('data-color')||'%BRAND%';
  var paths={build:'/build',shop:'/shop',home:'/'}; var store=s.getAttribute('data-store')||'%STORE%';
  var src=origin+(paths[page]||'/build')+'?embed=1&store='+encodeURIComponent(store);
  function frame(h){var f=document.createElement('iframe');f.src=src;f.title=label;f.allow='camera; clipboard-write; web-share';
    f.style.cssText='border:0;width:100%;height:'+h+';display:block;background:#fff;border-radius:12px';return f;}
  if(mode==='inline'){var t=document.querySelector(s.getAttribute('data-target')||'#atelier-builder');
    var h=s.getAttribute('data-height')||'820px'; (t||s.parentNode).insertBefore(frame(h), t?null:s); return;}
  var b=document.createElement('button');b.type='button';b.textContent=label;
  b.style.cssText='position:fixed;right:24px;bottom:24px;z-index:2147483000;padding:14px 22px;border:0;border-radius:999px;cursor:pointer;font:600 15px system-ui,sans-serif;color:#fff;background:'+color+';box-shadow:0 8px 24px rgba(0,0,0,.18)';
  var ov=null; b.onclick=function(){ if(ov){ov.style.display='flex';return;}
    ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;z-index:2147483001;background:rgba(20,20,18,.55);display:flex;align-items:center;justify-content:center';
    var box=document.createElement('div');box.style.cssText='position:relative;width:min(440px,100vw);height:min(900px,100vh);background:#fff;border-radius:16px;overflow:hidden';
    var x=document.createElement('button');x.type='button';x.setAttribute('aria-label','Close');x.innerHTML='&times;';
    x.style.cssText='position:absolute;top:8px;right:8px;z-index:2;width:36px;height:36px;border:0;border-radius:50%;background:rgba(255,255,255,.9);font-size:22px;cursor:pointer';
    x.onclick=function(){ov.style.display='none';}; ov.onclick=function(e){if(e.target===ov)ov.style.display='none';};
    var f=frame('100%');f.style.borderRadius='0';box.appendChild(f);box.appendChild(x);ov.appendChild(box);document.body.appendChild(ov);};
  (document.body||document.documentElement).appendChild(b);
})();"""


@public.get("/embed.js")
async def embed_js():
    b = await get_branding()
    return Response(content=EMBED_JS.replace("%BRAND%", b["colors"]["ink"]).replace("%STORE%", tenancy.current()["slug"]), media_type="application/javascript",
                    headers={"Cache-Control": "public, max-age=300"})
