/* Optional ambient ocean sound (Defender Villas).
   Off by default, no autoplay. The audio file is fetched only on the first tap of #sndBtn.
   Web Audio loop: audio/ocean-waves-4.mp3 is a 57 s loop with 1 s pre-roll and 1 s post-roll, so the loop points
   (LOOP_START..LOOP_END) sit inside real audio and the loop stays seamless even if a decoder adds MP3 padding.
   Volume 0.25, ~1 s fades, pauses while the tab is hidden, choice remembered in localStorage.
   Undo: bash _backup_pre_sound/revert-sound.sh */
(function () {
  'use strict';
  var SRC = 'audio/ocean-waves-4.mp3?v=20261106', VOL = 0.25, FADE = 1, LOOP_START = 1, LOOP_END = 58, KEY = 'dv-sound';
  var btn = document.getElementById('sndBtn');
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!btn || !AC) return;

  // styles (kept here so the change lives in this file only)
  var css = '.snd{position:fixed;right:calc(max(14px,env(safe-area-inset-right)) + 7px);bottom:calc(max(14px,env(safe-area-inset-bottom)) + var(--snd-up,0px));z-index:50;' +
    'width:40px;height:40px;border-radius:50%;display:grid;place-items:center;padding:0;cursor:pointer;color:#fff;' +
    'background:rgba(11,42,60,.62);border:1px solid rgba(255,255,255,.22);box-shadow:0 6px 16px rgba(0,0,0,.22);' +
    '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);transition:opacity .45s,visibility .45s,transform .15s,background-color .3s;-webkit-tap-highlight-color:transparent}' +
    '.snd.away{opacity:0;visibility:hidden;pointer-events:none}' +
    '.snd[hidden]{display:none}.snd svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}' +
    // tooltip "Sound on / off": on hover, keyboard focus, and briefly when the button first appears
    '.snd::after{content:attr(data-tip);position:absolute;right:calc(100% + 10px);top:50%;transform:translateY(-50%);white-space:nowrap;' +
    'font:500 .75rem/1 var(--sans,system-ui,sans-serif);letter-spacing:.02em;color:#fff;background:rgba(7,26,38,.88);padding:7px 10px;border-radius:999px;' +
    'box-shadow:0 4px 12px rgba(0,0,0,.2);opacity:0;pointer-events:none;transition:opacity .25s}' +
    '.snd:focus-visible::after,.snd.tip::after{opacity:1}' +
    '@media(hover:hover){.snd:hover::after{opacity:1}}' +
    '.snd .on{display:none}.snd[aria-pressed="true"] .on{display:block}.snd[aria-pressed="true"] .off{display:none}' +
    '.snd[aria-pressed="true"]{background:rgba(22,59,84,.92);border-color:rgba(242,215,166,.7)}' +
    '.snd[aria-busy="true"] svg{opacity:.55}' +
    '.snd:focus-visible{outline:3px solid #f2d7a6;outline-offset:3px;box-shadow:0 0 0 7px rgba(7,26,38,.6)}' +
    '@media(hover:hover){.snd:hover{transform:scale(1.07)}}' +
    '@media(prefers-reduced-motion:reduce){.snd,.snd::after{transition:none}.snd:hover{transform:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // sit just above the quick-contact buttons (their number depends on CONFIG), never on top of them
  var stack = document.querySelector('.sticky');
  var place = function () {
    var h = stack && stack.offsetHeight ? stack.offsetHeight + 12 : 0;
    btn.style.setProperty('--snd-up', h + 'px');
  };
  place();
  if (stack && 'ResizeObserver' in window) new ResizeObserver(place).observe(stack);
  window.addEventListener('load', place);
  btn.setAttribute('data-tip', 'Sound on / off');

  // hidden at the top of the page; fades in after the first small scroll (~100 px). Scrolling never starts audio.
  // Shown at once for keyboard users (first Tab) and with reduced motion.
  var SHOW_AT = 100, shown = false;
  var reveal = function (tip) {
    if (shown) return; shown = true;
    btn.classList.remove('away');
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('keydown', onKey, true);
    if (tip) { btn.classList.add('tip'); setTimeout(function () { btn.classList.remove('tip'); }, 2600); }
  };
  var onScroll = function () { if ((window.scrollY || document.documentElement.scrollTop) > SHOW_AT) reveal(true); };
  var onKey = function (e) { if (e.key === 'Tab') reveal(false); };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) shown = true;
  else {
    btn.classList.add('away');
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('keydown', onKey, true);
    onScroll(); // page opened part-way down (reload, #anchor)
  }
  btn.hidden = false;

  var store = function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} };
  var stored = function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } };

  var ctx = null, gain = null, buffer = null, source = null, loading = null, on = false;

  var setUI = function () {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  };

  var ramp = function (to, cb) {
    var t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(to, t + FADE);
    if (cb) setTimeout(cb, FADE * 1000 + 60);
  };

  var load = function () {
    if (loading) return loading;
    btn.setAttribute('aria-busy', 'true');
    loading = fetch(SRC).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.arrayBuffer();
    }).then(function (data) {
      return new Promise(function (res, rej) {
        var p = ctx.decodeAudioData(data, res, rej); // callback form for older Safari
        if (p && p.then) p.then(res, rej);
      });
    }).then(function (b) {
      buffer = b; btn.removeAttribute('aria-busy'); return b;
    }, function (e) {
      loading = null; btn.removeAttribute('aria-busy'); throw e;
    });
    return loading;
  };

  var startSource = function () {
    if (source || !buffer) return;
    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = LOOP_START;
    source.loopEnd = Math.min(LOOP_END, buffer.duration);
    source.connect(gain);
    source.start(0, LOOP_START);
  };

  var play = function () {
    // create and resume the context inside the tap (required on iOS)
    if (!ctx) {
      ctx = new AC();
      gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
    }
    if (ctx.state !== 'running') ctx.resume().catch(function () {});
    on = true; setUI(); store('on');
    load().then(function () {
      if (!on) return;
      startSource();
      if (!document.hidden) ramp(VOL);
    }).catch(function () { on = false; setUI(); });
  };

  var stop = function (remember) {
    on = false; setUI();
    if (remember) store('off');
    if (!ctx) return;
    ramp(0, function () { if (!on && ctx.state === 'running') ctx.suspend().catch(function () {}); });
  };

  btn.addEventListener('click', function () { if (on) stop(true); else play(); });

  // pause while the tab is hidden, fade back in when it returns
  document.addEventListener('visibilitychange', function () {
    if (!ctx || !on) return;
    if (document.hidden) {
      ramp(0, function () { if (document.hidden && ctx.state === 'running') ctx.suspend().catch(function () {}); });
    } else {
      var back = function () { if (on && !document.hidden) ramp(VOL); };
      if (ctx.state !== 'running') ctx.resume().then(back, function () {}); else back();
    }
  });
  // iOS can leave the context "interrupted" (calls, other audio); the next tap resumes it
  document.addEventListener('pointerdown', function () {
    if (ctx && on && ctx.state !== 'running' && !document.hidden) ctx.resume().then(function () { ramp(VOL); }, function () {});
  }, { passive: true });

  // remembered "on": browsers allow sound only after a user gesture, so it resumes at the visitor's first tap/click
  // or key press on the page (a click never fires for a scroll or swipe, and nothing plays on page load)
  setUI();
  if (stored() === 'on') {
    var first = function (e) {
      if (e.target && e.target.closest && e.target.closest('#sndBtn')) return; // the button handles itself
      if (e.type === 'keydown' && /^(Tab|Shift|Control|Alt|Meta)$/.test(e.key)) return;
      off(); if (!on && stored() === 'on') play();
    };
    var off = function () { ['click', 'keydown'].forEach(function (t) { document.removeEventListener(t, first, true); }); };
    ['click', 'keydown'].forEach(function (t) { document.addEventListener(t, first, true); });
    btn.addEventListener('click', off);
  }
})();
