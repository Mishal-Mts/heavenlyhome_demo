# heavenly_homes

Website for **Defender Villas**: premium gated beach villas near Kodungallur, Thrissur, Kerala, by Defender Real Estates & Builders Limited. It is a plain static site: upload the folder to any static host. The site has no runtime build step.

## Edit client details (CONFIG)
Open `js/main.js`. Everything at the top, inside `var CONFIG={...}`, is safe to edit:

- `CONFIG.brand`: `name` (shown in the header fallback, footer, WhatsApp messages, saved contact and consent line), `project`, `domain`, `tagline`.
- Phone, WhatsApp, email, K-RERA number, approvals, build stage, video, 360 photo, and the Minu John and Mercea cards.
- `CONFIG.images`: the picture slots (see "Adding or replacing images" below).
- Leave a value as `''` and the related text or button stays hidden.
- `ENDPOINTS` (just below CONFIG): the form delivery URLs. Enquiries are not sent anywhere until this list is filled.

---

## Adding or replacing images (step by step)

### How it works, in one paragraph
Every picture on the website has a **slot name**, for example `hero` for the big picture at the top or `villa-budget` for the Budget villa card. Each slot has the **current** brochure image, which is never changed or deleted, and a **hi-res** file name where a better image can go, for example `hero-hires.jpg`. When a hi-res file is in the `images` folder, the website uses it. When it isn't, the website uses the brochure image. You never edit code to swap a picture. The full list of slots, file names and sizes is in **MISSING_ASSETS.md**.

### One-time setup (about 5 minutes)
1. Go to **https://nodejs.org**, download the **LTS** version for Windows and install it (click Next until it finishes).
2. That's it. The first time you use the helper files below, they download the remaining tools automatically. This needs an internet connection and takes a few minutes.

### To add or replace a picture
1. **Find the slot.** Open `MISSING_ASSETS.md` (section 2 or 4) and find the picture you want to replace. Note its **"Save as"** name, for example `villa-budget-hires.jpg`.
2. **Save the new picture** into the website's `images` folder **with exactly that name**:
   - Use JPG or PNG, as large as you have (at least the size listed).
   - If you have a PNG, keep the name and use `.png`, then open `js/main.js`, find the slot's line under `images:` and change `-hires.jpg` to `-hires.png`.
   - **Do not** delete, rename or overwrite the old brochure picture (for example `wall.jpg`).
3. **Double-click `update-images.bat`** in the website folder. A black window opens.
   - Wait until it says **"Done."** (usually under a minute).
   - The table in the window lists every slot. Your slot should now say **yes** under HI-RES? and **hires** under PAGE USES.
   - Press any key to close the window.
4. **Check it.** Double-click **`preview-site.bat`**. Your browser opens the website at http://localhost:8080. Look at your picture. To stop the preview, close the black window.
5. **Publish.** Upload the website folder to your web host as usual. At minimum, upload `index.html`, the whole `images/auto` folder and your new picture.

### To undo a replacement (go back to the brochure picture)
1. In the `images` folder, **rename** your hi-res file, for example from `villa-budget-hires.jpg` to `villa-budget-hires-OLD.jpg`. You can also move it to another folder, or delete it if you no longer need it.
2. **Double-click `update-images.bat`** again. The slot now says **no** / **current**, and the website uses the brochure picture again.
3. Check with `preview-site.bat`, then upload `index.html` and the `images/auto` folder again.

### Good to know
- **Your original pictures are safe.** The script only *reads* them. It writes its web-ready copies into `images/auto` (a folder it manages itself) and never changes anything else.
- **A permanent backup** of all the brochure pictures is in `images/brochure-originals`. Those files are read-only. Never edit or delete them. If a brochure picture is ever lost, copy it back from there.
- **Small pictures are never stretched.** If a picture is smaller than its place on the page, the window table says "smaller than needed". The site then shows it at its real size (soft edges on wide screens), until a larger hi-res picture is added.
- **Optional extras** (the slots marked "optional" in the table, like the sky and texture images in section 4 of MISSING_ASSETS.md) stay hidden until their hi-res file exists. When one appears, the site adds an "Artist's impression" note automatically.
- **Interior and progress photos:** save them as `interior-living.jpg`, `interior-bedroom.jpg`, `interior-kitchen.jpg` or `progress-latest.jpg` in `images`. They appear in the gallery by themselves. No script is needed.
- **Colour grade:** the web copies get a gentle, consistent warm grade. To turn it off, set `imageGrade:''` in `js/main.js`, then run `update-images.bat` again.
- **Without the .bat files** (Mac or command line): open a terminal in the website folder and run `npm install` once, then `npm run images`. To preview, run `npm run serve`.

---

## Brand assets
The logo variants, favicons and the link-preview picture (`og-image.jpg`) are already made. `npm run brand` does nothing unless you add `--force`, so these files can't be overwritten by accident.

## Preview and checks
```bash
npm run serve
```
Then open http://localhost:8080. With the server running:
- `node tools/screenshots.mjs <label>` takes full-page screenshots at 390, 768 and 1440 px.
- `node tools/check-brand.mjs` checks the logo swap and brand text.
- `node tools/test-motion.mjs` checks the motion features: Lenis, reveals, header, enquiry panel, lightbox, pinned scenes, reduced motion, no-JS and the script-failure fallback.
- `node tools/check-contrast.mjs` measures real text contrast over the images and the background sky.
- `node tools/test-final.mjs` runs the slow-phone (4x CPU, Fast 4G), saved-contact, map, video, 360, keyboard and inline-form checks.
- `node tools/serve.mjs 8081` serves the site the way a real host does (compressed), then `node tools/lighthouse.mjs http://localhost:8081/ mobile` (or `desktop`) runs Lighthouse.

## Publishing
Upload everything **except** `node_modules`, `tools`, `.shots` and `images/brochure-originals` (the backup does not need to be online). Turn on **HTTPS** at your host (the canonical URL, sitemap and share links use https://defendervillas.com) and leave the host's compression (gzip or brotli) on. The site uses no outside services at page load: fonts and scripts are all in the folder.

## Hero options (in CONFIG)
- `HERO_FORM_MODE: 'panel'`: the hero form opens in a slide-in panel from every Enquire button. Set `'inline'` to put the form back in the hero.
- `heroLoop: 'images/hero-loop.mp4'`: save a 6-10 s muted loop with this name, then double-click `update-images.bat`; it plays behind the hero on desktop. Phones, Save-Data and reduced motion keep the still image.
