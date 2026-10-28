// Usage:
//   node render.js                       -> out/video.mp4 (all frames, silent)
//   node render.js --stills 2.5,9,20 DIR -> JPEG stills for review
//   node render.js --workers 3           -> parallel browsers (each renders a contiguous range)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ROOT = __dirname;
const TL = require('./timeline.js');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.otf': 'font/otf', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.json': 'application/json' };
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'];

function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    }).listen(0, () => res(srv));
  });
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => { console.error('[page error]', e.message); process.exitCode = 1; });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/index.html?render=1`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 180000 });
  return page;
}
const grab = (page, t) => page.evaluate((t) => { window.render(t); return document.getElementById('out').toDataURL('image/jpeg', 0.95).slice(23); }, t);

(async () => {
  const srv = await serve();
  const port = srv.address().port;
  const si = process.argv.indexOf('--stills');
  if (si > 0) {
    const browser = await chromium.launch({ args: ARGS });
    const page = await openPage(browser, port);
    const times = process.argv[si + 1].split(',').map(Number);
    const dir = process.argv[si + 2] || path.join(ROOT, 'out', 'stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const t of times) {
      const t0 = Date.now();
      fs.writeFileSync(path.join(dir, `s_${t.toFixed(2).padStart(6, '0')}.jpg`), Buffer.from(await grab(page, t), 'base64'));
      console.log('still', t, Date.now() - t0, 'ms');
    }
    await browser.close(); srv.close(); return;
  }
  const wi = process.argv.indexOf('--workers');
  const NW = wi > 0 ? parseInt(process.argv[wi + 1], 10) : 2;
  const total = Math.round(TL.DUR * TL.FPS);
  fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
  const per = Math.ceil(total / NW);
  const t0 = Date.now();
  const segs = [];
  await Promise.all(Array.from({ length: NW }, async (_, w) => {
    const a = w * per, b = Math.min(total, a + per);
    const seg = path.join(ROOT, 'out', `seg${w}.mp4`); segs[w] = seg;
    const browser = await chromium.launch({ args: ARGS });
    const page = await openPage(browser, port);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(TL.FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(TL.FPS), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = a; f < b; f++) {
      const buf = Buffer.from(await grab(page, f / TL.FPS), 'base64');
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if ((f - a) % 30 === 0) console.log(`w${w} frame ${f - a}/${b - a}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
    await browser.close();
  }));
  const list = path.join(ROOT, 'out', 'segs.txt');
  fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(ROOT, 'out', 'video.mp4')]);
  segs.forEach((s) => fs.unlinkSync(s)); fs.unlinkSync(list);
  console.log('wrote out/video.mp4 in', ((Date.now() - t0) / 1000).toFixed(0), 's');
  srv.close();
})();
