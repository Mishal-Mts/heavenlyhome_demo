# heavenly_homes

Website for **Defender Villas**: premium gated beach villas near Kodungallur, Thrissur, Kerala, by Defender Real Estates & Builders Limited. It is a plain static site: upload the folder to any static host. The site has no runtime build step.

## Edit client details (CONFIG)
Open `js/main.js`. Everything at the top, inside `var CONFIG={...}`, is safe to edit:

- `CONFIG.brand`: `name` (shown in the header fallback, footer, WhatsApp messages, saved contact and consent line), `project`, `domain`, `tagline`.
- Phone, WhatsApp, email, K-RERA number, approvals, build stage, video, 360 photo, and the Minu John and Mercea cards.
- Leave a value as `''` and the related text or button stays hidden.
- `ENDPOINTS` (just below CONFIG): the form delivery URLs. Enquiries are not sent anywhere until this list is filled.

## Images
1. Put source photos (JPG/PNG, as large as you have) in `images/originals/`. Keep the same file name to replace an existing photo, e.g. `hero.jpg`.
2. Run `npm install` once, then `npm run images`.

The script writes AVIF and WebP files at 800, 1400 and 2400 px wide (never upscaled) to `images/`. It also updates the `<picture>` tags in `index.html` so browsers pick the best size.

Brand assets (logo variants, favicons, the Open Graph image) are rebuilt with `npm run brand` from `images/originals/logo-defender-villas.png`.

## Preview and checks
```bash
npm run serve
```
Then open http://localhost:8080. With the server running:
- `node tools/screenshots.mjs <label>` takes full-page screenshots at 390, 768 and 1440 px.
- `node tools/check-brand.mjs` checks the logo swap and brand text.
- `node tools/test-motion.mjs` checks the motion features: Lenis, reveals, header, enquiry panel, lightbox, reduced motion, no-JS and the script-failure fallback.

## Hero options (in CONFIG)
- `HERO_FORM_MODE: 'panel'`: the hero form opens in a slide-in panel from every Enquire button. Set `'inline'` to put the form back in the hero.
- `heroLoop: 'images/hero-loop.mp4'`: add a 6-10 s muted loop with this name and it plays behind the hero on desktop. Phones, Save-Data and reduced motion keep the still image.
