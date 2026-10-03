// ChatGPT در برابر Claude — موشن‌گرافیک فارسی. renderFrame(t) is pure: same t -> same frame.
const W = 1920, H = 1080;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

const C = {
  ink: '#0c0f22', ink2: '#171c3a', ink3: '#232a52',
  text: '#f4efe4', muted: '#a3a8c8',
  gold: '#e0b75a', goldDim: 'rgba(224,183,90,0.10)',
  gpt: '#1fc8a0', gptDeep: '#0b5e4c',
  cl: '#ec8a5e', clDeep: '#7a3a22',
};
const DISPLAY = 'Lalezar, Vazirmatn, Tahoma, sans-serif';
const BODY = 'Vazirmatn, Tahoma, sans-serif';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const p = (t, a, b) => clamp((t - a) / (b - a));
const eo = (x) => 1 - Math.pow(1 - x, 3);
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const back = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = (a, b, x) => a + (b - a) * x;
const fa = (s) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

// ---------- drawing helpers
function text(s, x, y, size, { font = BODY, weight = 700, color = C.text, alpha = 1, align = 'center', base = 'middle', glow = 0, glowColor = null } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.direction = 'rtl';
  ctx.textAlign = align;
  ctx.textBaseline = base;
  if (glow) { ctx.shadowColor = glowColor || color; ctx.shadowBlur = glow; }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  ctx.restore();
}
function wrap(s, maxW, size, font = BODY, weight = 500) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.direction = 'rtl';
  const words = s.split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  ctx.restore();
  return lines;
}
function rrect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function star8(cx, cy, r1, r2, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = rot + (i * Math.PI) / 8, r = i % 2 ? r2 : r1;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

// ---------- background: night-blue tile field with Persian eight-pointed stars (girih)
function background(t, tintR = null, tintL = null, tintAmt = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.ink2); g.addColorStop(1, C.ink);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(t * 0.012);
  ctx.strokeStyle = 'rgba(224,183,90,0.075)';
  ctx.lineWidth = 2;
  const S = 170;
  for (let i = -8; i <= 8; i++) for (let j = -6; j <= 6; j++) {
    const x = i * S + (j % 2 ? S / 2 : 0), y = j * S * 0.87;
    star8(x, y, 62, 40, Math.PI / 16); ctx.stroke();
    star8(x, y, 24, 16, Math.PI / 16 + t * 0.15); ctx.stroke();
  }
  ctx.restore();

  if (tintAmt > 0) {
    if (tintR) { const r = ctx.createRadialGradient(W * 0.8, H * 0.5, 0, W * 0.8, H * 0.5, W * 0.6); r.addColorStop(0, tintR); r.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = tintAmt; ctx.fillStyle = r; ctx.fillRect(0, 0, W, H); }
    if (tintL) { const r = ctx.createRadialGradient(W * 0.2, H * 0.5, 0, W * 0.2, H * 0.5, W * 0.6); r.addColorStop(0, tintL); r.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = tintAmt; ctx.fillStyle = r; ctx.fillRect(0, 0, W, H); }
    ctx.globalAlpha = 1;
  }

  // drifting dust
  for (let k = 0; k < 60; k++) {
    const sx = (Math.sin(k * 91.7) * 0.5 + 0.5), sy = (Math.sin(k * 37.3 + 1) * 0.5 + 0.5);
    const x = ((sx * W + t * (12 + (k % 7) * 4)) % (W + 40)) - 20;
    const y = ((sy * H - t * (8 + (k % 5) * 3)) % H + H) % H;
    ctx.fillStyle = `rgba(244,239,228,${0.08 + (k % 4) * 0.04})`;
    ctx.beginPath(); ctx.arc(x, y, 1.5 + (k % 3), 0, Math.PI * 2); ctx.fill();
  }

  // vignette
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

// Persian tile border frame (subtle)
function frame(alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = C.gold; ctx.lineWidth = 2;
  rrect(40, 40, W - 80, H - 80, 18); ctx.stroke();
  ctx.globalAlpha = alpha * 0.6;
  for (const [x, y] of [[40, 40], [W - 40, 40], [40, H - 40], [W - 40, H - 40]]) { star8(x, y, 18, 11, Math.PI / 16); ctx.fillStyle = C.gold; ctx.fill(); }
  ctx.restore();
}

// generic emblem: orbit rings + initial (no brand logos)
function emblem(cx, cy, r, color, letter, t, appear) {
  if (appear <= 0) return;
  ctx.save();
  ctx.translate(cx, cy);
  const s = back(clamp(appear));
  ctx.scale(s, s);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.6);
  glow.addColorStop(0, color + '55'); glow.addColorStop(1, color + '00');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.5; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r * 1.25, t * 1.2, t * 1.2 + Math.PI * 1.4); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.78, -t * 1.6, -t * 1.6 + Math.PI * 1.1); ctx.stroke();
  ctx.globalAlpha = 1;
  for (let i = 0; i < 3; i++) {
    const a = t * 1.2 + i * (Math.PI * 2 / 3);
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.25, Math.sin(a) * r * 1.25, 9, 0, Math.PI * 2); ctx.fill();
  }
  star8(0, 0, r * 0.62, r * 0.45, Math.PI / 16 + t * 0.2);
  ctx.fillStyle = color + '22'; ctx.fill(); ctx.strokeStyle = color + '99'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  text(letter, cx, cy + r * 0.06, r * 0.75, { font: DISPLAY, weight: 400, color: C.text, alpha: clamp(appear * 2), glow: 30, glowColor: color });
}

// ---------- scenes
function sceneIntro(t) {
  const pin = eo(p(t, 0.2, 1.4));
  const out = eio(p(t, 5.4, 6));
  background(t, C.gptDeep, C.clDeep, 0.6 * pin);

  // shake on VS hit
  const sh = Math.max(0, 1 - (t - 2.4) / 0.45);
  ctx.save();
  if (t > 2.4 && sh > 0) ctx.translate(Math.sin(t * 90) * 18 * sh, Math.cos(t * 70) * 12 * sh);
  ctx.globalAlpha = 1 - out;

  // diagonal split panels (RTL: ChatGPT on the right, Claude on the left)
  const off = (1 - pin) * W * 0.6 + out * 200;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(W / 2 + 70 + off, 0); ctx.lineTo(W + off, 0); ctx.lineTo(W + off, H); ctx.lineTo(W / 2 - 70 + off, H); ctx.closePath();
  let g = ctx.createLinearGradient(W, 0, W / 2, 0); g.addColorStop(0, 'rgba(31,200,160,0.30)'); g.addColorStop(1, 'rgba(31,200,160,0.05)');
  ctx.fillStyle = g; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-off, 0); ctx.lineTo(W / 2 + 70 - off, 0); ctx.lineTo(W / 2 - 70 - off, H); ctx.lineTo(-off, H); ctx.closePath();
  g = ctx.createLinearGradient(0, 0, W / 2, 0); g.addColorStop(0, 'rgba(236,138,94,0.30)'); g.addColorStop(1, 'rgba(236,138,94,0.05)');
  ctx.fillStyle = g; ctx.fill();
  // seam
  ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.globalAlpha *= p(t, 1.2, 1.6);
  ctx.beginPath(); ctx.moveTo(W / 2 + 70, 0); ctx.lineTo(W / 2 - 70, H); ctx.stroke();
  ctx.restore();

  const top = eo(p(t, 0.5, 1.3));
  text('نبرد غول‌های هوش مصنوعی', W / 2, 150 - (1 - top) * 30, 54, { font: DISPLAY, weight: 400, color: C.gold, alpha: top });

  const nIn = eo(p(t, 0.9, 1.9));
  text('ChatGPT', W * 0.755 + (1 - nIn) * 300, H / 2 - 10, 150, { font: DISPLAY, weight: 400, color: C.gpt, alpha: nIn, glow: 40 });
  text('ساخته‌ی OpenAI', W * 0.755 + (1 - nIn) * 300, H / 2 + 105, 40, { weight: 500, color: C.text, alpha: nIn * 0.85 });
  text('Claude', W * 0.245 - (1 - nIn) * 300, H / 2 - 10, 150, { font: DISPLAY, weight: 400, color: C.cl, alpha: nIn, glow: 40 });
  text('ساخته‌ی Anthropic', W * 0.245 - (1 - nIn) * 300, H / 2 + 105, 40, { weight: 500, color: C.text, alpha: nIn * 0.85 });

  // VS badge
  if (t >= 2.4) {
    const k = back(p(t, 2.4, 2.8));
    const sc = lerp(3.2, 1, k);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(sc, sc);
    ctx.rotate(Math.sin(t * 1.5) * 0.04);
    star8(0, 0, 150, 112, Math.PI / 16 + t * 0.3);
    ctx.fillStyle = C.gold; ctx.shadowColor = C.gold; ctx.shadowBlur = 50; ctx.fill();
    ctx.shadowBlur = 0;
    star8(0, 0, 124, 94, Math.PI / 16 + t * 0.3); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    text('در برابر', W / 2, H / 2 + 8, 62 * sc, { font: DISPLAY, weight: 400, color: C.ink });
    // shock ring
    const ring = p(t, 2.4, 3.2);
    if (ring < 1) { ctx.strokeStyle = `rgba(224,183,90,${1 - ring})`; ctx.lineWidth = 10 * (1 - ring); ctx.beginPath(); ctx.arc(W / 2, H / 2, 150 + ring * 700, 0, Math.PI * 2); ctx.stroke(); }
  }

  const sub = eo(p(t, 3.3, 4.0));
  text('کدام دستیار هوشمند برای شما بهتر است؟', W / 2, H - 170 + (1 - sub) * 30, 48, { weight: 700, color: C.text, alpha: sub });
  ctx.restore();

  // flash
  const fl = 1 - p(t, 2.4, 2.75);
  if (t >= 2.4 && fl > 0) { ctx.fillStyle = `rgba(255,246,225,${fl * 0.85})`; ctx.fillRect(0, 0, W, H); }
}

function profile(t, who) {
  const isG = who === 'gpt';
  const col = isG ? C.gpt : C.cl;
  const inA = eo(p(t, 0, 0.7)), out = eio(p(t, 5.45, 6));
  background(t + (isG ? 6 : 12), isG ? C.gptDeep : null, isG ? null : C.clDeep, 0.9);
  ctx.save();
  ctx.globalAlpha = 1 - out;
  const ex = isG ? W * 0.74 : W * 0.26;
  emblem(ex + (isG ? 1 : -1) * out * 200, H / 2, 190, col, isG ? 'G' : 'C', t, p(t, 0.15, 0.85));

  // text column (RTL, right-aligned)
  const ax = isG ? W * 0.56 : W * 0.88;
  const slide = (d) => (1 - eo(p(t, d, d + 0.6))) * 60;
  text(isG ? 'مبارز اول' : 'مبارز دوم', ax, 250 + slide(0.3), 44, { font: DISPLAY, weight: 400, color: C.gold, align: 'right', alpha: p(t, 0.3, 0.8) });
  text(isG ? 'ChatGPT' : 'Claude', ax, 370 + slide(0.45), 170, { font: DISPLAY, weight: 400, color: col, align: 'right', alpha: p(t, 0.45, 0.95), glow: 35 });
  ctx.fillStyle = col; ctx.globalAlpha = (1 - out) * p(t, 0.8, 1.2);
  const lw = 640 * eo(p(t, 0.8, 1.5));
  ctx.fillRect(ax - lw, 480, lw, 5);
  ctx.globalAlpha = 1 - out;

  const rows = isG
    ? [['سازنده', 'OpenAI'], ['عرضه‌ی عمومی', 'آذر ۱۴۰۱ — نوامبر ۲۰۲۲'], ['شهرت', 'محبوب‌ترین چت‌بات جهان']]
    : [['سازنده', 'Anthropic'], ['عرضه‌ی عمومی', 'اسفند ۱۴۰۱ — مارس ۲۰۲۳'], ['شعار', 'ایمنی و گفت‌وگوی طبیعی']];
  rows.forEach(([k, v], i) => {
    const d = 1.4 + i * 0.6, a = p(t, d, d + 0.5);
    const y = 570 + i * 105 + slide(d) * 0.6;
    star8(ax - 14, y + 4, 14, 9, Math.PI / 16); ctx.fillStyle = col; ctx.globalAlpha = (1 - out) * a; ctx.fill(); ctx.globalAlpha = 1 - out;
    text(k + ':', ax - 46, y, 42, { weight: 400, color: C.muted, align: 'right', alpha: a });
    ctx.save(); ctx.font = `400 42px ${BODY}`; const kw = ctx.measureText(k + ':').width; ctx.restore();
    text(v, ax - 66 - kw, y, 46, { weight: 700, color: C.text, align: 'right', alpha: a });
  });
  ctx.restore();
}

const ROUNDS = [
  { title: 'برنامه‌نویسی', gpt: 'کدنویسی سریع و پشتیبانی از زبان‌های گوناگون', cl: 'محبوب توسعه‌دهندگان برای پروژه‌های بزرگ و ساختارمند', edge: -0.55 },
  { title: 'نوشتن و متن‌های طولانی', gpt: 'متن‌های خلاقانه در سبک‌ها و لحن‌های مختلف', cl: 'لحن طبیعی و تحلیل اسناد بسیار طولانی', edge: -0.5 },
  { title: 'تصویر و صدا', gpt: 'ساخت تصویر و گفت‌وگوی صوتی زنده', cl: 'درک و تحلیل تصویر، اما بدون تولید تصویر', edge: 0.65 },
  { title: 'ابزارها و اکوسیستم', gpt: 'GPTهای سفارشی و جامعه‌ی کاربری بسیار بزرگ', cl: 'Artifacts و اتصال به ابزارهای کاری', edge: 0.5 },
  { title: 'ایمنی و اعتمادپذیری', gpt: 'سیاست‌های ایمنی گسترده و به‌روزرسانی مداوم', cl: 'رویکرد «هوش مصنوعی قانون‌مدار»', edge: 0 },
];

function card(cx, y, w, h, col, name, body, a, win, t) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  if (win > 0) { ctx.shadowColor = col; ctx.shadowBlur = 50 * win; }
  rrect(cx - w / 2, y, w, h, 26);
  ctx.fillStyle = 'rgba(23,28,58,0.88)'; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = col; ctx.lineWidth = 2 + win * 3; ctx.globalAlpha *= 0.5 + win * 0.5; ctx.stroke();
  ctx.restore();
  text(name, cx + w / 2 - 50, y + 70, 64, { font: DISPLAY, weight: 400, color: col, align: 'right', alpha: a });
  const lines = wrap(body, w - 100, 42);
  lines.forEach((ln, i) => text(ln, cx + w / 2 - 50, y + 160 + i * 66, 42, { weight: 500, color: C.text, align: 'right', alpha: a }));
  if (win > 0) {
    const s = back(clamp(win));
    ctx.save(); ctx.translate(cx - w / 2 + 70, y + 70); ctx.scale(s, s);
    star8(0, 0, 34, 22, Math.PI / 16 + t); ctx.fillStyle = C.gold; ctx.fill(); ctx.restore();
  }
}

function sceneRound(t, i) {
  const R = ROUNDS[i];
  const out = eio(p(t, 5.5, 6));
  const tiltNow = R.edge * eo(p(t, 2.6, 3.6));
  background(18 + i * 6 + t, C.gptDeep, C.clDeep, 0.35 + Math.max(0, tiltNow) * 0.5 + Math.max(0, -tiltNow) * 0.5);
  ctx.save();
  ctx.globalAlpha = 1 - out;
  ctx.translate(0, -out * 40);

  // round pill
  const pa = eo(p(t, 0, 0.5));
  ctx.save(); ctx.globalAlpha *= pa;
  rrect(W / 2 - 110, 90 - (1 - pa) * 40, 220, 76, 38); ctx.fillStyle = C.gold; ctx.fill(); ctx.restore();
  text('راند ' + fa(i + 1), W / 2, 130 - (1 - pa) * 40, 46, { font: DISPLAY, weight: 400, color: C.ink, alpha: pa });

  const ta = eo(p(t, 0.2, 0.8));
  const ts = lerp(1.3, 1, ta);
  ctx.save(); ctx.translate(W / 2, 255); ctx.scale(ts, ts);
  text(R.title, 0, 0, 96, { font: DISPLAY, weight: 400, color: C.text, alpha: ta, glow: 20, glowColor: C.gold });
  ctx.restore();

  const ca = eo(p(t, 0.7, 1.4)), cb = eo(p(t, 0.9, 1.6));
  const winG = R.edge > 0 ? p(t, 3.4, 3.9) : 0, winC = R.edge < 0 ? p(t, 3.4, 3.9) : 0;
  card(W * 0.74 + (1 - ca) * 500, 370, 760, 330, C.gpt, 'ChatGPT', R.gpt, ca, winG, t);
  card(W * 0.26 - (1 - cb) * 500, 370, 760, 330, C.cl, 'Claude', R.cl, cb, winC, t);

  // tug-of-war meter
  const ma = eo(p(t, 1.6, 2.2));
  const mx = W / 2, my = 820, mw = 1300;
  ctx.save(); ctx.globalAlpha *= ma;
  rrect(mx - mw / 2, my - 14, mw, 28, 14); ctx.fillStyle = C.ink3; ctx.fill();
  const pos = mx + tiltNow * mw / 2;
  if (tiltNow > 0) { rrect(mx, my - 14, pos - mx, 28, 14); ctx.fillStyle = C.gpt; ctx.fill(); }
  if (tiltNow < 0) { rrect(pos, my - 14, mx - pos, 28, 14); ctx.fillStyle = C.cl; ctx.fill(); }
  ctx.fillStyle = C.muted; ctx.fillRect(mx - 2, my - 30, 4, 60);
  star8(pos, my, 40, 26, Math.PI / 16 + t * 2); ctx.fillStyle = C.gold; ctx.shadowColor = C.gold; ctx.shadowBlur = 25; ctx.fill();
  ctx.restore();
  text('ChatGPT', mx + mw / 2, my + 70, 34, { font: DISPLAY, weight: 400, color: C.gpt, align: 'right', alpha: ma });
  text('Claude', mx - mw / 2, my + 70, 34, { font: DISPLAY, weight: 400, color: C.cl, align: 'left', alpha: ma });

  const va = eo(p(t, 3.6, 4.2));
  const verdict = R.edge === 0 ? 'نتیجه: مساوی — هر دو جدی‌اند' : 'برتری نسبی: ' + (R.edge > 0 ? 'ChatGPT' : 'Claude');
  text(verdict, W / 2, my + 140 + (1 - va) * 20, 50, { weight: 900, color: R.edge === 0 ? C.gold : R.edge > 0 ? C.gpt : C.cl, alpha: va });
  ctx.restore();

  // wipe in from previous round
  const wi = p(t, 0, 0.35);
  if (wi < 1 && i > 0) {
    ctx.fillStyle = C.gold;
    ctx.fillRect(W * eio(wi), 0, W, H);
  }
}

function sceneSummary(t) {
  const out = eio(p(t, 6.7, 7.2));
  background(48 + t, C.gptDeep, C.clDeep, 0.6);
  ctx.save(); ctx.globalAlpha = 1 - out;
  const ta = eo(p(t, 0, 0.6));
  text('جمع‌بندی', W / 2, 150 - (1 - ta) * 30, 96, { font: DISPLAY, weight: 400, color: C.gold, alpha: ta });
  const cols = [
    { x: W * 0.74, col: C.gpt, head: 'ChatGPT را انتخاب کنید اگر…', items: ['تولید تصویر می‌خواهید', 'گفت‌وگوی صوتی برایتان مهم است', 'به GPTهای آماده نیاز دارید'] },
    { x: W * 0.26, col: C.cl, head: 'Claude را انتخاب کنید اگر…', items: ['کد و پروژه‌ی بزرگ می‌نویسید', 'با اسناد طولانی کار می‌کنید', 'لحن طبیعی و دقیق می‌خواهید'] },
  ];
  cols.forEach((c, ci) => {
    const d0 = 0.5 + ci * 0.3, a = eo(p(t, d0, d0 + 0.6));
    ctx.save(); ctx.globalAlpha *= a;
    rrect(c.x - 400, 270 + (1 - a) * 60, 800, 600, 30);
    ctx.fillStyle = 'rgba(23,28,58,0.85)'; ctx.fill(); ctx.strokeStyle = c.col; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    text(c.head, c.x + 340, 360 + (1 - a) * 60, 52, { font: DISPLAY, weight: 400, color: c.col, align: 'right', alpha: a });
    c.items.forEach((it, k) => {
      const d = 1.4 + k * 0.7 + ci * 0.35, ia = eo(p(t, d, d + 0.45));
      const y = 500 + k * 120;
      ctx.save(); ctx.globalAlpha *= ia;
      ctx.translate(c.x + 320, y);
      ctx.scale(back(ia), back(ia));
      ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.fillStyle = c.col; ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-12, 1); ctx.lineTo(-3, 10); ctx.lineTo(13, -9); ctx.stroke();
      ctx.restore();
      text(it, c.x + 270 - (1 - ia) * 40, y + 2, 42, { weight: 700, color: C.text, align: 'right', alpha: ia });
    });
  });
  ctx.restore();
}

function sceneOutro(t) {
  background(55.2 + t, C.gptDeep, C.clDeep, 0.5);
  const a = back(p(t, 0, 0.7));
  ctx.save();
  ctx.translate(W / 2, H / 2 - 60);
  ctx.scale(lerp(0.6, 1, a), lerp(0.6, 1, a));
  star8(0, 0, 330, 250, Math.PI / 16 + t * 0.1);
  ctx.strokeStyle = 'rgba(224,183,90,0.35)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
  text('انتخاب با شماست!', W / 2, H / 2 - 60, 150, { font: DISPLAY, weight: 400, color: C.gold, alpha: clamp(a), glow: 40 });
  const s = eo(p(t, 0.9, 1.6));
  text('هر دو، دستیارانی قدرتمند برای کار و یادگیری‌اند', W / 2, H / 2 + 100 + (1 - s) * 20, 50, { weight: 700, color: C.text, alpha: s });
  const q = eo(p(t, 2.0, 2.7));
  text('ChatGPT', W / 2 + 330, H / 2 + 230, 64, { font: DISPLAY, weight: 400, color: C.gpt, alpha: q });
  text('یا', W / 2, H / 2 + 230, 56, { font: DISPLAY, weight: 400, color: C.muted, alpha: q });
  text('Claude', W / 2 - 330, H / 2 + 230, 64, { font: DISPLAY, weight: 400, color: C.cl, alpha: q });
  const c2 = eo(p(t, 3.0, 3.6));
  text('شما کدام را ترجیح می‌دهید؟ در کامنت‌ها بنویسید', W / 2, H - 140, 40, { weight: 500, color: C.muted, alpha: c2 });
  // final hit flash at 60s (t = 4.8)
  const fl = 1 - p(t, 4.8, 5.2);
  if (t >= 4.8 && fl > 0) { ctx.fillStyle = `rgba(224,183,90,${fl * 0.35})`; ctx.fillRect(0, 0, W, H); }
  const fade = p(t, 5.8, 6.8);
  if (fade > 0) { ctx.fillStyle = `rgba(5,6,14,${fade})`; ctx.fillRect(0, 0, W, H); }
}

function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  const S = TL.SCENES;
  if (t < S.intro[1]) sceneIntro(t);
  else if (t < S.gpt[1]) profile(t - S.gpt[0], 'gpt');
  else if (t < S.claude[1]) profile(t - S.claude[0], 'claude');
  else if (t < S.rounds[1]) { const k = Math.floor((t - S.rounds[0]) / 6); sceneRound(t - S.rounds[0] - k * 6, k); }
  else if (t < S.summary[1]) sceneSummary(t - S.summary[0]);
  else sceneOutro(t - S.outro[0]);
  frame(t < 0.6 ? p(t, 0, 0.6) * 0.5 : 0.5);
  // round progress dots in rounds
  if (t >= S.rounds[0] && t < S.rounds[1]) {
    const k = Math.floor((t - S.rounds[0]) / 6);
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.arc(W / 2 + (2 - i) * 40, H - 70, i === k ? 11 : 7, 0, Math.PI * 2);
      ctx.fillStyle = i <= k ? C.gold : C.ink3; ctx.fill();
    }
  }
}
window.renderFrame = renderFrame;

// ---------- preview player (index.html without ?render)
(async function boot() {
  await Promise.all([
    document.fonts.load(`400 80px Lalezar`), document.fonts.load(`500 40px Vazirmatn`),
    document.fonts.load(`700 40px Vazirmatn`), document.fonts.load(`900 40px Vazirmatn`),
  ]);
  renderFrame(4.5);
  window.READY = true;
  if (location.search.includes('render')) return;
  const audio = document.getElementById('a');
  const btn = document.getElementById('play');
  const bar = document.getElementById('bar');
  let playing = false;
  btn.onclick = () => { if (playing) audio.pause(); else audio.play(); };
  audio.onplay = () => { playing = true; btn.textContent = 'توقف'; loop(); };
  audio.onpause = () => { playing = false; btn.textContent = 'پخش'; };
  bar.oninput = () => { audio.currentTime = (bar.value / 1000) * TL.DUR; renderFrame(audio.currentTime); };
  function loop() { renderFrame(audio.currentTime); bar.value = (audio.currentTime / TL.DUR) * 1000; if (playing) requestAnimationFrame(loop); }
})();
