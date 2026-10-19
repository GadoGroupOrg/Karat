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
