# Defender Villas website

Static site for premium gated beach villas near Kodungallur, Thrissur, Kerala. The promoter is **Defender Real Estates & Builders Limited**. The site was originally branded "Heavenly Homes" and is being rebranded to **Defender Villas** (https://defendervillas.com). Audience: Kerala, Indian and Gulf/NRI buyers, mostly on mobile. The goal is enquiries by call, WhatsApp or the form.

## Files
- `index.html`: markup. `css/styles.css`: styles. `js/main.js`: behaviour, with **CONFIG at the top** (all client details and `CONFIG.brand`).
- Note: `npm run images` also rebuilds `images/auto/logo-defender-villas*-h80.webp` from the old logo PNGs; after running it, restore those two files with `git checkout -- images/auto/logo-defender-villas-h80.webp images/auto/logo-defender-villas-white-h80.webp`.
- Images are **slots** in `CONFIG.images` (js/main.js): `{current, hires}`. `tools/build-images.mjs` (`npm run images` or `update-images.bat`) uses hires if the file exists, else current. It writes AVIF/WebP/JPEG copies only to `images/auto/` and rewrites every `<picture data-img="slot">` (sources, fallback src, width/height, `data-lowres` + `--src-w/--src-h` when the image is smaller than its place). Optional slots (current:'') stay `hidden`; `data-show-with` elements (AI badges, footer disclosure) follow them. The report prints every slot and which file it uses.
- `images/originals/` is legacy (Phase 0 copies; the logo source for `tools/build-brand.mjs`, which now needs `--force`).
- `tools/build-brand.mjs` (`npm run brand`): logo variants, favicons and `images/og-image.jpg`.
- `tools/screenshots.mjs <label>`, `tools/diff.mjs <a> <b>`, `tools/check-brand.mjs`: Playwright checks (serve first with `npm run serve`).

## Motion (js/motion.js)
- GSAP 3.15.0 (core, ScrollTrigger, SplitText) and Lenis 1.3.26 are vendored in `/vendor` (pinned; refresh with `npm run vendor`). All scripts load with `defer`: gsap, ScrollTrigger, SplitText, lenis, main.js, motion.js.
- Reveal hooks: `data-anim="fade-up | stagger | line-reveal | clip-reveal | parallax | count"`. Tokens (ease, durations, travel) are defined once at the top of motion.js.
- The head script sets `js hero-panel motion` on `<html>` (`motion` only without reduced motion). CSS hides reveal targets only under `.motion`. A 4 s failsafe removes `motion` and `hero-panel` if the scripts never run. Scripts that run late skip entrance animations.
- Lenis: wheel smoothing only, native touch. Anchors are handled in motion.js; Lenis applies the CSS `scroll-padding-top` for the header. `site:lock` events from main.js (lightbox, enquiry panel) stop and start Lenis. Scrollable overlays carry `data-lenis-prevent`.
- `CONFIG.HERO_FORM_MODE`: `'panel'` (the hero form moves into `#enqPanel`, opened by `[data-panel]` buttons) or `'inline'`. `CONFIG.heroLoop`: an optional desktop hero video, probed with a HEAD request after load.
- Atmosphere: `.atmos` is a fixed sky behind the `.cine` sections (strip, about, villas, walkthrough, gallery, development banner, enquire). motion.js blends `--atm-top/--atm-bottom/--atm-glow` dawn, then day, sunset and dusk, using stops at #hero, #villas, #gallery and #location. Every other `main>section` is opaque white or sand.
- Layered parallax: `data-parallax="speed"` (an image inside a clipping `.frame` is scaled so its edges never show). `.handoff` wraps #development and #location (`.curtain`, rounded top); #development no longer sticks.
- Closing sections (motion.js "closing sections" block): #development `.dv-stage` opens from a clip-path mask and zooms; on desktop it pins (`.is-scene`) while three `.dv-step`s crossfade (steps 2-3 `.dv-extra` reuse facts from Location/Amenities, aria-hidden, hidden outside the scene). Then three overlapping `.dv-p` panels (slots `dev-panel-*`, crops via object-position) and the outlined `.dv-mq` line, scrubbed sideways. Location: navy SVG map; `.route-draw` paths (first = NH-66) draw in one scrubbed timeline and `.mtown` labels fade in; travel facts are `.loc-list` cards. Developer: outlined 1994 counts from `data-from` and fills (`.dy-fill` clip-path), `.dev-rule` gold line (scaleX), MD photo slot `developer-md` (optional; initials until the file exists). Group: `.grp-link` line (scaleX) between the cards at 900px+.
- Hero copy order: location line, h1, buttons, then `.hero-more` (subtext and pills), which arrive after the headline. On phones the pills wait for the first scroll and sit just below the fold.
- Signature scenes (only at min-width 1024px, min-height 700px, motion allowed): #villas `.v-scene` pins and crossfades the Premium card into the Budget card (`.is-pinned`; the plan card moves to `.v-plan` and back on revert). #gallery pins and scrolls its track sideways (`.is-hscroll`). Keyboard focus inside a pinned scene seeks the scroll to show the focused item. Phones, smaller screens and reduced motion keep the swipe carousels. Pins use refreshPriority; the atmosphere trigger is -1 so it measures after them.
- Location map: `.pulse` ring and `.mwave` sea lines are CSS animations (off with reduced motion). Ornament divider: `#i-orn` symbol.
- Tests: `node tools/test-motion.mjs` (50 behaviour checks), `node tools/check-contrast.mjs` (measures real contrast behind text over images and the atmosphere; skips text mid-crossfade and transparent outlined text; must report 0 below AA), `tools/verify-load.mjs`, `tools/check-brand.mjs`.

## Performance notes (Phase 6)
- No runtime CDNs: fonts are self-hosted (`vendor/fonts`, @font-face written into the top of css/styles.css by `tools/build-fonts.mjs`), Pannellum 2.5.6 is in `vendor/pannellum-2.5.6`. One stylesheet only (Lenis base rules are copied into styles.css).
- motion.js sets up the hero at once; everything below the hero runs at the first idle moment (`later` queue, then ScrollTrigger.sort + refresh). Headings are split only as they approach the screen. A ResizeObserver on <main> re-measures triggers when the page height changes (late fonts, optional photos).
- Nothing missing is requested at page load: optional gallery photos are probed when the gallery comes near; the hero video is used only if the image script found the file (`data-loop` on #hero); the walkthrough still frame is `data-poster`, applied when the section comes near.
- Lighthouse (`tools/serve.mjs` + `tools/lighthouse.mjs`): mobile 97-98 / 100 / 100 / 100, desktop 100 / 100 / 100 / 100. `tools/test-final.mjs`: throttled phone/desktop, vCard, map, video, 360, keyboard, inline mode.

- Cache busting: index.html loads css/styles.css, js/main.js and js/motion.js with `?v=YYYYMMDD`. Change that value whenever those files change, or visitors may keep old cached copies (GitHub Pages caches for 10 minutes).

## IMAGE SAFETY RULES
- Never delete, overwrite, rename, move or recompress any existing image in /images. Processing writes new files only (images/auto/).
- `images/brochure-originals/` is a permanent read-only backup of the whole /images folder as it was before Phase 5. Never modify it.
- New images are added next to the brochure ones as `<slot>-hires.<ext>`. Replacing or undoing never needs a code change.
- Never remove a brochure image from the page unless the user explicitly says so.

## HARD RULES
1. Never change, rewrite or delete the client's copy, prices, facts, disclaimers, FAQ or compliance text. The one exception is brand surfaces (see REBRAND). Keep "Defender Real Estates & Builders Limited" exactly as written (it is the RERA promoter name).
2. Keep CONFIG and ENDPOINTS, and keep every hook working: data-needs / data-call / data-wa / data-wt / data-ptext / data-villa / data-brand, the enquiry forms, the vCard, lightbox, click-to-load map, video play, the 360 preview with its Pannellum swap, and the optional gallery slides (`data-opt`). Don't break ids that main.js uses.
3. Static site only: no framework, and no bundler at runtime. Free tools only. No paid services, API keys or runtime CDNs: install with npm, copy dist files into `/vendor`, and reference them locally with pinned versions.
4. Animate only transform, opacity and clip-path, plus CSS variables for the atmosphere layer.
5. Every effect respects prefers-reduced-motion (show the final state) and degrades cleanly without JS (content visible).
6. Mobile first. Pinned scenes and heavy effects only at min-width 1024px. Use 100svh, not 100vh. Use gsap.matchMedia() for breakpoint and reduced-motion logic.
7. Keep every "Artist's impression" badge (`.ai`) and every disclaimer. Any generated or non-site image must carry the badge.
8. Don't invent content, projects, testimonials or claims.
9. Don't claim an effect works unless it was run. Report what could not be verified.
10. Every image has explicit width/height or an aspect-ratio (no layout shift).

## REBRAND rules
- Brand name, domain and tagline come from `CONFIG.brand`. Brand surfaces (logo, header, footer, title and meta, WhatsApp `data-wt` text via `{brand}`, vCard ORG/NOTE, consent line, aria-labels, alt text) use it.
- The project name is now "Defender Villas" everywhere on the site, including the former "Heavenly Homes" narrative copy (client decision, option B in `BRAND_REVIEW.md`). Don't reintroduce "Heavenly Homes" as the project name. The one exception is the separate sister concern **Heavenly Homes USA** (Minu John) in Our Group (client feedback, 2026-10-31).
- Logo variants: `images/logo-defender-villas.png` (red, for light backgrounds and the solid header) and `images/logo-defender-villas-white.png` (for the hero, dark sections and the footer). The header shows `.lo-l` while transparent and `.lo-d` when `header.solid`. Fallback wordmark: "DEFENDER VILLAS".
- Palette changes go only through the CSS custom properties in `:root`, with WCAG AA contrast (4.5:1 for text). Palette changes need client approval.
- The canonical URL, Open Graph and Twitter tags, sitemap.xml and robots.txt point at https://defendervillas.com/. HTTPS must be enabled on the host.
