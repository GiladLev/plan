# Recon map — iplan.co.il (public marketing + directory surface)

Scope agreed with user: **everything public**, both locales (`/he-IL` RTL primary, `/en-US` LTR mirror), **interactive** fidelity, stack **Next.js**, assets **mixed** (reuse photos/illustrations/logos as dev-reference; replace licensed icon fonts — Font Awesome 5 Pro and the proprietary `iplan` icon font — with open equivalents).

Sources: public pages only, read with Playwright at human pace. Extraction data lives in `replica/pixel/` (never shipped):

- `pixel/extract/<locale>/<page>@<w>.json` — visible-element tree with rects + computed styles, assets, icon glyphs, hover/focus/active deltas (1440 & 390)
- `pixel/extract/<locale>/<page>.html` — cleaned DOM snapshot (structure + copy reference)
- `pixel/extract/<locale>/states/` — dropdowns open, mobile menu modal, tabs, filters, map view, cookie banner (png + json)
- `pixel/extract/<locale>/_tokens.md` — aggregated primitives
- `pixel/screens/original/<locale>/<page>@<w>.png` (+ `.fold.png`, `.cookie-banner.png`)
- `pixel/assets/` — downloaded imagery (`index.json` maps URL → file), `icon-ref/` 4x crops of every icon glyph, `directory/` venue photos & logos
- `pixel/seed/<locale>/dir-*.json` — directory results, filters, SEO links (structured seed data)

## Observed stack (public)
Ruby on Rails (Phusion Passenger) behind Cloudflare; Bootstrap 3.3.6 custom RTL theme (**24-column grid, 14px gutters → 7px half-gutter; container 1154px @≥1200 incl. padding, i.e. 1140 content**); jQuery 1.10.2 + Bootstrap JS; Flickity carousels; PhotoSwipe; Twitter Typeahead (vendor search); Google Maps JS (directory map view); Google reCAPTCHA v3 badge; GA4 + FB pixel. Fonts: **Rubik** 300/400/500/700/900 from Google Fonts (he-IL); **Arial** on en-US. Icon fonts: Font Awesome 5 Pro (solid 900 / light 300 / brands) + custom `iplan` font (`ip-icon-*`). `html { font-size: 10px }`, body 16px/100-weight Rubik (renders as 300), colour `#333`. Breakpoints: 768 / 992 / 1200 (+ max 767 / 991).

## Screen inventory
| ID | screen | route (he-IL; en-US mirror where it exists) | purpose | key components | states seen |
|---|---|---|---|---|---|
| S01 | Home | `/he-IL` (= `/front/client/home`; `/` 301→`/he-IL`) | marketing landing | Navbar, Hero (textured), Callouts ×3 (sprite icons), Features (4 pills + tab panes + venue photo), Testimonials ×3 (random per load), Vendor logo Flickity carousel (sprite), Contact CTA, Footer, Cookie banner | tabs, carousel drag/arrows, dropdowns, mobile menu modal |
| S02 | Client sign-in | `/he-IL/client/sign_in` | host login | Hero, 3 buttons (Facebook, Google, email) → email form | email form, focus, error |
| S03 | Corp sign-in | `/he-IL/corp/sign_in` (no en-US → 404) | vendor login; **separate layout** (BS4-style, blue wave bg, card, lock illustration, no main navbar) | card form, social buttons, password toggle | focus, password shown, submit-empty |
| S04 | About | `/front/about` | company story | Hero, text, "recipe" plate illustration + ingredient list, team mosaic (134 photos) with centered quote card, world map | — |
| S05 | Accessibility statement | `/front/accessibility_statement` | legal | Hero, prose | — |
| S06 | Contact | `/front/contact` | contact forms | Hero, 4 audience pills (icons), per-audience form (jQuery-UI themed select), submit | pill switch, visibility toggles |
| S07 | Jobs | `/front/jobs` | careers | Hero, intro, 2×2 photo/colour tiles, job cards list | — |
| S08–S18 | Client feature pages | `/front/client/{guest_list,sketches,tasks,credit_gifts,rsvp,digital_invitation,notify,minisite,reception,help,testimonials}` | feature marketing | Hero, feature sections with photos/illustrations, icon lists, full-bleed banners, 4-up icon grids; help = FAQ with side index; testimonials = 19,600+ header, star summary, review list, load-more; minisite has 4 pills (iPhone mockups); credit_gifts embeds YouTube | tabs (minisite), tooltips (guest_list), load-more (testimonials) |
| S19 | Vendor home | `/front/vendor/home` | B2B toolbox | Hero, illustration, 2-col icon feature list, testimonial Flickity carousel (bg photo), partner logo grid, FAQ CTA | carousel |
| S20 | Vendor marketing | `/front/vendor/marketing` | B2B marketing | Hero, 4 callouts (sprite), browser/analytics screenshots, map image, contact form image | — |
| S21 | Directory category ×14 | `/directory/search/categories/<id>-<slug>` (he-IL only; en-US 404) | ad-free search | Filters sidebar (collapsible checkbox groups, advanced switches, submit), results header (category icon, togglers filter/list/map, meta "20 of 300+"), 2-col brand cards (Flickity gallery w/ lazy bg, logo, name, stars+count, type • capacity, city/phone/more buttons), SEO link grid, Google map pane | filters open/closed, more filters, hide filters, map view, card hover, gallery next, pagination |
| S22 | 404 | any unknown path | error | Hero-less exception page with callouts sprite | — |
| S23 | Privacy statement | `/client/legal_info/privacy_statement` → redirects to `app.iplan.co.il` (different app) | legal | out of scope (external host) — link kept | skip |

Shared: **Navbar** (fixed, 62px, `#4b688d` + grey_overlay texture, bottom border `#324b69`, 1px dividers via box-shadow `#324b69`/`#546e8f`; brand = iplan logo glyph 40px `#f2f2f2`; left cluster "כניסה למערכת" dropdown (bordered button-like), "יצירת קשר" two-line; right cluster 3 items: "כלים לניהול אירוע" mega-dropdown (2 headers, two-col lists with icons), "מקומות לאירוע" link, "ספקים" mega-dropdown (13 categories + empty filler), search typeahead (rounded white input "חיפוש ספק" w/ search icon)), **Mobile menu** (`<768`: hamburger → full-screen Bootstrap modal with logo header, "כניסה למערכת" collapsible, then all groups expanded), **Footer** (`#333`, 4 cols: iPlan links + flags, host links, vendor links, "נוצר ב ♥ © 2026 iPlan" + reCAPTCHA notice), **Cookie banner** (fixed bottom, `#4b688d`-ish bar, text + "קראתי" btn-info), **Hero** (`#d1c8b2` + rays.gif texture via `::before`, h1 52px/500 `#893f48`, subtitle 22px/300, bubble.png wavy bottom edge).

## Flows
- F01 Discover venue: S01 → "חיפוש מקום לאירוע" → S21 → open filters → search → card → (brand page: out of scope) · edge: map view, mobile full-screen filters
- F02 Learn a feature: S01 features tabs / nav mega-menu → S08–S18 → CTA → S02
- F03 Vendor interest: nav "ספקים" → S19/S20 → contact (S06, pill "ספק")
- F04 Login: nav "כניסה למערכת" → S02 (host) / S03 (vendor)
- F05 Switch language: footer flags → `/en-US` mirror (LTR, Arial)

## Components (see pixel/extract/*/_tokens.md for values)
Navbar, Dropdown mega-menu (caret, two-col), Mobile nav modal, Hero, Section (white / `#eef1f3` gray / full-bleed photo), Callout (sprite icon circle + title + text + dotted link), Feature pills (circle icon 70px coloured), Tab pane with icon list, Testimonial card (circular photo, title, date label, side labels), Logo carousel (Flickity-like, wrap-around, draggable, arrows), Contact CTA (life-ring icon), Footer, Cookie banner, Buttons (btn-primary `#337ab7`/`#2e6da4` r6; btn-default white `#ccc`; btn-info; btn-lg 46px; btn-sm), dotted link (`border-bottom 1px dashed`), Filter accordion (chevron up/down), Switch (round slider), Brand card (shadow `0 0 5px rgba(0,0,0,.1)`, r3), Stars, Pagination, Map pane, Review list, FAQ index, Form controls (BS3 + jQuery UI select), YouTube embed.

## Data model (inferred)
Category(id, slug, title, icon) · Brand/Location(location_id, name, href, logo, rating, reviews, type, capacity, city, phone, gallery[]) · FilterGroup(attr_id, title, options[]) · Review(author, date, event labels, text, photo) · Job(title, sections) · FAQ(q, a).

## Cannot/should not clone (skip)
Google Maps tiles & key (use Leaflet + CARTO tiles, same pane geometry) · reCAPTCHA badge (static look-alike or omitted) · live search typeahead backend (static index of brand names from seed) · Facebook/Google OAuth (buttons only) · brand detail pages `/directory/brands/*` (not in scope) · app.iplan.co.il privacy page · analytics pixels.

## Size: XL (36 templates × 2 locales × 4 viewports, pixel loop). Hardest: directory page (filters + galleries + map + mobile), RTL/LTR dual theme, icon-font replacement fidelity.
