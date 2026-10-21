# Atelier — Virtual Jewelry Builder (PRD)

## Original problem
App connecting to websites/ecommerce stores with a mobile app for end users. Start with a virtual jewelry builder (like pencildesign.co). Later: virtual try-on of store products via uploaded photo or camera.

## User choices
- MVP: builder only; try-on later (AI try-on via photo/camera, live overlay in future)
- Types: necklaces, bracelets (charms), rings, earrings
- No accounts; saved designs on device
- Design: luxury minimal (cream, gold, Playfair Display + Satoshi)

## Architecture
- Backend FastAPI + Mongo: catalog seeded on startup (product_types, metals, addons); `/api/catalog`, `/api/price`, `/api/quotes` (POST/GET) with server-side price recompute.
- Frontend Expo Router: tabs Home / Build / Saved (NativeTabs on iOS 26+), modal `design/[id]`. Live SVG preview (`src/components/jewelry-preview.tsx`). Saved designs in local storage (`src/designs.ts`).

## Implemented (2026-06)
- Home hero + category grid + how-it-works + Try-On teaser
- Builder: type, style, metal, size, charms/stone, engraving, name, live preview, running price, save/update, toasts
- Saved gallery, design detail with breakdown, quote request form, edit, delete, Try-On coming soon
- Tested: backend 16/16, frontend all flows pass

## Store Sync (2026-06)
- Shopify connection via public /products.json (no API key), default store gadojewellers.com (SHOPIFY_STORE_DOMAIN in backend .env), auto-synced on startup if none connected; 429 backoff
- Endpoints: GET/DELETE /api/store, POST /api/store/connect, POST /api/store/sync, GET /api/store/products(?q,&product_type), GET /api/store/products/{id}
- Store products merged into /api/catalog addons (id prefix shop-), usable as charms (necklace/bracelet) or centre stone (ring/earrings); priced server-side
- New Shop tab (search + type chips), product modal (add to design, view in store), store-connect modal (connect/sync/disconnect)
- Tested: backend 32/32, frontend all flows pass
- Note: store prices are CAD while builder base prices are USD-style "$"

## Backlog
- P0: Virtual try-on (AI photo try-on with Gemini Nano Banana; camera capture)
- P1: Store connector (Shopify/WooCommerce product sync), embeddable web builder widget, add to bag/checkout
- P1: Merchant admin to manage catalog & view quotes
- P2: Live camera overlay try-on, share designs, wishlist sync across devices

## Realistic Ring Builder + AI Studio Render + 360/Zoom (2026-06)
- Rings are the focal point: real-time WebGL 3D ring (expo-gl + three) — procedural geometry for 6 settings (4/6-prong solitaire, cathedral, bezel, halo, three-stone), 5 bands (classic, petite, knife-edge, pavé, bold), 5 cuts (round, oval, cushion, princess, emerald), 7 stones, 6 carat weights; PBR polished gold, faceted gems, procedural HDR studio environment, twinkling sparkles tied to motion, leaning sway, contact shadow
- 360° orbit (drag horizontal + vertical), pinch / buttons / mouse-wheel zoom, auto-spin toggle, reset, full-screen viewer
- Metals: Yellow, White, Rose gold only (silver removed) + 14k/18k purity option; generic option_groups pricing (metal_factor / addon_factor)
- AI photoreal render: Gemini Nano Banana (gemini-3.1-flash-image-preview) with 3D snapshot + store product photos as references; auto 2.8s after pause, manual re-render; cached by design hash in Mongo; images in Emergent Object Storage, served via /api/renders/{hash}/image
- Saved designs keep render photo; design detail shows 3D/photo canvas and full option breakdown
- Store products usable for necklace/bracelet/earrings only (not rings)
- Tested iteration_3: backend 18/18, frontend all flows pass

## Backlog (updated)
- P0: Virtual try-on (photo upload/camera) using the saved render as reference
- P1: Live camera overlay try-on, buy-on-store cart handoff, currency match (CAD)
- P2: More cuts (pear, marquise, radiant), hidden halo, split shank, two-tone metals

## Bug fix (2026-06): live preview not updating on device
- Root cause: studio HDR env used Float32 textures (not filterable on OpenGL ES 3 phones) → native render loop threw every frame and froze
- Fix: HalfFloat (RGBA16F) env, no flipY, render loop try/catch with fallback lighting; studio photo auto-shows when ready, any change returns to live 3D
- Tested iteration_4: all pass

## Ring builder v3 (2026-06)
- 18k only (Yellow/White/Rose) + "Request other ring material" free-text (priced on request)
- 12 settings incl. Hidden Halo, Double Halo, Vintage Milgrain, Toi et Moi, Split Shank, Bypass; 13 shapes incl. Moval, Old Mine; accent stone shape selector (6)
- Bands: Polished, Diamond-Cut, Partial/3/4/Full Pavé, Infinity — every setting/band/shape/accent has an AI-generated illustrative preview image (backend/gen_option_images.py → object storage, /api/option-images/{key})
- Stones order/default: Colombian Emerald, Earth Diamond, Lab Diamond, Ruby, Sapphire, Natural Zircon, Tanzanite, Aquamarine, Morganite (rings & earrings)
- Pricing = 18k gold grams × $/g (96) × size weight factor + setting/band craftsmanship + accent diamonds (ct × $1,200 × accent-shape factor) + centre stone (per-ct price × carat size premium) + engraving; breakdown shown in builder & detail. ALL prices are illustrative placeholders in backend/catalog_data.py — merchant should supply real price sheet
- Canvas defaults to Photo (auto render 1.2s after change, previous photo kept while updating); 3D optional

## Merchant Price Sheet (2026-06)
- backend/pricing.py: supplier price sheet in Mongo `price_sheet` (seeded defaults), costs never exposed publicly (/api/catalog stripped, /api/price retail only)
- Ring quote = gold (net g × (1+casting loss) × 18k $/g) + labor (base + setting + band + fancy-shape) + accents (pavé ct × cost/ct × accent-shape factor) + centre (carat × bracket $/ct × grade) + engraving; per-category markups; store-wide minimum margin floor
- Gold weight: setting grams × head factor (0.6+0.4√ct) + band grams × size factor (US size inner-diameter circumference ratio); sizes 3–10 in halves
- Gold: live spot from api.gold-api.com (no key) every 3h + manual override mode
- Admin API /api/admin/* gated by X-Merchant-Pin (MERCHANT_PIN in backend .env), rate-limited 5 fails / 5 min
- /merchant screen: PIN unlock, sample quote cost/retail/margin, editable groups, CSV export/import (expo-sharing / document-picker)

## Virtual Try-On — store products (2026-06)
- POST /api/tryons (multipart product_id + photo, ≤12MB image) → Gemini Nano Banana edits the customer photo to wear the exact Shopify product (placement by product type: ring finger / neck / ear / wrist); result in object storage, `tryons` collection; GET /api/tryons/{id}/image
- /try-on/[id] modal: take photo (camera w/ pre-permission + Open Settings fallback) or upload from library, loading overlay, before/after toggle, save/share; entry via "Try it on" on product detail; Home teaser links to Shop
- Tested iteration_7: all pass
- Next: try-on for custom builder designs (use saved studio render as reference), live AR overlay
