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

## Desktop Store Admin + White-label + Embed (2026-06)
- Email/password admin auth (bcrypt + JWT 12h, per-email lockout 5 fails/15 min); admin seeded from backend .env ADMIN_EMAIL/ADMIN_PASSWORD; /api/auth/login, /api/auth/me
- /admin (responsive web: sidebar ≥900px, chips on mobile): Leads inbox (KPIs, status filters, search), lead detail (render/try-on/product image, spec breakdown, contact email/call, status New→Contacted→Quoted→Won/Lost, notes timeline), Branding (store name, tagline, logo upload to object storage, colour presets + hex, 4 heading + 4 body fonts, live preview), Website & Shopify (embed snippet popup/inline, page choice, direct link, platform install steps), Pricing (/merchant auto-unlocks with admin session)
- Branding applied app-wide at startup (theme.applyBranding) — home shows store name/logo
- Leads = `quotes` collection: design OR product (try-on enquiry with try-on image), phone, source app|embed; public GET /api/quotes removed
- /api/embed.js: floating button + modal iframe or inline iframe (camera allowed); ?embed=1 tags leads as Website
- Tested iteration_8: backend 24/24, frontend all pass
- Backlog: native Shopify App (theme app extension + app proxy + add-to-cart), multi-store tenancy, email alerts for new leads, try-on for custom designs

## Bridal builder + Catalog control (2026-06)
- "Bridal" chip with modes Engagement Ring (type ring) | Wedding Band (type band); "Add a matching wedding band" copies gold + size, curved-contour
- Wedding band: 12 styles w/ women's/men's (wearers), widths 1.5–8 mm filtered by wearer, finish (polish/brushed/hammered), accent stone type, size 3–15, engraving; priced via pricing.wedding_band_quote (grams/mm × width × weight × size)
- Multi-stone: toi et moi second stone + shape; three-stone left/right side stones (each 0.35× centre ct); halo/pavé accent stone type (accent_stone_factor in sheet). Groups use `when` ({styles}|"accents"); 3D shows colours + distinct toi et moi
- Removed Infinity band
- Admin /admin/catalog: builders on/off, per-option on/off (settings, shapes, bands, centre stones, accent stones, band styles), image slots per option + storefront (hero, tiles): brand upload / stock library / AI default. Collections: catalog_config, image_slots. Public /api/storefront, /api/slot-images/{key}
- Stock library is curated (5 Unsplash photos); live Unsplash search needs a user key

## Angles, Sketch, Customer access, New builders (2026-06) — tested iterations 11-12
- Angle views: POST /api/renders/{hash}/angles/{front|side|top|back|hero} (Gemini w/ base render as reference, cached in render_angles); angle-bar under studio photo
- Sketch-to-render: SketchPad overlay (red ink, normalised strokes) on photo or 3D snapshot → POST /api/sketches (PIL composite + Gemini) → SketchResult modal → quote with sketch_id → lead kind "sketch"
- Customer access (customers.py): rules per action prices/studio_photo/angles/try_on/sketch/save_design/quote = none|form|account; custom contact questions; customers collection (contact/account, bcrypt, Emergent Google via POST /api/auth/session); X-Customer-Token header; server enforces on renders/angles/sketches/tryons/quotes (403 "gate:<level>"); client GateModal via useCustomer().ensure(action); admin /admin/access + /admin/customers
- Iteration 13 (Jun 2026): Verified home grid respects disabled_types + Bridal tile; "Continue with Google" shown on form & account gates, gate auto-closes after native Google sign-in; customer "Signed in as · Sign out" row on home; admin catalog Switch is display-only (card toggles) to fix web double-toggle.
- Iteration 14 (Jun 2026): "Account" tab replaces "Saved" (profile/sign-in details, Saved designs, Quote requests). Designs sync to customer_designs collection when signed in (/api/customers/designs GET/PUT/DELETE, /api/customers/quotes); admin customers show saved-design count. Shopify app (shopify_app.py): OAuth install/callback, app home, HMAC-verified webhooks (app/uninstalled + GDPR), downloadable theme app extension zip (/api/shopify/package.zip: Jewelry Builder section + Try-On button product block). Needs SHOPIFY_API_KEY/SECRET in backend/.env (empty until user creates Partner app). Admin > Website & Shopify has setup panel.
- Iteration 15 (Jun 2026): MULTI-BUSINESS. tenancy.py ScopedDB auto-scopes tenant collections by tenant_id (contextvar set by app-level resolve_tenant from X-Tenant header / ?store=, or by admin JWT). Gado migrated as first tenant (slug gado, default). auth.py: owner/staff roles, /api/auth/signup, /me returns tenant, password change, /api/dashboard/team. platform_admin.py: /platform console (tenants list + usage, create, pause/resume, plan, impersonate, reset owner password). Shopify install auto-creates/links tenant; app home SSO → /admin?sso=. Usage logged per AI image. Frontend: src/tenant.ts (store slug, per-tab), admin signup mode, Team page, setup guide, impersonation banner, snippet/package include store. Billing deferred.
- Iteration 16 (Jun 2026): Clean storefront links /s/<slug>[/build|/shop] (app/s/[slug]); embed "direct link" + setup guide use them. Store connect/sync/disconnect now require jeweller login (was public); Shop tab hides store settings for shoppers; "Sync products" shortcut in Admin > Website & Shopify.
- Iteration 17 (Jun 2026): Bulk actions. Leads: checkbox select/select-all, action bar with Status, Assign (team member, assignee_id), Tag/Untag (tags[], tag filter chips), Export CSV (client-side), Delete. POST /api/dashboard/leads/bulk. Customers: Export CSV + Delete (POST /api/dashboard/customers/bulk removes sessions + saved designs). Components: src/components/admin/bulk.tsx, lead-bulk-panel.tsx.
- Iteration 18 (Jun 2026): Angle-view fix. generate_angle now receives design_facts() (ground-truth spec from the saved render design) + ring-anatomy rules; ANGLES redefined (front = through finger opening, band as full circle; side = 90° profile, shank edge-on; top = face-up; back). ANGLE_VERSION=2 in render_angles cache so old wrong views regenerate.
- Iteration 19 (Jun 2026): No-halo fix. build_prompt says "pavé" (not "halo/pavé") for non-halo styles and adds explicit "There is NO halo" line; angle texts no longer mention halo; ANGLE_VERSION=3.
- Iteration 21 (Jun 2026): Builder add-ons for rings: hidden_halo (non-halo styles), head_metal (two-tone/platinum head), stack (0-4 extra bands) + stack_style + stack_metal (when:"stack"), engraving_font with InscriptionPreview; design.notes ("Notes for your jeweller", excluded from render hash, shown on lead). Pricing lines added in pricing.ring_quote; render prompt describes hidden halo/two-tone/stack/font. 3D: hiddenHalo melee + headColor. 3D viewer starts paused (spin=false). Prices labelled as estimates + disclaimer.
- Iteration 23 (Jun 2026): hidden_halo available on ALL settings (not charged when style is hidden-halo); InscriptionPreview = SVG ring with curved TextPath inside the band.
- Iteration 24 (Jun 2026): Hidden halo is its own add-on section (toggle + Switch) above Engraving, like engraving (ADD_ON_GROUPS excluded from generic chips). Add-on headers show the actual breakdown line amount (Optional add-on when off; "Added" when prices gated).
- Iteration 25 (Jun 2026): Photo redesign: /redesign screen (upload or camera with permission flow) -> SketchPad over the photo (backgroundUri, square) + written instructions -> POST /api/sketches with no design (server pads photo to square, design optional, strokes optional if note) -> SketchResult -> quote kind sketch with sketch.uploaded (price 0, "Price to be quoted"). Builder header button "Redesign a photo". Admin lead Crafting brief (PUT /api/dashboard/leads/{id}/brief, BRIEF_KEYS sizing/specs) component crafting-brief.tsx.





- New builders: fashion-ring, pendant, tennis (+ bracelet charm/bangle/anklet, earrings huggie/pavé hoop/climber); generic pricing adds option prices; 3D only for ring/band; style toggles per builder (style.<type>) with image slots; custom styles (db.custom_styles) via /api/dashboard/custom-styles
- Spend controls (caps per AI feature) — user still deciding (explained options A/B/C)

## NEXT (user-approved order)
3. Consultation Studio (admin): customer profiles (create/edit, ring size, budget, occasion, date, preferences), timeline of designs/sketches/quotes/notes; consult-mode builder inside admin for a customer (no gating, shows cost vs retail/margin, price override); multi-colour annotate (save without AI) or render; share proposal link/PDF
4. Production: spec sheet PDF (piece, metal, size, widths, stones mm/ct/grade, accents, gold weight, engraving, finish, images/angles/sketches, deadline) + Production board (Design→CAD→Wax/Print→Casting→Setting→Polish→QC→Ready), assignees, due dates, comments
5. Staff logins with roles (Owner, Sales/Consultant, Atelier/Bench — bench sees only Production board)
- CAD/3D export: REMOVED from scope by user
