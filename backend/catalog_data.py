METALS = [
    {"id": "yellow-gold", "name": "Yellow Gold", "color": "#EDC36A", "multiplier": 1.0},
    {"id": "white-gold", "name": "White Gold", "color": "#E4E4E0", "multiplier": 1.05},
    {"id": "rose-gold", "name": "Rose Gold", "color": "#EBA88E", "multiplier": 1.0},
]

KARAT_GROUP = {
    "id": "karat", "label": "Gold purity", "default": "14k",
    "options": [
        {"id": "14k", "name": "14k", "price": 0, "metal_factor": 1.0},
        {"id": "18k", "name": "18k", "price": 0, "metal_factor": 1.35},
    ],
}

TYPES = [
    {
        "id": "ring", "name": "Ring", "tagline": "Engagement & heirloom rings, set by you",
        "style_label": "Setting", "featured": True,
        "base_price": 380, "addon_kind": "stone", "addon_label": "Centre stone", "max_addons": 1,
        "engraving_price": 40, "engraving_max": 16,
        "styles": [
            {"id": "solitaire-4", "name": "4-Prong Solitaire", "price": 0},
            {"id": "solitaire-6", "name": "6-Prong Solitaire", "price": 120},
            {"id": "cathedral", "name": "Cathedral", "price": 260},
            {"id": "bezel", "name": "Bezel", "price": 180},
            {"id": "halo", "name": "Halo", "price": 690},
            {"id": "three-stone", "name": "Three-Stone", "price": 1250},
        ],
        "option_groups": [
            {
                "id": "shape", "label": "Stone shape", "default": "round",
                "options": [
                    {"id": "round", "name": "Round Brilliant", "price": 0},
                    {"id": "oval", "name": "Oval", "price": 0},
                    {"id": "cushion", "name": "Cushion", "price": 0},
                    {"id": "princess", "name": "Princess", "price": 0},
                    {"id": "emerald", "name": "Emerald Cut", "price": 0},
                ],
            },
            {
                "id": "carat", "label": "Carat weight", "default": "1",
                "options": [
                    {"id": "0.5", "name": "0.50 ct", "price": 0, "addon_factor": 0.4},
                    {"id": "0.75", "name": "0.75 ct", "price": 0, "addon_factor": 0.65},
                    {"id": "1", "name": "1.00 ct", "price": 0, "addon_factor": 1.0},
                    {"id": "1.5", "name": "1.50 ct", "price": 0, "addon_factor": 1.8},
                    {"id": "2", "name": "2.00 ct", "price": 0, "addon_factor": 2.8},
                    {"id": "3", "name": "3.00 ct", "price": 0, "addon_factor": 4.8},
                ],
            },
            {
                "id": "band", "label": "Band", "default": "classic",
                "options": [
                    {"id": "classic", "name": "Classic", "price": 0},
                    {"id": "slim", "name": "Petite", "price": 0},
                    {"id": "knife", "name": "Knife-Edge", "price": 90},
                    {"id": "pave", "name": "Pavé", "price": 780},
                    {"id": "wide", "name": "Bold", "price": 220},
                ],
            },
            KARAT_GROUP,
        ],
        "sizes": [{"id": s, "label": s, "price": 0} for s in ["4", "5", "6", "7", "8", "9"]],
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
        "option_groups": [KARAT_GROUP],
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
        "option_groups": [KARAT_GROUP],
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
        "option_groups": [KARAT_GROUP],
        "sizes": [
            {"id": "petite", "label": "Petite", "price": 0},
            {"id": "classic", "label": "Classic", "price": 30},
            {"id": "statement", "label": "Statement", "price": 60},
        ],
    },
]

CHARM_TYPES = ["necklace", "bracelet"]

ADDONS = [
    # Ring centre stones (price per 1.00 ct, scaled by carat factor)
    {"id": "ring-diamond", "name": "Natural Diamond", "shape": "gem", "color": "#FFFFFF", "price": 5200, "types": ["ring"]},
    {"id": "ring-lab-diamond", "name": "Lab Diamond", "shape": "gem", "color": "#FFFFFF", "price": 1400, "types": ["ring"]},
    {"id": "ring-sapphire", "name": "Blue Sapphire", "shape": "gem", "color": "#1C3C9E", "price": 2600, "types": ["ring"]},
    {"id": "ring-emerald", "name": "Emerald", "shape": "gem", "color": "#11885A", "price": 3100, "types": ["ring"]},
    {"id": "ring-ruby", "name": "Ruby", "shape": "gem", "color": "#B5122E", "price": 3400, "types": ["ring"]},
    {"id": "ring-morganite", "name": "Morganite", "shape": "gem", "color": "#F1B3A4", "price": 650, "types": ["ring"]},
    {"id": "ring-aquamarine", "name": "Aquamarine", "shape": "gem", "color": "#8FD0E2", "price": 720, "types": ["ring"]},
    # Charms
    {"id": "heart", "name": "Heart", "shape": "heart", "color": None, "price": 45, "types": CHARM_TYPES},
    {"id": "star", "name": "Star", "shape": "star", "color": None, "price": 45, "types": CHARM_TYPES},
    {"id": "moon", "name": "Crescent", "shape": "moon", "color": None, "price": 50, "types": CHARM_TYPES},
    {"id": "initial", "name": "Initial Disc", "shape": "disc", "color": None, "price": 55, "types": CHARM_TYPES},
    {"id": "clover", "name": "Clover", "shape": "clover", "color": None, "price": 55, "types": CHARM_TYPES},
    {"id": "pearl-charm", "name": "Pearl", "shape": "pearl", "color": "#F3EDE2", "price": 65, "types": CHARM_TYPES},
    {"id": "birthstone", "name": "Birthstone", "shape": "gem", "color": "#9B3D5A", "price": 70, "types": CHARM_TYPES},
    {"id": "evil-eye", "name": "Evil Eye", "shape": "eye", "color": "#2E5C8A", "price": 60, "types": CHARM_TYPES},
    # Earring stones
    {"id": "diamond", "name": "Diamond", "shape": "gem", "color": "#F4F6F6", "price": 400, "types": ["earrings"]},
    {"id": "sapphire", "name": "Sapphire", "shape": "gem", "color": "#2C4A86", "price": 280, "types": ["earrings"]},
    {"id": "emerald", "name": "Emerald", "shape": "gem", "color": "#2F7A55", "price": 300, "types": ["earrings"]},
    {"id": "ruby", "name": "Ruby", "shape": "gem", "color": "#A3202F", "price": 320, "types": ["earrings"]},
    {"id": "morganite", "name": "Morganite", "shape": "gem", "color": "#E7B3A6", "price": 180, "types": ["earrings"]},
    {"id": "pearl", "name": "Pearl", "shape": "pearl", "color": "#F3EDE2", "price": 120, "types": ["earrings"]},
]
