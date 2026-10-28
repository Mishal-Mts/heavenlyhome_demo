// Responsive image pipeline.
// Usage: npm run images
//
// 1. Every JPG/PNG photo in images/originals/ (not logo-*) is resized to 800, 1400 and 2400 px wide
//    (never upscaled; the source width is used when it is smaller) and written to images/ as
//    <name>-<width>.avif and <name>-<width>.webp, plus a <name>.jpg fallback capped at 1400 px.
// 2. index.html is updated: every <picture data-img="<name>"> gets fresh <source> tags for the widths
//    that exist, its <img> gets the real width/height (so layout never shifts), and the hero preload
//    link (<link data-img="hero">) gets a matching imagesrcset.
// Drop a higher-resolution original into images/originals/ with the same name and re-run: the page
// picks up the bigger files automatically.
import sharp from 'sharp';
import { readdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { parse } from 'node:path';

const SRC = 'images/originals', OUT = 'images', WIDTHS = [800, 1400, 2400];
const files = readdirSync(SRC).filter(f => /\.(jpe?g|png)$/i.test(f) && !/^(logo-|legacy-)/i.test(f));
const manifest = {};

for (const f of files) {
  const name = parse(f).name, src = `${SRC}/${f}`;
  const { width, height } = await sharp(src).metadata();
  const widths = [...new Set(WIDTHS.map(w => Math.min(w, width)))].sort((a, b) => a - b);
  for (const w of widths) {
    const img = sharp(src).rotate().resize({ width: w });
    await img.clone().avif({ quality: 52, effort: 4 }).toFile(`${OUT}/${name}-${w}.avif`);
    await img.clone().webp({ quality: 78 }).toFile(`${OUT}/${name}-${w}.webp`);
  }
  const fw = Math.min(width, 1400);
  // small JPG originals are copied as-is so they are not recompressed on every run
  if (/\.jpe?g$/i.test(f) && width <= 1400) copyFileSync(src, `${OUT}/${name}.jpg`);
  else await sharp(src).rotate().resize({ width: fw }).jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}/${name}.jpg`);
  manifest[name] = { width, height, widths, fallback: { w: fw, h: Math.round(height * fw / width) } };
  console.log(`${name}: ${width}x${height} -> ${widths.join(', ')}`);
}

// Rewrite <picture data-img> blocks and the hero preload in index.html
let html = readFileSync('index.html', 'utf8');
const set = (n, ext) => manifest[n].widths.map(w => `images/${n}-${w}.${ext} ${w}w`).join(', ');
html = html.replace(/<picture data-img="([\w-]+)">([\s\S]*?)<\/picture>/g, (all, n, inner) => {
  if (!manifest[n]) { console.warn(`no original for picture "${n}"; left unchanged`); return all; }
  let img = inner.match(/<img[^>]*>/)[0];
  const sizes = (img.match(/ sizes="([^"]*)"/) || [, '100vw'])[1];
  const { w, h } = manifest[n].fallback;
  img = img.replace(/ width="\d+"/, ` width="${w}"`).replace(/ height="\d+"/, ` height="${h}"`);
  return `<picture data-img="${n}"><source type="image/avif" srcset="${set(n, 'avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set(n, 'webp')}" sizes="${sizes}">${img}</picture>`;
});
html = html.replace(/<link rel="preload" as="image" data-img="([\w-]+)"[^>]*>/, (all, n) => manifest[n]
  ? `<link rel="preload" as="image" data-img="${n}" type="image/avif" imagesrcset="${set(n, 'avif')}" imagesizes="100vw" fetchpriority="high">`
  : all);
writeFileSync('index.html', html);
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 1));
console.log('index.html updated');
