# Missing assets: what to ask for and where it goes

Every picture on the site is a **slot** (listed in `js/main.js` under `images:`). Each slot has:
- **current**: the brochure image in use today. It is never changed or deleted.
- **hires**: the file name for a better replacement.

Save a replacement in the `images` folder with exactly the hires name, then double-click `update-images.bat`. The site switches to the new file automatically, and goes back to the brochure image if the hires file is removed (see README, "Adding or replacing images").

All brochure images are backed up, read-only, in `images/brochure-originals/`.

---

## 1. Audit of the current images

| File | Pixel size | Used in slot(s) | Verdict |
|---|---|---|---|
| hero.jpg | 1400 × 789 | hero, walkthrough-poster, gallery-beach-villa | **Too small for full screen** (needs ≥ 1600, ideally 2400). Shown at real size with soft edges on wide screens. |
| aerial.jpg | 1400 × 689 | development-banner, preview-360, gallery-beachfront-dusk | **Too small for the full-width banner.** Fine in the gallery; soft on high-DPI screens in the 360 preview. |
| pavilion.jpg | 1322 × 568 | enquire-backdrop, gallery-pavilion | **Too small for the full-width enquiry background.** Fine in the gallery. |
| row.jpg | 1400 × 618 | about-main, gallery-villa-row | OK on normal screens; soft on high-DPI screens in About. |
| villa.jpg | 1400 × 1067 | villa-premium, gallery-villa-front | OK. |
| wall.jpg | 608 × 640 | villa-budget, gallery-feature-wall | **Too small for the Budget villa card** (needs ≥ 770). Shown in a narrower frame. Soft in the gallery on high-DPI screens. |
| entry.jpg | 538 × 550 | gallery-entrance | **Slightly too small** for gallery slides on very wide screens (needs 560). Shown in a narrower frame. |
| stairs.jpg | 740 × 1095 | gallery-staircase | OK on normal screens; soft on high-DPI screens. |
| beach.jpg | 969 × 785 | about-beach, gallery-beach | OK (real photo). |
| sunset.jpg | 1047 × 501 | gallery-sunset | OK. |
| logo-defender-villas.png / -white.png | 754 × 160 | header, footer, group card | Made from the supplied 1678 × 356 logo. OK. |
| logo-mercea.png | 123 × 147 | group card | Small but shown small. A larger or SVG version would be sharper. |
| og-image.jpg | 1200 × 630 | link previews (WhatsApp, Facebook…) | OK. |

**Repetition:** hero.jpg, aerial.jpg, row.jpg, villa.jpg, wall.jpg, pavilion.jpg and beach.jpg each appear in 2–3 places. Every place now has its own slot, so each one can get a different image later without touching the others. No brochure image was removed from the page.

---

## 2. High-resolution originals to request from the client (most important)

The villa images **must** come from the client's original renders or photos. Never use AI images for the villas. Ask for the original render files (the brochure versions are compressed copies), as large as possible, JPG or PNG.

| Save as (in `images/`) | Minimum size | Shape | Where it is used | What it should show |
|---|---|---|---|---|
| hero-hires.jpg | 2400 × 1350 | 16:9 landscape | Hero, full screen | The same beach-villa render as hero.jpg, full resolution |
| hero-mobile-hires.jpg | 1200 × 1800 | 2:3 portrait | Hero on phones (optional) | A portrait crop or render of the same villa, villa in the upper half |
| about-main-hires.jpg | 2400 × 1500 | 16:10 | About section, large image | Villa row render (same as row.jpg) |
| about-beach-hires.jpg | 1200 × 1200 | square | About, small floating photo | **Real photo** of the beach near the site |
| villa-premium-hires.jpg | 1800 × 1350 | 4:3 | Villas: 2-in-1 Premium card | Premium villa render (same as villa.jpg) |
| villa-budget-hires.jpg | 1800 × 1350 | 4:3 | Villas: Budget card | Budget single-storey villa render (wall.jpg is only 608 px) |
| walkthrough-poster-hires.jpg | 1920 × 1080 | 16:9 | Still frame before the walkthrough video plays | A frame from the walkthrough video |
| preview-360-hires.jpg | 2800 × 1380 | about 2:1 | 360 preview demo | Wide aerial render of the beachfront (same as aerial.jpg) |
| gallery-beach-villa-hires.jpg | 1600 × 1200 | 4:3 | Gallery 1 | Beach villa render |
| gallery-villa-front-hires.jpg | 1600 × 1200 | 4:3 | Gallery 2 | 2-in-1 villa front |
| gallery-villa-row-hires.jpg | 1600 × 1200 | 4:3 | Gallery 3 | Villa row |
| gallery-entrance-hires.jpg | 1600 × 1200 | 4:3 | Gallery 4 | Entrance & planters |
| gallery-staircase-hires.jpg | 1200 × 1600 | 3:4 | Gallery 5 | Terrace & glass staircase |
| gallery-feature-wall-hires.jpg | 1600 × 1200 | 4:3 | Gallery 6 | Feature wall |
| gallery-beach-hires.jpg | 1600 × 1200 | 4:3 | Gallery 7 | **Real photo** of the beach |
| gallery-beachfront-dusk-hires.jpg | 1600 × 1200 | 4:3 | Gallery 8 | Beachfront at dusk render |
| gallery-pavilion-hires.jpg | 1600 × 1200 | 4:3 | Gallery 9 | Seaside pavilion render |
| gallery-sunset-hires.jpg | 1600 × 1200 | 4:3 | Gallery 10 | Sunset by the sea |
| development-banner-hires.jpg | 2400 × 1350 | 16:9 or wider | "The development" banner, full width | Aerial render of the development |
| enquire-backdrop-hires.jpg | 2400 × 1350 | 16:9 or wider | Enquiry section background (shown dimmed) | Pavilion or dusk render of the project |

**Also ask the client for:**
- **Logo:** an SVG or a large transparent PNG of the Defender logo. If a "Defender Villas" lockup exists, that version too.
- **Mercea logo:** an SVG or a larger PNG.
- **Sister-concern logo:** `logo-sister.png` (transparent PNG), for Minu John's card.
- **Interior renders:** `interior-living.jpg`, `interior-bedroom.jpg`, `interior-kitchen.jpg` (1600 × 1200 or larger). These appear in the gallery automatically as soon as the files exist.
- **Site progress photo:** `progress-latest.jpg` (1600 × 1200, a real photo, dated). It also appears in the gallery automatically.
- **K-RERA QR code** image, e.g. `rera-qr.png`. Set `reraQr` in CONFIG.

## 3. Video and 360 footage

| Save as | Spec | Where it is used |
|---|---|---|
| images/hero-loop.mp4 | 6–10 s seamless loop, 1920 × 1080, H.264, muted, under 6 MB. Drone or slow gimbal shot of the beach or villas. | Behind the hero on desktop (plays automatically when the file exists) |
| images/walkthrough.mp4 | 1920 × 1080 H.264, ideally under 40 MB (or upload to YouTube and set `yt` in CONFIG) | Walkthrough "Play" button |
| images/tour-360.jpg | Equirectangular 360° photo, 2:1, at least 6000 × 3000 | Replaces the 360 demo. Set `tour360:'images/tour-360.jpg'` in CONFIG |
| Real site photos | Several, landscape, at least 2000 px wide: plot, access road, beach walk, gate | For future gallery or progress use (real photos, so no "Artist's impression" label) |

---

## 4. Atmosphere images (may be AI-generated)

These are **atmosphere only**: sky, palms, sea and texture, with **no villas or buildings**. The villas must always come from the client's renders. Every one of these slots is optional and hidden until its file exists. When one is used, the site automatically shows an "Artist's impression" note: a badge on the NRI background, plus a disclosure line in the footer for the sky and texture layers.

**Shared style (paste at the end of every prompt):**
> golden-hour light, warm teal-and-gold colour grade, photorealistic, realistic Kerala coastline with coconut palms and the Arabian Sea, soft natural haze, calm and premium, wide cinematic composition, no people, no text, no logos, no watermarks, no buildings

| Save as (in `images/`) | Size | Where it is used | Prompt (add the shared style at the end) |
|---|---|---|---|
| atmos-dawn-hires.jpg | 2400 × 1350 (16:9) | Faint sky layer behind About (the "hero wide beach plate") | Ultra-wide empty beach at dawn on the Kerala coast, gentle waves, long low horizon, pastel sky warming to gold, lots of open sky in the upper half |
| atmos-day-hires.jpg | 2400 × 1350 (16:9) | Faint layer behind Villas and Walkthrough | Coconut grove beside the beach, tall palms in soft backlight, dappled light on sand, sea glimpsed between the trunks |
| atmos-sunset-hires.jpg | 2400 × 1350 (16:9) | Faint layer behind Gallery and the development banner | Sunset sky over the Arabian Sea, sun low on the horizon, layered clouds in coral and gold, calm water reflecting the light |
| atmos-dusk-hires.jpg | 2400 × 1350 (16:9) | Faint layer behind the closing enquiry section (the "closing dusk plate") | Blue-hour dusk over a quiet Kerala beach, last band of gold on the horizon, palm silhouettes at the edges, deep teal sky |
| nri-backdrop-hires.jpg | 2400 × 1350 (16:9) | Gulf & NRI section background, dimmed (the "shoreline detail") | Close shoreline detail: wet sand, thin foam lines of a receding wave, golden reflections, shallow depth of field |
| strip-texture-hires.jpg | 2400 × 600 (4:1) | Very faint texture behind the stats strip (the "wave texture") | Top-down abstract texture of small sea waves and foam patterns, even and low-contrast, seamless feel |

The **mobile hero crop** (`hero-mobile-hires.jpg`) shows the villa, so it is listed under section 2 and must come from the client's render, not from AI.

After adding any image, double-click `update-images.bat`. The table it prints shows which file each slot uses.
