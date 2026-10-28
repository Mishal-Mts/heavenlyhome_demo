# Defender Villas website

Static site for premium gated beach villas near Kodungallur, Thrissur, Kerala. The promoter is **Defender Real Estates & Builders Limited**. The site was originally branded "Heavenly Homes" and is being rebranded to **Defender Villas** (https://defendervillas.com). Audience: Kerala, Indian and Gulf/NRI buyers, mostly on mobile. The goal is enquiries by call, WhatsApp or the form.

## Files
- `index.html`: markup. `css/styles.css`: styles. `js/main.js`: behaviour, with **CONFIG at the top** (all client details and `CONFIG.brand`).
- `images/originals/`: source files (never referenced by the page). `tools/build-images.mjs` (`npm run images`) makes AVIF/WebP widths in `images/` and rewrites every `<picture data-img="name">` in index.html.
- `tools/build-brand.mjs` (`npm run brand`): logo variants, favicons and `images/og-image.jpg`.
- `tools/screenshots.mjs <label>`, `tools/diff.mjs <a> <b>`, `tools/check-brand.mjs`: Playwright checks (serve first with `npm run serve`).

## Motion (js/motion.js)
- GSAP 3.15.0 (core, ScrollTrigger, SplitText) and Lenis 1.3.26 are vendored in `/vendor` (pinned; refresh with `npm run vendor`). All scripts load with `defer`: gsap, ScrollTrigger, SplitText, lenis, main.js, motion.js.
- Reveal hooks: `data-anim="fade-up | stagger | line-reveal | clip-reveal | parallax | count"`. Tokens (ease, durations, travel) are defined once at the top of motion.js.
- The head script sets `js hero-panel motion` on `<html>` (`motion` only without reduced motion). CSS hides reveal targets only under `.motion`. A 4 s failsafe removes `motion` and `hero-panel` if the scripts never run. Scripts that run late skip entrance animations.
- Lenis: wheel smoothing only, native touch. Anchors are handled in motion.js; Lenis applies the CSS `scroll-padding-top` for the header. `site:lock` events from main.js (lightbox, enquiry panel) stop and start Lenis. Scrollable overlays carry `data-lenis-prevent`.
- `CONFIG.HERO_FORM_MODE`: `'panel'` (the hero form moves into `#enqPanel`, opened by `[data-panel]` buttons) or `'inline'`. `CONFIG.heroLoop`: an optional desktop hero video, probed with a HEAD request after load.
- Atmosphere: `.atmos` is a fixed sky behind the `.cine` sections (strip, about, villas, walkthrough, gallery, development banner, enquire). motion.js blends `--atm-top/--atm-bottom/--atm-glow` dawn, then day, sunset and dusk, using stops at #hero, #villas, #gallery and #location. Every other `main>section` is opaque white or sand.
- Layered parallax: `data-parallax="speed"` (an image inside a clipping `.frame` is scaled so its edges never show). Curtain hand-off: `.handoff` wraps #development (sticky, desktop) and #location (`.curtain`, slides over).
- Hero copy order: location line, h1, buttons, then `.hero-more` (subtext and pills), which arrive after the headline. On phones the pills wait for the first scroll and sit just below the fold.
- Tests: `node tools/test-motion.mjs` (38 behaviour checks), `node tools/check-contrast.mjs` (measures real contrast behind text over images and the atmosphere; must report 0 below AA), `tools/verify-load.mjs`, `tools/check-brand.mjs`.

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
- Narrative copy that says "Heavenly Homes" stays as written until the client decides. See `BRAND_REVIEW.md`.
- Logo variants: `images/logo-defender-villas.png` (red, for light backgrounds and the solid header) and `images/logo-defender-villas-white.png` (for the hero, dark sections and the footer). The header shows `.lo-l` while transparent and `.lo-d` when `header.solid`. Fallback wordmark: "DEFENDER VILLAS".
- Palette changes go only through the CSS custom properties in `:root`, with WCAG AA contrast (4.5:1 for text). Palette changes need client approval.
- The canonical URL, Open Graph and Twitter tags, sitemap.xml and robots.txt point at https://defendervillas.com/. HTTPS must be enabled on the host.
