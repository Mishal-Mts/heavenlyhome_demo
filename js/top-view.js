/* "See the layout from above" (#layout): scroll-driven fly-over of the site plan, with an optional 3D layer.
   Native scroll only: the stage is position:sticky inside a tall track; scroll progress is read in requestAnimationFrame
   (only while the section is on screen) and moves each layer's camera with transform translate/scale; captions use
   opacity/transform. Data (steps, camera boxes, flags) comes from #tvxData, written by tools/build-top-view.mjs.
   Plan boxes are in plan metres; 3D boxes are in pixels of the cropped render, which is never shown larger than
   1 image pixel per CSS pixel. Reduced motion or no JS: the plain plan with the captions as a list (CSS default). */
(function () {
  'use strict';
  var sec = document.getElementById('layout'), dataEl = document.getElementById('tvxData');
  if (!sec || !dataEl || !sec.classList.contains('tvx')) return;
  var D; try { D = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var track = sec.querySelector('.tvx-track'), view = sec.querySelector('.tvx-view'),
      world = sec.querySelector('.tvx-world'), svg = world && world.querySelector('svg'), ring = svg && svg.querySelector('.tv-ring'),
      world3 = sec.querySelector('.tvx-world3d'),
      cards = [].slice.call(sec.querySelectorAll('.tvx-card')), dots = [].slice.call(sec.querySelectorAll('.tvx-dots i')),
      bar = sec.querySelector('.tvx-bar i'), hl = svg ? [].slice.call(svg.querySelectorAll('.hl')) : [];
  if (!svg || !D.steps.length) return;

  // ---- Plan | 3D view switch (built only when the render exists and the proposals it shows are switched on) ----
  // The 3D view is the default (client request, 2026-11-09). The render is inserted and starts loading only when the
  // section comes near the screen, so it never competes with the hero. Without JS the section shows the plan.
  var tog = sec.querySelector('.tvx-toggle'), ai = sec.querySelector('.tvx-ai'), is3d = false, userChose = false;
  var load3d = function () {
    if (sec.classList.contains('tvx-has3d')) return;
    var tpl = world3.querySelector('template'); if (tpl) world3.appendChild(tpl.content.cloneNode(true));
    sec.classList.add('tvx-has3d'); if (on) { measure(); last = -1; frame(); }
  };
  var setView = function (want) {
    is3d = want; if (want) load3d();
    requestAnimationFrame(function () { sec.classList.toggle('tvx-3d', want); });
    if (ai) ai.hidden = !want;
    [].forEach.call(tog.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', (x.getAttribute('data-view') === '3d') === want ? 'true' : 'false'); });
  };
  if (tog && world3 && D.img3d) {
    tog.hidden = false;
    [].forEach.call(tog.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-view') === '3d' ? 'true' : 'false'); });
    tog.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; userChose = true; var want = b.getAttribute('data-view') === '3d'; if (want !== is3d) setView(want); });
    if ('IntersectionObserver' in window) {
      var near = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { near.disconnect(); if (!userChose) setView(true); } }, { rootMargin: '100% 0px' });
      near.observe(sec);
    } else setView(true);
  }

  var VB = D.vb, N = D.steps.length, on = false, raf = 0, last = -1, focusKey = '', idle = 0, onScreen = false, lastCur = -1;
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var portrait = function () { return innerWidth < 768 && innerHeight > innerWidth; };
  // Phones (compact mode): the whole plan and the whole 3D view always stay visible, fitted to the width and centred in
  // the space above the caption. The layers are placed once (no per-frame transforms, no re-rasterising at new zooms);
  // each step moves a spotlight and swaps the caption with CSS transitions. Wider screens keep the camera fly-over.
  var compact = false, spot = world3 && world3.querySelector('.tvx-spot');
  var W = 0, H = 0;
  var measure = function () {
    W = view.clientWidth; H = view.clientHeight;
    var was = compact; compact = innerWidth < 768; sec.classList.toggle('tvx-compact', compact);
    if (was !== compact) { lastCur = -1; cards.forEach(function (c) { c.style.opacity = c.style.transform = ''; }); var ce = sec.querySelector('.tvx-cards'); if (ce && !compact) ce.style.top = ce.style.bottom = ''; }
    world.style.width = W + 'px'; world.style.height = (W * VB[3] / VB[2]) + 'px';
    if (world3 && D.img3d) { world3.style.width = W + 'px'; world3.style.height = (W * D.img3d[1] / D.img3d[0]) + 'px'; }
    if (compact) fit();
  };
  // the area left free by the header (top) and the caption card (bottom on phones)
  var cardSpace = function () { var m = 0; cards.forEach(function (c) { m = Math.max(m, c.offsetHeight); }); return m + 74; };
  var inset = function () { return compact ? [70, Math.min(cardSpace(), H * 0.45)] : portrait() ? [70, Math.min(260, H * 0.34)] : [76, 40]; };
  // phones: the view (full width) and its caption form one block, centred between the header and the note
  var cardsEl = sec.querySelector('.tvx-cards');
  var fit = function () {
    var top0 = 70, bottom0 = 46, gap = 16, cardH = 0;
    cards.forEach(function (c) { cardH = Math.max(cardH, c.offsetHeight); });
    var sP = 0.96, hP = W * VB[3] / VB[2] * sP;                                   // plan: 96% of the width
    var s3 = D.img3d ? Math.min(0.96, D.img3d[0] / W) : 0, h3 = D.img3d ? W * D.img3d[1] / D.img3d[0] * s3 : 0;  // render: never upscaled
    var mh = Math.max(hP, h3), room = H - top0 - bottom0 - gap - cardH;
    if (mh > room && room > 60) { var f = room / mh; sP *= f; hP *= f; s3 *= f; h3 *= f; mh = room; } // very short screens
    var top = top0 + Math.max(0, (H - top0 - bottom0 - (mh + gap + cardH)) / 2);
    var place = function (el, s, h) { el.style.transform = 'translate3d(' + ((W - W * s) / 2).toFixed(1) + 'px,' + (top + (mh - h) / 2).toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')'; el.style.willChange = 'auto'; };
    place(world, sP, hP);
    if (world3 && D.img3d) place(world3, s3, h3);
    if (cardsEl) { cardsEl.style.top = Math.round(top + mh + gap) + 'px'; cardsEl.style.bottom = 'auto'; }
  };
  // the 3D spotlight: everything outside the step's area is dimmed (clip-path with a hole, in % of the render)
  var setSpot = function (st) {
    if (!spot || !D.img3d) return;
    var b = st.focus !== 'all' && st.box3d;
    if (!b) { spot.classList.remove('on'); return; }
    var X = function (v) { return (v / D.img3d[0] * 100).toFixed(2) + '%'; }, Y = function (v) { return (v / D.img3d[1] * 100).toFixed(2) + '%'; };
    spot.style.clipPath = 'polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,' + X(b[0]) + ' ' + Y(b[1]) + ',' + X(b[2]) + ' ' + Y(b[1]) + ',' + X(b[2]) + ' ' + Y(b[3]) + ',' + X(b[0]) + ' ' + Y(b[3]) + ',' + X(b[0]) + ' ' + Y(b[1]) + ')';
    spot.classList.add('on');
  };
  // fit box b into the free area. Plan: world units are metres, origin VB. 3D: units are render pixels, origin 0,0,
  // scale capped so one render pixel is never drawn larger than one CSS pixel, and the render keeps covering the stage.
  var cam = function (b, three) {
    var ins = inset(), ah = H - ins[0] - ins[1], ux = three ? D.img3d[0] : VB[2], ox = three ? 0 : VB[0], oy = three ? 0 : VB[1];
    var ppu = W / ux, bw = b[2] - b[0], bh = b[3] - b[1], s = Math.min(W / (bw * ppu), ah / (bh * ppu)) * 0.94;
    if (three) {
      var wh = W * D.img3d[1] / D.img3d[0];
      s = Math.min(s, D.img3d[0] / W);                 // never upscale the render
      if (!compact) s = Math.max(s, Math.min(H / wh, D.img3d[0] / W)); // wide screens: cover the stage height when the resolution allows
    }
    var cx = (b[0] + b[2]) / 2 - ox, cy = (b[1] + b[3]) / 2 - oy, tx = W / 2 - cx * ppu * s, ty = ins[0] + ah / 2 - cy * ppu * s;
    if (three) {
      var sw = W * s, sh = W * D.img3d[1] / D.img3d[0] * s;
      // keep the render's edges off-screen when it is larger than the stage; when smaller, it may sit anywhere inside
      tx = clamp(tx, Math.min(0, W - sw), Math.max(0, W - sw));
      ty = clamp(ty, Math.min(0, H - sh), Math.max(0, H - sh));
    }
    return [tx, ty, s];
  };
  var boxOf = function (st, three) { return three ? ((portrait() && st.mbox3d) || st.box3d || [0, 0, D.img3d[0], D.img3d[1]]) : ((portrait() && st.mbox) || st.box); };
  var put = function (el, a, b, k) {
    var tx = a[0] + (b[0] - a[0]) * k, ty = a[1] + (b[1] - a[1]) * k, s = a[2] + (b[2] - a[2]) * k;
    el.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')';
    el.style.willChange = 'transform';
  };
  var setFocus = function (step) {
    var k = step.focus || 'all'; if (k === focusKey) return; focusKey = k;
    var keys = k.split(' '), all = k === 'all';
    svg.classList.toggle('dim', !all);
    hl.forEach(function (el) { var ek = (el.getAttribute('data-k') || '').split(' '); el.classList.toggle('is-focus', all || ek.some(function (x) { return keys.indexOf(x) >= 0; })); });
    if (ring) { if (step.ring) { var r = step.ring; ring.setAttribute('x', r[0]); ring.setAttribute('y', r[1]); ring.setAttribute('width', r[2] - r[0]); ring.setAttribute('height', r[3] - r[1]); ring.classList.add('on'); } else ring.classList.remove('on'); }
  };

  var frame = function () {
    raf = 0;
    var r = track.getBoundingClientRect(), span = r.height - innerHeight;
    var p = clamp(-r.top / (span > 0 ? span : 1), 0, 1), u = p * (N - 1);
    if (Math.abs(u - last) < 0.0005) return; last = u;
    if (bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if (compact) {                                   // phones: only act when the step changes
      var c0 = Math.round(u); if (c0 === lastCur) return; lastCur = c0;
      setFocus(D.steps[c0]); setSpot(D.steps[c0]);
      cards.forEach(function (c, n) { c.classList.toggle('on', n === c0); });
      return;
    }
    var i = Math.min(Math.max(N - 2, 0), Math.floor(u)), j = Math.min(N - 1, i + 1), t = u - i;
    var k = N > 1 ? ease(clamp((t - 0.22) / 0.56, 0, 1)) : 0;     // each step holds, then the camera eases to the next
    put(world, cam(boxOf(D.steps[i])), cam(boxOf(D.steps[j])), k);
    if (world3 && sec.classList.contains('tvx-has3d')) put(world3, cam(boxOf(D.steps[i], true), true), cam(boxOf(D.steps[j], true), true), k);
    // while moving, the layers are promoted; when still they are re-drawn crisp at the new scale
    clearTimeout(idle); idle = setTimeout(function () { world.style.willChange = 'auto'; if (world3) world3.style.willChange = 'auto'; }, 160);
    var cur = Math.round(u);
    setFocus(D.steps[cur]); if (cur !== lastCur) { lastCur = cur; setSpot(D.steps[cur]); }
    cards.forEach(function (c, n) {
      var d = u - n, o = clamp(1 - Math.abs(d) * 2.4, 0, 1);
      c.style.opacity = o.toFixed(3);
      c.style.transform = 'translate3d(0,' + (-d * 34).toFixed(1) + 'px,0)';   // captions drift slower than the map: a light parallax
      c.classList.toggle('on', n === cur);
    });
    dots.forEach(function (d, n) { d.classList.toggle('on', n === cur); });
  };
  var tick = function () { if (!raf) raf = requestAnimationFrame(frame); };
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
    var vis = en[0].isIntersecting;
    if (vis && !onScreen) { onScreen = true; addEventListener('scroll', tick, { passive: true }); tick(); }
    else if (!vis && onScreen) { onScreen = false; removeEventListener('scroll', tick); }
  }, { rootMargin: '20% 0px' }) : null;

  var start = function () {
    if (on) return; on = true;
    sec.classList.add('tvx-on');
    track.style.setProperty('--tvx-steps', N);
    measure(); last = -1; focusKey = '';
    if (io) io.observe(track); else { onScreen = true; addEventListener('scroll', tick, { passive: true }); }
    tick();
  };
  var stop = function () {
    if (!on) return; on = false;
    sec.classList.remove('tvx-on'); if (io) io.unobserve(track);
    removeEventListener('scroll', tick); onScreen = false;
    [world, world3].forEach(function (el) { if (el) el.style.transform = el.style.width = el.style.height = el.style.willChange = ''; });
    svg.classList.remove('dim'); hl.forEach(function (el) { el.classList.remove('is-focus'); }); if (ring) ring.classList.remove('on');
    sec.classList.remove('tvx-compact'); compact = false; lastCur = -1; if (spot) spot.classList.remove('on');
    cards.forEach(function (c) { c.style.opacity = c.style.transform = ''; c.classList.remove('on'); });
  };
  var apply = function () { if (reduce.matches) stop(); else start(); };
  // resize: phones fire this when the address bar shows or hides; only re-fit, without re-running the step logic
  var rz = 0;
  addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (on) { measure(); last = -1; if (!compact) lastCur = -1; tick(); } }, 150); });
  if (reduce.addEventListener) reduce.addEventListener('change', apply);
  apply();
  // keyboard: a focused control inside a caption card scrolls its step into view
  sec.addEventListener('focusin', function (e) {
    if (!on) return; var c = e.target.closest('.tvx-card'); if (!c) return;
    var n = +c.getAttribute('data-i'), r = track.getBoundingClientRect(), span = r.height - innerHeight;
    scrollTo(0, scrollY + r.top + span * (n / Math.max(1, N - 1)));
  });
})();
