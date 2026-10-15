METALS = [
    {"id": "yellow-gold", "name": "14k Yellow Gold", "color": "#D4AF37", "multiplier": 1.0},
    {"id": "rose-gold", "name": "14k Rose Gold", "color": "#C9907A", "multiplier": 1.0},
    {"id": "white-gold", "name": "14k White Gold", "color": "#CFCFCB", "multiplier": 1.1},
    {"id": "silver", "name": "Sterling Silver", "color": "#A9A9A6", "multiplier": 0.45},
]

TYPES = [
    {
        "id": "necklace", "name": "Necklace", "tagline": "Layered stories on a fine chain",
        "base_price": 180, "addon_kind": "charm", "addon_label": "Charms", "max_addons": 5,
        "engraving_price": 25, "engraving_max": 12,
        "styles": [
            {"id": "cable", "name": "Cable", "price": 0},
            {"id": "paperclip", "name": "Paperclip", "price": 40},
            {"id": "snake", "name": "Snake", "price": 60},
        ],
        "sizes": [
            {"id": "16", "label": '16"', "price": 0},
            {"id": "18", "label": '18"', "price": 20},
            {"id": "20", "label": '20"', "price": 35},
            {"id": "22", "label": '22"', "price": 50},
        ],
    },
    {
        "id": "bracelet", "name": "Bracelet", "tagline": "Charms that move with you",
        "base_price": 140, "addon_kind": "charm", "addon_label": "Charms", "max_addons": 4,
        "engraving_price": 25, "engraving_max": 10,
        "styles": [
            {"id": "cable", "name": "Cable", "price": 0},
            {"id": "paperclip", "name": "Paperclip", "price": 35},
            {"id": "tennis", "name": "Tennis", "price": 220},
        ],
        "sizes": [
            {"id": "6", "label": '6"', "price": 0},
            {"id": "6.5", "label": '6.5"', "price": 10},
            {"id": "7", "label": '7"', "price": 20},
            {"id": "7.5", "label": '7.5"', "price": 30},
        ],
    },
    {
        "id": "ring", "name": "Ring", "tagline": "A single stone, endlessly yours",
        "base_price": 220, "addon_kind": "stone", "addon_label": "Stone", "max_addons": 1,
        "engraving_price": 30, "engraving_max": 14,
        "styles": [
            {"id": "solitaire", "name": "Solitaire", "price": 150},
            {"id": "band", "name": "Band", "price": 0},
            {"id": "halo", "name": "Halo", "price": 320},
        ],
        "sizes": [{"id": s, "label": s, "price": 0} for s in ["5", "6", "7", "8", "9"]],
    },
    {
        "id": "earrings", "name": "Earrings", "tagline": "Quiet light, framing the face",
        "base_price": 120, "addon_kind": "stone", "addon_label": "Stone", "max_addons": 1,
        "engraving_price": 0, "engraving_max": 0,
        "styles": [
            {"id": "stud", "name": "Stud", "price": 0},
            {"id": "hoop", "name": "Hoop", "price": 40},
            {"id": "drop", "name": "Drop", "price": 80},
        ],
        "sizes": [
            {"id": "petite", "label": "Petite", "price": 0},
            {"id": "classic", "label": "Classic", "price": 30},
            {"id": "statement", "label": "Statement", "price": 60},
        ],
    },
]

CHARM_TYPES = ["necklace", "bracelet"]
STONE_TYPES = ["ring", "earrings"]

ADDONS = [
    {"id": "heart", "name": "Heart", "shape": "heart", "color": None, "price": 45, "types": CHARM_TYPES},
    {"id": "star", "name": "Star", "shape": "star", "color": None, "price": 45, "types": CHARM_TYPES},
    {"id": "moon", "name": "Crescent", "shape": "moon", "color": None, "price": 50, "types": CHARM_TYPES},
    {"id": "initial", "name": "Initial Disc", "shape": "disc", "color": None, "price": 55, "types": CHARM_TYPES},
    {"id": "clover", "name": "Clover", "shape": "clover", "color": None, "price": 55, "types": CHARM_TYPES},
    {"id": "pearl-charm", "name": "Pearl", "shape": "pearl", "color": "#F3EDE2", "price": 65, "types": CHARM_TYPES},
    {"id": "birthstone", "name": "Birthstone", "shape": "gem", "color": "#9B3D5A", "price": 70, "types": CHARM_TYPES},
    {"id": "evil-eye", "name": "Evil Eye", "shape": "eye", "color": "#2E5C8A", "price": 60, "types": CHARM_TYPES},
    {"id": "diamond", "name": "Diamond", "shape": "gem", "color": "#F4F6F6", "price": 400, "types": STONE_TYPES},
    {"id": "sapphire", "name": "Sapphire", "shape": "gem", "color": "#2C4A86", "price": 280, "types": STONE_TYPES},
    {"id": "emerald", "name": "Emerald", "shape": "gem", "color": "#2F7A55", "price": 300, "types": STONE_TYPES},
    {"id": "ruby", "name": "Ruby", "shape": "gem", "color": "#A3202F", "price": 320, "types": STONE_TYPES},
    {"id": "morganite", "name": "Morganite", "shape": "gem", "color": "#E7B3A6", "price": 180, "types": STONE_TYPES},
    {"id": "pearl", "name": "Pearl", "shape": "pearl", "color": "#F3EDE2", "price": 120, "types": STONE_TYPES},
]
