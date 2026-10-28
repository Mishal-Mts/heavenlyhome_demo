// Compare two screenshot sets: node tools/diff.mjs <labelA> <labelB>
import sharp from 'sharp';
const [a, b] = process.argv.slice(2);
for (const w of [390, 768, 1440]) {
  const A = sharp(`.shots/${a}/${w}.png`), B = sharp(`.shots/${b}/${w}.png`);
  const [ma, mb] = await Promise.all([A.metadata(), B.metadata()]);
  if (ma.height !== mb.height) { console.log(w, `height differs: ${ma.height} vs ${mb.height}`); continue; }
  const [da, db] = await Promise.all([A.raw().toBuffer(), B.raw().toBuffer()]);
  let diff = 0; for (let i = 0; i < da.length; i++) if (Math.abs(da[i] - db[i]) > 24) diff++;
  console.log(w, `${(diff / da.length * 100).toFixed(3)}% channels differ`);
}
