"""Merchant price sheet: supplier costs + markups -> live retail quotes. Costs never leave the admin API."""
import csv
import io
import math
from datetime import datetime, timezone

import httpx

from catalog_data import (ACCENT_SHAPES, BAND_WIDTHS, MULTI_STONE_STYLES, RING_BANDS, RING_SETTINGS, RING_SHAPES,
                          SIDE_STONE_RATIO, STONES, WEDDING_STYLES)

TROY_OZ_G = 31.1035
BRACKETS = [0.5, 0.75, 1.0, 1.5, 2.0, 3.0]
BRACKET_LABELS = ["0.50–0.74", "0.75–0.99", "1.00–1.49", "1.50–1.99", "2.00–2.99", "3.00+"]
_BRACKET_CURVE = [0.7, 0.85, 1.0, 1.2, 1.45, 1.8]  # per-carat premium vs 1 ct (seed only)
# Accent (melee) cost vs white natural diamond melee, per stone type.
ACCENT_STONE_FACTOR = {"earth-diamond": 1.0, "lab-diamond": 0.3, "colombian-emerald": 1.1, "ruby": 1.0, "sapphire": 0.7,
                       "natural-zircon": 0.25, "tanzanite": 0.35, "aquamarine": 0.3, "morganite": 0.25}
FINISH_LABOR = {"polished": 0, "brushed": 30, "hammered": 60}
FANCY_SHAPE_LABOR = {"pear": 60, "marquise": 60, "heart": 90, "moval": 50, "old-mine": 70, "asscher": 40, "radiant": 30}


def ring_size_factor(size: float) -> float:
    """Gold scales with finger circumference. US size → inner diameter ≈ 11.63 + 0.8128 × size (mm); size 6 = 1.0."""
    return (11.63 + 0.8128 * size) / (11.63 + 0.8128 * 6)


def head_factor(carat: float) -> float:
    """Heads, prongs and halos grow with the stone's diameter (∝ ∛carat ≈ √ for this range)."""
    return 0.6 + 0.4 * math.sqrt(max(0.25, carat))


def default_sheet() -> dict:
    return {
        "key": "default",
        "gold": {"mode": "live", "manual_cost_per_gram": 96.0, "casting_loss_pct": 10.0,
                 "live_spot_usd_oz": None, "live_updated_at": None, "purity": 0.75},
        "markups": {"centre_stone": 60.0, "accent": 70.0, "gold": 30.0, "labor": 80.0},
        "min_margin_pct": 35.0,
        "accent_cost_per_ct": 700.0,
        "grades": {"good": 0.75, "fine": 1.0, "exceptional": 1.5},
        "stones": {i: [round(p / 1.6 * c) for c in _BRACKET_CURVE] for i, _, _, p in STONES},
        "labor": {
            "setting": {s["id"]: round(s["price"] / 1.5) for s in RING_SETTINGS},
            "band": {b["id"]: round(b["price"] / 1.5) for b in RING_BANDS},
            "shape": {i: FANCY_SHAPE_LABOR.get(i, 0) for i, _, _ in RING_SHAPES},
            "wedding_band": {w["id"]: round(w["price"] / 1.5) for w in WEDDING_STYLES},
            "finish": dict(FINISH_LABOR),
            "engraving": 25.0,
            "base": 90.0,  # casting, polishing, QC
        },
        "grams": {  # 18k net weight; settings at 1.00 ct, bands at size 6
            "setting": {s["id"]: s["grams"] for s in RING_SETTINGS},
            "band": {b["id"]: b["grams"] for b in RING_BANDS},
        },
        "accent_ct": {
            "setting": {s["id"]: s["accent_ct"] for s in RING_SETTINGS},
            "band": {b["id"]: b["accent_ct"] for b in RING_BANDS},
            "wedding_band": {w["id"]: w["accent_ct"] for w in WEDDING_STYLES},
        },
        "accent_shape_factor": {i: f for i, _, f, _ in ACCENT_SHAPES},
        "accent_stone_factor": dict(ACCENT_STONE_FACTOR),
        "wedding_band_grams_per_mm": 1.7,  # 18k comfort-fit, size 6
    }


def merge_defaults(sheet: dict | None) -> dict:
    """Fill keys missing from a stored sheet (e.g. new stones/settings) with defaults."""
    base = default_sheet()
    if not sheet:
        return base

    def deep(a, b):
        for k, v in b.items():
            if isinstance(v, dict) and isinstance(a.get(k), dict):
                deep(a[k], v)
            elif k not in a or a[k] is None and v is not None and k not in ("live_spot_usd_oz", "live_updated_at"):
                a[k] = v
        return a

    return deep(dict(sheet), base)


def gold_cost_per_gram(sheet: dict) -> float:
    g = sheet["gold"]
    if g["mode"] == "live" and g.get("live_spot_usd_oz"):
        return g["live_spot_usd_oz"] / TROY_OZ_G * g.get("purity", 0.75)
    return float(g["manual_cost_per_gram"])


async def fetch_spot() -> float:
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get("https://api.gold-api.com/price/XAU")
        r.raise_for_status()
        return float(r.json()["price"])


async def refresh_gold(db) -> dict:
    spot = await fetch_spot()
    now = datetime.now(timezone.utc).isoformat()
    # spot price is market-wide: refresh every business's sheet
    await getattr(db, "raw", db).price_sheet.update_many({"key": "default"}, {"$set": {"gold.live_spot_usd_oz": spot, "gold.live_updated_at": now}})
    return {"spot": spot, "updated_at": now}


def bracket_index(carat: float) -> int:
    idx = 0
    for i, b in enumerate(BRACKETS):
        if carat + 1e-9 >= b:
            idx = i
    return idx


def ring_quote(sheet: dict, catalog: dict, d, t: dict, style: dict, size: dict, addons: list) -> dict:
    opt = lambda g: d.options.get(g) or next(x["default"] for x in t["option_groups"] if x["id"] == g)  # noqa: E731
    carat, shape, band = float(opt("carat")), opt("shape"), opt("band")
    accent_shape, grade = opt("accent_shape"), opt("quality")
    m = sheet["markups"]
    hf, sf = head_factor(carat), ring_size_factor(float(size["id"]))

    net_g = sheet["grams"]["setting"].get(style["id"], 0.8) * hf + sheet["grams"]["band"].get(band, 3.4) * sf
    gross_g = net_g * (1 + sheet["gold"]["casting_loss_pct"] / 100)
    gold_cost = gross_g * gold_cost_per_gram(sheet)

    lab = sheet["labor"]
    labor_cost = lab["base"] + lab["setting"].get(style["id"], 0) + lab["band"].get(band, 0) + lab["shape"].get(shape, 0)
    engraving = bool(d.engraving.strip())
    engr_cost = lab["engraving"] if engraving else 0

    setting_ct = 0 if style["id"] in MULTI_STONE_STYLES else sheet["accent_ct"]["setting"].get(style["id"], 0)
    accent_ct = setting_ct * hf + sheet["accent_ct"]["band"].get(band, 0) * sf
    accent_stone = opt("accent_stone")
    accent_cost = (accent_ct * sheet["accent_cost_per_ct"] * sheet["accent_shape_factor"].get(accent_shape, 1)
                   * sheet["accent_stone_factor"].get(accent_stone, 1))

    stone = addons[0] if addons else None
    sid = stone["id"].removeprefix("ring-") if stone else None
    per_ct = sheet["stones"].get(sid, [0] * 6)[bracket_index(carat)] if sid else 0
    centre_cost = carat * per_ct * sheet["grades"].get(grade, 1.0)

    lines = [
        {"label": f"18k gold · {net_g:.1f} g", "cost": gold_cost, "markup": m["gold"]},
        {"label": "Setting & craftsmanship", "cost": labor_cost, "markup": m["labor"]},
    ]
    if accent_ct > 0:
        lines.append({"label": f"Accent {stone_name(accent_stone).lower()} · {accent_ct:.2f} ct", "cost": accent_cost, "markup": m["accent"]})
    if stone:
        lines.append({"label": f"{stone['name']} · {carat:.2f} ct", "cost": centre_cost, "markup": m["centre_stone"]})
    grade_f = sheet["grades"].get(grade, 1.0)

    def gem(sid: str, ct: float) -> float:
        return ct * sheet["stones"].get(sid, [0] * 6)[bracket_index(ct)] * grade_f

    if style["id"] == "toi-et-moi":
        sid2 = opt("second_stone")
        lines.append({"label": f"{stone_name(sid2)} · {carat:.2f} ct (second stone)", "cost": gem(sid2, carat), "markup": m["centre_stone"]})
    if style["id"] == "three-stone":
        side_ct = round(carat * SIDE_STONE_RATIO, 2)
        for side in ("side_left", "side_right"):
            sid2 = opt(side)
            lines.append({"label": f"{stone_name(sid2)} · {side_ct:.2f} ct ({'left' if side == 'side_left' else 'right'})",
                          "cost": gem(sid2, side_ct), "markup": m["centre_stone"]})
    if engraving:
        lines.append({"label": "Engraving", "cost": engr_cost, "markup": m["labor"]})
    return finalize(sheet, lines, {
        "gold_grams": round(net_g, 2), "gold_grams_with_loss": round(gross_g, 2),
        "gold_cost_per_gram": round(gold_cost_per_gram(sheet), 2), "accent_ct": round(accent_ct, 3),
        "centre_cost_per_ct": per_ct, "bracket": BRACKET_LABELS[bracket_index(carat)],
    })


_STONE_NAMES = {i: n for i, n, _, _ in STONES}


def stone_name(sid: str) -> str:
    return _STONE_NAMES.get(sid, "Diamond")


def wedding_band_quote(sheet: dict, d, t: dict, style: dict, size: dict) -> dict:
    opt = lambda g: d.options.get(g) or next(x["default"] for x in t["option_groups"] if x["id"] == g)  # noqa: E731
    widths = {i: mm for i, mm, _ in BAND_WIDTHS}
    mm = widths.get(opt("width"), 2.0)
    sf = ring_size_factor(float(size["id"]))
    m, lab = sheet["markups"], sheet["labor"]
    net_g = sheet["wedding_band_grams_per_mm"] * mm * style.get("weight", 1.0) * sf
    gross_g = net_g * (1 + sheet["gold"]["casting_loss_pct"] / 100)
    gold_cost = gross_g * gold_cost_per_gram(sheet)
    labor_cost = lab["base"] + lab["wedding_band"].get(style["id"], 100) + lab["finish"].get(opt("finish"), 0)
    accent_ct = sheet["accent_ct"]["wedding_band"].get(style["id"], 0) * (mm / 2.5) * sf
    accent_stone = opt("accent_stone")
    lines = [
        {"label": f"18k gold · {net_g:.1f} g · {mm:g} mm", "cost": gold_cost, "markup": m["gold"]},
        {"label": "Band craftsmanship & finish", "cost": labor_cost, "markup": m["labor"]},
    ]
    if accent_ct > 0:
        cost = accent_ct * sheet["accent_cost_per_ct"] * sheet["accent_stone_factor"].get(accent_stone, 1)
        lines.append({"label": f"Accent {stone_name(accent_stone).lower()} · {accent_ct:.2f} ct", "cost": cost, "markup": m["accent"]})
    if d.engraving.strip():
        lines.append({"label": "Engraving", "cost": lab["engraving"], "markup": m["labor"]})
    return finalize(sheet, lines, {"gold_grams": round(net_g, 2), "gold_grams_with_loss": round(gross_g, 2),
                                   "gold_cost_per_gram": round(gold_cost_per_gram(sheet), 2), "accent_ct": round(accent_ct, 3)})


def finalize(sheet: dict, lines: list, details: dict) -> dict:
    for ln in lines:
        ln["retail"] = ln["cost"] * (1 + ln["markup"] / 100)
    cost = sum(ln["cost"] for ln in lines)
    retail = sum(ln["retail"] for ln in lines)
    floor = sheet["min_margin_pct"] / 100
    adjusted = False
    if retail > 0 and (retail - cost) / retail < floor:
        scale = (cost / (1 - floor)) / retail
        for ln in lines:
            ln["retail"] *= scale
        adjusted = True
    for ln in lines:
        ln["amount"] = int(round(ln["retail"]))
    total = sum(ln["amount"] for ln in lines)
    return {
        "lines": [{"label": ln["label"], "amount": ln["amount"]} for ln in lines],
        "total": total,
        "gold_grams": details["gold_grams"],
        "admin": {
            "cost": round(cost, 2), "retail": total,
            "margin_pct": round((total - cost) / total * 100, 1) if total else 0,
            "min_margin_applied": adjusted,
            "lines": [{"label": ln["label"], "cost": round(ln["cost"], 2), "markup_pct": ln["markup"], "retail": ln["amount"]} for ln in lines],
            **details,
        },
    }


# ---------- CSV ----------
def to_csv(sheet: dict) -> str:
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["section", "key", "subkey", "value"])
    g = sheet["gold"]
    for k in ("mode", "manual_cost_per_gram", "casting_loss_pct", "purity"):
        w.writerow(["gold", k, "", g[k]])
    for k, v in sheet["markups"].items():
        w.writerow(["markup", k, "", v])
    w.writerow(["min_margin_pct", "", "", sheet["min_margin_pct"]])
    w.writerow(["accent_cost_per_ct", "", "", sheet["accent_cost_per_ct"]])
    for k, v in sheet["grades"].items():
        w.writerow(["grade", k, "", v])
    for sid, row in sheet["stones"].items():
        for lbl, v in zip(BRACKET_LABELS, row):
            w.writerow(["stone_cost_per_ct", sid, lbl, v])
    for kind in ("setting", "band", "shape", "wedding_band", "finish"):
        for k, v in sheet["labor"][kind].items():
            w.writerow([f"labor_{kind}", k, "", v])
    w.writerow(["labor_engraving", "", "", sheet["labor"]["engraving"]])
    w.writerow(["labor_base", "", "", sheet["labor"]["base"]])
    for kind in ("setting", "band"):
        for k, v in sheet["grams"][kind].items():
            w.writerow([f"grams_{kind}", k, "", v])
        for k, v in sheet["accent_ct"][kind].items():
            w.writerow([f"accent_ct_{kind}", k, "", v])
    for k, v in sheet["accent_ct"]["wedding_band"].items():
        w.writerow(["accent_ct_wedding_band", k, "", v])
    for k, v in sheet["accent_shape_factor"].items():
        w.writerow(["accent_shape_factor", k, "", v])
    for k, v in sheet["accent_stone_factor"].items():
        w.writerow(["accent_stone_factor", k, "", v])
    w.writerow(["wedding_band_grams_per_mm", "", "", sheet["wedding_band_grams_per_mm"]])
    return out.getvalue()


def from_csv(text: str, sheet: dict) -> tuple[dict, int]:
    sheet = merge_defaults(sheet)
    n = 0
    for row in csv.DictReader(io.StringIO(text.strip())):
        sec, key, sub, raw = [(row.get(c) or "").strip() for c in ("section", "key", "subkey", "value")]
        if not sec or raw == "":
            continue
        val = raw if (sec == "gold" and key == "mode") else float(raw)
        if sec == "gold":
            sheet["gold"][key] = val
        elif sec == "markup":
            sheet["markups"][key] = val
        elif sec in ("min_margin_pct", "accent_cost_per_ct", "wedding_band_grams_per_mm"):
            sheet[sec] = val
        elif sec == "grade":
            sheet["grades"][key] = val
        elif sec == "stone_cost_per_ct":
            row_vals = sheet["stones"].setdefault(key, [0] * 6)
            if sub in BRACKET_LABELS:
                row_vals[BRACKET_LABELS.index(sub)] = val
        elif sec.startswith("labor_") and sec[6:] in ("setting", "band", "shape", "wedding_band", "finish"):
            sheet["labor"][sec[6:]][key] = val
        elif sec in ("labor_engraving", "labor_base"):
            sheet["labor"][sec[6:]] = val
        elif sec.startswith("grams_"):
            sheet["grams"][sec[6:]][key] = val
        elif sec.startswith("accent_ct_"):
            sheet["accent_ct"][sec[10:]][key] = val
        elif sec in ("accent_shape_factor", "accent_stone_factor"):
            sheet[sec][key] = val
        else:
            continue
        n += 1
    return sheet, n
