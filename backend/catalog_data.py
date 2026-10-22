# All gold is 18k. Prices are ILLUSTRATIVE mid-market retail estimates (USD) and should be replaced
# with the merchant's own supplier / price sheet. See PRICING below.

PRICING = {
    "gold_karat": "18k",
    # 18k = 75% pure. Spot gold ≈ $4,000/oz (≈ $128/g) → 18k metal ≈ $96/g before labor.
    "gold_per_gram": 96,
    # Natural diamond melee (accent stones), good quality, per total carat.
    "accent_price_per_ct": 1200,
    "currency": "USD",
    "note": "Illustrative estimates — replace with your supplier price list.",
}

METALS = [
    {"id": "yellow-gold", "name": "18k Yellow Gold", "color": "#EDC36A", "multiplier": 1.0},
    {"id": "white-gold", "name": "18k White Gold", "color": "#E4E4E0", "multiplier": 1.0},
    {"id": "rose-gold", "name": "18k Rose Gold", "color": "#EBA88E", "multiplier": 1.0},
]

# Stones across the board, in the merchant's preferred order (first = default).
# price = per-stone price at 1.00 ct (scaled by the carat factor, which includes the per-carat size premium).
STONES = [
    ("colombian-emerald", "Colombian Emerald", "#0F8A5F", 5500),
    ("earth-diamond", "Earth Diamond", "#FFFFFF", 5800),
    ("lab-diamond", "Lab Diamond", "#FFFFFF", 650),
    ("ruby", "Ruby", "#B5122E", 4200),
    ("sapphire", "Sapphire", "#1C3C9E", 2400),
    ("natural-zircon", "Natural Zircon", "#4FB3D1", 220),
    ("tanzanite", "Tanzanite", "#4B3F9E", 600),
    ("aquamarine", "Aquamarine", "#8FD0E2", 450),
    ("morganite", "Morganite", "#F1B3A4", 280),
]

RING_SETTINGS = [
    # price = setting craftsmanship/labor, grams = 18k gold in the head/setting, accent_ct = accent diamonds
    {"id": "solitaire-4", "name": "4-Prong Solitaire", "price": 250, "grams": 0.6, "accent_ct": 0,
     "description": "Four slim claws lift the stone high to catch the most light."},
    {"id": "solitaire-6", "name": "6-Prong Solitaire", "price": 300, "grams": 0.7, "accent_ct": 0,
     "description": "Six claws for a rounder silhouette and extra security."},
    {"id": "hidden-halo", "name": "Hidden Halo", "price": 550, "grams": 0.8, "accent_ct": 0.12,
     "description": "A secret ring of diamonds under the stone, seen from the side."},
    {"id": "halo", "name": "Halo", "price": 650, "grams": 0.9, "accent_ct": 0.25,
     "description": "A frame of micro-pavé diamonds that makes the centre look larger."},
    {"id": "double-halo", "name": "Double Halo", "price": 950, "grams": 1.3, "accent_ct": 0.45,
     "description": "Two concentric rows of pavé for maximum brilliance."},
    {"id": "vintage-milgrain", "name": "Vintage Milgrain", "price": 850, "grams": 1.2, "accent_ct": 0.2,
     "description": "Edwardian-inspired halo with hand-beaded milgrain edges and filigree."},
    {"id": "cathedral", "name": "Cathedral", "price": 380, "grams": 1.1, "accent_ct": 0,
     "description": "Graceful arches rise from the band to cradle the stone."},
    {"id": "bezel", "name": "Bezel", "price": 350, "grams": 1.0, "accent_ct": 0,
     "description": "A smooth gold rim fully encircles the stone. Modern and secure."},
    {"id": "three-stone", "name": "Three-Stone", "price": 700, "grams": 1.2, "accent_ct": 0,
     "description": "Centre stone flanked by two side stones: past, present, future."},
    {"id": "toi-et-moi", "name": "Toi et Moi", "price": 650, "grams": 1.0, "accent_ct": 0,
     "description": "Two stones side by side, a romantic 'you and me' design."},
    {"id": "split-shank", "name": "Split Shank", "price": 600, "grams": 1.4, "accent_ct": 0.1,
     "description": "The band divides into two strands as it meets the stone."},
    {"id": "bypass", "name": "Bypass", "price": 450, "grams": 1.0, "accent_ct": 0,
     "description": "The band sweeps around the stone in an elegant spiral."},
]

RING_BANDS = [
    {"id": "polished", "name": "Polished Gold", "price": 0, "grams": 3.4, "accent_ct": 0,
     "description": "A smooth, high-polish 18k comfort-fit band, about 2mm."},
    {"id": "diamond-cut", "name": "Diamond-Cut Design", "price": 180, "grams": 3.6, "accent_ct": 0,
     "description": "Gold faceted by a diamond tool so it glitters like a gemstone."},
    {"id": "partial-pave", "name": "Partial Pavé", "price": 320, "grams": 3.0, "accent_ct": 0.15,
     "description": "Tiny diamonds set across the top third of the band."},
    {"id": "three-quarter-pave", "name": "3/4 Pavé", "price": 520, "grams": 3.0, "accent_ct": 0.35,
     "description": "Diamonds continue three-quarters of the way around."},
    {"id": "full-pave", "name": "Full Pavé (Eternity)", "price": 720, "grams": 3.1, "accent_ct": 0.5,
     "description": "Diamonds all the way around the band: full eternity sparkle."},
]

RING_SHAPES = [
    ("round", "Round Brilliant", "The classic. 57 facets for maximum sparkle."),
    ("oval", "Oval", "Elongated brilliant that flatters and looks larger."),
    ("moval", "Moval", "A modern marquise-oval hybrid with softly pointed ends."),
    ("old-mine", "Old Mine", "Antique cushion cut with a high crown and open culet."),
    ("cushion", "Cushion", "A softly squared pillow shape with romantic fire."),
    ("elongated-cushion", "Elongated Cushion", "Cushion stretched into a graceful rectangle."),
    ("pear", "Pear", "A teardrop: rounded at one end, pointed at the other."),
    ("marquise", "Marquise", "A boat shape with two points, very finger-lengthening."),
    ("emerald", "Emerald Cut", "Step-cut rectangle with a hall-of-mirrors effect."),
    ("radiant", "Radiant", "Rectangular with brilliant facets: sparkle and structure."),
    ("asscher", "Asscher", "A square step cut with an Art Deco feel."),
    ("princess", "Princess", "A sharp-cornered square brilliant."),
    ("heart", "Heart", "The romantic shape, cut as a brilliant."),
]

ACCENT_SHAPES = [
    ("round", "Round", 1.0, "Classic round melee."),
    ("baguette", "Baguette", 1.15, "Slim step-cut rectangles."),
    ("tapered-baguette", "Tapered Baguette", 1.25, "Baguettes that narrow toward the band."),
    ("pear", "Pear", 1.3, "Tiny teardrops, often petal-like in halos."),
    ("marquise", "Marquise", 1.3, "Tiny marquise for leaf and vine motifs."),
    ("trillion", "Trillion", 1.25, "Triangular side stones."),
]

# Stone pickers (toi et moi, three-stone sides, halo/pavé accents). Colour drives the 3D preview.
STONE_OPTIONS = [{"id": i, "name": n, "color": c} for i, n, c, _ in STONES]
MULTI_STONE_STYLES = ["three-stone", "toi-et-moi"]
SIDE_STONE_RATIO = 0.35  # each three-stone side stone vs the centre carat

# Wedding bands. weight = gold vs a comfort-fit band of the same width; accent_ct at 2.5 mm, size 6.
WEDDING_STYLES = [
    {"id": "classic-dome", "name": "Classic Dome", "price": 120, "weight": 1.0, "accent_ct": 0, "wearers": ["womens", "mens"],
     "description": "A softly rounded, high-polish profile. Timeless."},
    {"id": "comfort-fit", "name": "Comfort Fit", "price": 150, "weight": 1.15, "accent_ct": 0, "wearers": ["womens", "mens"],
     "description": "Rounded inside and out so it glides on and stays comfortable."},
    {"id": "flat-court", "name": "Flat Court", "price": 140, "weight": 1.1, "accent_ct": 0, "wearers": ["mens"],
     "description": "A crisp flat top with a comfort-fit interior. Modern and strong."},
    {"id": "beveled-edge", "name": "Beveled Edge", "price": 190, "weight": 1.1, "accent_ct": 0, "wearers": ["mens"],
     "description": "A flat centre framed by angled, polished bevels."},
    {"id": "diamond-cut", "name": "Diamond-Cut Accents", "price": 260, "weight": 1.05, "accent_ct": 0, "wearers": ["womens", "mens"],
     "description": "Gold faceted with a diamond tool in a sparkling geometric pattern."},
    {"id": "milgrain", "name": "Milgrain Edge", "price": 220, "weight": 1.0, "accent_ct": 0, "wearers": ["womens", "mens"],
     "description": "Hand-beaded edges for a vintage, heirloom finish."},
    {"id": "knife-edge", "name": "Knife Edge", "price": 180, "weight": 0.9, "accent_ct": 0, "wearers": ["womens"],
     "description": "Two planes meet in a fine ridge that catches the light."},
    {"id": "curved-contour", "name": "Curved Contour", "price": 320, "weight": 1.0, "accent_ct": 0.08, "wearers": ["womens"],
     "description": "Gently curved to nest flush against your engagement ring."},
    {"id": "pave", "name": "Pavé", "price": 380, "weight": 0.95, "accent_ct": 0.2, "wearers": ["womens"],
     "description": "Tiny stones bead-set across the top of the band."},
    {"id": "channel", "name": "Channel Set", "price": 420, "weight": 1.1, "accent_ct": 0.3, "wearers": ["womens", "mens"],
     "description": "Stones set flush between two gold walls. Sleek and secure."},
    {"id": "eternity", "name": "Full Eternity", "price": 560, "weight": 0.95, "accent_ct": 0.6, "wearers": ["womens"],
     "description": "Stones all the way around for unbroken sparkle."},
    {"id": "single-stone", "name": "Flush-Set Stone", "price": 260, "weight": 1.1, "accent_ct": 0.05, "wearers": ["mens"],
     "description": "A single stone burnished flush into the gold."},
]
BAND_WIDTHS = [
    ("1.5", 1.5, ["womens"]), ("2", 2.0, ["womens"]), ("2.5", 2.5, ["womens"]), ("3", 3.0, ["womens", "mens"]),
    ("4", 4.0, ["womens", "mens"]), ("5", 5.0, ["mens"]), ("6", 6.0, ["mens"]), ("7", 7.0, ["mens"]), ("8", 8.0, ["mens"]),
]

TYPES = [
    {
        "id": "ring", "name": "Engagement Ring", "group": "bridal", "group_name": "Bridal",
        "tagline": "Engagement rings & wedding bands, made yours",
        "style_label": "Setting", "featured": True,
        "base_price": 0, "addon_kind": "stone", "addon_label": "Centre stone", "max_addons": 1,
        "engraving_price": 40, "engraving_max": 16, "material_request": True,
        "styles": RING_SETTINGS,
        "option_groups": [
            {"id": "shape", "label": "Stone shape", "default": "round",
             "options": [{"id": i, "name": n, "price": 0, "description": d} for i, n, d in RING_SHAPES]},
            {"id": "second_stone", "label": "Second stone", "default": "earth-diamond", "when": {"styles": ["toi-et-moi"]},
             "options": STONE_OPTIONS},
            {"id": "second_shape", "label": "Second stone shape", "default": "pear", "when": {"styles": ["toi-et-moi"]},
             "options": [{"id": i, "name": n, "price": 0} for i, n, _ in RING_SHAPES]},
            {"id": "carat", "label": "Carat weight", "default": "1",
             "options": [
                 {"id": "0.5", "name": "0.50 ct", "price": 0, "addon_factor": 0.42},
                 {"id": "0.75", "name": "0.75 ct", "price": 0, "addon_factor": 0.68},
                 {"id": "1", "name": "1.00 ct", "price": 0, "addon_factor": 1.0},
                 {"id": "1.5", "name": "1.50 ct", "price": 0, "addon_factor": 1.75},
                 {"id": "2", "name": "2.00 ct", "price": 0, "addon_factor": 2.7},
                 {"id": "2.5", "name": "2.50 ct", "price": 0, "addon_factor": 3.6},
                 {"id": "3", "name": "3.00 ct", "price": 0, "addon_factor": 4.6},
             ]},
            {"id": "side_left", "label": "Left side stone", "default": "earth-diamond", "when": {"styles": ["three-stone"]},
             "options": STONE_OPTIONS},
            {"id": "side_right", "label": "Right side stone", "default": "earth-diamond", "when": {"styles": ["three-stone"]},
             "options": STONE_OPTIONS},
            {"id": "band", "label": "Band", "default": "polished", "options": RING_BANDS},
            {"id": "accent_stone", "label": "Halo & pavé stones", "default": "earth-diamond", "when": "accents",
             "options": STONE_OPTIONS},
            {"id": "accent_shape", "label": "Accent stone shape", "default": "round", "when": "accents",
             "options": [{"id": i, "name": n, "price": 0, "accent_factor": f, "description": d} for i, n, f, d in ACCENT_SHAPES]},
            {"id": "quality", "label": "Stone quality", "default": "fine",
             "options": [
                 {"id": "good", "name": "Good", "price": 0},
                 {"id": "fine", "name": "Fine", "price": 0},
                 {"id": "exceptional", "name": "Exceptional", "price": 0},
             ]},
        ],
        "sizes": [{"id": f"{s:g}", "label": f"{s:g}", "price": 0} for s in [x / 2 for x in range(6, 22)]],
    },
    {
        "id": "band", "name": "Wedding Band", "group": "bridal", "group_name": "Bridal",
        "tagline": "His, hers and theirs: bands to wear forever", "style_label": "Band style",
        "base_price": 0, "addon_kind": "none", "addon_label": "", "max_addons": 0,
        "engraving_price": 40, "engraving_max": 20, "material_request": True,
        "styles": WEDDING_STYLES,
        "option_groups": [
            {"id": "wearer", "label": "For", "default": "womens",
             "options": [{"id": "womens", "name": "Women's", "price": 0}, {"id": "mens", "name": "Men's", "price": 0}]},
            {"id": "width", "label": "Width", "default": "2",
             "options": [{"id": i, "name": f"{mm:g} mm", "price": 0, "mm": mm, "wearers": w} for i, mm, w in BAND_WIDTHS]},
            {"id": "finish", "label": "Finish", "default": "polished",
             "options": [{"id": "polished", "name": "High polish", "price": 0}, {"id": "brushed", "name": "Brushed satin", "price": 0},
                         {"id": "hammered", "name": "Hammered", "price": 0}]},
            {"id": "accent_stone", "label": "Accent stones", "default": "earth-diamond", "when": "accents",
             "options": STONE_OPTIONS},
        ],
        "sizes": [{"id": f"{s:g}", "label": f"{s:g}", "price": 0} for s in [x / 2 for x in range(6, 31)]],
    },
    {
        "id": "necklace", "name": "Necklace", "tagline": "Layered stories on a fine chain", "style_label": "Chain",
        "base_price": 180, "addon_kind": "charm", "addon_label": "Charms", "max_addons": 5,
        "engraving_price": 25, "engraving_max": 12,
        "styles": [
            {"id": "cable", "name": "Cable", "price": 0},
            {"id": "paperclip", "name": "Paperclip", "price": 40},
            {"id": "snake", "name": "Snake", "price": 60},
        ],
        "option_groups": [],
        "sizes": [
            {"id": "16", "label": '16"', "price": 0},
            {"id": "18", "label": '18"', "price": 20},
            {"id": "20", "label": '20"', "price": 35},
            {"id": "22", "label": '22"', "price": 50},
        ],
    },
    {
        "id": "bracelet", "name": "Bracelet", "tagline": "Charms that move with you", "style_label": "Chain",
        "base_price": 140, "addon_kind": "charm", "addon_label": "Charms", "max_addons": 4,
        "engraving_price": 25, "engraving_max": 10,
        "styles": [
            {"id": "cable", "name": "Cable", "price": 0},
            {"id": "paperclip", "name": "Paperclip", "price": 35},
            {"id": "tennis", "name": "Tennis", "price": 220},
        ],
        "option_groups": [],
        "sizes": [
            {"id": "6", "label": '6"', "price": 0},
            {"id": "6.5", "label": '6.5"', "price": 10},
            {"id": "7", "label": '7"', "price": 20},
            {"id": "7.5", "label": '7.5"', "price": 30},
        ],
    },
    {
        "id": "earrings", "name": "Earrings", "tagline": "Quiet light, framing the face", "style_label": "Style",
        "base_price": 120, "addon_kind": "stone", "addon_label": "Stone", "max_addons": 1,
        "engraving_price": 0, "engraving_max": 0,
        "styles": [
            {"id": "stud", "name": "Stud", "price": 0},
            {"id": "hoop", "name": "Hoop", "price": 40},
            {"id": "drop", "name": "Drop", "price": 80},
        ],
        "option_groups": [],
        "sizes": [
            {"id": "petite", "label": "Petite", "price": 0},
            {"id": "classic", "label": "Classic", "price": 30},
            {"id": "statement", "label": "Statement", "price": 60},
        ],
    },
]

CHARM_TYPES = ["necklace", "bracelet"]

ADDONS = (
    # Ring centre stones (per 1.00 ct)
    [{"id": f"ring-{i}", "name": n, "shape": "gem", "color": c, "price": p, "types": ["ring"]} for i, n, c, p in STONES]
    # Earring stones (pair of small stones, flat price)
    + [{"id": f"ear-{i}", "name": n, "shape": "gem", "color": c, "price": round(p * 0.12), "types": ["earrings"]}
       for i, n, c, p in STONES]
    + [{"id": "ear-pearl", "name": "Pearl", "shape": "pearl", "color": "#F3EDE2", "price": 120, "types": ["earrings"]}]
    + [
        {"id": "birthstone", "name": "Colombian Emerald Charm", "shape": "gem", "color": "#0F8A5F", "price": 120, "types": CHARM_TYPES},
        {"id": "heart", "name": "Heart", "shape": "heart", "color": None, "price": 45, "types": CHARM_TYPES},
        {"id": "star", "name": "Star", "shape": "star", "color": None, "price": 45, "types": CHARM_TYPES},
        {"id": "moon", "name": "Crescent", "shape": "moon", "color": None, "price": 50, "types": CHARM_TYPES},
        {"id": "initial", "name": "Initial Disc", "shape": "disc", "color": None, "price": 55, "types": CHARM_TYPES},
        {"id": "clover", "name": "Clover", "shape": "clover", "color": None, "price": 55, "types": CHARM_TYPES},
        {"id": "pearl-charm", "name": "Pearl", "shape": "pearl", "color": "#F3EDE2", "price": 65, "types": CHARM_TYPES},
        {"id": "evil-eye", "name": "Evil Eye", "shape": "eye", "color": "#2E5C8A", "price": 60, "types": CHARM_TYPES},
    ]
)
