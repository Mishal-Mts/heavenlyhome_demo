// Builds the hero background video from the clips listed in hero-video.config.json. Nothing here names a clip:
// change the clips, their order, trims, speeds, crossfade, sizes or grade in the config and run this script again.
//   node tools/build-hero.mjs [path/to/config.json]
// Outputs (names from the config): videos/hero.mp4 + hero.webm (desktop), videos/hero-mobile.mp4 + .webm,
// images/hero-poster.jpg + .webp and hero-poster-mobile.jpg + .webp (first frame of the loop), and a report in
// .shots/hero-build-report.json. Source clips are only read, never changed.
// ffmpeg/ffprobe: ffmpeg-static + ffprobe-static installed OUTSIDE the project (config "toolsDir"):
//   npm install --prefix "%TEMP%\defender-hero-tools" ffmpeg-static ffprobe-static
//
// Pipeline: 1) each clip is trimmed, slowed to its speed and motion-interpolated back to the frame rate (mci keeps
// palm fronds crisper than frame blending). 2) Every frame is measured (mean linear RGB); slow brightness drift and
// colour cast are pulled towards the reference clip, smoothed over ~1 s, then each seam (including the loop seam) is
// ramped so both sides meet in the middle before the crossfade; a clip that flickers frame to frame is deflickered.
// 3) Clips are joined with crossfades plus one from the last clip back into the first, trimmed so the last frame
// leads into the first; one final gentle grade over the whole loop. 4) Encodes, poster, report.
import sharp from 'sharp';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, statSync, rmSync, renameSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ---------- config + tools ----------
// --entry NAME builds another video described in the config's "entries" (it overrides the top-level settings);
// without it the top-level settings build the hero
const argv = process.argv.slice(2), ENTRY = argv.includes('--entry') ? argv[argv.indexOf('--entry') + 1] : '';
const cfgPath = resolve(argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--sample' && argv[i - 1] !== '--entry') || 'hero-video.config.json');
const BASE = JSON.parse(readFileSync(cfgPath, 'utf8')), E = ENTRY ? (BASE.entries || {})[ENTRY] : null;
if (ENTRY && !E) { console.error(`No entry "${ENTRY}" in ${cfgPath}`); process.exit(1); }
const merge = (a, b) => { const o = { ...a }; for (const k in b || {}) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' ? merge(a[k], b[k]) : b[k]; return o; };
const C = E ? merge(BASE, E) : BASE, O = C.output, G = C.grade;
const toolsDir = (process.env.HERO_TOOLS_DIR || C.toolsDir || '').replace(/%(\w+)%/g, (_, v) => process.env[v] || '');
let ffmpeg, ffprobe;
try { const req = createRequire(join(resolve(toolsDir), 'package.json')); ffmpeg = req('ffmpeg-static'); ffprobe = req('ffprobe-static').path; }
catch { console.error(`ffmpeg-static / ffprobe-static not found in ${toolsDir}\nInstall them there (outside the project):\n  npm install --prefix "${toolsDir}" ffmpeg-static ffprobe-static`); process.exit(1); }
const SEG = C.clips.map(c => ({ ...c, path: join(C.sourceDir, c.file) }));
for (const s of SEG) if (!existsSync(s.path)) { console.error(`Clip not found: ${s.path} (check "sourceDir" and "clips" in ${cfgPath})`); process.exit(1); }
const FPS = C.fps || 24, X = C.crossfade ?? 0.5, TMP = join(O.videoDir, '_tmp');
mkdirSync(TMP, { recursive: true }); mkdirSync(O.imageDir, { recursive: true }); mkdirSync('.shots', { recursive: true });
const T_START = Date.now(), log = m => console.log(`[${((Date.now() - T_START) / 1000).toFixed(0).padStart(4)}s] ${m}`);
// -nostdin + ignored stdin: ffmpeg never waits on the terminal; each call is killed after STEP_TIMEOUT instead of hanging
const STEP_TIMEOUT = (C.stepTimeoutSeconds || 300) * 1000;
const run = (args, what) => { const t = Date.now(); if (what) log(what + ' ...'); execFileSync(ffmpeg, ['-hide_banner', '-nostdin', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'], timeout: STEP_TIMEOUT }); if (what) log(`${what} done (${((Date.now() - t) / 1000).toFixed(1)} s)`); };
// --sample N: encode only the first N seconds of the loop into videos/_sample/ to test encoder settings (no poster, page untouched)
const SAMPLE = process.argv.includes('--sample') ? +process.argv[process.argv.indexOf('--sample') + 1] || 4 : 0;
const probe = (p, e) => execFileSync(ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', e, '-of', 'csv=p=0', p]).toString().trim();
// working size = the first clip's size (even numbers); every clip is scaled to it before joining
const [W, H] = probe(SEG[0].path, 'stream=width,height').split(',').map(n => Math.round(+n / 2) * 2);

// ---------- colour helpers (sRGB-style transfer, close enough to BT.709 for matching) ----------
const toLin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const toEnc = x => { x = Math.max(0, Math.min(1, x)); return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055); };
const LIN = Float64Array.from({ length: 256 }, (_, v) => toLin(v));
const shoulder = x => x <= 0.8 ? x : 0.8 + 0.2 * Math.tanh((x - 0.8) / 0.2); // soft roll-off: the sun is never hard-clipped
const lumOf = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const smooth = (arr, r = 12) => arr.map((_, i) => { let s = 0, w = 0; for (let j = -r; j <= r; j++) { const k = Math.min(arr.length - 1, Math.max(0, i + j)), q = Math.exp(-(j * j) / (2 * (r / 2) ** 2)); s += arr[k] * q; w += q; } return s / w; });
const measure = file => new Promise((res, rej) => { // mean linear RGB of every frame, on a 96x54 copy
  const p = spawn(ffmpeg, ['-nostdin', '-loglevel', 'error', '-i', file, '-vf', 'scale=96:54:flags=area,format=rgb24', '-f', 'rawvideo', '-'], { stdio: ['ignore', 'pipe', 'inherit'] });
  const bufs = []; p.stdout.on('data', d => bufs.push(d)); p.on('error', rej);
  p.on('close', () => { const all = Buffer.concat(bufs), fs = 96 * 54 * 3, out = [];
    for (let o = 0; o + fs <= all.length; o += fs) { const m = [0, 0, 0]; for (let i = 0; i < fs; i += 3) { m[0] += LIN[all[o + i]]; m[1] += LIN[all[o + i + 1]]; m[2] += LIN[all[o + i + 2]]; } out.push(m.map(v => v / (96 * 54))); }
    res(out); });
});
const flicker = means => { const y = means.map(m => toEnc(lumOf(m))); let s = 0, n = 0; for (let i = 4; i < y.length - 4; i++) { let a = 0; for (let j = -4; j <= 4; j++) a += y[i + j]; s += (y[i] - a / 9) ** 2; n++; } return n ? Math.sqrt(s / n) : 0; };
const applyGains = (src, dst, gains) => new Promise((res, rej) => { // per-frame channel gains in linear light
  const dec = spawn(ffmpeg, ['-nostdin', '-loglevel', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { stdio: ['ignore', 'pipe', 'inherit'] });
  const enc = spawn(ffmpeg, ['-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-', '-c:v', 'ffv1', dst]);
  const fs = W * H * 3; let pend = Buffer.alloc(0), f = 0;
  const lutFor = g => g.map(gc => Uint8Array.from({ length: 256 }, (_, v) => Math.round(toEnc(shoulder(LIN[v] * gc)))));
  dec.stdout.on('data', d => {
    pend = pend.length ? Buffer.concat([pend, d]) : d;
    while (pend.length >= fs) {
      const fr = Buffer.from(pend.subarray(0, fs)); pend = pend.subarray(fs);
      const L = lutFor(gains[Math.min(f, gains.length - 1)]); f++;
      for (let i = 0; i < fs; i += 3) { fr[i] = L[0][fr[i]]; fr[i + 1] = L[1][fr[i + 1]]; fr[i + 2] = L[2][fr[i + 2]]; }
      if (!enc.stdin.write(fr)) { dec.stdout.pause(); enc.stdin.once('drain', () => dec.stdout.resume()); }
    }
  });
  dec.on('close', () => enc.stdin.end()); enc.on('close', c => c ? rej(new Error('encode failed')) : res()); dec.on('error', rej); enc.on('error', rej);
});

// ---------- 1) trim, slow down, interpolate (lossless) ----------
// interpolation: "none" = plain slow-down (setpts, frames repeated to the output rate), "blend", or "mci"
const MI = C.interpolation === 'blend' ? `minterpolate=fps=${FPS}:mi_mode=blend` : `minterpolate=fps=${FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1`;
const raw = [];
for (let i = 0; i < SEG.length; i++) {
  const s = SEG[i], out = join(TMP, `seg${i}.mkv`), speed = s.speed || 1;
  log(`clip ${i + 1}: ${s.path} ${s.start}-${s.end} s at ${speed}x`);
  run(['-i', s.path, '-vf', `trim=${s.start}:${s.end},${s.decimate ? `decimate=cycle=${s.decimate},` : ''}setpts=(PTS-STARTPTS)/${speed},${speed === 1 || C.interpolation === 'none' ? `fps=${FPS}` : MI},scale=${W}:${H},setsar=1`, '-an', '-c:v', 'ffv1', out]);
  let means = await measure(out); const fl = flicker(means), deflick = fl > (G.deflickerAbove ?? 0.6);
  if (deflick) { run(['-i', out, '-vf', 'deflicker=size=9:mode=pm', '-c:v', 'ffv1', join(TMP, `seg${i}d.mkv`)]); rmSync(out); renameSync(join(TMP, `seg${i}d.mkv`), out); means = await measure(out); }
  raw.push({ file: out, means, flicker: +fl.toFixed(2), deflick });
}

// ---------- 2) one look: match to the reference clip, then meet in the middle at every seam ----------
const ref = raw[G.referenceClip || 0].means, refL = ref.map(lumOf);
const refRatio = [0, 1, 2].map(c => ref.reduce((a, m, i) => a + m[c] / refL[i], 0) / ref.length);
const allL = raw.flatMap(r => r.means.map(lumOf)).sort((a, b) => a - b), TL = allL[Math.floor(allL.length / 2)];
const plans = raw.map(r => {
  const L = smooth(r.means.map(lumOf)), ratio = [0, 1, 2].map(c => smooth(r.means.map(m => m[c] / lumOf(m))));
  return r.means.map((_, f) => { const gL = (TL / L[f]) ** (G.matchBrightness ?? 0.8);
    return [0, 1, 2].map(c => { const want = ratio[c][f] + (G.matchColour ?? 0.85) * (refRatio[c] - ratio[c][f]); return gL * want / ratio[c][f]; }); });
});
const nX = Math.max(1, Math.round(X * FPS)), nRamp = Math.max(nX + 1, Math.round((G.seamRampSeconds ?? 1.5) * FPS));
const winL = (k, a, b) => { let s = 0; for (let f = a; f < b; f++) s += lumOf(raw[k].means[f].map((v, c) => v * plans[k][f][c])); return s / (b - a); };
const seams = SEG.map((_, a) => { const b = (a + 1) % SEG.length, na = raw[a].means.length, A = winL(a, na - nX, na), B = winL(b, 0, nX); return { a, b, A, B, mid: Math.sqrt(A * B) }; });
const ease = w => w * w * (3 - 2 * w);
for (const s of seams) {
  const na = raw[s.a].means.length;
  for (let f = 0; f < na; f++) { const w = Math.max(0, Math.min(1, (f - (na - nRamp)) / (nRamp - nX))); plans[s.a][f] = plans[s.a][f].map(v => v * (s.mid / s.A) ** ease(w)); }
  for (let f = 0; f < raw[s.b].means.length; f++) { const w = Math.max(0, Math.min(1, 1 - (f - nX) / (nRamp - nX))); plans[s.b][f] = plans[s.b][f].map(v => v * (s.mid / s.B) ** ease(w)); }
}
const EXPOSURE = G.exposure ?? 1; // overall lift in linear light; the soft shoulder keeps the sky from clipping
for (const p of plans) for (const fr of p) for (let c = 0; c < 3; c++) fr[c] = Math.min(1.35, Math.max(0.75, fr[c])) * EXPOSURE;
const graded = [];
for (let k = 0; k < SEG.length; k++) { const out = join(TMP, `graded${k}.mkv`); log(`grade clip ${k + 1} ...`); await applyGains(raw[k].file, out, plans[k]); graded.push(out); }

// ---------- 3) loop + final grade ----------
const durOf = p => +execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).toString().trim();
const lens = graded.map(durOf);
let f = graded.map((_, i) => `[${i}:v]setpts=PTS-STARTPTS,fps=${FPS},format=yuv420p[s${i}]`).join(';');
f += `;[${graded.length}:v]setpts=PTS-STARTPTS,fps=${FPS},format=yuv420p[a2]`;
let off = lens[0] - X, last = 's0';
for (let i = 1; i < graded.length; i++) { f += `;[${last}][s${i}]xfade=transition=fade:duration=${X}:offset=${off.toFixed(3)}[j${i}]`; last = `j${i}`; off += lens[i] - X; }
const fg = G.final || {};
f += `;[${last}][a2]xfade=transition=fade:duration=${X}:offset=${off.toFixed(3)}[loop]`;
// start one frame after the crossfade window so the last frame (first clip, fully faded in) leads straight into the first
const T0 = X + 1 / FPS;
f += `;[loop]trim=${T0.toFixed(4)}:${(off + T0).toFixed(4)},setpts=PTS-STARTPTS,eq=contrast=${fg.contrast ?? 1}:saturation=${fg.saturation ?? 1}:gamma=${fg.gamma ?? 1}[out]`;
const master = join(TMP, 'master.mkv');
run([...graded.flatMap(p => ['-i', p]), '-i', graded[0], '-filter_complex', f, '-map', '[out]', '-an', '-c:v', 'libx264', '-crf', '8', '-preset', 'medium', master], 'join clips, dissolves, final grade');

// ---------- 4) encodes, poster ----------
const vf = o => `scale=${o.width}:${o.height}:flags=lanczos${o.width > W && o.sharpen ? `,unsharp=5:5:${o.sharpen}` : ''},setsar=1,format=yuv420p`;
const outs = [];
const OUTDIR = SAMPLE ? join(O.videoDir, '_sample') : O.videoDir; mkdirSync(OUTDIR, { recursive: true });
const cut = SAMPLE ? ['-t', String(SAMPLE)] : [];
for (const o of [O.desktop, O.mobile]) {
  const mp4 = join(OUTDIR, `${o.name}.mp4`), webm = join(OUTDIR, `${o.name}.webm`);
  const cap = o.maxrate ? ['-maxrate', o.maxrate, '-bufsize', o.bufsize || o.maxrate] : [];
  run(['-i', master, ...cut, '-vf', vf(o), '-an', '-c:v', 'libx264', '-preset', o.preset || 'medium', '-crf', String(o.crf), ...cap, '-profile:v', 'high', '-movflags', '+faststart', mp4], `encode ${mp4}`);
  outs.push([mp4, o.sizeCapMB]);
  if (O.webm !== false) { run(['-i', master, ...cut, '-vf', vf(o), '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(o.webmCrf), '-row-mt', '1', '-deadline', 'good', '-cpu-used', String(O.vp9CpuUsed ?? 4), webm], `encode ${webm}`); outs.push([webm, o.sizeCapMB]); }
}
if (SAMPLE) { for (const [p] of outs) log(`${p} ${(statSync(p).size / 1048576).toFixed(2)} MB for ${SAMPLE} s -> about ${(statSync(p).size / 1048576 / SAMPLE * (durOf(master))).toFixed(1)} MB for the full ${durOf(master).toFixed(1)} s loop`); rmSync(TMP, { recursive: true, force: true }); process.exit(0); }
const P = O.poster, png = join(TMP, 'poster.png');
run(['-i', join(O.videoDir, `${O.desktop.name}.mp4`), '-frames:v', '1', png]);
await sharp(png).jpeg({ quality: P.jpgQuality, mozjpeg: true, progressive: true }).toFile(join(O.imageDir, `${P.name}.jpg`));
await sharp(png).webp({ quality: P.webpQuality }).toFile(join(O.imageDir, `${P.name}.webp`));
const ph = Math.round(P.mobileWidth * O.desktop.height / O.desktop.width / 2) * 2;
await sharp(png).resize(P.mobileWidth, ph).jpeg({ quality: P.jpgQuality - 2, mozjpeg: true, progressive: true }).toFile(join(O.imageDir, `${P.name}-mobile.jpg`));
await sharp(png).resize(P.mobileWidth, ph).webp({ quality: P.webpQuality - 2 }).toFile(join(O.imageDir, `${P.name}-mobile.webp`));

// ---------- cache-busting: every video and poster URL in the page gets ?v=<first 10 hex of the file's SHA-1> ----------
{
  const { createHash } = await import('node:crypto');
  const files = [O.desktop, O.mobile].flatMap(o => ['mp4', 'webm'].map(x => `${O.videoDir}/${o.name}.${x}`))
    .concat(['jpg', 'webp'].flatMap(x => [`${O.imageDir}/${P.name}.${x}`, `${O.imageDir}/${P.name}-mobile.${x}`])).filter(p => existsSync(p));
  if (C.html && existsSync(C.html)) {
    let html = readFileSync(C.html, 'utf8'); const tags = [];
    for (const p of files) {
      const v = createHash('sha1').update(readFileSync(p)).digest('hex').slice(0, 10), url = p.replace(/\\/g, '/');
      const re = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\?v=[0-9a-f]+)?(?=")', 'g');
      const n = (html.match(re) || []).length; html = html.replace(re, `${url}?v=${v}`); tags.push(`${url} x${n} -> ?v=${v}`);
    }
    writeFileSync(C.html, html); console.log('cache-busting in ' + C.html + ':\n  ' + tags.join('\n  '));
  }
}

// ---------- report ----------
const y8 = l => +toEnc(l).toFixed(1), avgL = a => a.reduce((x, m) => x + lumOf(m), 0) / a.length;
const gm = []; for (const g of graded) gm.push(await measure(g));
const fin = await measure(join(O.videoDir, `${O.mobile.name}.mp4`)), total = fin.length / FPS;
const loopStep = +Math.abs(toEnc(lumOf(fin.at(-1))) - toEnc(lumOf(fin[0]))).toFixed(1); // luma step at the loop point (0 = seamless)
const report = {
  config: cfgPath, workingSize: `${W}x${H}`, fps: FPS, crossfade: X, loopSeconds: +total.toFixed(2),
  clips: SEG.map((s, k) => ({ file: s.path, trim: [s.start, s.end], speed: s.speed, seconds: +lens[k].toFixed(2), flicker: raw[k].flicker, deflickered: raw[k].deflick,
    lumaBefore: { mean: y8(avgL(raw[k].means)), head: y8(avgL(raw[k].means.slice(0, nX))), tail: y8(avgL(raw[k].means.slice(-nX))) },
    lumaAfter: { mean: y8(avgL(gm[k])), head: y8(avgL(gm[k].slice(0, nX))), tail: y8(avgL(gm[k].slice(-nX))) } })),
  finalLumaPerSecond: [...Array(Math.ceil(total)).keys()].map(i => y8(avgL(fin.slice(i * FPS, (i + 1) * FPS)))), finalFlicker: +flicker(fin).toFixed(2), loopPointLumaStep: loopStep,
  files: outs.map(([p, cap]) => ({ file: p, MB: +(statSync(p).size / 1048576).toFixed(2), capMB: cap }))
};
writeFileSync(`.shots/${ENTRY || 'hero'}-build-report.json`, JSON.stringify(report, null, 1));
rmSync(TMP, { recursive: true, force: true });

console.log(`loop ${report.loopSeconds} s, ${FPS} fps, working size ${W}x${H}`);
for (const c of report.clips) console.log(`${c.file} ${c.trim.join('-')}s at ${c.speed}x -> ${c.seconds}s | luma ${c.lumaBefore.head}..${c.lumaBefore.tail} -> ${c.lumaAfter.head}..${c.lumaAfter.tail} | flicker ${c.flicker}${c.deflickered ? ' (deflickered)' : ''}`);
for (const s of seams) console.log(`seam ${s.a + 1}->${s.b + 1}: ${report.clips[s.a].lumaBefore.tail} | ${report.clips[s.b].lumaBefore.head}  ->  ${report.clips[s.a].lumaAfter.tail} | ${report.clips[s.b].lumaAfter.head}`);
console.log('final luma per second', report.finalLumaPerSecond.join(' '), '| flicker', report.finalFlicker, '| loop point step', report.loopPointLumaStep);
for (const x of report.files) console.log(x.file.padEnd(24), x.MB + ' MB', x.MB > x.capMB ? `  OVER the ${x.capMB} MB cap` : '');
