// Lighthouse audit (mobile preset by default: simulated slow 4G and 4x CPU slowdown) on a Playwright-launched Chromium.
// Usage: node tools/lighthouse.mjs [url] [mobile|desktop]   (serve the site first)
import { chromium } from 'playwright';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { writeFileSync, mkdirSync } from 'node:fs';

const url = process.argv[2] || 'http://localhost:8080/', mode = process.argv[3] || 'mobile', port = 9333;
mkdirSync('.shots/lighthouse', { recursive: true });
const browser = await chromium.launch({ args: [`--remote-debugging-port=${port}`] });
const result = await lighthouse(url, { port, output: ['json', 'html'], logLevel: 'error' }, mode === 'desktop' ? desktopConfig : undefined);
await browser.close();
writeFileSync(`.shots/lighthouse/${mode}.json`, result.report[0]);
writeFileSync(`.shots/lighthouse/${mode}.html`, result.report[1]);
const { categories: c, audits: a } = result.lhr;
console.log(`${mode}: ` + Object.values(c).map(x => `${x.title} ${Math.round(x.score * 100)}`).join(' | '));
for (const k of ['first-contentful-paint', 'largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time', 'speed-index']) console.log(`  ${a[k].title}: ${a[k].displayValue}`);
const lcp = a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet;
if (lcp) console.log('  LCP element:', lcp.slice(0, 120));
console.log('  audits below 0.9:');
for (const [k, v] of Object.entries(a)) if (v.score !== null && v.score < 0.9 && !['informative', 'notApplicable', 'manual'].includes(v.scoreDisplayMode)) console.log(`   - ${k} (${v.score}) ${v.displayValue || ''}`);
