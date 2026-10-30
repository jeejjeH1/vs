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
  const CH = 120; // frames per chunk; finished chunks survive a restart and are skipped
  const dir = path.join(ROOT, 'out', 'chunks'); fs.mkdirSync(dir, { recursive: true });
  const chunks = []; for (let a = 0; a < total; a += CH) chunks.push([a, Math.min(total, a + CH)]);
  const name = (a) => path.join(dir, `c${String(a).padStart(5, '0')}.mp4`);
  const todo = chunks.filter(([a]) => !fs.existsSync(name(a)));
  console.log(`${chunks.length - todo.length}/${chunks.length} chunks already done`);
  const t0 = Date.now();
  await Promise.all(Array.from({ length: Math.min(NW, todo.length) }, async (_, w) => {
    const browser = await chromium.launch({ args: ARGS });
    const page = await openPage(browser, port);
    while (todo.length) {
      const [a, b] = todo.shift();
      const part = name(a) + '.part.mp4';
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(TL.FPS), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(TL.FPS), part], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let f = a; f < b; f++) {
        const buf = Buffer.from(await grab(page, f / TL.FPS), 'base64');
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      }
      ff.stdin.end();
      await new Promise((r) => ff.on('close', r));
      fs.renameSync(part, name(a));
      console.log(`w${w} chunk ${a}-${b} done  ${((Date.now() - t0) / 1000).toFixed(0)}s  (${todo.length} left)`);
    }
    await browser.close();
  }));
  const list = path.join(ROOT, 'out', 'segs.txt');
  fs.writeFileSync(list, chunks.map(([a]) => `file '${name(a)}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(ROOT, 'out', 'video.mp4')]);
  console.log('wrote out/video.mp4 in', ((Date.now() - t0) / 1000).toFixed(0), 's');
  srv.close();
})();
