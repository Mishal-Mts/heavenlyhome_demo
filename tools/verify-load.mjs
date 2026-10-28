// Loads the page in Chromium, scrolls it fully, and reports CSS/JS/image status and console errors.
// Takes viewport and full-page screenshots at 1440 and 390 px.
// Usage: node tools/verify-load.mjs [url] [label]   e.g. http://localhost:8080/ or file:///D:/.../index.html
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] || 'http://localhost:8080/';
const label = process.argv[3] || 'verify';
const OPTIONAL = /(logo-sister|interior-living|interior-bedroom|interior-kitchen|progress-latest)\./; // files the page skips when absent
mkdirSync(`.shots/${label}`, { recursive: true });
const browser = await chromium.launch();
for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: width < 800 ? 844 : 900 }, reducedMotion: 'reduce' });
  const failed = [], consoleErrors = [], pageErrors = [];
  page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', r => failed.push(`FAILED ${r.url()} (${r.failure()?.errorText})`));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await wait(80); }
    // swipe every carousel to the end so its lazy slides are requested too
    for (const t of document.querySelectorAll('.car-track')) { t.scrollIntoView({ block: 'center' }); for (let x = 0; x <= t.scrollWidth; x += t.clientWidth / 2) { t.scrollLeft = x; await wait(120); } }
  });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  // wait for in-flight images, but never longer than 5 s (lazy images in hidden slides never start)
  await page.evaluate(() => Promise.race([new Promise(r => setTimeout(r, 5000)),
    Promise.all([...document.images].filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; })))]));
  await page.waitForTimeout(800);
  const s = await page.evaluate(() => ({
    // read an applied style rather than cssRules (Chrome blocks cssRules on file://)
    css: getComputedStyle(document.getElementById('hdr')).position === 'fixed',
    js: document.querySelectorAll('.car .dots button').length > 0,
    images: [...document.images].filter(i => !i.closest('[hidden]') && !i.hidden && i.getAttribute('src')).map(i => ({ src: (i.currentSrc || i.src).split('/').pop(), ok: i.naturalWidth > 0 })),
  }));
  const bad = s.images.filter(i => !i.ok);
  const unexpected = failed.filter(f => !OPTIONAL.test(f));
  console.log(`\n${width}px  ${url}`);
  console.log(`  css/styles.css applied: ${s.css}   js/main.js ran: ${s.js}`);
  console.log(`  visible images decoded: ${s.images.length - bad.length}/${s.images.length}${bad.length ? '  BROKEN: ' + bad.map(b => b.src).join(', ') : ''}`);
  console.log(`  failed requests (unexpected): ${unexpected.length ? unexpected.join(' | ') : 'none'}`);
  console.log(`  failed requests (optional files the page hides when absent): ${failed.length - unexpected.length}`);
  console.log(`  JS exceptions: ${pageErrors.length ? pageErrors.join(' | ') : 'none'}   console errors: ${consoleErrors.length} (${failed.length - unexpected.length} are the optional-file 404s)`);
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(400);
  await page.screenshot({ path: `.shots/${label}/${width}-top.png` });
  await page.screenshot({ path: `.shots/${label}/${width}-full.png`, fullPage: true });
  await page.close();
}
await browser.close();
