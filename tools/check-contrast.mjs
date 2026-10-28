// Measures real text contrast over images and the atmosphere layer.
// For every visible text element in the hero and the cinematic sections it hides all text, screenshots
// what is actually behind it, takes the brightest 2% of background pixels in the text box (worst case)
// and computes the WCAG contrast against the text colour.
// Usage: node tools/check-contrast.mjs [baseUrl]   (serve the site first)
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:8080/';
mkdirSync('.shots/contrast', { recursive: true });
const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };

const browser = await chromium.launch();
let worst = [], fails = 0;
for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: width < 800 ? 844 : 900 }, deviceScaleFactor: 1 });
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForTimeout(4200); // hero intro finished
  // scroll positions: hero at rest, hero part-scrolled, then each cinematic section's heading at mid-screen
  const targets = await page.evaluate(() => {
    const ys = [0, 260];
    document.querySelectorAll('.cine').forEach(s => {
      const r = s.getBoundingClientRect(), top = r.top + scrollY;
      for (let y = top - innerHeight * .35; y < top + r.height - innerHeight * .4; y += innerHeight * .7) ys.push(Math.max(0, Math.round(y)));
    });
    return ys;
  });
  for (const y of targets) {
    await page.evaluate(y => { (window.lenis ? window.lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y)); }, y);
    await page.waitForTimeout(1600); // reveals and atmosphere settle
    const items = await page.evaluate(() => {
      const out = [];
      const skip = '.card,.lead,.pw,.vbox,.gl,.gf,.btn-primary,.btn-teal,.btn-wa,.car-ctl,.panel,[hidden]';
      document.querySelectorAll('.hero-copy *, .cine *').forEach(el => {
        if (el.closest(skip)) return;
        const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        if (!own) return;
        const cs = getComputedStyle(el); if (cs.visibility !== 'visible' || +cs.opacity < .5) return;
        // measure only where the letters are (text-node rects), and skip text covered by another element
        const rg = document.createRange(); rg.selectNodeContents(el); const rr = [...rg.getClientRects()].filter(q => q.width > 1);
        if (!rr.length) return;
        const r = { left: Math.min(...rr.map(q => q.left)), top: Math.min(...rr.map(q => q.top)), right: Math.max(...rr.map(q => q.right)), bottom: Math.max(...rr.map(q => q.bottom)) }; r.width = r.right - r.left; r.height = r.bottom - r.top;
        const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2); if (!hit || !(el.contains(hit) || hit.contains(el))) return;
        if (r.width < 4 || r.height < 4 || r.bottom < 70 || r.top > innerHeight - 4 || r.right < 0 || r.left > innerWidth) return;
        const fs = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700, large = fs >= 24 || (bold && fs >= 18.66);
        let op = 1; for (let p = el; p; p = p.parentElement) op *= +getComputedStyle(p).opacity;
        out.push({ text: el.textContent.trim().slice(0, 40), color: cs.color, op, large, box: [Math.max(0, r.left), Math.max(70, r.top), Math.min(innerWidth, r.right), Math.min(innerHeight, r.bottom)] });
      });
      return out;
    });
    if (!items.length) continue;
    await page.addStyleTag({ content: '.sticky,header{visibility:hidden!important} *{color:transparent!important;text-shadow:none!important;caret-color:transparent!important} .pill,.btn-ghost{border-color:transparent!important}' });
    const shot = await page.screenshot();
    await page.evaluate(() => { const s = [...document.querySelectorAll('style')].pop(); s.remove(); });
    const img = sharp(shot), { width: W, height: H } = await img.metadata(), raw = await img.raw().toBuffer(), ch = raw.length / (W * H);
    for (const it of items) {
      const [x0, y0, x1, y1] = it.box.map(Math.round), px = [];
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * W + xx) * ch; px.push([raw[i], raw[i + 1], raw[i + 2]]); }
      if (!px.length) continue;
      px.sort((a, b) => lum(b) - lum(a));
      const bg = px[Math.floor(px.length * .02)];
      const m = it.color.match(/[\d.]+/g).map(Number), a = (m[3] ?? 1) * it.op;
      const fg = [0, 1, 2].map(i => Math.round(m[i] * a + bg[i] * (1 - a))); // text blended over its own background
      const c = ratio(fg, bg), need = it.large ? 3 : 4.5;
      const row = { width, y, text: it.text, contrast: +c.toFixed(2), need };
      if (c < need) { fails++; console.log(`FAIL ${width}px y=${y}  ${c.toFixed(2)} < ${need}  "${it.text}"`); }
      worst.push(row);
    }
  }
  await page.close();
}
await browser.close();
worst.sort((a, b) => a.contrast / a.need - b.contrast / b.need);
console.log('\nLowest measured (worst case, brightest 2% of background behind the text):');
for (const w of worst.slice(0, 10)) console.log(`  ${w.width}px y=${w.y}  ${w.contrast}:1 (needs ${w.need})  "${w.text}"`);
console.log(`\n${worst.length} text measurements, ${fails} below WCAG AA`);
process.exit(fails ? 1 : 0);
