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

## Backlog
- P0: Virtual try-on (AI photo try-on with Gemini Nano Banana; camera capture)
- P1: Store connector (Shopify/WooCommerce product sync), embeddable web builder widget, add to bag/checkout
- P1: Merchant admin to manage catalog & view quotes
- P2: Live camera overlay try-on, share designs, wishlist sync across devices
