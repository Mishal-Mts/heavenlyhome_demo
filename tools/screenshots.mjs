// Full-page screenshots at 390, 768 and 1440 px for before/after comparison.
// Usage: node tools/screenshots.mjs <label> [baseUrl]   (serve the site first: npm run serve)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const label = process.argv[2] || 'shot';
const base = process.argv[3] || 'http://localhost:8080/';
const out = `.shots/${label}`;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
for (const width of [390, 768, 1440]) {
  // reduced motion so reveal animations show their final state and runs are comparable
  const page = await browser.newPage({ viewport: { width, height: width < 800 ? 844 : 900 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } scrollTo(0, 0); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/${width}.png`, fullPage: true });
  console.log(width, 'ok', errors.length ? 'JS errors: ' + errors.join(' | ') : 'no JS errors');
  await page.close();
}
await browser.close();
