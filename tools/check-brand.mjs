// Checks the rebrand in a real browser: header logo swap, footer and group logos, vCard and WhatsApp text.
// Usage: node tools/check-brand.mjs [baseUrl]   (serve the site first)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:8080/';
mkdirSync('.shots/brand', { recursive: true });
const browser = await chromium.launch();
for (const width of [390, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
  await page.goto(base, { waitUntil: 'networkidle' });
  const vis = () => page.evaluate(() => [...document.querySelectorAll('#hdr .lg > *')].map(e => `${e.className || e.tagName}:${getComputedStyle(e).display !== 'none' && !e.hidden ? 'shown' : 'hidden'}`).join(' '));
  console.log(width, 'top    ', await vis());
  await page.screenshot({ path: `.shots/brand/${width}-header-top.png`, clip: { x: 0, y: 0, width, height: 90 } });
  await page.evaluate(() => scrollTo(0, 900)); await page.waitForTimeout(300);
  console.log(width, 'scrolled', await vis());
  await page.screenshot({ path: `.shots/brand/${width}-header-solid.png`, clip: { x: 0, y: 0, width, height: 90 } });
  for (const [sel, name] of [['footer', 'footer'], ['#group', 'group']]) {
    await page.locator(sel).scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
    await page.locator(sel).screenshot({ path: `.shots/brand/${width}-${name}.png` });
  }
  if (width === 1440) {
    console.log('consent:', await page.locator('.consent').innerText());
    console.log('wordmark fallback:', await page.locator('#hdr .wm').innerText());
    console.log('data-wt:', await page.$$eval('[data-wt]', a => [...new Set(a.map(x => x.getAttribute('data-wt')))].join(' | ')));
    console.log('head:', await page.evaluate(() => [document.title, document.querySelector('link[rel=canonical]').href, document.querySelector('meta[property="og:image"]').content].join(' | ')));
    for (const u of ['favicon.ico', 'images/favicon-32.png', 'images/apple-touch-icon.png', 'images/og-image.jpg', 'robots.txt', 'sitemap.xml']) {
      const r = await page.request.get(base + u); console.log(u, r.status());
    }
  }
  await page.close();
}
await browser.close();
