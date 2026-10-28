// Before/after screenshots of a proposed palette, injected at runtime (no files change).
// Usage: node tools/palette-preview.mjs [baseUrl]
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:8080/';
const PROPOSED = ':root{--coral:#d1001c;--coral2:#a8001a;--gold:#8a5f24}';
mkdirSync('.shots/palette', { recursive: true });
const browser = await chromium.launch();
const shots = [];
for (const [label, css] of [['before', ''], ['after', PROPOSED]]) {
  for (const [width, sections] of [[1440, ['.hero', '#villas', '#enquire']], [390, ['.hero', '#villas']]]) {
    const page = await browser.newPage({ viewport: { width, height: width < 800 ? 844 : 860 }, reducedMotion: 'reduce' });
    await page.goto(base, { waitUntil: 'networkidle' });
    if (css) await page.addStyleTag({ content: css });
    for (const s of sections) {
      const el = page.locator(s).first(); await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(250);
      const f = `.shots/palette/${label}-${width}-${s.replace(/\W/g, '')}.png`;
      await el.screenshot({ path: f }); shots.push(f);
    }
    await page.close();
  }
}
await browser.close();
// side-by-side sheets: before (left) / after (right)
for (const f of shots.filter(s => s.includes('/before-'))) {
  const a = f, b = f.replace('/before-', '/after-');
  const [ma, mb] = await Promise.all([sharp(a).metadata(), sharp(b).metadata()]);
  const scale = ma.width > 1000 ? 0.5 : 1, w = Math.round(ma.width * scale), h = Math.round(Math.max(ma.height, mb.height) * scale);
  const [ia, ib] = await Promise.all([sharp(a).resize({ width: w }).toBuffer(), sharp(b).resize({ width: w }).toBuffer()]);
  await sharp({ create: { width: w * 2 + 16, height: h, channels: 3, background: '#ffffff' } })
    .composite([{ input: ia, left: 0, top: 0 }, { input: ib, left: w + 16, top: 0 }]).png()
    .toFile(f.replace('/before-', '/compare-'));
}
console.log('palette previews in .shots/palette/compare-*.png');
