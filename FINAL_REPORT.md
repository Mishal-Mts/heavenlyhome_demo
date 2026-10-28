# Defender Villas website: final report

Static site (HTML, CSS, JS) for premium gated beach villas near Kodungallur, Thrissur, by Defender Real Estates & Builders Limited. It was rebranded from "Heavenly Homes" to **Defender Villas** (https://defendervillas.com) and turned into a cinematic, scroll-driven experience. All work is on `main`, committed per phase.

## What changed

| Phase | Result |
|---|---|
| 0 Setup & rebrand | Page split into `index.html`, `css/styles.css` and `js/main.js` (screenshots pixel-identical before and after). New Defender logo in colour and white variants; favicons; link-preview image (`og-image.jpg`); `CONFIG.brand`; title, meta, canonical, Open Graph, Twitter, JSON-LD, `robots.txt`, `sitemap.xml`. Narrative "Heavenly Homes" copy listed in `BRAND_REVIEW.md`, not changed. |
| 1 Motion foundation | GSAP 3.15.0 (ScrollTrigger, SplitText) and Lenis 1.3.26, stored locally. One set of motion tokens and a `data-anim` system (fade-up, stagger, line-reveal, clip-reveal, parallax, count). Header hides on scroll down and shows on scroll up; progress line along the top. |
| 2 Hero | Full-screen hero with slow zoom, line-by-line headline, then subtext and pills; optional desktop video loop; phone art direction; slide-in enquiry panel (focus-trapped, Esc closes, scroll locked). `CONFIG.HERO_FORM_MODE` switches back to the inline form. |
| 3 Story | Fixed "sky" that blends dawn, day, sunset and dusk behind the cinematic sections; half-bleed About; counting stats; development banner with the Location section sliding over it like a curtain; full-width closing enquiry background. |
| 4 Signature scenes | Desktop: pinned villa handover (Premium to Budget), sideways-scrolling pinned gallery, route drawing itself on the location sketch, framed walkthrough, palm ornament. Phones keep the swipe carousels. |
| 5 Images | Read-only backup `images/brochure-originals/`. Every picture is a slot in `CONFIG.images` that uses `<slot>-hires.jpg` when it exists and falls back to the brochure image otherwise. Small images are never stretched. `MISSING_ASSETS.md`; `update-images.bat` and `preview-site.bat`; plain-language README steps. |
| Polish | Navy, red and gold palette through the existing variables; larger, lighter headings; fewer competing elements; red only on primary actions; neighbouring sections never share a layout. |
| 6 Performance, SEO, accessibility | Fonts and the 360 viewer are hosted locally (no outside requests at page load); one stylesheet; everything below the hero is set up when the browser is idle; nothing missing is requested at load; small WebP logo copies; re-measuring when late fonts change the page height. |

## Measured results (local, realistic host with compression)

- **Lighthouse mobile** (simulated slow 4G, 4× slower CPU), three runs: Performance **97–98**, Accessibility **100**, Best Practices **100**, SEO **100**. LCP **2.2–2.3 s**, CLS **0**, TBT 110–160 ms.
- **Lighthouse desktop:** **100 / 100 / 100 / 100**. LCP 0.7 s, CLS 0.
- **Without compression** (plain local test server), mobile Performance is about 80. Real hosts compress by default; keep that on.
- **Contrast:** 203 measurements on real pixels behind the text (images and sky), at 1440 and 390 px, all AA or better.
- **Behaviour tests:** `tools/test-motion.mjs` 50/50 and `tools/test-final.mjs` 14/14. They cover:
  - Lenis, reveals, header and logo swap, enquiry panel (focus trap, Esc, scroll lock), anchors, mobile menu, lightbox and form submit;
  - the villa and gallery pins, keyboard focus inside them, the route drawing and resizing back to phone layout;
  - reduced motion, JavaScript disabled, and scripts failing to load (content still shown);
  - a phone and a desktop with 4× CPU slowdown on Fast 4G (LCP about 2.2 s, nothing left hidden, no errors);
  - the saved contact (ORG and NOTE say "Defender Villas"), map click-to-load, the video fallback, 360 drag and arrow keys, focus rings, every control having a name, and the inline form mode.

## What you or the client must supply
See `MISSING_ASSETS.md` for exact file names and sizes.
1. **High-resolution originals of the villa renders.** Most important: hero, Budget villa (only 608 px today), development banner and enquiry background are below the size their place needs.
2. **Contact details and compliance data in CONFIG:** phone, WhatsApp, email, K-RERA number and QR, permits, build stage, office, CIN, Minu John and Mercea details.
3. **`ENDPOINTS`** for the enquiry forms. **Until this is set, enquiries are not sent anywhere.**
4. **Optional:** walkthrough video, hero loop video, a real 360 photo, interior and site-progress photos, a sister-concern logo, an SVG logo, and AI atmosphere images (prompts provided).

## Not verified
- **Real devices:** iPhone Safari and Android Chrome (address-bar resizing, touch inertia) and trackpad feel. Only an emulated phone was tested.
- **Videos:** the hero loop and walkthrough video playback. There are no video files yet, and the test browser has no MP4 support.
- **Real 360 viewer:** Pannellum with a real photo, since there is no photo yet.
- **Form delivery:** no endpoint is configured yet.
- **Live domain:** HTTPS and the canonical URL on defendervillas.com, which isn't live yet.
- **Slow-network results:** the throttled tests used emulated throttling, not a real slow network.

## Known limitations
- **Page length:** the desktop pinned scenes add about 5,000 px of scrolling, mostly the 10-image gallery.
- **Small images:** five brochure images are smaller than their place. They're shown at their real size with soft edges until hi-res files are added.
- **Leftover files:** generated files from Phase 0 (for example `images/hero-800.avif`) and `images/originals/` are unused but kept, under the no-delete rule.
- **Map button overlap:** the "Load interactive map" button overlaps one label on the location sketch. This predates the project and is unchanged.
- **Brand files:** the brand-file script needs `--force`, to protect the existing brand files.

## Decisions waiting on you
1. **Project name:** keep "Heavenly Homes" as the project name, or rename the seven narrative lines (`BRAND_REVIEW.md`).
2. **Header tagline:** "BY DEFENDER REAL ESTATES" under the "Defender" logo: keep, remove or change to "VILLAS".
3. **Enquiry form position:** in the slide-in panel (current) or inline in the hero (`HERO_FORM_MODE`).
4. **Colour grade:** the gentle grade on web image copies (`imageGrade:'warm'`), on or off.
5. **AI disclosure wording:** the footer line that appears only if AI atmosphere images are added.
