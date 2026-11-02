// Works out how dark the video hero's overlay must be, from the video itself (not by guesswork).
// For each width it hides every dark layer over the video (hero gradient, copy glow, header gradient), steps the
// video through its whole loop, and for every text element in the hero and the transparent header takes the
// brightest 2% of background pixels behind its letters (the worst case). It then solves for the smallest
// overlay opacity (navy #071a26 over that background) that gives WCAG AA: 4.5:1 for body text, 3:1 for large text.
// With --verify it keeps the real overlay on and reports the actual worst contrast per element instead.
// Add --with-shadow (with --verify) to keep the text shadows in the background sample (the WCAG figure ignores them).
// Usage: node tools/measure-hero-overlay.mjs [--verify] [baseUrl]   (serve the site first)
import { chromium } from 'playwright';
import sharp from 'sharp';

const verify = process.argv.includes('--verify'), withShadow = process.argv.includes('--with-shadow'), base = process.argv.find(a => a.startsWith('http')) || 'http://localhost:8080/';
const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const NAVY = [7, 26, 38], mix = (a, b, t) => a.map((v, i) => v * (1 - t) + b[i] * t);
// smallest overlay alpha so the text colour (with its own opacity) reaches `need` over background `bg`
const needAlpha = (fg, fgA, bg, need) => { let lo = 0, hi = 1; for (let i = 0; i < 20; i++) { const a = (lo + hi) / 2, b = mix(bg, NAVY, a); (ratio(mix(b, fg, fgA), b) >= need ? hi = a : lo = a); } return hi; };
const SEL = ['#hdr nav ul a', '#hdr .nav-call', '#hdr .logo small', '.hero .eyebrow', '.hero h1', '.hero .cta-row .btn-ghost', '.hero .sub', '.hero .pill', '.hero .cap'];
// (the phone layout's fade from the video into the page colour below it stays: it is part of the layout, not an overlay)
const OFF = '.hero.hero--video::after,.hero.hero--video .hero-copy::before,header::before{opacity:0!important}';
const HIDE = (withShadow ? '.hero *,#hdr *{color:transparent!important;-webkit-text-stroke:0!important}' : '.hero *,#hdr *{color:transparent!important;text-shadow:none!important;-webkit-text-stroke:0!important}') + ' .hero .btn-ghost,.hero .pill{border-color:transparent!important} #hdr .lg img,.menu-btn,.hero .btn-primary,.scroll-cue,#hdr .btn{visibility:hidden!important}';

const browser = await chromium.launch({ channel: 'msedge' });
for (const [w, h, mob] of [[1440, 900, false], [768, 1024, true], [390, 844, true]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob });
  await page.goto(base, { waitUntil: 'load' }); await page.waitForTimeout(5000);
  if (!verify) await page.addStyleTag({ content: OFF });
  const dur = await page.evaluate(() => { const v = document.querySelector('.hero-video'); v.pause(); return v.duration; });
  const worst = {};
  for (let t = 0; t < dur; t += 0.5) {
    const items = await page.evaluate(async ({ t, SEL }) => {
      const v = document.querySelector('.hero-video'); v.currentTime = t; await new Promise(r => v.onseeked = r);
      const out = [];
      for (const sel of SEL) document.querySelectorAll(sel).forEach((el, i) => {
        if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return;
        const rg = document.createRange(); rg.selectNodeContents(el); const rr = [...rg.getClientRects()].filter(q => q.width > 1 && q.bottom > 0 && q.top < innerHeight);
        if (!rr.length) return;
        const cs = getComputedStyle(el); let op = 1; for (let p = el; p; p = p.parentElement) op *= +getComputedStyle(p).opacity;
        const fs = parseFloat(cs.fontSize), large = fs >= 24 || (+cs.fontWeight >= 700 && fs >= 18.66);
        out.push({ key: sel + (i ? ' #' + (i + 1) : ''), rects: rr.map(q => [q.left, q.top, q.right, q.bottom].map(Math.round)), color: cs.color, op, large, x: Math.round(Math.max(...rr.map(q => q.right)) / innerWidth * 100), y: Math.round(Math.min(...rr.map(q => q.top)) / innerHeight * 100) });
      });
      return out;
    }, { t, SEL });
    await page.addStyleTag({ content: HIDE });
    const shot = await page.screenshot();
    await page.evaluate(() => [...document.querySelectorAll('style')].pop().remove());
    const img = sharp(shot), meta = await img.metadata(), raw = await img.raw().toBuffer(), ch = raw.length / (meta.width * meta.height);
    for (const it of items) {
      const px = [];
      for (const [x0, y0, x1, y1] of it.rects) for (let y = Math.max(0, y0); y < Math.min(meta.height, y1); y++) for (let x = Math.max(0, x0); x < Math.min(meta.width, x1); x++) { const i = (y * meta.width + x) * ch; px.push([raw[i], raw[i + 1], raw[i + 2]]); }
      if (!px.length) continue;
      px.sort((a, b) => lum(b) - lum(a)); const bg = px[Math.floor(px.length * .02)];
      const m = it.color.match(/[\d.]+/g).map(Number), fg = m.slice(0, 3), fgA = (m[3] ?? 1) * it.op, need = it.large ? 3 : 4.5;
      const val = verify ? ratio(mix(bg, fg, fgA), bg) : needAlpha(fg, fgA, bg, need);
      const worse = verify ? (!worst[it.key] || val < worst[it.key].val) : (!worst[it.key] || val > worst[it.key].val);
      if (worse) worst[it.key] = { val: +val.toFixed(verify ? 2 : 3), need, t: +t.toFixed(1), x: it.x, y: it.y, bgLuma: Math.round(lum(bg) * 1000) / 1000 };
    }
  }
  console.log(`\n${w}px ${verify ? 'actual worst contrast with the overlay on (needs >= 4.5 / 3)' : 'minimum overlay opacity needed (navy), worst frame of the loop'}`);
  for (const [k, v] of Object.entries(worst)) console.log(`  ${k.padEnd(28)} ${verify ? v.val + ':1' : 'alpha ' + v.val}  (need ${v.need}:1, worst at ${v.t}s, text right edge ${v.x}% / top ${v.y}%)${verify && v.val < v.need ? '  FAIL' : ''}`);
  await page.close();
}
await browser.close();
