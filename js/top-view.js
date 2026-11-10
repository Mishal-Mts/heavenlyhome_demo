/* "See the layout from above" (#layout): scroll-driven tour of the site plan, with the 3D view as the default layer.
   Two modes, chosen per device:
   - continuous (capable desktops: fine pointer, more than 4 cores / 4 GB): requestAnimationFrame reads scroll progress
     and scrubs a camera (transform translate/scale) between step boxes; captions drift with it.
   - discrete (touch screens and low-power devices): no scroll listener at all. Invisible step markers inside the track,
     positioned with CSS, are watched by an IntersectionObserver; on each step change CSS transitions move the camera,
     fade the caption and move the spotlight. On phones the whole plan / render is shown as a full-width strip with a
     gentle zoom (at most 1.3x) toward the step, and a tap opens a full-screen viewer with pinch-zoom and pan.
   The progress line uses a CSS scroll-driven animation where supported. Only transform, opacity and clip-path animate;
   will-change is set only while a layer moves. Plan boxes are in plan metres; 3D boxes in pixels of the cropped render,
   which is never shown larger than 1 render pixel per CSS pixel on the page. Data: #tvxData (tools/build-top-view.mjs).
   Reduced motion or no JS: the plain plan with the captions as a list (CSS default). */
(function () {
  'use strict';
  var sec = document.getElementById('layout'), dataEl = document.getElementById('tvxData');
  if (!sec || !dataEl || !sec.classList.contains('tvx')) return;
  var D; try { D = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var reduce = matchMedia('(prefers-reduced-motion: reduce)'), coarse = matchMedia('(pointer: coarse)');
  var track = sec.querySelector('.tvx-track'), stage = sec.querySelector('.tvx-stage'), view = sec.querySelector('.tvx-view'),
      world = sec.querySelector('.tvx-world'), svg = world && world.querySelector('svg'), ring = svg && svg.querySelector('.tv-ring'),
      world3 = sec.querySelector('.tvx-world3d'), cardsEl = sec.querySelector('.tvx-cards'),
      cards = [].slice.call(sec.querySelectorAll('.tvx-card')), dots = [].slice.call(sec.querySelectorAll('.tvx-dots i')),
      bar = sec.querySelector('.tvx-bar i'), hl = svg ? [].slice.call(svg.querySelectorAll('.hl')) : [];
  if (!svg || !D.steps.length) return;
  var VB = D.vb, N = D.steps.length, I3 = D.img3d;
  var lowPower = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  var scrollTimeline = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var tf = function (a) { return 'translate3d(' + a[0].toFixed(1) + 'px,' + a[1].toFixed(1) + 'px,0) scale(' + a[2].toFixed(4) + ')'; };

  // ---------- Plan | 3D view switch; the 3D view is the default, loaded and decoded before the section arrives ----------
  var tog = sec.querySelector('.tvx-toggle'), ai = sec.querySelector('.tvx-ai'), is3d = false, userChose = false;
  if (ai && stage && ai.parentNode !== stage) stage.appendChild(ai);
  var spot = world3 && world3.querySelector('.tvx-spot'), ring3 = null;
  var load3d = function () {
    if (sec.classList.contains('tvx-has3d')) return;
    var tpl = world3.querySelector('template'); if (tpl) world3.insertBefore(tpl.content.cloneNode(true), spot || null);
    ring3 = document.createElement('i'); ring3.className = 'tvx-ring3d'; world3.appendChild(ring3);
    var img = world3.querySelector('img'); if (img && img.decode) img.decode().catch(function () {});
    sec.classList.add('tvx-has3d'); if (on) layout();
  };
  var setView = function (want) {
    is3d = want; if (want) load3d();
    if (!want && on && mode === 'discrete' && cur >= 0) { var n0 = cur; is3d = false; showStep(n0, true); }
    requestAnimationFrame(function () { sec.classList.toggle('tvx-3d', want); });
    if (ai) ai.hidden = !want;
    [].forEach.call(tog.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', (x.getAttribute('data-view') === '3d') === want ? 'true' : 'false'); });
  };
  if (tog && world3 && I3) {
    tog.hidden = false;
    [].forEach.call(tog.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-view') === '3d' ? 'true' : 'false'); });
    tog.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; userChose = true; var want = b.getAttribute('data-view') === '3d'; if (want !== is3d) setView(want); });
    if ('IntersectionObserver' in window) {
      var near = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { near.disconnect(); if (!userChose) setView(true); } }, { rootMargin: '150% 0px' });
      near.observe(sec);
    } else setView(true);
  }

  // ---------- geometry ----------
  var on = false, mode = '', compact = false, W = 0, H = 0, cur = -1, strip = null;
  var cardSpace = function () { var m = 0; cards.forEach(function (c) { m = Math.max(m, c.offsetHeight); }); return m; };
  var inset = function () { return innerWidth < 768 && innerHeight > innerWidth ? [70, Math.min(260, H * 0.34)] : [76, 40]; };
  // fit box b into the free area (wide screens). Plan units: metres; 3D units: render pixels (never upscaled).
  var cam = function (b, three) {
    var ins = inset(), ah = H - ins[0] - ins[1], ux = three ? I3[0] : VB[2], ox = three ? 0 : VB[0], oy = three ? 0 : VB[1];
    var ppu = W / ux, s = Math.min(W / ((b[2] - b[0]) * ppu), ah / ((b[3] - b[1]) * ppu)) * 0.94;
    if (three) { var wh = W * I3[1] / I3[0]; s = Math.min(s, I3[0] / W); s = Math.max(s, Math.min(H / wh, I3[0] / W)); }
    var cx = (b[0] + b[2]) / 2 - ox, cy = (b[1] + b[3]) / 2 - oy, tx = W / 2 - cx * ppu * s, ty = ins[0] + ah / 2 - cy * ppu * s;
    if (three) { var sw = W * s, sh = W * I3[1] / I3[0] * s; tx = clamp(tx, Math.min(0, W - sw), Math.max(0, W - sw)); ty = clamp(ty, Math.min(0, H - sh), Math.max(0, H - sh)); }
    return [tx, ty, s];
  };
  var boxOf = function (st, three) { return three ? (st.box3d || [0, 0, I3[0], I3[1]]) : st.box; };
  // phones: the whole plan / render as a full-width strip, with the caption under it; the strip clips a gentle zoom
  var layoutStrip = function () {
    var top0 = 70, bottom0 = 46, gap = 16, ch = cardSpace();
    var sP = 0.96, hP = W * VB[3] / VB[2] * sP, s3 = I3 ? Math.min(0.96, I3[0] / W) : 0, h3 = I3 ? W * I3[1] / I3[0] * s3 : 0;
    var mh = Math.max(hP, h3), room = H - top0 - bottom0 - gap - ch;
    if (mh > room && room > 60) { var f = room / mh; sP *= f; hP *= f; s3 *= f; h3 *= f; mh = room; }
    var top = top0 + Math.max(0, (H - top0 - bottom0 - (mh + gap + ch)) / 2), sw = Math.max(W * sP, W * s3), left = (W - sw) / 2;
    strip = { x: left, y: top, w: sw, h: mh, sP: sP, hP: hP, s3: s3, h3: h3 };
    view.style.clipPath = 'inset(' + top.toFixed(1) + 'px ' + left.toFixed(1) + 'px ' + (H - top - mh).toFixed(1) + 'px ' + left.toFixed(1) + 'px round 14px)';
    if (cardsEl) { cardsEl.style.top = Math.round(top + mh + gap) + 'px'; cardsEl.style.bottom = 'auto'; }
    if (zoomBtn) { zoomBtn.style.top = Math.round(top + mh - 44) + 'px'; zoomBtn.style.right = Math.round(left + 8) + 'px'; }
    if (ai) { var ah = ai.hidden ? 34 : ai.offsetHeight || 34; sec.style.setProperty('--ai-top', Math.max(122, Math.round(top - ah - 8)) + 'px'); }
  };
  // a step on phones: zoom at most 1.3x toward the focus box, keeping the strip filled (no empty edges)
  var stripCam = function (b, three) {
    var s0 = three ? strip.s3 : strip.sP, h0 = three ? strip.h3 : strip.hP, ux = three ? I3[0] : VB[2], ox = three ? 0 : VB[0], oy = three ? 0 : VB[1];
    var ppu = W / ux, x0 = (W - W * s0) / 2, y0 = strip.y + (strip.h - h0) / 2;
    var z = 1;
    if (b) { var bw = (b[2] - b[0]) * ppu * s0, bh = (b[3] - b[1]) * ppu * s0; z = clamp(Math.min(strip.w / bw, strip.h / bh) * 0.9, 1, 1.3); if (three) z = Math.min(z, I3[0] / (W * s0)); }
    var s = s0 * z, cx = b ? ((b[0] + b[2]) / 2 - ox) * ppu : W / 2, cy = b ? ((b[1] + b[3]) / 2 - oy) * ppu : h0 / s0 / 2;
    var tx = strip.x + strip.w / 2 - cx * s, ty = strip.y + strip.h / 2 - cy * s, sw = W * s, sh = h0 * z;
    tx = clamp(tx, strip.x + strip.w - sw, strip.x); ty = clamp(ty, strip.y + strip.h - sh, strip.y);
    if (z === 1) { tx = x0; ty = y0; }
    return [tx, ty, s];
  };
  var place = function (el, a, moving) {
    if (!el) return;
    if (moving) { el.style.willChange = 'transform'; clearTimeout(el._wc); el._wc = setTimeout(function () { el.style.willChange = 'auto'; }, 1200); }
    el.style.transform = tf(a);
  };

  // ---------- step visuals ----------
  var focusKey = '';
  var setFocus = function (step) {
    var k = step.focus || 'all'; if (k === focusKey) return; focusKey = k;
    var keys = k.split(' '), all = k === 'all';
    svg.classList.toggle('dim', !all);
    hl.forEach(function (el) { var ek = (el.getAttribute('data-k') || '').split(' '); el.classList.toggle('is-focus', all || ek.some(function (x) { return keys.indexOf(x) >= 0; })); });
    if (ring) { if (step.ring) { var r = step.ring; ring.setAttribute('x', r[0]); ring.setAttribute('y', r[1]); ring.setAttribute('width', r[2] - r[0]); ring.setAttribute('height', r[3] - r[1]); ring.classList.add('on'); } else ring.classList.remove('on'); }
  };
  // 3D spotlight (dims outside the area, clip-path) and ring (fades in at the new place; no layout animation)
  var setSpot = function (st) {
    if (!spot || !I3) return;
    var b = st.focus !== 'all' && st.box3d;
    if (!b) { spot.classList.remove('on'); if (ring3) ring3.classList.remove('on'); return; }
    var X = function (v) { return (v / I3[0] * 100).toFixed(2) + '%'; }, Y = function (v) { return (v / I3[1] * 100).toFixed(2) + '%'; };
    spot.style.clipPath = 'polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,' + X(b[0]) + ' ' + Y(b[1]) + ',' + X(b[2]) + ' ' + Y(b[1]) + ',' + X(b[2]) + ' ' + Y(b[3]) + ',' + X(b[0]) + ' ' + Y(b[3]) + ',' + X(b[0]) + ' ' + Y(b[1]) + ')';
    spot.classList.add('on');
    if (ring3) { ring3.classList.remove('on'); ring3.style.left = X(b[0]); ring3.style.top = Y(b[1]); ring3.style.width = X(b[2] - b[0]); ring3.style.height = Y(b[3] - b[1]); void ring3.offsetWidth; ring3.classList.add('on'); }
  };
  var showStep = function (n, force) {
    n = clamp(n, 0, N - 1); if (n === cur && !force) return; cur = n;
    var st = D.steps[n], planHidden = mode === 'discrete' && is3d && sec.classList.contains('tvx-has3d');
    if (!planHidden) setFocus(st); setSpot(st);
    if (mode === 'discrete') {
      cards.forEach(function (c, i) { c.classList.toggle('on', i === n); });
      if (compact) {
        if (!planHidden) place(world, stripCam(st.focus === 'all' ? null : (st.ring || st.box)), true);
        if (world3 && I3 && sec.classList.contains('tvx-has3d')) place(world3, stripCam(st.focus === 'all' ? null : st.box3d, true), true);
      } else {
        if (!planHidden) place(world, cam(boxOf(st)), true);
        if (world3 && I3 && sec.classList.contains('tvx-has3d')) place(world3, cam(boxOf(st, true), true), true);
      }
      if (bar && !scrollTimeline) bar.style.transform = 'scaleX(' + (N > 1 ? n / (N - 1) : 1).toFixed(3) + ')';
    }
    dots.forEach(function (d, i) { d.classList.toggle('on', i === n); });
  };

  // ---------- discrete mode: step markers + IntersectionObserver (no scroll listener) ----------
  var marks = [], markIO = null;
  var buildMarks = function () {
    if (marks.length) return;
    for (var i = 0; i < N; i++) { var m = document.createElement('i'); m.className = 'tvx-mark'; m.style.setProperty('--i', i); m.setAttribute('aria-hidden', 'true'); track.appendChild(m); marks.push(m); }
    markIO = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) showStep(marks.indexOf(e.target)); }); }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
    marks.forEach(function (m) { markIO.observe(m); });
  };
  var dropMarks = function () { if (markIO) markIO.disconnect(); marks.forEach(function (m) { m.remove(); }); marks = []; markIO = null; };

  // ---------- continuous mode: one rAF loop driven by passive scroll events while the section is on screen ----------
  var raf = 0, last = -1, onScreen = false, idle = 0;
  var frame = function () {
    raf = 0;
    var r = track.getBoundingClientRect(), span = r.height - innerHeight;
    var p = clamp(-r.top / (span > 0 ? span : 1), 0, 1), u = p * (N - 1);
    if (Math.abs(u - last) < 0.0005) return; last = u;
    if (bar && !scrollTimeline) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    var i = Math.min(Math.max(N - 2, 0), Math.floor(u)), j = Math.min(N - 1, i + 1), t = u - i, k = N > 1 ? ease(clamp((t - 0.22) / 0.56, 0, 1)) : 0;
    var mix = function (a, b) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; };
    world.style.transform = tf(mix(cam(boxOf(D.steps[i])), cam(boxOf(D.steps[j])))); world.style.willChange = 'transform';
    if (world3 && I3 && sec.classList.contains('tvx-has3d')) { world3.style.transform = tf(mix(cam(boxOf(D.steps[i], true), true), cam(boxOf(D.steps[j], true), true))); world3.style.willChange = 'transform'; }
    clearTimeout(idle); idle = setTimeout(function () { world.style.willChange = 'auto'; if (world3) world3.style.willChange = 'auto'; }, 160);
    showStep(Math.round(u));
    cards.forEach(function (c, n) { var d = u - n; c.style.opacity = clamp(1 - Math.abs(d) * 2.4, 0, 1).toFixed(3); c.style.transform = 'translate3d(0,' + (-d * 34).toFixed(1) + 'px,0)'; c.classList.toggle('on', n === Math.round(u)); });
  };
  var tick = function () { if (!raf) raf = requestAnimationFrame(frame); };
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
    var vis = en[0].isIntersecting;
    if (vis && !onScreen) { onScreen = true; addEventListener('scroll', tick, { passive: true }); tick(); }
    else if (!vis && onScreen) { onScreen = false; removeEventListener('scroll', tick); }
  }, { rootMargin: '20% 0px' }) : null;

  // ---------- full-screen viewer (phones): pinch-zoom and pan ----------
  var zoomBtn = null, viewer = null;
  var openViewer = function () {
    if (viewer) return;
    var three = sec.classList.contains('tvx-3d') && world3 && world3.querySelector('img');
    viewer = document.createElement('div'); viewer.className = 'tvx-viewer'; viewer.setAttribute('role', 'dialog'); viewer.setAttribute('aria-modal', 'true'); viewer.setAttribute('aria-label', three ? '3D view, full screen' : 'Site plan, full screen'); viewer.setAttribute('data-lenis-prevent', '');
    var pane = document.createElement('div'); pane.className = 'tvx-vpane';
    var media;
    if (three) { media = document.createElement('img'); var src = world3.querySelector('img'); media.src = src.currentSrc || src.src; media.alt = ''; media.width = I3[0]; media.height = I3[1]; }
    else { media = svg.cloneNode(true); [].forEach.call(media.querySelectorAll('[id]'), function (e) { e.removeAttribute('id'); }); media.removeAttribute('aria-labelledby'); media.setAttribute('aria-hidden', 'true'); media.classList.remove('dim'); [].forEach.call(media.querySelectorAll('.is-focus'), function (e) { e.classList.remove('is-focus'); }); var rr = media.querySelector('.tv-ring'); if (rr) rr.remove(); }
    media.className = (media.className.baseVal !== undefined ? '' : media.className + ' ') + 'tvx-vmedia'; if (media.className.baseVal !== undefined) media.setAttribute('class', 'tv-svg tvx-vmedia');
    pane.appendChild(media); viewer.appendChild(pane);
    viewer.insertAdjacentHTML('beforeend', '<button type="button" class="tvx-vclose" aria-label="Close the full-screen view">&times;</button><p class="tvx-vhint">Pinch to zoom, drag to move' + (innerHeight > innerWidth ? '. Rotate your phone for the full view' : '') + '.</p>' + (three && ai ? '<p class="tvx-vnote">' + ai.textContent + '</p>' : ''));
    document.body.appendChild(viewer); document.dispatchEvent(new CustomEvent('site:lock', { detail: true })); document.documentElement.classList.add('locked');
    // gestures: one finger pans, two fingers pinch (1x to 4x), double tap toggles 2.2x
    var s = 1, x = 0, y = 0, pts = {}, start = null, lastTap = 0;
    var apply = function () { var r = pane.getBoundingClientRect(), mw = media.offsetWidth * s, mh = media.offsetHeight * s; x = clamp(x, Math.min(0, (r.width - mw) / 2), Math.max(0, (mw - r.width) / 2)); y = clamp(y, Math.min(0, (r.height - mh) / 2), Math.max(0, (mh - r.height) / 2)); media.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + s.toFixed(3) + ')'; };
    pane.addEventListener('pointerdown', function (e) { try { pane.setPointerCapture(e.pointerId); } catch (er) {} pts[e.pointerId] = [e.clientX, e.clientY]; start = { s: s, x: x, y: y, pts: JSON.parse(JSON.stringify(pts)) }; media.style.willChange = 'transform';
      var now = Date.now(); if (now - lastTap < 300 && Object.keys(pts).length === 1) { s = s > 1.2 ? 1 : 2.2; if (s === 1) { x = y = 0; } apply(); } lastTap = now; });
    pane.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) return; pts[e.pointerId] = [e.clientX, e.clientY];
      var ids = Object.keys(pts), sids = Object.keys(start.pts);
      if (ids.length >= 2 && sids.length >= 2) { var a = pts[ids[0]], b = pts[ids[1]], a0 = start.pts[sids[0]], b0 = start.pts[sids[1]]; var d = Math.hypot(a[0] - b[0], a[1] - b[1]), d0 = Math.hypot(a0[0] - b0[0], a0[1] - b0[1]) || 1; s = clamp(start.s * d / d0, 1, 4); x = start.x + ((a[0] + b[0]) - (a0[0] + b0[0])) / 2; y = start.y + ((a[1] + b[1]) - (a0[1] + b0[1])) / 2; }
      else if (ids.length === 1 && start.pts[ids[0]]) { x = start.x + pts[ids[0]][0] - start.pts[ids[0]][0]; y = start.y + pts[ids[0]][1] - start.pts[ids[0]][1]; }
      apply();
    });
    var up = function (e) { delete pts[e.pointerId]; start = { s: s, x: x, y: y, pts: JSON.parse(JSON.stringify(pts)) }; if (!Object.keys(pts).length) media.style.willChange = 'auto'; };
    pane.addEventListener('pointerup', up); pane.addEventListener('pointercancel', up);
    var close = function () { if (!viewer) return; viewer.remove(); viewer = null; document.dispatchEvent(new CustomEvent('site:lock', { detail: false })); document.documentElement.classList.remove('locked'); removeEventListener('keydown', esc); if (zoomBtn) zoomBtn.focus(); };
    var esc = function (e) { if (e.key === 'Escape') close(); };
    viewer.querySelector('.tvx-vclose').addEventListener('click', close); addEventListener('keydown', esc);
    viewer.querySelector('.tvx-vclose').focus();
  };
  var buildZoom = function () {
    if (zoomBtn) return;
    zoomBtn = document.createElement('button'); zoomBtn.type = 'button'; zoomBtn.className = 'tvx-zoom';
    zoomBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg><span>Tap to enlarge</span>';
    zoomBtn.setAttribute('aria-label', 'Open the layout full screen');
    zoomBtn.addEventListener('click', openViewer); stage.appendChild(zoomBtn);
    view.addEventListener('click', function (e) { if (compact && !e.target.closest('button,a')) openViewer(); });
  };

  // ---------- modes ----------
  var layout = function () {
    W = view.clientWidth; H = view.clientHeight;
    world.style.width = W + 'px'; world.style.height = (W * VB[3] / VB[2]) + 'px';
    if (world3 && I3) { world3.style.width = W + 'px'; world3.style.height = (W * I3[1] / I3[0]) + 'px'; }
    if (compact) layoutStrip(); else { view.style.clipPath = ''; if (cardsEl) cardsEl.style.top = cardsEl.style.bottom = ''; }
    if (mode === 'discrete') showStep(cur < 0 ? 0 : cur, true); else { last = -1; tick(); }
  };
  var start = function () {
    var nextMode = (coarse.matches || lowPower || innerWidth < 768) ? 'discrete' : 'continuous';
    var nextCompact = innerWidth < 768;
    if (on && nextMode === mode && nextCompact === compact) { layout(); return; }
    if (on) stop();
    on = true; mode = nextMode; compact = nextCompact;
    sec.classList.add('tvx-on'); sec.classList.toggle('tvx-discrete', mode === 'discrete'); sec.classList.toggle('tvx-compact', compact);
    track.style.setProperty('--tvx-steps', N);
    cards.forEach(function (c) { c.style.opacity = c.style.transform = ''; });
    cur = -1; focusKey = '';
    if (compact) buildZoom();
    if (mode === 'discrete') { buildMarks(); layout(); }
    else { layout(); if (io) io.observe(track); else { onScreen = true; addEventListener('scroll', tick, { passive: true }); } }
  };
  var stop = function () {
    if (!on) return; on = false;
    sec.classList.remove('tvx-on', 'tvx-discrete', 'tvx-compact');
    if (io) io.unobserve(track); removeEventListener('scroll', tick); onScreen = false; dropMarks();
    [world, world3].forEach(function (el) { if (el) el.style.transform = el.style.width = el.style.height = el.style.willChange = ''; });
    view.style.clipPath = ''; if (cardsEl) cardsEl.style.top = cardsEl.style.bottom = '';
    if (zoomBtn) { zoomBtn.remove(); zoomBtn = null; }
    svg.classList.remove('dim'); hl.forEach(function (el) { el.classList.remove('is-focus'); }); if (ring) ring.classList.remove('on');
    if (spot) spot.classList.remove('on'); if (ring3) ring3.classList.remove('on');
    cards.forEach(function (c) { c.style.opacity = c.style.transform = ''; c.classList.remove('on'); });
    mode = ''; compact = false; cur = -1;
  };
  var apply = function () { if (reduce.matches) stop(); else start(); };
  // resize: phones fire this when the browser bar shows or hides; only re-fit (the stage itself uses svh and does not change)
  var rz = 0, lastW = innerWidth;
  addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (!on) return; if (innerWidth !== lastW) { lastW = innerWidth; start(); } else layout(); }, 150); });
  if (reduce.addEventListener) { reduce.addEventListener('change', apply); coarse.addEventListener('change', apply); }
  apply();
  // keyboard: a focused control inside a caption card scrolls its step into view
  sec.addEventListener('focusin', function (e) {
    if (!on) return; var c = e.target.closest('.tvx-card'); if (!c) return;
    var n = +c.getAttribute('data-i'), r = track.getBoundingClientRect(), span = r.height - innerHeight;
    scrollTo(0, scrollY + r.top + span * (n / Math.max(1, N - 1)));
  });
})();
