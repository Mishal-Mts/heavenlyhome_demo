// Builds every brand asset from images/originals/logo-defender-villas.png:
//   logo variants (colour for light backgrounds, white for dark), favicons and the Open Graph image.
// Usage: npm run brand   (re-run whenever the source logo or hero image changes)
import sharp from 'sharp';
import { writeFileSync, existsSync } from 'node:fs';

// Safety: this script rewrites the brand files in /images (logo variants, favicons, og-image.jpg).
// They already exist, so it only runs when asked explicitly:  node tools/build-brand.mjs --force
if (!process.argv.includes('--force')) {
  console.log('Brand files already exist. Nothing was changed. To rebuild them on purpose run: node tools/build-brand.mjs --force');
  process.exit(0);
}

const SRC = 'images/originals/logo-defender-villas.png';
const HERO = existsSync('images/originals/hero.jpg') ? 'images/originals/hero.jpg' : 'images/hero.jpg';

// 1. Trim transparent padding, then cap the height so the files stay small (display height is under 50 px).
const trimmed = await sharp(SRC).trim({ threshold: 10 }).png().toBuffer();
const base = sharp(trimmed).resize({ height: 160, withoutEnlargement: true });
const colour = await base.clone().png({ compressionLevel: 9, palette: true }).toBuffer();
const meta = await sharp(colour).metadata();

// 2. Colour version (as supplied) for the solid header and light sections.
writeFileSync('images/logo-defender-villas.png', colour);
await sharp(colour).webp({ quality: 90, alphaQuality: 100 }).toFile('images/logo-defender-villas.webp');

// 3. White version for the transparent header over the hero, dark sections and the footer:
//    keep the alpha channel, set every RGB value to white.
const { data, info } = await sharp(colour).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < data.length; i += 4) { data[i] = data[i + 1] = data[i + 2] = 255; }
const white = await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toBuffer();
writeFileSync('images/logo-defender-villas-white.png', white);
await sharp(white).webp({ quality: 90, alphaQuality: 100 }).toFile('images/logo-defender-villas-white.webp');

// 4. Favicons: the wordmark is too wide for a square icon, so use its own first letter "D"
//    (the left 17% of the trimmed logo) in brand red on white.
const tmeta = await sharp(trimmed).metadata();
const dMark = await sharp(trimmed)
  .extract({ left: 0, top: 0, width: Math.round(tmeta.width * 0.168), height: tmeta.height })
  .trim({ threshold: 10 }).png().toBuffer();
async function icon(size, pad = 0.16, radius = 0.18) {
  const inner = Math.round(size * (1 - pad * 2));
  const mark = await sharp(dMark).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const r = Math.round(size * radius);
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="#ffffff"/></svg>`);
  return sharp(bg).composite([{ input: mark, gravity: 'center' }]).png({ compressionLevel: 9 }).toBuffer();
}
const ico32 = await icon(32, 0.1, 0.16), ico16 = await icon(16, 0.06, 0.12);
writeFileSync('images/favicon-32.png', ico32);
writeFileSync('images/apple-touch-icon.png', await icon(180, 0.16, 0)); // iOS rounds the corners itself
writeFileSync('images/icon-512.png', await icon(512));
// favicon.ico with embedded PNGs (supported by every current browser)
const pngs = [ico16, ico32];
const head = Buffer.alloc(6 + 16 * pngs.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
let offset = head.length;
pngs.forEach((p, i) => {
  const s = [16, 32][i], o = 6 + i * 16;
  head.writeUInt8(s, o); head.writeUInt8(s, o + 1); head.writeUInt8(0, o + 2); head.writeUInt8(0, o + 3);
  head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6); head.writeUInt32LE(p.length, o + 8); head.writeUInt32LE(offset, o + 12);
  offset += p.length;
});
writeFileSync('favicon.ico', Buffer.concat([head, ...pngs]));

// 5. Open Graph image 1200x630: hero image, dark scrim, white logo.
const W = 1200, H = 630;
const scrim = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#071a26" stop-opacity=".25"/><stop offset=".55" stop-color="#071a26" stop-opacity=".55"/><stop offset="1" stop-color="#071a26" stop-opacity=".9"/>
  </linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="${W - 232}" y="28" width="204" height="34" rx="17" fill="#071a26" fill-opacity=".74"/>
  <text x="${W - 130}" y="51" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#fff">Artist's impression</text></svg>`);
const ogLogo = await sharp(white).resize({ width: 520 }).png().toBuffer();
const ogLogoMeta = await sharp(ogLogo).metadata();
await sharp(HERO).resize(W, H, { fit: 'cover', position: 'centre' })
  .composite([{ input: scrim }, { input: ogLogo, left: 72, top: H - 72 - ogLogoMeta.height }])
  .jpeg({ quality: 84, mozjpeg: true }).toFile('images/og-image.jpg');

console.log(`logo ${meta.width}x${meta.height}; favicons, apple-touch-icon, icon-512, favicon.ico, og-image.jpg written`);
