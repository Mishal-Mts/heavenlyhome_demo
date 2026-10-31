// Behaviour tests for Phase 1-2 (motion foundation and hero). Serve the site first (npm run serve).
// Usage: node tools/test-motion.mjs [baseUrl]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:8080/';
const out = '.shots/phase2'; mkdirSync(out, { recursive: true });
const OPTIONAL = /(logo-sister|interior-\w+|progress-latest|hero-loop)\./;
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok, info }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  - ' + info : ''}`); };
const browser = await chromium.launch();

async function open(opts = {}, url = base, waitUntil = 'load') {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); }); // failed loads are checked via responses
  page.on('response', r => { if (r.status() >= 400 && !OPTIONAL.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(url, { waitUntil });
  return { ctx, page, errors };
}
const wheel = async (page, dy, steps = 8) => { for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await page.waitForTimeout(60); } await page.waitForTimeout(900); };

// ---------- desktop 1440, motion on ----------
{
  const { ctx, page, errors } = await open();
  await page.waitForTimeout(3200); // let the intro finish
  const st = await page.evaluate(() => ({
    motion: document.documentElement.classList.contains('motion'),
    lenis: document.documentElement.classList.contains('lenis'),
    panelMode: document.documentElement.classList.contains('hero-panel'),
    formInPanel: !!document.querySelector('#panelBody #heroForm'),
    h1Lines: document.querySelectorAll('.hero h1 .ln').length,
    h1Label: document.querySelector('.hero h1').getAttribute('aria-label'),
    copyVisible: [...document.querySelectorAll('.hero-copy>*')].every(e => getComputedStyle(e).visibility === 'visible' && +getComputedStyle(e).opacity > .5),
    heroH: document.querySelector('.hero').getBoundingClientRect().height, vh: innerHeight,
    logo: getComputedStyle(document.querySelector('.lo-l')).display,
  }));
  check('desktop: GSAP motion + Lenis active', st.motion && st.lenis, JSON.stringify(st));
  check('desktop: hero is full viewport height', Math.abs(st.heroH - st.vh) < 2, `${st.heroH}px of ${st.vh}px`);
  check('desktop: hero form moved into panel', st.panelMode && st.formInPanel);
  check('desktop: headline split into masked lines with aria-label', st.h1Lines > 0 && !!st.h1Label, `${st.h1Lines} lines, label "${st.h1Label}"`);
  check('desktop: hero copy visible after intro', st.copyVisible);
  check('desktop: white logo over hero', st.logo !== 'none');
  await page.screenshot({ path: `${out}/1440-hero.png` });

  // header stays visible while scrolling down, as a slim solid bar with the colour logo
  await wheel(page, 1400);
  const down = await page.evaluate(() => { const h = document.getElementById('hdr'), r = h.getBoundingClientRect(); return { top: Math.round(r.top), height: Math.round(r.height), solid: h.classList.contains('solid'), y: scrollY }; });
  check('desktop: header stays visible on scroll down, slim (60px) and solid', down.top === 0 && down.height === 60 && down.solid, JSON.stringify(down));
  await page.screenshot({ path: `${out}/1440-scrolled.png` });
  await wheel(page, -300);
  const up = await page.evaluate(() => ({ hide: document.getElementById('hdr').classList.contains('hide'), solid: document.getElementById('hdr').classList.contains('solid'), dark: getComputedStyle(document.querySelector('.lo-d')).display }));
  check('desktop: header shows on scroll up (solid, colour logo)', !up.hide && up.solid && up.dark !== 'none');
  const prog = await page.evaluate(() => getComputedStyle(document.querySelector('.progress span')).transform);
  check('desktop: progress line follows scroll', prog !== 'none' && prog !== 'matrix(0, 0, 0, 1, 0, 0)', prog);

  // reveals: scroll through the page, then everything must be visible
  // wheel down until the bottom of the page is reached (page length changes with design and pinned scenes)
  for (let i = 0; i < 120 && await page.evaluate(() => scrollY + innerHeight < document.documentElement.scrollHeight - 4); i++) await page.mouse.wheel(0, 500), await page.waitForTimeout(90);
  await page.waitForTimeout(1800);
  const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-anim], [data-anim="stagger"] > *')].filter(e => !e.closest('.sec-bg') && !e.closest('[hidden]') && e.offsetParent !== null && (getComputedStyle(e).visibility === 'hidden' || +getComputedStyle(e).opacity < .99)).map(e => e.tagName + '.' + e.className + ' ' + (e.textContent || '').trim().slice(0, 30)));
  check('desktop: every revealed element ends fully visible', hidden.length === 0, hidden.slice(0, 5).join(' | '));
  const counts = await page.$$eval('[data-anim="count"]', b => b.map(x => x.textContent));
  check('desktop: counters end on the original text', counts.join('|') === '6 & 3 cents|< 30 min|~3 km|1994', counts.join(' | '));

  // anchor link via Lenis with header offset
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(600);
  await page.click('nav[aria-label="Main"] a[href="#location"]'); await page.waitForTimeout(2000);
  const anc = await page.evaluate(() => ({ top: Math.round(document.getElementById('location').getBoundingClientRect().top), hash: location.hash }));
  check('desktop: nav anchor scrolls to section below the header', anc.top >= 60 && anc.top <= 90 && anc.hash === '#location', `section top at ${anc.top}px, hash ${anc.hash}`);

  // enquiry panel: open, focus, trap, Esc, focus returns, scroll locked
  const enq = page.locator('#hdr .nav-actions .btn-primary[data-panel]');
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(500);
  await enq.click(); await page.waitForTimeout(700);
  const p = await page.evaluate(() => ({ open: !document.getElementById('enqPanel').hidden, focus: document.activeElement.id, locked: document.documentElement.classList.contains('locked'), lenisStopped: document.documentElement.classList.contains('lenis-stopped'), hash: location.hash }));
  check('panel: opens from header Enquire, focus on Name, page locked', p.open && p.focus === 'q-name' && p.locked && p.lenisStopped, JSON.stringify(p));
  await page.screenshot({ path: `${out}/1440-panel.png` });
  const y0 = await page.evaluate(() => scrollY); await page.mouse.wheel(0, 800); await page.waitForTimeout(600);
  check('panel: page does not scroll behind the panel', (await page.evaluate(() => scrollY)) === y0);
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  const inside = await page.evaluate(() => document.getElementById('enqPanel').contains(document.activeElement));
  check('panel: Tab focus stays inside the panel', inside);
  await page.keyboard.press('Escape'); await page.waitForTimeout(700);
  const c = await page.evaluate(() => ({ hidden: document.getElementById('enqPanel').hidden, focusBack: document.activeElement.matches('#hdr .nav-actions .btn-primary[data-panel]'), locked: document.documentElement.classList.contains('locked') }));
  check('panel: Esc closes, focus returns to Enquire, scroll unlocked', c.hidden && c.focusBack && !c.locked, JSON.stringify(c));
  // villa button pre-selects the panel form
  // (on desktop the Budget card is the second state of the pinned villa scene: scroll to the end of the pin first)
  await page.evaluate(() => { const s = ScrollTrigger.getAll().find(s => s.pin && s.trigger.classList.contains('v-scene')); window.lenis.scrollTo(s.end - 4, { immediate: true }); }); await page.waitForTimeout(900);
  await page.click('[data-villa="Budget single-storey villa (Rs 50 Lakh)"]'); await page.waitForTimeout(700);
  check('panel: villa button opens panel with that villa selected', await page.evaluate(() => !document.getElementById('enqPanel').hidden && document.getElementById('q-villa').value.startsWith('Budget')));
  // submit with empty ENDPOINTS shows thank-you (existing behaviour)
  await page.fill('#q-name', 'Test Person'); await page.fill('#q-phone', '9876543210'); await page.click('#heroForm button[type=submit]'); await page.waitForTimeout(800);
  check('panel: form submits and shows the thank-you message', await page.evaluate(() => getComputedStyle(document.querySelector('#heroForm .ok')).display === 'block'));
  await page.click('.panel-close'); await page.waitForTimeout(700);

  // lightbox locks Lenis
  await page.locator('#gallery').scrollIntoViewIfNeeded(); await page.waitForTimeout(1500);
  await page.locator('#gallery [data-lb]').first().click(); await page.waitForTimeout(300);
  const lb = await page.evaluate(() => ({ on: document.getElementById('lb').classList.contains('on'), stopped: document.documentElement.classList.contains('lenis-stopped') }));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const lb2 = await page.evaluate(() => ({ on: document.getElementById('lb').classList.contains('on'), stopped: document.documentElement.classList.contains('lenis-stopped') }));
  check('lightbox: opens and stops Lenis; Esc closes and restarts it', lb.on && lb.stopped && !lb2.on && !lb2.stopped);
  check('desktop: no JS errors or unexpected failed requests', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// ---------- Phase 3: hero order, atmosphere, about half-bleed, curtain hand-off ----------
{
  const { ctx, page, errors } = await open({}, base, 'domcontentloaded');
  await page.waitForTimeout(1300);
  const early = await page.evaluate(() => ({ h1: getComputedStyle(document.querySelector('.hero h1')).visibility, cta: +getComputedStyle(document.querySelector('.hero .cta-row .btn')).opacity, sub: +getComputedStyle(document.querySelector('.hero .sub')).opacity, pill: +getComputedStyle(document.querySelector('.hero .pill')).opacity }));
  check('hero: buttons arrive with the headline; subtext and pills only after it settles', early.cta > .5 && early.sub < .05 && early.pill < .05, JSON.stringify(early));
  await page.waitForTimeout(2500);
  const order = await page.evaluate(() => [...document.querySelector('.hero-copy').querySelectorAll('.eyebrow,h1,.cta-row,.sub,.pills,.cap')].map(e => e.className || e.tagName).join(' > '));
  check('hero: order is location, headline, buttons, subtext, pills, caption', order === 'eyebrow > H1 > cta-row > sub > pills > cap', order);
  const sky = async y => { await page.evaluate(y => window.lenis.scrollTo(y, { immediate: true }), y); await page.waitForTimeout(300); return page.evaluate(() => getComputedStyle(document.querySelector('.atmos')).getPropertyValue('--atm-bottom').trim()); };
  const ys = await page.evaluate(() => ['#villas', '#gallery', '#location'].map(s => Math.round(document.querySelector(s).getBoundingClientRect().top + scrollY - innerHeight / 2)));
  const skies = [await sky(0), await sky(ys[0]), await sky(ys[1]), await sky(ys[2])];
  check('atmosphere: sky changes dawn -> day -> sunset -> dusk with scroll', new Set(skies).size === 4, skies.join(' | '));
  await page.evaluate(() => window.lenis.scrollTo('#about', { immediate: true })); await page.waitForTimeout(1500);
  const bleed = await page.evaluate(() => ({ right: Math.round(document.querySelector('#about .frame').getBoundingClientRect().right), vw: document.documentElement.clientWidth, hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth }));
  check('about: image runs to the right edge, no horizontal scroll', bleed.right >= bleed.vw - 1 && !bleed.hscroll, JSON.stringify(bleed));
  await page.screenshot({ path: `${out}/1440-about.png` });
  const devTop = await page.evaluate(() => Math.round(document.getElementById('development').getBoundingClientRect().top + scrollY));
  await page.evaluate(y => window.lenis.scrollTo(y + 500, { immediate: true }), devTop); await page.waitForTimeout(600);
  const cur = await page.evaluate(() => ({ dev: Math.round(document.getElementById('development').getBoundingClientRect().top), loc: Math.round(document.getElementById('location').getBoundingClientRect().top), vh: innerHeight }));
  check('hand-off: banner holds at the top while Location slides over it', cur.dev === 0 && cur.loc < cur.vh, JSON.stringify(cur));
  await page.screenshot({ path: `${out}/1440-curtain.png` });
  await page.evaluate(() => window.lenis.scrollTo('#enquire', { immediate: true })); await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/1440-enquire.png` });
  await page.evaluate(() => window.lenis.scrollTo('#gallery', { immediate: true })); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/1440-gallery.png` });
  check('phase 3: no JS errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// ---------- Phase 4: pinned villas, horizontal gallery, route draw ----------
{
  const { ctx, page, errors } = await open();
  await page.waitForTimeout(1500);
  const pins = await page.evaluate(() => ScrollTrigger.getAll().filter(s => s.pin).map(s => ({ id: s.trigger.className, start: s.start, end: s.end })));
  const v = pins.find(p => p.id.includes('v-scene')), g = pins.find(p => p.id.includes('cine'));
  check('villas + gallery are pinned on desktop', !!v && !!g, JSON.stringify(pins.map(p => p.id)));
  const go = async y => { await page.evaluate(y => window.lenis.scrollTo(y, { immediate: true }), y); await page.waitForTimeout(700); };
  const vstate = () => page.evaluate(() => { const [a, b] = document.querySelectorAll('#villas .car-slide'); return { a: +getComputedStyle(a).opacity, b: +getComputedStyle(b).opacity, aHidden: a.getAttribute('aria-hidden'), top: Math.round(document.querySelector('#villas .v-scene').getBoundingClientRect().top) }; });
  await go(v.start + 10); const v1 = await vstate();
  await go(v.end - 10); const v2 = await vstate();
  check('villas: Premium shows first, Budget replaces it, scene stays put while pinned', v1.a === 1 && v1.b === 0 && v2.b === 1 && v2.a === 0 && v1.top === 0 && v2.top === 0, JSON.stringify({ v1, v2 }));
  const plan = await page.evaluate(() => !!document.querySelector('.v-plan .card .sz'));
  check('villas: the plan table follows as its own panel', plan);
  await go(v.start - 400);
  await page.evaluate(() => document.querySelectorAll('#villas .car-slide')[1].querySelector('.btn').focus()); await page.waitForTimeout(700);
  const kb = await vstate();
  check('villas: keyboard focus on the Budget button scrolls the scene to show it', kb.b === 1, JSON.stringify(kb));
  const trackX = () => page.evaluate(() => Math.round(gsap.getProperty(document.querySelector('#gallery .car-track'), 'x')));
  await go(g.start + 10); const x1 = await trackX();
  await go((g.start + g.end) / 2); const x2 = await trackX();
  await go(g.end - 10); const x3 = await trackX();
  const lastVisible = await page.evaluate(() => { const s = [...document.querySelectorAll('#gallery .car-slide')].filter(s => !s.hidden).pop().getBoundingClientRect(); return s.right <= innerWidth && s.left >= 0; });
  check('gallery: images scroll sideways while pinned and the last one comes fully into view', x1 > -20 && x2 < x1 - 300 && x3 < x2 && lastVisible, `x: ${x1} -> ${x2} -> ${x3}`);
  await go((g.start + g.end) / 2);
  const target = await page.evaluate(() => { const b = [...document.querySelectorAll('#gallery [data-lb]')].find(b => { const r = b.getBoundingClientRect(); return r.left > 100 && r.right < innerWidth - 100; }); b.setAttribute('data-test', '1'); return b.querySelector('span').textContent; });
  await page.click('[data-test="1"]'); await page.waitForTimeout(300);
  const lbo = await page.evaluate(() => document.getElementById('lb').classList.contains('on'));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  check('gallery: clicking an image in the pinned row opens the lightbox', lbo, target);
  await go(g.start - 300);
  await page.evaluate(() => [...document.querySelectorAll('#gallery [data-lb]')].filter(b => !b.closest('[hidden]')).pop().focus()); await page.waitForTimeout(700);
  const kf = await page.evaluate(() => { const r = [...document.querySelectorAll('#gallery [data-lb]')].filter(b => !b.closest('[hidden]')).pop().getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), vw: innerWidth }; });
  check('gallery: keyboard focus on the last image scrolls it into view', kf.left >= 0 && kf.right <= kf.vw, JSON.stringify(kf));
  const mapTop = await page.evaluate(() => Math.round(document.getElementById('mapbox').getBoundingClientRect().top + scrollY));
  await go(mapTop - 900); const d0 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.route-draw')).strokeDashoffset));
  await go(mapTop - 100); const d1 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.route-draw')).strokeDashoffset));
  check('location: the route to NH-66 draws on scroll', d0 > .9 && d1 < .05, `dashoffset ${d0} -> ${d1}`);
  await page.screenshot({ path: `${out}/1440-location.png` });
  // resize to phone width: scenes are undone and the carousels return
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(1200);
  const back = await page.evaluate(() => ({ pinned: document.getElementById('villas').classList.contains('is-pinned'), planInTrack: !!document.querySelector('#villas .car-track .card .sz'), noPlanHolder: !document.querySelector('.v-plan'), h: document.getElementById('gallery').classList.contains('is-hscroll'), x: gsap.getProperty(document.querySelector('#gallery .car-track'), 'x') }));
  check('resize to phone: pinned scenes are undone cleanly', !back.pinned && back.planInTrack && back.noPlanHolder && !back.h && back.x === 0, JSON.stringify(back));
  check('phase 4: no JS errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// ---------- mobile 390 (touch, native scrolling) ----------
{
  const { ctx, page, errors } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await page.waitForTimeout(3200);
  await page.screenshot({ path: `${out}/390-hero.png` });
  const st = await page.evaluate(() => ({ heroH: document.querySelector('.hero').getBoundingClientRect().height, vh: innerHeight, pos: getComputedStyle(document.querySelector('.hero-media img')).objectPosition, overflow: document.documentElement.scrollWidth > innerWidth }));
  check('mobile: full-height hero (100svh) with mobile crop', st.heroH >= 842 && st.pos.startsWith('56%'), `${st.heroH}/${st.vh}px, object-position ${st.pos}`);
  check('mobile: no horizontal page scroll', !st.overflow);
  const pillsBefore = await page.evaluate(() => getComputedStyle(document.querySelector('.hero .pill')).visibility);
  const subShown = await page.evaluate(() => +getComputedStyle(document.querySelector('.hero .sub')).opacity > .99);
  await page.evaluate(() => scrollTo(0, 40)); await page.waitForTimeout(1200);
  const pillsAfter = await page.evaluate(() => getComputedStyle(document.querySelector('.hero .pill')).visibility + ' ' + getComputedStyle(document.querySelector('.hero .pill')).opacity);
  check('mobile: subtext shown after headline; pills wait until scrolled', subShown && pillsBefore === 'hidden' && pillsAfter === 'visible 1', `before: ${pillsBefore}, after: ${pillsAfter}`);
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(400);
  await page.tap('#menuBtn'); await page.waitForTimeout(300);
  check('mobile: menu opens', await page.evaluate(() => !document.getElementById('mnav').hidden));
  await page.tap('#mnav a[href="#gallery"]'); await page.waitForTimeout(1800);
  const g = await page.evaluate(() => ({ closed: document.getElementById('mnav').hidden, top: Math.round(document.getElementById('gallery').getBoundingClientRect().top) }));
  check('mobile: menu link closes menu and scrolls to section', g.closed && g.top > 40 && g.top < 100, `gallery top ${g.top}px`);
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(600);
  await page.tap('#hdr .nav-actions .btn-primary[data-panel]'); await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/390-panel.png` });
  check('mobile: Enquire opens the panel', await page.evaluate(() => !document.getElementById('enqPanel').hidden));
  await page.tap('.panel-close'); await page.waitForTimeout(700);
  await page.evaluate(() => scrollTo(0, 700)); await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/390-scrolled.png` });
  const mob = await page.evaluate(() => ({ pinned: document.getElementById('villas').classList.contains('is-pinned'), h: document.getElementById('gallery').classList.contains('is-hscroll'), planInTrack: !!document.querySelector('#villas .car-track .card .sz'), ctl: !document.querySelector('#gallery .car-ctl').hidden }));
  check('mobile: no pinned scenes; villa and gallery swipe carousels as before', !mob.pinned && !mob.h && mob.planInTrack && mob.ctl, JSON.stringify(mob));
  check('mobile: no JS errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// ---------- reduced motion ----------
{
  const { ctx, page, errors } = await open({ reducedMotion: 'reduce' });
  await page.waitForTimeout(400);
  const st = await page.evaluate(() => ({
    motion: document.documentElement.classList.contains('motion'), lenis: document.documentElement.classList.contains('lenis'),
    hidden: [...document.querySelectorAll('[data-anim], .hero-copy>*:not(.cap)')].filter(e => !e.closest('.sec-bg') && e.offsetParent !== null && (getComputedStyle(e).visibility === 'hidden' || +getComputedStyle(e).opacity < .99)).length,
    imgTransform: getComputedStyle(document.querySelector('.hero-media img')).transform,
  }));
  check('reduced motion: no smooth scroll, nothing hidden, no Ken Burns', !st.motion && !st.lenis && st.hidden === 0 && st.imgTransform === 'none', JSON.stringify(st));
  await page.click('#hdr .nav-actions .btn-primary[data-panel]'); await page.waitForTimeout(200);
  check('reduced motion: panel opens instantly', await page.evaluate(() => !document.getElementById('enqPanel').hidden && getComputedStyle(document.querySelector('.panel-sheet')).transform === 'none'));
  const rm = await page.evaluate(() => ({ pinned: document.getElementById('villas').classList.contains('is-pinned'), h: document.getElementById('gallery').classList.contains('is-hscroll'), planInTrack: !!document.querySelector('#villas .car-track .card .sz'), route: getComputedStyle(document.querySelector('.route-draw')).strokeDashoffset }));
  check('reduced motion: no pinned scenes, carousels as before, route fully drawn', !rm.pinned && !rm.h && rm.planInTrack && parseFloat(rm.route) === 0, JSON.stringify(rm));
  check('reduced motion: no JS errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// ---------- JavaScript disabled ----------
{
  const { ctx, page } = await open({ javaScriptEnabled: false });
  const st = await page.evaluate === undefined ? {} : null;
  const vis = await page.locator('.hero h1').isVisible(), form = await page.locator('.hero #heroForm').isVisible(), about = await page.locator('#about h2').isVisible();
  check('no JS: headline, hero form (inline) and sections visible', vis && form && about);
  await page.screenshot({ path: `${out}/1440-nojs.png` });
  await ctx.close();
}

// ---------- scripts blocked (JS on but motion.js / main.js fail to load): failsafe ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route(/(motion|main)\.js|gsap|lenis/, r => r.abort());
  const page = await ctx.newPage(); await page.goto(base, { waitUntil: 'load' }); await page.waitForTimeout(4500); // head failsafe fires at 4 s
  const st = await page.evaluate(() => ({ cls: document.documentElement.className, h1: getComputedStyle(document.querySelector('.hero h1')).visibility, form: getComputedStyle(document.querySelector('#heroForm')).display, about: getComputedStyle(document.querySelector('#about [data-anim]')).visibility }));
  check('scripts fail: failsafe shows all content and the inline form', st.h1 === 'visible' && st.form !== 'none' && st.about === 'visible', JSON.stringify(st));
  await ctx.close();
}

await browser.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
