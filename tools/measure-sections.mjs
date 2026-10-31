// Measures total page height and the height of each top-level block (sections, strip, footer) at 1440 and 390 px.
// Pinned scenes are measured with their pin spacing included (the scroll distance a visitor actually travels).
// Usage: node tools/measure-sections.mjs <label> [baseUrl]   -> writes .shots/measure-<label>.json
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const label = process.argv[2] || 'now', base = process.argv[3] || 'http://localhost:8080/';
mkdirSync('.shots', { recursive: true });
const browser = await chromium.launch(), out = {};
for (const [w, h, mob] of [[1440, 900, false], [390, 844, true]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob });
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  out[w] = await page.evaluate(() => {
    const name = el => el.id ? '#' + el.id : el.tagName === 'FOOTER' ? 'footer' : (el.className || el.tagName).toString().split(' ').filter(c => !/^(cine|curtain|alt|is-)/.test(c))[0] || el.tagName;
    const blocks = [];
    const add = el => { if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return; const box = el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el; blocks.push([name(el), Math.round(box.getBoundingClientRect().height)]); };
    document.querySelectorAll('main > section, main > div:not(.handoff):not(.pin-spacer), main > .handoff > section, main > .pin-spacer > section, main > .handoff > .pin-spacer > section, body > footer').forEach(add);
    return { total: document.documentElement.scrollHeight, blocks };
  });
  await page.close();
}
await browser.close();
writeFileSync(`.shots/measure-${label}.json`, JSON.stringify(out, null, 1));
console.log(label, '1440 total', out[1440].total, '| 390 total', out[390].total);
