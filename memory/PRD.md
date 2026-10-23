# Karat — Landing Page PRD

## Original problem statement
"Build a landing page: for the gemfit sutdio app. the business name will actually be Karat, karatdesign.io"
Clarified: Karat is a store/website embed for jewelry businesses so their prospects can design concepts and virtually try on products; on the backend it is a CRM and design tool for the jeweller. Audience: jewelers (B2B). CTA: waitlist. Style: Option B — dark onyx hero + light ivory sections. Brand assets to be uploaded later.

## Architecture
- React (CRA) + Tailwind + framer-motion + lenis; components in `src/components/karat/`
- FastAPI: `POST /api/waitlist` (email, dedupe, returns position), `GET /api/waitlist/count`; Mongo collection `waitlist`
- Generated imagery saved locally in `public/img/`; original SVG mark in `Logo.jsx` + `public/favicon.svg`

## User personas
- Independent jeweler / custom jewelry studio owner wanting higher-intent leads

## Core requirements
- Hero with masked line reveal, 3D tilt ring + metal switcher, parallax; waitlist capture
- Marquee, How it works, Bento (Atelier configurator, Mirror AR try-on, Ledger CRM, Embed), For jewelers, FAQ, final CTA, footer

## Implemented (2026-10-23)
- Full landing page + waitlist backend, verified at 1440px and 390px
- User's Karat logos integrated (public/brand/): ivory wordmark w/ gold diamond in nav, "Karat design" in footer, K mark in marquee + final CTA; PNG favicons from K mark (thickened diamond)
- Simplified per feedback: removed embed code/"one line" messaging, AR size detection, How-it-works, CRM mock board. Structure now: Hero → Marquee → For your clients (Design + Try-on: photo upload / live camera) → For your studio (Design & consult, Client CRM, Production briefs) → FAQ → CTA

## Placeholders
- Contact email [hello@karatdesign.io], embed snippet URL, CRM sample names, product names (Atelier/Mirror/Ledger), generated photos, SVG logo

## Backlog
- P0: Swap in real brand assets/logo when uploaded
- P1: Admin view/export of waitlist; confirmation email
- P2: Live interactive demo of configurator; SEO setup
