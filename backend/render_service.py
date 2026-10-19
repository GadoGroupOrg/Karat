"""Photoreal jewelry renders with Gemini Nano Banana, stored in Emergent Object Storage."""
import base64
import logging
import os
import uuid

import httpx
import requests
from emergentintegrations.llm.chat import ImageContent, LlmChat, UserMessage

logger = logging.getLogger(__name__)

MODEL = "gemini-3.1-flash-image-preview"
APP_NAME = "atelier-jewelry"
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
_storage_key: str | None = None


def init_storage() -> str:
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ["EMERGENT_LLM_KEY"]}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    global _storage_key
    for attempt in range(2):
        key = init_storage()
        resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type},
                            data=data, timeout=120)
        if resp.status_code == 503 and attempt == 0:
            _storage_key = None
            continue
        resp.raise_for_status()
        return resp.json()
    raise RuntimeError("storage unavailable")


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "image/png")


def _opt(t: dict, group: str, options: dict) -> dict | None:
    g = next((x for x in t.get("option_groups", []) if x["id"] == group), None)
    if not g:
        return None
    oid = options.get(group, g["default"])
    return next((o for o in g["options"] if o["id"] == oid), None)


SETTING_DESC = {
    "solitaire-4": "a classic four-prong solitaire head with slim claw prongs holding the centre stone high",
    "solitaire-6": "a six-prong solitaire Tiffany-style head with six fine claw prongs",
    "cathedral": "a cathedral setting where graceful metal arches rise from the shoulders of the band to cradle the centre stone",
    "bezel": "a sleek bezel setting with a smooth polished metal rim fully encircling the centre stone",
    "halo": "a halo setting with a ring of tiny micro-pavé round diamonds tightly surrounding the centre stone",
    "three-stone": "a three-stone setting with the centre stone flanked by two smaller matching side stones, each in prongs",
}
BAND_DESC = {
    "classic": "a classic polished comfort-fit band about 2mm wide",
    "slim": "a delicate petite polished band about 1.6mm wide",
    "knife": "a knife-edge band with a crisp central ridge",
    "pave": "a pavé band with small round diamonds set along the top half of the shank",
    "wide": "a bold, substantial polished band about 3mm wide",
}


def build_prompt(catalog: dict, d: dict, has_snapshot: bool, product_refs: int) -> str:
    t = next(x for x in catalog["types"] if x["id"] == d["type"])
    metal = next(m for m in catalog["metals"] if m["id"] == d["metalId"])
    style = next(s for s in t["styles"] if s["id"] == d["styleId"])
    size = next((s for s in t["sizes"] if s["id"] == d["sizeId"]), None)
    options = d.get("options") or {}
    karat = _opt(t, "karat", options)
    addons = [a for a in catalog["addons"] if a["id"] in d.get("addonIds", [])]
    gold = f"{karat['name'] if karat else '14k'} {metal['name'].lower()}"
    engraving = (d.get("engraving") or "").strip()

    base = (
        "Ultra-photorealistic luxury fine-jewelry product photograph, shot on a 100mm macro lens, "
        "high-end catalogue style like Cartier or Tiffany. Soft warm cream seamless studio backdrop, "
        "gentle soft-box lighting with crisp specular highlights, a delicate soft contact shadow, shallow depth of field. "
    )
    if d["type"] == "ring":
        shape = _opt(t, "shape", options)
        carat = _opt(t, "carat", options)
        band = _opt(t, "band", options)
        stone = addons[0]["name"] if addons else "Natural Diamond"
        desc = (
            f"Subject: a single engagement ring in highly polished {gold}. "
            f"Centre stone: a {carat['name'] if carat else '1.00 ct'} {shape['name'] if shape else 'round brilliant'} cut {stone.lower()}, "
            "dimensional, with brilliant facets, sparkling fire and scintillation. "
            f"Setting: {SETTING_DESC.get(style['id'], style['name'])}. Band: {BAND_DESC.get(band['id'] if band else 'classic')}. "
            "The ring stands upright, viewed at a three-quarter angle slightly from above so the stone and setting are the focal point. "
        )
        if engraving:
            desc += f"Fine script engraving '{engraving}' visible on the inside of the band. "
    else:
        names = ", ".join(a["name"] for a in addons) or "no charms"
        desc = f"Subject: a {style['name'].lower()} {t['name'].lower()} in polished {gold}"
        if size:
            desc += f", size {size['label']}"
        desc += f". Details: {t['addon_label'].lower()}: {names}. "
        if engraving:
            desc += f"Engraving reads '{engraving}'. "
        desc += "Laid elegantly on the backdrop, every link and charm crisp and dimensional. "
    if has_snapshot:
        desc += "The first reference image is a 3D preview of the exact design: match its setting geometry, stone shape and proportions precisely, but make it photographic. "
    if product_refs:
        desc += f"The {'following' if has_snapshot else ''} {product_refs} product photo(s) show charms/pieces that must appear exactly as pictured. "
    return base + desc + "Only the jewelry, no hands, no text, no watermark, no props. Square composition."


async def _fetch_b64(url: str) -> str | None:
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as c:
            r = await c.get(url, params={"width": 768})
            if r.status_code == 200:
                return base64.b64encode(r.content).decode()
    except Exception:
        logger.warning("could not fetch reference image")
    return None


async def generate_render(catalog: dict, design: dict, snapshot: bytes | None) -> tuple[bytes, str]:
    refs: list[ImageContent] = []
    if snapshot:
        refs.append(ImageContent(base64.b64encode(snapshot).decode()))
    product_imgs = [a.get("image") for a in catalog["addons"] if a["id"] in design.get("addonIds", []) and a.get("source") == "shopify"]
    n_products = 0
    for url in [u for u in product_imgs if u][:3]:
        b64 = await _fetch_b64(url)
        if b64:
            refs.append(ImageContent(b64))
            n_products += 1
    prompt = build_prompt(catalog, design, bool(snapshot), n_products)
    chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=f"render-{uuid.uuid4()}",
                   system_message="You are a world-class jewelry product photographer and retoucher.")
    chat.with_model("gemini", MODEL).with_params(modalities=["image", "text"])
    _, images = await chat.send_message_multimodal_response(UserMessage(text=prompt, file_contents=refs or None))
    if not images:
        raise RuntimeError("The renderer returned no image")
    return base64.b64decode(images[0]["data"]), images[0].get("mime_type") or "image/png"


def storage_path() -> str:
    return f"{APP_NAME}/renders/{uuid.uuid4()}.png"
