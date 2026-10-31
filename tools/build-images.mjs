// Image slots -> web-ready files.   Run: npm run images   (or double-click update-images.bat)
//
// SAFETY: this script only READS the images in /images. It never changes, moves, renames or deletes them.
// Everything it makes goes into images/auto/ (a folder this script owns and may rewrite), and it updates
// the <picture> tags in index.html.
//
// For every slot in CONFIG.images (js/main.js):
//   - if the slot's hires file exists, that is the source; otherwise the slot's current (brochure) file is used
//   - AVIF + WebP copies are made at 800 / 1400 / 2400 px wide (never wider than the source) in images/auto/
//   - <picture data-img="slot"> in index.html gets those copies; its <img> keeps a JPEG fallback
//     (the brochure file itself, or images/auto/<slot>.jpg for a hires source)
//   - an image smaller than its place on the page needs is marked data-lowres, so the CSS shows it in a
//     smaller frame instead of stretching it
//   - optional slots (current:'') stay hidden until their hires file exists
// At the end it prints every slot: current image, whether a hires file exists, and which one the page uses.
import sharp from 'sharp';
import vm from 'node:vm';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';

const OUT = 'images/auto', WIDTHS = [800, 1400, 2400];
// width in CSS pixels each slot fills at its largest on a typical desktop (for the "too small" check)
const NEED = {
  'hero': 1600, 'hero-mobile': 860, 'about-main': 1000, 'about-beach': 360, 'villa-premium': 770, 'villa-budget': 770,
  'walkthrough-poster': 660, 'preview-360': 1000, 'development-banner': 1600, 'enquire-backdrop': 1600,
  'nri-backdrop': 1600, 'strip-texture': 1600, 'atmos-dawn': 1600, 'atmos-day': 1600, 'atmos-sunset': 1600, 'atmos-dusk': 1600,
  'dev-panel-beachfront': 640, 'dev-panel-pavilion': 560, 'dev-panel-sunset': 480,
};
const need = slot => NEED[slot] || (slot.startsWith('gallery-') ? 560 : 800);

// ---- read CONFIG from js/main.js (the one place the client edits) ----
const js = readFileSync('js/main.js', 'utf8');
const start = js.indexOf('var CONFIG='), end = js.indexOf('\n};', start);
const ctx = {}; vm.runInNewContext(js.slice(start, end + 3).replace('var CONFIG=', 'CONFIG='), ctx);
const SLOTS = ctx.CONFIG.images || {}, GRADE = ctx.CONFIG.imageGrade || '';

mkdirSync(OUT, { recursive: true });
const manifestPath = `${OUT}/manifest.json`;
const old = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const manifest = {}, rows = [];

const grade = img => GRADE === 'warm'
  ? img.modulate({ saturation: 1.05 }).linear([1.03, 1.01, 0.98], [-3, -2, 3]) // gentle: warmer highlights, slightly teal shadows
  : img;

for (const [slot, s] of Object.entries(SLOTS)) {
  const hasHires = !!s.hires && existsSync(s.hires), hasCurrent = !!s.current && existsSync(s.current);
  const src = hasHires ? s.hires : hasCurrent ? s.current : '';
  const row = { slot, current: s.current || '(none: optional)', currentSize: '', hires: s.hires, hiresExists: hasHires, using: src ? (hasHires ? 'hires' : 'current') : 'hidden (no image yet)', status: '' };
  if (hasCurrent) { const m = await sharp(s.current).metadata(); row.currentSize = `${m.width}x${m.height}`; }
  if (!src) { rows.push(row); continue; }
  const st = statSync(src), meta = await sharp(src).metadata();
  const key = `${src}|${st.size}|${st.mtimeMs}|${GRADE}`;
  const widths = [...new Set(WIDTHS.map(w => Math.min(w, meta.width)))].sort((a, b) => a - b);
  const fallback = hasHires ? `${OUT}/${slot}.jpg` : s.current;
  if (old[slot]?.key !== key || !widths.every(w => existsSync(`${OUT}/${slot}-${w}.avif`))) {
    for (const w of widths) {
      const img = grade(sharp(src).rotate().resize({ width: w }));
      await img.clone().avif({ quality: 52, effort: 4 }).toFile(`${OUT}/${slot}-${w}.avif`);
      await img.clone().webp({ quality: 78 }).toFile(`${OUT}/${slot}-${w}.webp`);
    }
    if (hasHires) await grade(sharp(src).rotate().resize({ width: Math.min(meta.width, 1600) })).jpeg({ quality: 82, mozjpeg: true }).toFile(fallback);
  }
  const fw = hasHires ? Math.min(meta.width, 1600) : meta.width, fh = Math.round(meta.height * fw / meta.width);
  manifest[slot] = { key, source: src, width: meta.width, height: meta.height, widths, fallback, fw, fh, lowres: meta.width < need(slot) };
  row.status = meta.width < need(slot) ? `smaller than needed (${meta.width} < ${need(slot)} px): shown in a smaller frame, needs a higher-resolution image`
    : meta.width < need(slot) * 1.5 ? 'OK on normal screens, a little soft on high-DPI screens' : 'OK';
  row.sourceSize = `${meta.width}x${meta.height}`;
  rows.push(row);
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));

// small WebP copies of the two logo variants for the page (shown at most ~40 px tall; 80 px covers high-DPI screens)
for (const f of ['logo-defender-villas', 'logo-defender-villas-white']) {
  if (existsSync(`images/${f}.png`)) await sharp(`images/${f}.png`).resize({ height: 80 }).webp({ quality: 90, alphaQuality: 100 }).toFile(`${OUT}/${f}-h80.webp`);
}

// ---- update index.html ----
let html = readFileSync('index.html', 'utf8');
const set = (n, ext) => manifest[n].widths.map(w => `${OUT}/${n}-${w}.${ext} ${w}w`).join(', ');
html = html.replace(/<picture data-img="([\w-]+)"([^>]*)>([\s\S]*?)<\/picture>/g, (all, n, attrs, inner) => {
  let img = inner.match(/<img[^>]*>/)[0];
  attrs = attrs.replace(/ hidden/g, '');
  const m = manifest[n];
  if (!m) { // optional slot with no image (yet, or again after an undo): hidden, no file referenced
    img = img.replace(/ src="[^"]*"/, '').replace(/ width="\d+"/, ' width="2400"').replace(/ height="\d+"/, ' height="1350"');
    return `<picture data-img="${n}"${attrs} hidden>${img}</picture>`;
  }
  const sizes = (img.match(/ sizes="([^"]*)"/) || [, '100vw'])[1];
  img = img.replace(/ src="[^"]*"/, '').replace(/<img /, `<img src="${m.fallback}" `)
    .replace(/ width="\d+"/, ` width="${m.fw}"`).replace(/ height="\d+"/, ` height="${m.fh}"`)
    .replace(/ data-lowres(="[^"]*")?/, '').replace(/ style="--src-w:[^"]*"/, '');
  if (m.lowres) img = img.replace(/<img /, `<img data-lowres style="--src-w:${m.width}px;--src-h:${m.height}px" `);
  let sources = '';
  const mob = (attrs.match(/data-mobile="([\w-]+)"/) || [])[1];
  if (mob && manifest[mob]) sources += `<source media="(max-width:767px)" type="image/avif" srcset="${set(mob, 'avif')}" sizes="100vw"><source media="(max-width:767px)" type="image/webp" srcset="${set(mob, 'webp')}" sizes="100vw">`;
  sources += `<source type="image/avif" srcset="${set(n, 'avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set(n, 'webp')}" sizes="${sizes}">`;
  return `<picture data-img="${n}"${attrs}>${sources}${img}</picture>`;
});
// optional hero video: the page only asks for it when the file exists (no failed request otherwise)
const loop = ctx.CONFIG.heroLoop || '';
const hasLoop = !!loop && existsSync(loop);
html = html.replace(/<section class="hero" id="hero"( data-loop="[^"]*")?>/, `<section class="hero" id="hero"${hasLoop ? ` data-loop="${loop}"` : ''}>`);
rows.push({ slot: 'hero-loop (video)', current: '(none: optional)', hiresExists: hasLoop, using: hasLoop ? `video ${loop}` : 'still image (no video file yet)' });
// walkthrough still frame: written as data-poster (js/main.js applies it when the section comes near), using the lighter WebP copy
html = html.replace(/(?:data-)?poster="[^"]*" data-poster-slot="([\w-]+)"/g, (all, n) => {
  const m = manifest[n], w = m && Math.min(1400, Math.max(...m.widths));
  return `data-poster="${m ? `${OUT}/${n}-${w}.webp` : 'images/hero.jpg'}" data-poster-slot="${n}"`;
});
// elements that only show when one of their slots has an image (e.g. the artist's impression badge on an optional backdrop)
html = html.replace(/<(\w+)([^>]*?) data-show-with="([^"]+)"( hidden)?>/g, (all, tag, a, list, h) =>
  `<${tag}${a} data-show-with="${list}"${list.split(' ').some(n => manifest[n]) ? '' : ' hidden'}>`);
// hero preload (desktop image, plus the phone version when there is one)
html = html.replace(/<!--hero-preload-->[\s\S]*?<!--\/hero-preload-->/, () => {
  const mob = manifest['hero-mobile'];
  const desk = `<link rel="preload" as="image" data-img="hero" type="image/avif" imagesrcset="${set('hero', 'avif')}" imagesizes="100vw" fetchpriority="high"${mob ? ' media="(min-width:768px)"' : ''}>`;
  return `<!--hero-preload-->${desk}${mob ? `<link rel="preload" as="image" data-img="hero-mobile" type="image/avif" imagesrcset="${set('hero-mobile', 'avif')}" imagesizes="100vw" fetchpriority="high" media="(max-width:767px)">` : ''}<!--/hero-preload-->`;
});
writeFileSync('index.html', html);

// ---- report ----
const pad = (t, n) => String(t).padEnd(n);
console.log('\n' + pad('SLOT', 25) + pad('CURRENT (brochure)', 30) + pad('HI-RES?', 9) + 'PAGE USES');
for (const r of rows) console.log(pad(r.slot, 25) + pad(r.current + (r.currentSize ? ` ${r.currentSize}` : ''), 30) + pad(r.hiresExists ? 'yes' : 'no', 9) + r.using + (r.status ? `  - ${r.status}` : ''));
writeFileSync(`${OUT}/report.json`, JSON.stringify(rows, null, 1));
console.log(`\nDone. Web copies are in ${OUT}/. Your original images were not changed.`);
