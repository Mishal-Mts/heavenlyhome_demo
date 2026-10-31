// Final end-to-end checks: slow phone (4x CPU + Fast 4G), vCard, map, video fallback, 360 drag, keyboard focus,
// inline hero form mode. Serve the site first (npm run serve).   Usage: node tools/test-final.mjs [baseUrl]
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:8080/';
mkdirSync('.shots/final', { recursive: true });
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  - ' + info : ''}`); };
const OPTIONAL = /(logo-sister|interior-\w+|progress-latest|hero-loop|walkthrough)\./;
const browser = await chromium.launch();

// rewrite CONFIG values in js/main.js for a test (the real file is not changed)
const mainJs = readFileSync('js/main.js', 'utf8');
// the trailing * also matches the ?v= version number on the script address
const withConfig = (ctx, edits) => ctx.route('**/js/main.js*', r => { let s = mainJs; for (const [a, b] of edits) s = s.replace(a, b); r.fulfill({ body: s, contentType: 'application/javascript' }); });

// ---------- slow phone: 4x CPU slowdown + Fast 4G ----------
for (const [label, viewport, mobile] of [['phone', { width: 390, height: 844 }, true], ['desktop', { width: 1440, height: 900 }, false]]) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && !OPTIONAL.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 9e6 / 8, uploadThroughput: 1.5e6 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => { window.__lcp = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); });
  const t0 = Date.now();
  await page.goto(base, { waitUntil: 'load', timeout: 90000 });
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(4000);
  const st = await page.evaluate(() => ({ lcp: Math.round(window.__lcp), h1: getComputedStyle(document.querySelector('.hero h1')).visibility, lines: document.querySelectorAll('.hero h1 .ln').length, motion: document.documentElement.classList.contains('motion'), main: !!window.__mainReady }));
  check(`${label} (4x CPU, Fast 4G): page loads, scripts run, headline visible`, st.main && st.h1 === 'visible' && st.lines > 0, `load ${loadMs} ms, LCP ${st.lcp} ms`);
  // walk down the page in 500 px steps to the very bottom (absolute positions, so smooth scrolling cannot swallow a step)
  for (let i = 1; i < 80 && await page.evaluate(() => scrollY + innerHeight < document.documentElement.scrollHeight - 4); i++) {
    if (mobile) await page.evaluate(y => window.lenis ? window.lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y), i * 500); else await page.mouse.wheel(0, 500);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(2500);
  const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-anim]')].filter(e => !e.closest('[hidden],.sec-bg,#villas .car-slide') && e.offsetParent !== null && getComputedStyle(e).visibility === 'hidden').length);
  check(`${label} (throttled): after scrolling through, nothing is left hidden`, hidden === 0, `${hidden} hidden`);
  await page.screenshot({ path: `.shots/final/${label}-throttled-bottom.png` });
  check(`${label} (throttled): no JS errors or unexpected failed requests`, errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// ---------- vCard: saved contact uses the new brand ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await withConfig(ctx, [["phone:'',      //   Phone, country code + digits. Shows the Call icon.", "phone:'919876543210',"], ["email:'',      //   Email. Added to the saved contact.", "email:'test@example.com',"]]);
  const page = await ctx.newPage(); await page.goto(base, { waitUntil: 'load' }); await page.waitForTimeout(1500);
  await page.evaluate(() => window.lenis ? window.lenis.scrollTo('#group', { immediate: true }) : document.getElementById('group').scrollIntoView()); await page.waitForTimeout(1200);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#vcfbtn')]);
  const vcf = readFileSync(await dl.path(), 'utf8');
  check('vCard: downloads Minu-John.vcf with ORG "Heavenly Homes USA" and NOTE "Defender Villas"', dl.suggestedFilename() === 'Minu-John.vcf' && /ORG:Heavenly Homes USA/.test(vcf) && /NOTE:Defender Villas\\, Perinjanam/.test(vcf), vcf.split('\r\n').filter(l => /^(ORG|NOTE|TEL|EMAIL)/.test(l)).join(' | '));
  await ctx.close();
}

// ---------- map, video, 360, keyboard focus ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route(/google\.com|youtube/, r => r.abort()); // do not load third-party pages in tests
  const page = await ctx.newPage(); await page.goto(base, { waitUntil: 'load' }); await page.waitForTimeout(1500);
  // click-to-load map
  await page.evaluate(() => window.lenis.scrollTo('#mapbox', { immediate: true, offset: -200 })); await page.waitForTimeout(1200);
  await page.click('#mapbtn'); await page.waitForTimeout(400);
  const map = await page.evaluate(() => { const f = document.querySelector('#mapbox iframe'); return f ? f.src : ''; });
  check('map: "Load interactive map" swaps the sketch for the Google Maps iframe', /google\.com\/maps\?q=10\.298.*output=embed/.test(map), map.slice(0, 90));
  // video: no walkthrough.mp4 yet -> the friendly fallback appears
  await page.evaluate(() => window.lenis.scrollTo('#walkthrough', { immediate: true })); await page.waitForTimeout(1500);
  const poster = await page.evaluate(() => document.getElementById('vid').getAttribute('poster') || '');
  await page.click('#vplay'); await page.waitForTimeout(1500);
  const vf = await page.evaluate(() => document.getElementById('vfall').classList.contains('on'));
  check('video: still frame loads near the section; Play without a video file shows the "video tour" fallback', /walkthrough-poster/.test(poster) && vf, `poster ${poster}`);
  // 360 drag
  const box = await page.locator('#pano').boundingBox();
  const before = await page.evaluate(() => getComputedStyle(document.getElementById('panoIn')).transform);
  await page.mouse.move(box.x + box.width * .7, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width * .2, box.y + box.height / 2, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(300);
  const after = await page.evaluate(() => getComputedStyle(document.getElementById('panoIn')).transform);
  check('360 preview: dragging pans the panorama', before !== after, `${before} -> ${after}`);
  await page.focus('#pano'); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(400);
  check('360 preview: arrow keys pan it too', (await page.evaluate(() => getComputedStyle(document.getElementById('panoIn')).transform)) !== after);
  // keyboard: focus ring visible on header links, buttons and form fields
  await page.evaluate(() => window.lenis.scrollTo(0, { immediate: true })); await page.waitForTimeout(500);
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  const ring = await page.evaluate(() => { const e = document.activeElement, c = getComputedStyle(e); return { el: e.tagName + ' ' + (e.textContent || '').trim().slice(0, 20), outline: c.outlineStyle + ' ' + c.outlineWidth + ' ' + c.outlineColor }; });
  check('keyboard: Tab moves through the header with a visible focus ring', ring.outline.startsWith('solid 3px'), `${ring.el}: ${ring.outline}`);
  const unlabeled = await page.evaluate(() => [...document.querySelectorAll('a,button,input,select,textarea')].filter(e => e.offsetParent !== null && !(e.getAttribute('aria-label') || (e.textContent || '').trim() || e.labels?.length || e.getAttribute('title') || e.closest('[aria-hidden="true"]') || e.type === 'hidden' || e.classList.contains('hp'))).map(e => e.outerHTML.slice(0, 80)));
  check('accessibility: every visible link, button and field has a name', unlabeled.length === 0, unlabeled.join(' | '));
  await ctx.close();
}

// ---------- CONFIG.HERO_FORM_MODE = 'inline' ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await withConfig(ctx, [["HERO_FORM_MODE:'panel'", "HERO_FORM_MODE:'inline'"]]);
  const page = await ctx.newPage(); await page.goto(base, { waitUntil: 'load' }); await page.waitForTimeout(3500);
  const st = await page.evaluate(() => ({ inHero: !!document.querySelector('.hero #heroForm'), visible: getComputedStyle(document.getElementById('heroForm')).display !== 'none', cls: document.documentElement.classList.contains('hero-panel') }));
  await page.click('#hdr .nav-actions .btn-primary'); await page.waitForTimeout(1800);
  const top = await page.evaluate(() => ({ panel: !document.getElementById('enqPanel').hidden, top: Math.round(document.getElementById('enquire').getBoundingClientRect().top) }));
  check("inline mode: one CONFIG line puts the form back in the hero; Enquire scrolls to the enquiry section", st.inHero && st.visible && !st.cls && !top.panel && top.top < 120, JSON.stringify({ ...st, ...top }));
  await page.evaluate(() => window.lenis.scrollTo(0, { immediate: true })); await page.waitForTimeout(800);
  await page.screenshot({ path: '.shots/final/1440-inline-mode.png' });
  await ctx.close();
}

await browser.close();
const f = results.filter(r => !r).length;
console.log(`\n${results.length - f}/${results.length} passed`);
process.exit(f ? 1 : 0);
