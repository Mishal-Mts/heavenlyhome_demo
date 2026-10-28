// Screenshots of the hero, villas and closing enquiry sections at 1440 and 390 px, plus a before/after sheet.
// Usage: node tools/polish-shots.mjs <label>            (serve the site first)
//        node tools/polish-shots.mjs --compare before after
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'node:fs';

const base = 'http://localhost:8080/';
if (process.argv[2] === '--compare') {
  const [, , , a, b] = process.argv;
  for (const w of [1440, 390]) for (const s of ['hero', 'villas', 'closing']) {
    const fa = `.shots/polish/${a}/${w}-${s}.png`, fb = `.shots/polish/${b}/${w}-${s}.png`;
    if (!existsSync(fa) || !existsSync(fb)) continue;
    const tw = w > 800 ? 720 : 390;
    const [ia, ib] = await Promise.all([fa, fb].map(f => sharp(f).resize({ width: tw }).toBuffer()));
    const [ma, mb] = await Promise.all([ia, ib].map(x => sharp(x).metadata()));
    const label = t => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="30"><rect width="100%" height="100%" fill="#111"/><text x="10" y="21" font-family="Arial" font-size="15" fill="#fff">${t}</text></svg>`);
    await sharp({ create: { width: tw * 2 + 12, height: Math.max(ma.height, mb.height) + 30, channels: 3, background: '#777' } })
      .composite([{ input: label('BEFORE'), left: 0, top: 0 }, { input: label('AFTER'), left: tw + 12, top: 0 }, { input: ia, left: 0, top: 30 }, { input: ib, left: tw + 12, top: 30 }])
      .png().toFile(`.shots/polish/compare-${w}-${s}.png`);
  }
  console.log('compare sheets in .shots/polish/');
  process.exit(0);
}
const label = process.argv[2] || 'shot', out = `.shots/polish/${label}`;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, ...(w < 800 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
  await page.goto(base, { waitUntil: 'load' }); await page.waitForTimeout(3800);
  await page.screenshot({ path: `${out}/${w}-hero.png` });
  const go = async y => { await page.evaluate(y => window.lenis ? window.lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y), y); await page.waitForTimeout(1800); };
  const vPin = await page.evaluate(() => { const s = window.ScrollTrigger && ScrollTrigger.getAll().find(s => s.pin && s.trigger.classList.contains('v-scene')); return s ? s.start + 5 : null; });
  await go(vPin ?? await page.evaluate(() => Math.round(document.getElementById('villas').getBoundingClientRect().top + scrollY) - 10));
  await page.screenshot({ path: `${out}/${w}-villas.png` });
  await go(await page.evaluate(() => Math.round(document.getElementById('enquire').getBoundingClientRect().top + scrollY) - 10));
  await page.screenshot({ path: `${out}/${w}-closing.png` });
  await page.close();
}
await browser.close();
console.log('saved', out);
