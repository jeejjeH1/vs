// Startale App — ipUSD × IP Vault motion graphic. renderFrame(t) is pure: same t -> same frame.
const W = 1920, H = 1080;
const out = document.getElementById('c');
const octx = out.getContext('2d');
let ctx = octx;
const mk = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const BUF = [mk(), mk()];             // scene buffers (transitions only)
const FX = [mk(), mk(), mk(), mk()];  // scratch buffers (inside scenes and post)

const C = {
  bg: '#fafcfa', ink: '#0b0c0e', grey: '#5d646b', soft: '#9aa1a8',
  mint: '#7ff3b5', green: '#2fdc86', lime: '#dcfa9c', cyan: '#9ee9ff', pink: '#ff8ad8', lilac: '#b99cff', dark: '#03060a',
};
const IRI = ['#ff8ad8', '#c7a0ff', '#8ad7ff', '#9ff5cf', '#fff1a6', '#ffb0e0', '#ff8ad8'];
const IRI_DEEP = ['#ff3fb8', '#8b5cff', '#1fb8ff', '#19d68a', '#ffcf3d', '#ff3fb8'];
const FONT = 'Poppins, Inter, sans-serif';
const LOGO_R = 1.72;  // ring radius in units of square side (measured from the logo)

// ---------- math
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const p = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, x) => a + (b - a) * x;
const eo = (x) => 1 - Math.pow(1 - x, 3);
const eo5 = (x) => 1 - Math.pow(1 - x, 5);
const ei = (x) => x * x * x;
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const back = (x, s = 1.7) => { const c3 = s + 1; return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const elastic = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1);
const pulse = (t, a, d) => (t < a ? 0 : Math.exp(-(t - a) / d));
const fract = (x) => x - Math.floor(x);
const hash = (n) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
function rng(s) { return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let q = Math.imul(s ^ (s >>> 15), 1 | s); q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q; return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; }
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

// ---------- primitives
function rrect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function blob(x, y, r, color, a = 1) {
  if (a <= 0 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(0.4, rgba(color, a * 0.45)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function sparkle(x, y, r, a = 1, rot = 0, color = '#ffffff', halo = true) {
  if (a <= 0 || r <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y);
  if (halo) blob(0, 0, r * 0.9, color, 0.55);
  ctx.rotate(rot);
  ctx.beginPath(); ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(0, 0, r, 0); ctx.quadraticCurveTo(0, 0, 0, r);
  ctx.quadraticCurveTo(0, 0, -r, 0); ctx.quadraticCurveTo(0, 0, 0, -r);
  ctx.fillStyle = color; ctx.fill(); ctx.restore();
}
function rays(x, y, n, len, rot, a, color, width = 0.09, seed = 1) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, len);
  g.addColorStop(0, rgba(color, 0.9)); g.addColorStop(0.35, rgba(color, 0.35)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + hash(i + seed) * 0.2, hw = width * (0.4 + hash(i * 3 + seed) * 0.9);
    const L = len * (0.55 + 0.45 * hash(i * 7 + seed));
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a0 - hw) * L, Math.sin(a0 - hw) * L); ctx.lineTo(Math.cos(a0 + hw) * L, Math.sin(a0 + hw) * L);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function shock(x, y, t, t0, maxR, color, width = 14, dur = 0.8, sy = 1) {
  const k = p(t, t0, t0 + dur); if (k <= 0 || k >= 1) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(1, sy);
  ctx.beginPath(); ctx.arc(0, 0, eo(k) * maxR, 0, Math.PI * 2);
  ctx.strokeStyle = rgba(color, (1 - k) * 0.9); ctx.lineWidth = width * (1 - k) + 1; ctx.stroke();
  ctx.restore();
}
// anamorphic flare: core, horizontal streak, ghosts mirrored through the frame center
function flare(x, y, k, color = '#9ff5cf') {
  if (k <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  blob(x, y, 160 * k, '#ffffff', 0.8 * k);
  blob(x, y, 420 * k, color, 0.35 * k);
  ctx.save(); ctx.translate(x, y); ctx.scale(9, 0.07); blob(0, 0, 160 * k, '#d9fff0', 0.9 * k); ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.scale(4, 0.025); blob(0, 0, 220 * k, '#ffffff', k); ctx.restore();
  const dx = W / 2 - x, dy = H / 2 - y;
  [[0.5, 40, '#ff8ad8'], [0.9, 22, '#8ad7ff'], [1.35, 70, '#9ff5cf'], [1.7, 30, '#c7a0ff']].forEach(([f, r, c]) => {
    const gx = x + dx * f * 2, gy = y + dy * f * 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) ctx.lineTo(gx + Math.cos(i * Math.PI / 3) * r * k, gy + Math.sin(i * Math.PI / 3) * r * k);
    ctx.closePath(); ctx.fillStyle = rgba(c, 0.12 * k); ctx.fill();
  });
  ctx.restore();
}
function iriConic(cx, cy, ph, cols = IRI) { const g = ctx.createConicGradient(ph, cx, cy); cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c)); return g; }
function iriLinear(x0, x1, y, ph, cols = IRI_DEEP) {
  // seamless horizontal sweep: two periods, shifted by ph
  const w = x1 - x0, g = ctx.createLinearGradient(x0 - w * fract(ph), y, x0 + w * (2 - fract(ph)), y + w * 0.15);
  const n = cols.length - 1;
  for (let i = 0; i <= 2 * n; i++) g.addColorStop(i / (2 * n), cols[i % n]);
  return g;
}

// ---------- text
function setFont(size, weight = 700, ls = 0) { ctx.font = `${weight} ${size}px ${FONT}`; ctx.letterSpacing = `${ls}px`; }
function tw(s, size, weight = 700, ls = 0) { ctx.save(); setFont(size, weight, ls); const w = ctx.measureText(s).width; ctx.restore(); return w; }
function txt(s, x, y, size, o = {}) {
  const { weight = 700, color = C.ink, alpha = 1, align = 'left', base = 'alphabetic', ls = 0, shadow = null, stroke = 0 } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; setFont(size, weight, ls);
  ctx.textAlign = align; ctx.textBaseline = base;
  if (shadow) { ctx.shadowColor = shadow[0]; ctx.shadowBlur = shadow[1]; ctx.shadowOffsetY = shadow[2] || 0; }
  if (stroke) { ctx.strokeStyle = color; ctx.lineWidth = stroke; ctx.strokeText(s, x, y); } else { ctx.fillStyle = color; ctx.fillText(s, x, y); }
  ctx.restore();
}
// per-letter slam: letters fall in with overshoot scale and motion-blur ghosts
function kinetic(s, x, y, size, t, t0, o = {}) {
  const { weight = 700, color = C.ink, align = 'left', stagger = 0.035, dur = 0.55, ls = -size * 0.02, rise = 0.6, alpha = 1 } = o;
  if (t < t0 || alpha <= 0) return;
  const total = tw(s, size, weight, ls);
  const x0 = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]; if (ch === ' ') continue;
    const k = p(t, t0 + i * stagger, t0 + i * stagger + dur); if (k <= 0) continue;
    const off = tw(s.slice(0, i), size, weight, ls), cw = tw(ch, size, weight, 0);
    const cx = x0 + off + cw / 2;
    const draw = (kk, a) => {
      const e = eo5(kk), sc = lerp(1.9, 1, back(kk, 1.4));
      ctx.save(); ctx.globalAlpha *= a * alpha; ctx.translate(cx, y - (1 - e) * size * rise); ctx.scale(sc, sc);
      setFont(size, weight, 0); ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.fillText(ch, 0, 0); ctx.restore();
    };
    if (k < 0.7) for (let g = 3; g >= 1; g--) draw(clamp(k - g * 0.05), clamp(k * 4) * 0.16);
    draw(k, clamp(k * 4));
  }
}
// line rises out of a mask; parts = [[text, weight, color], ...]
function reveal(parts, x, y, size, t, t0, o = {}) {
  const k = eo5(p(t, t0, t0 + (o.dur || 0.7))); if (k <= 0) return;
  if (typeof parts === 'string') parts = [[parts, o.weight || 500, o.color || C.ink]];
  const ls = o.ls ?? 0;
  const total = parts.reduce((w, [s, wt]) => w + tw(s, size, wt, ls), 0);
  let cx = o.align === 'center' ? x - total / 2 : x;
  ctx.save(); ctx.beginPath(); ctx.rect(0, y - size * 1.2, W, size * 1.55); ctx.clip();
  for (const [s, wt, col] of parts) {
    txt(s, cx, y + (1 - k) * size * 1.4, size, { weight: wt, color: col, ls, alpha: o.alpha ?? 1 });
    cx += tw(s, size, wt, ls);
  }
  ctx.restore();
}
function pill(s, cx, cy, k, o = {}) {
  if (k <= 0) return;
  const { size = 26, bg = C.ink, color = '#fff', padX = 26, h = size * 2.1, ls = 4, weight = 600 } = o;
  const w = tw(s, size, weight, ls) + padX * 2;
  ctx.save(); ctx.translate(cx, cy); const sc = back(clamp(k)); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(k * 3);
  rrect(-w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = bg; ctx.fill();
  if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 2; ctx.stroke(); }
  txt(s, ls / 2, 1, size, { weight, color, align: 'center', base: 'middle', ls });
  ctx.restore();
}

// ---------- brand
const markHalf = (s) => LOGO_R * s + s * Math.SQRT1_2;
function logoMark(cx, cy, s, o = {}) {
  const { color = C.ink, piece = null, spin = 0, from = 7, glow = null, alpha = 1, trail = false } = o;
  for (let i = 0; i < 8; i++) {
    const k = piece ? piece(i) : 1; if (k <= 0) continue;
    const one = (kk, a) => {
      const e = eo5(clamp(kk));
      const ang = -Math.PI / 2 + (i * Math.PI) / 4 + spin;
      const rad = LOGO_R * s * lerp(from, 1, e);
      const sz = s * lerp(2.6, 1, e);
      ctx.save(); ctx.globalAlpha *= alpha * a;
      if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = s * 1.4; }
      ctx.translate(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad);
      ctx.rotate(ang + Math.PI / 4 + (1 - e) * 4);
      ctx.fillStyle = color; ctx.fillRect(-sz / 2, -sz / 2, sz, sz); ctx.restore();
    };
    if (trail && k < 1) for (let g = 5; g >= 1; g--) one(k - g * 0.035, clamp(k * 2.5) * 0.12);
    one(k, clamp(k * 2.5));
  }
}
// "Startale App" wordmark; y = vertical center of the mark
function wordmark(x, y, F, color, alpha = 1) {
  const base = y + F * 0.35;
  txt('Startale', x, base, F, { weight: 400, color, ls: -F * 0.02, alpha });
  txt('App', x + tw('Startale ', F, 400, -F * 0.02), base, F, { weight: 600, color, ls: -F * 0.02, alpha });
}
const wordW = (F) => tw('Startale ', F, 400, -F * 0.02) + tw('App', F, 600, -F * 0.02);
function lockup(x, y, F, o = {}) {
  const s = F * 0.27, mh = markHalf(s);
  logoMark(x + mh, y, s, o);
  wordmark(x + 2 * mh + F * 0.36, y, F, o.color || C.ink, o.alpha ?? 1);
}
const lockupW = (F) => 2 * markHalf(F * 0.27) + F * 0.36 + wordW(F);
function brandBug(t, t0, a = 1) {
  const k = eo5(p(t, t0, t0 + 0.6)); if (k <= 0) return;
  ctx.save(); ctx.globalAlpha *= k * a; ctx.translate(-(1 - k) * 40, 0);
  lockup(78, 82, 44, { color: C.ink });
  ctx.restore();
}

// ---------- coins
function coin(x, y, r, spin, t, o = {}) {
  const kind = o.kind || 'ip', a = o.alpha ?? 1;
  if (a <= 0 || r <= 1) return;
  const c = Math.cos(spin), s = Math.sin(spin);
  const sx = Math.max(Math.abs(c), 0.02), th = r * 0.14 * s;
  ctx.save(); ctx.globalAlpha *= a;
  if (o.shadow !== false) { ctx.save(); ctx.globalAlpha *= 0.22; ctx.translate(x, y + r * 1.35); ctx.scale(1, 0.16); blob(0, 0, r * 0.95, '#1d3a2c', 0.9); ctx.restore(); }
  // edge band
  if (Math.abs(th) > 0.6) {
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x + th, y, r * sx, r, 0, 0, Math.PI * 2); ctx.rect(Math.min(x, x + th), y - r, Math.abs(th), 2 * r);
    const eg = ctx.createLinearGradient(0, y - r, 0, y + r);
    if (kind === 'ip') { eg.addColorStop(0, '#f2a6e6'); eg.addColorStop(0.5, '#a77cf0'); eg.addColorStop(1, '#e48ad6'); }
    else { eg.addColorStop(0, '#3a6fe0'); eg.addColorStop(1, '#15328c'); }
    ctx.fillStyle = eg; ctx.fill(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let yy = y - r; yy < y + r; yy += Math.max(3, r * 0.035)) ctx.fillRect(x - r * 2, yy, r * 4, 1.2);
    ctx.restore();
  }
  ctx.translate(x, y); ctx.scale(sx, 1);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  if (kind === 'ip') ctx.fillStyle = iriConic(0, 0, t * 0.7 + spin * 0.5);
  else { const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 0, 0, 0, r); g.addColorStop(0, '#6fa8ff'); g.addColorStop(1, '#1d4fd8'); ctx.fillStyle = g; }
  ctx.fill();
  ctx.save(); ctx.clip();
  // inner disc and gloss
  ctx.beginPath(); ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2);
  const ig = ctx.createRadialGradient(-r * 0.35, -r * 0.45, 0, 0, 0, r);
  ig.addColorStop(0, 'rgba(255,255,255,0.75)'); ig.addColorStop(0.5, 'rgba(255,255,255,0.12)'); ig.addColorStop(1, 'rgba(120,60,160,0.18)');
  ctx.fillStyle = ig; ctx.fill();
  ctx.lineWidth = r * 0.025; ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.93, 0, Math.PI * 2); ctx.setLineDash([r * 0.012, r * 0.03]);
  ctx.lineWidth = r * 0.07; ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.stroke(); ctx.setLineDash([]);
  // emblem, embossed: dark offset pass then light pass
  const emb = (col, dx, dy) => {
    ctx.save(); ctx.translate(dx, dy);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = r * 0.075;
    if (kind === 'ip') {
      ctx.beginPath(); ctx.arc(0, 0, r * 0.6, Math.PI * 0.62, Math.PI * 1.38); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.6, -Math.PI * 0.38, Math.PI * 0.38); ctx.stroke();
      setFont(r * 0.62, 800, -r * 0.01); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('IP', 0, r * 0.04);
    } else {
      ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2); ctx.lineWidth = r * 0.05; ctx.stroke();
      setFont(r * 0.78, 700, 0); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, r * 0.05);
    }
    ctx.restore();
  };
  emb(kind === 'ip' ? 'rgba(150,50,150,0.45)' : 'rgba(10,30,90,0.5)', r * 0.025, r * 0.035);
  const eg2 = ctx.createLinearGradient(0, -r * 0.6, 0, r * 0.6);
  eg2.addColorStop(0, '#ffffff'); eg2.addColorStop(1, kind === 'ip' ? '#ffd3f4' : '#d6e6ff');
  emb(eg2, 0, 0);
  if (kind === 'ip') { sparkle(-r * 0.47, -r * 0.5, r * 0.12, 0.95, 0, '#fff', false); sparkle(r * 0.5, r * 0.47, r * 0.09, 0.95, 0, '#fff', false); }
  // specular sheen band
  const sh = o.sheen ?? (fract(t * 0.23 + spin * 0.08) * 3.2 - 1.6);
  ctx.globalCompositeOperation = 'screen';
  const sg = ctx.createLinearGradient(-r + sh * r, -r, r + sh * r, r);
  sg.addColorStop(0.35, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.85)'); sg.addColorStop(0.65, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg; ctx.fillRect(-r, -r, 2 * r, 2 * r);
  ctx.restore();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.lineWidth = r * 0.02; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.stroke();
  ctx.restore();
}

// ---------- star points badge
function badge(cx, cy, val, k, t, o = {}) {
  if (k <= 0) return;
  const h = o.h || 124, plus = `+${val}`;
  const pw = tw(plus, h * 0.5, 700, -1), lw = tw('STAR Points', h * 0.27, 500, 1);
  const w = h + pw + 18 + lw + h * 0.45;
  ctx.save(); ctx.translate(cx, cy); const sc = back(clamp(k), 2.2); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(k * 3);
  ctx.shadowColor = 'rgba(30,190,110,0.35)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
  rrect(-w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = C.ink; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.lineWidth = 3; ctx.strokeStyle = iriConic(0, 0, t * 2); ctx.stroke();
  const ix = -w / 2 + h / 2;
  ctx.beginPath(); ctx.arc(ix, 0, h * 0.34, 0, Math.PI * 2); ctx.fillStyle = iriConic(ix, 0, t * 3); ctx.fill();
  sparkle(ix, 0, h * 0.2, 1, t * 1.5, '#ffffff', false);
  txt(plus, -w / 2 + h, h * 0.03, h * 0.5, { weight: 700, color: '#fff', base: 'middle', ls: -1 });
  txt('STAR Points', -w / 2 + h + pw + 18, h * 0.04, h * 0.27, { weight: 500, color: C.mint, base: 'middle', ls: 1 });
  ctx.save(); rrect(-w / 2, -h / 2, w, h, h / 2); ctx.clip();
  const bx = lerp(-w, w, fract((t - (o.t0 || 0)) * 0.55));
  const g = ctx.createLinearGradient(bx - 80, 0, bx + 80, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore();
  ctx.restore();
}
// particle burst (sparkles + logo squares), deterministic per seed
function burst(x, y, t, t0, n, seed, o = {}) {
  const age = t - t0, life = o.life || 1.3; if (age < 0 || age > life) return;
  const r = rng(seed), spd = o.speed || 900, grav = o.grav ?? 600, add = o.add;
  ctx.save(); if (add) ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const a = (o.dir ?? 0) + (o.spread ? (r() - 0.5) * o.spread : r() * Math.PI * 2);
    const v = spd * (0.25 + r() * 0.75), sz = (o.size || 16) * (0.4 + r() * 0.9), col = (o.cols || IRI_DEEP)[Math.floor(r() * 5)];
    const lf = life * (0.6 + r() * 0.4), k = age / lf; if (k >= 1) { r(); continue; }
    const d = v * (1 - Math.pow(1 - clamp(age / lf), 2)) * lf * 0.55;
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d + grav * age * age * 0.5;
    const al = (1 - k) * (o.alpha ?? 1), sq = r() < 0.35;
    if (sq) { ctx.save(); ctx.globalAlpha *= al; ctx.translate(px, py); ctx.rotate(a + age * 6); ctx.fillStyle = col; ctx.fillRect(-sz * 0.3, -sz * 0.3, sz * 0.6, sz * 0.6); ctx.restore(); }
    else sparkle(px, py, sz * (1 - k * 0.5), al, age * 3, col, false);
  }
  ctx.restore();
}

// ---------- precomputed textures
let DOTS, GRAIN = [], GLASS_SPR = [];
function buildTextures() {
  DOTS = mk(); const d = DOTS.getContext('2d'); d.fillStyle = '#000';
  for (let y = 0; y < H; y += 9) for (let x = (y / 9) % 2 ? 4.5 : 0; x < W; x += 9) { d.beginPath(); d.arc(x, y, 2.1, 0, Math.PI * 2); d.fill(); }
  const r = rng(5);
  for (let k = 0; k < 4; k++) {
    const g = mk(480, 270), gc = g.getContext('2d'), im = gc.createImageData(480, 270);
    for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (r() - 0.5) * 200; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    gc.putImageData(im, 0, 0); GRAIN.push(g);
  }
  for (const b of [0, 3, 8, 16]) {
    const s = mk(260, 260), sc = s.getContext('2d');
    sc.filter = `blur(${b}px)`; sc.translate(130, 130);
    const g = sc.createLinearGradient(-60, -60, 60, 60);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.5, 'rgba(190,250,220,0.55)'); g.addColorStop(1, 'rgba(230,200,255,0.6)');
    sc.fillStyle = g; sc.fillRect(-60, -60, 120, 120);
    sc.strokeStyle = 'rgba(255,255,255,0.95)'; sc.lineWidth = 3; sc.strokeRect(-58, -58, 116, 116);
    sc.strokeStyle = 'rgba(40,160,100,0.18)'; sc.lineWidth = 2; sc.strokeRect(-61, -61, 122, 122);
    GLASS_SPR.push(s);
  }
}
const GLASS = (() => { const r = rng(11); return Array.from({ length: 18 }, () => ({ x: r() * W * 1.6, y: r() * H, z: r(), rot: r() * 6, vr: (r() - 0.5) * 0.5, vy: -(14 + r() * 30) })).sort((a, b) => a.z - b.z); })();
function glassField(t, ox = 0, a = 1) {
  for (const g of GLASS) {
    const depth = 0.35 + g.z * 1.5, size = 0.55 * depth;
    const span = W * 1.6, x = ((g.x + ox * depth) % span + span) % span - W * 0.3;
    const y = ((g.y + g.vy * depth * t) % (H + 300) + H + 300) % (H + 300) - 150;
    const spr = GLASS_SPR[depth < 0.6 ? 1 : depth < 1.2 ? 0 : depth < 1.6 ? 2 : 3];
    ctx.save(); ctx.globalAlpha *= a * (depth > 1.5 ? 0.55 : 0.8); ctx.translate(x, y); ctx.rotate(g.rot + g.vr * t); ctx.scale(size, size);
    ctx.drawImage(spr, -130, -130); ctx.restore();
  }
}
const STARS = (() => { const r = rng(21); return Array.from({ length: 260 }, () => ({ a: r() * Math.PI * 2, d: 0.08 + r() * 0.95, z: r(), c: r() })); })();

// ---------- backgrounds
function bgWhite(t, ox = 0) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const f = FX[0].getContext('2d'); f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = 'source-over'; f.clearRect(0, 0, W, H);
  const prev = ctx; ctx = f;
  const px = ox * 0.35;
  // diagonal swoosh like the key visual
  ctx.save(); ctx.translate(1180 + px + Math.sin(t * 0.3) * 60, 560); ctx.rotate(-0.62 + Math.sin(t * 0.21) * 0.05); ctx.scale(2.6, 0.62);
  blob(0, 0, 520, '#8ff7b9', 0.95); ctx.restore();
  blob(1640 + px + Math.cos(t * 0.4) * 80, 220 + Math.sin(t * 0.33) * 60, 620, '#a9f5c9', 0.9);
  blob(1500 + px * 1.2 + Math.sin(t * 0.27) * 90, 900, 520, '#dcfaa0', 0.8);
  blob(1880 + px, 760 + Math.cos(t * 0.5) * 50, 460, '#9ee9ff', 0.55);
  blob(380 + px * 0.6 + Math.sin(t * 0.2) * 120, 980, 420, '#e8fbb8', 0.45);
  blob(200 + px * 0.5 + Math.cos(t * 0.25) * 140, 160 + Math.sin(t * 0.35) * 50, 380, '#ffd0ef', 0.28);  // light leak
  ctx = prev;
  ctx.save(); ctx.globalAlpha = 0.85; ctx.drawImage(FX[0], 0, 0); ctx.restore();
  // halftone dots tinted by the aurora
  const g = FX[1].getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
  g.drawImage(FX[0], 0, 0); g.globalCompositeOperation = 'destination-in'; g.drawImage(DOTS, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(40,205,120,0.45)'; g.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.drawImage(FX[1], 0, 0); ctx.restore();
}
function bgDark(t, o = {}) {
  const { warp = 0.15, cx = W / 2, cy = H / 2, inward = false, a = 1 } = o;
  ctx.fillStyle = C.dark; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  blob(cx + Math.sin(t * 0.4) * 200, cy - 120, 900, '#0d4d33', 0.55 * a);
  blob(cx - 500 + Math.cos(t * 0.3) * 150, cy + 300, 700, '#3a1450', 0.45 * a);
  blob(cx + 600, cy + 250 + Math.sin(t * 0.5) * 80, 600, '#0b3550', 0.45 * a);
  for (let i = 0; i < STARS.length; i++) {
    const s = STARS[i];
    const z = fract(s.z + (inward ? -1 : 1) * t * warp);
    const proj = (zz) => (s.d * 900) / Math.max(0.06, 1.05 - zz);
    const r1 = proj(z), r0 = proj(clamp(z - warp * 0.25 - 0.005));
    if (r1 > 2600) continue;
    const al = clamp(z * 1.6) * clamp((1 - z) * 6) * a;
    ctx.strokeStyle = s.c < 0.2 ? rgba('#ff9be0', al) : s.c < 0.45 ? rgba('#9ff5cf', al) : `rgba(255,255,255,${al})`;
    ctx.lineWidth = 1 + z * 2.2;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(s.a) * r0, cy + Math.sin(s.a) * r0); ctx.lineTo(cx + Math.cos(s.a) * r1, cy + Math.sin(s.a) * r1); ctx.stroke();
  }
  ctx.restore();
}

// ================= scenes =================
const DISCLAIMER = 'Disclaimer: Digital asset prices are volatile, and the value of your investment can go up or down. You are solely responsible for your financial decisions. Startale Group is not liable for any losses you may incur. The APY shown is an estimate of rewards over the selected timeframe and may not reflect actual or fiat returns; actual rewards may differ. APY offered will be at Startale’s discretion and may be modified/ or discontinued at any time. Always DYOR — for more details, please see our Terms of Use.';

// S1 0–4: light converges, the eight squares lock into the mark, wordmark wipes on
function s1Layout() { const F = 150, s = F * 0.27, total = lockupW(F); return { F, s, mx: W / 2 - total / 2 + markHalf(s), wx: W / 2 - total / 2 + 2 * markHalf(s) + F * 0.36 }; }
function S1(t) {
  const L = s1Layout(), cy = H / 2 - 20;
  const slide = eo5(p(t, 2.7, 3.4)), mx = lerp(W / 2, L.mx, slide);
  bgDark(t, { warp: 0.06 + 0.25 * p(t, 0, 2.4), cx: mx, cy, inward: t < 2.5 });
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  // converging light filaments
  const r = rng(3);
  for (let i = 0; i < 140; i++) {
    const a = r() * Math.PI * 2, r0 = 500 + r() * 1100, d0 = r() * 1.2, len = 40 + r() * 160;
    const k = eo(p(t, 0.1 + d0, 2.45)); if (k <= 0 || k >= 1) continue;
    const rr = r0 * (1 - k), al = Math.sin(k * Math.PI) * 0.9;
    ctx.strokeStyle = i % 3 ? rgba('#9ff5cf', al) : rgba('#ffb0e8', al); ctx.lineWidth = 1.5 + (i % 4);
    ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * rr, cy + Math.sin(a) * rr); ctx.lineTo(mx + Math.cos(a) * (rr + len * (1 - k * 0.6)), cy + Math.sin(a) * (rr + len * (1 - k * 0.6))); ctx.stroke();
  }
  blob(mx, cy, 260 + 200 * p(t, 0.5, 2.5), '#7ff3b5', 0.15 + 0.35 * p(t, 0.5, 2.45) + 0.9 * pulse(t, 2.5, 0.35));
  rays(mx, cy, 22, 1100, t * 0.15, pulse(t, 2.5, 0.9) * 0.8 + 0.12 * p(t, 2.5, 3), '#9ff5cf', 0.05, 4);
  ctx.restore();
  // pieces
  const spin = -(1 - eo5(p(t, 1.0, 2.5))) * 2.4;
  const ps = 1 + 0.12 * pulse(t, 2.5, 0.12) * Math.cos((t - 2.5) * 40);
  ctx.save(); ctx.translate(mx, cy); ctx.scale(ps, ps); ctx.translate(-mx, -cy);
  logoMark(mx, cy, L.s, { color: '#ffffff', glow: '#7ff3b5', spin, from: 9, trail: true, piece: (i) => p(t, 1.1 + i * 0.1, 1.6 + i * 0.1) });
  ctx.restore();
  shock(mx, cy, t, 2.5, 900, '#bffbe0', 22, 0.9);
  shock(mx, cy, t, 2.58, 600, '#ffb0e8', 10, 0.8);
  burst(mx, cy, t, 2.5, 60, 9, { speed: 1500, grav: 0, add: true, cols: ['#ffffff', '#9ff5cf', '#ff9be0', '#8ad7ff', '#fff1a6'], size: 20, life: 1.4 });
  flare(mx, cy, pulse(t, 2.5, 0.45) * 1.2);
  // wordmark wipe from behind the mark
  const wk = eo5(p(t, 2.8, 3.5));
  if (wk > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(mx + markHalf(L.s) + 10, 0, W, H); ctx.clip();
    ctx.translate(-(1 - wk) * 260, 0);
    ctx.shadowColor = 'rgba(127,243,181,0.8)'; ctx.shadowBlur = 30;
    wordmark(L.wx, cy, L.F, '#ffffff', clamp(wk * 1.5));
    ctx.restore();
  }
  txt('ipUSD  ×  IP VAULT  ×  SONEIUM', W / 2, cy + 190, 26, { weight: 500, color: '#bfeedd', align: 'center', ls: 9, alpha: eo(p(t, 3.05, 3.4)) * 0.85 });
  // core opens up for the fly-through
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; blob(mx, cy, 40 + 600 * ei(p(t, 3.45, 4)), '#ffffff', p(t, 3.45, 3.8)); ctx.restore();
}

// S2 4–10: hero
function S2(t) {
  bgWhite(t, 0);
  glassField(t, 0);
  const ck = p(t, 4.05, 4.95), cx = lerp(1800, 1570, eo5(ck)), cy = lerp(-320, 455, eo5(ck)) + Math.sin(t * 1.6) * 12;
  const spin = (1 - eo5(ck)) * 16 + Math.sin(t * 0.9) * 0.5;
  // halo behind coin
  blob(cx, cy, 520, '#ffb7ec', 0.45 * eo(ck)); blob(cx + 60, cy + 40, 420, '#b9a8ff', 0.3 * eo(ck));
  rays(cx, cy, 16, 650, t * 0.12, 0.22 * eo(ck), '#7ff3b5', 0.06, 2);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.32); ctx.beginPath(); ctx.arc(0, 0, 340 + Math.sin(t * 2) * 6, 0, Math.PI * 2);
  ctx.strokeStyle = rgba('#c7a0ff', 0.35 * eo(ck)); ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
  coin(cx, cy, 205 * lerp(0.6, 1, back(ck)), spin, t, { kind: 'ip', sheen: t < 5.2 ? undefined : fract((t - 5.2) * 0.4) * 3.4 - 1.7 });
  for (let i = 0; i < 7; i++) {
    const a = t * 0.5 + i * 0.9, rr = 300 + 40 * Math.sin(i * 2 + t);
    sparkle(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.55, 14 + 10 * hash(i), eo(ck) * (0.5 + 0.5 * Math.sin(t * 4 + i * 1.7)), 0, i % 2 ? '#c7a0ff' : '#ff8ad8');
  }
  shock(cx, cy, t, 4.95, 420, '#ff8ad8', 10, 0.7);
  burst(cx, cy, t, 4.95, 34, 31, { speed: 900, grav: 500, size: 22 });
  // headline
  kinetic('ipUSD Is Live', 136, 438, 140, t, 4.3, { stagger: 0.04 });
  kinetic('on Startale App', 136, 604, 140, t, 4.85, { stagger: 0.035 });
  const ia = eo(p(t, 5.6, 6.2));
  if (ia > 0) txt('ipUSD', 136, 438, 140, { color: iriLinear(136, 560, 300, t * 0.25), ls: -3, alpha: ia });
  // underline sweep
  const uk = eo5(p(t, 6.0, 6.7));
  if (uk > 0) { ctx.fillStyle = iriLinear(136, 1100, 650, t * 0.3); rrect(140, 644, 940 * uk, 8, 4); ctx.fill(); }
  reveal('Swap and deposit into IP Vault', 140, 760, 58, t, 6.3, { weight: 400 });
  reveal([['Earn up to ', 400, C.ink], ['230 STAR Points', 700, C.ink]], 140, 842, 58, t, 6.55);
}

// S3: IP Vault on Soneium + phone
function phone(t, x, y, k) {
  if (k <= 0) return;
  const pw = 400, ph = 820, ry = (1 - eo5(k)) * 1.1 - 0.22 + Math.sin(t * 0.8) * 0.04;
  ctx.save(); ctx.translate(x, y + (1 - eo5(k)) * 300 + Math.sin(t * 1.2) * 10);
  ctx.globalAlpha *= clamp(k * 2);
  ctx.transform(Math.cos(ry), Math.sin(ry) * 0.18, 0, 1, 0, 0);
  ctx.translate(-pw / 2, -ph / 2);
  ctx.shadowColor = 'rgba(20,80,50,0.28)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 40;
  rrect(0, 0, pw, ph, 62); ctx.fillStyle = '#0b0c0e'; ctx.fill(); ctx.shadowColor = 'transparent';
  rrect(14, 14, pw - 28, ph - 28, 50); ctx.fillStyle = '#f6faf7'; ctx.fill();
  ctx.save(); ctx.clip();
  blob(pw - 40, 120, 300, '#9ff5cf', 0.7); blob(60, ph - 80, 260, '#dcfa9c', 0.5);
  rrect(pw / 2 - 60, 30, 120, 34, 17); ctx.fillStyle = '#0b0c0e'; ctx.fill();
  const el = (i) => back(p(t, 10.8 + i * 0.12, 11.3 + i * 0.12));
  const pop = (i, fn) => { const e = el(i); if (e <= 0) return; ctx.save(); ctx.globalAlpha *= clamp(e * 2); ctx.translate(0, (1 - e) * 40); fn(); ctx.restore(); };
  pop(0, () => lockup(40, 112, 26, { color: C.ink }));
  pop(1, () => {
    rrect(36, 158, pw - 72, 200, 30); ctx.fillStyle = '#0b0c0e'; ctx.fill();
    ctx.save(); rrect(36, 158, pw - 72, 200, 30); ctx.clip(); ctx.globalAlpha *= 0.5; blob(pw - 60, 180, 200, '#ff8ad8', 0.8); blob(pw - 140, 340, 180, '#8ad7ff', 0.7); ctx.restore();
    txt('IP Vault', 62, 214, 34, { weight: 600, color: '#fff' });
    txt('Earn STAR Points', 62, 252, 21, { weight: 500, color: C.mint });
    rrect(62, 286, 128, 46, 23); ctx.fillStyle = C.mint; ctx.fill(); txt('Deposit', 126, 310, 19, { weight: 600, align: 'center', base: 'middle' });
    coin(pw - 100, 270, 54, Math.sin(t * 2) * 0.6, t, { kind: 'ip', shadow: false });
  });
  const row = (i, yy, kind, name, amt) => pop(i, () => {
    rrect(36, yy, pw - 72, 92, 24); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 2; ctx.stroke();
    coin(84, yy + 46, 26, 0, t, { kind, shadow: false, sheen: -2 });
    txt(name, 124, yy + 40, 24, { weight: 600 }); txt('Soneium', 124, yy + 68, 17, { weight: 400, color: C.grey });
    txt(amt, pw - 56, yy + 54, 24, { weight: 600, align: 'right' });
  });
  row(2, 384, 'usdsc', 'USDSC', '100.00');
  row(3, 490, 'ip', 'ipUSD', '100.00');
  pop(4, () => {
    rrect(36, ph - 150, (pw - 84) / 2, 84, 42); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke(); txt('Swap', 36 + (pw - 84) / 4, ph - 108, 24, { weight: 600, align: 'center', base: 'middle' });
    const bx = 48 + (pw - 84) / 2; rrect(bx, ph - 150, (pw - 84) / 2, 84, 42); ctx.fillStyle = C.ink; ctx.fill(); txt('Deposit', bx + (pw - 84) / 4, ph - 108, 24, { weight: 600, align: 'center', base: 'middle', color: '#fff' });
  });
  // tap on Deposit
  const tk = p(t, 12.9, 13.5);
  if (tk > 0 && tk < 1) { ctx.beginPath(); ctx.arc(48 + (pw - 84) * 0.75, ph - 108, 20 + 90 * eo(tk), 0, Math.PI * 2); ctx.fillStyle = rgba('#7ff3b5', 0.5 * (1 - tk)); ctx.fill(); }
  const sg = ctx.createLinearGradient(0, 0, pw, ph); const sp = fract(t * 0.25);
  sg.addColorStop(clamp(sp - 0.1), 'rgba(255,255,255,0)'); sg.addColorStop(sp, 'rgba(255,255,255,0.35)'); sg.addColorStop(clamp(sp + 0.1), 'rgba(255,255,255,0)');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, pw, ph);
  ctx.restore(); ctx.restore();
}
function S3(t) {
  bgWhite(t, -300);
  glassField(t, -300);
  pill('NOW LIVE', 228, 330, p(t, 10.25, 10.75), { size: 22, bg: C.ink, color: C.mint });
  reveal('IP Vault is live on', 136, 452, 84, t, 10.35, { weight: 600, ls: -2 });
  const sk = p(t, 10.75, 11.3);
  if (sk > 0) {
    const w = tw('Soneium', 96, 700, -2) + 90;
    ctx.save(); ctx.translate(136 + w / 2, 560); const sc = back(sk, 2); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(sk * 3);
    ctx.shadowColor = 'rgba(30,190,110,0.35)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
    rrect(-w / 2, -66, w, 132, 66); ctx.fillStyle = C.ink; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.lineWidth = 3; ctx.strokeStyle = iriConic(0, 0, t * 2); ctx.stroke();
    txt('Soneium', 0, 4, 96, { color: iriLinear(-w / 2, w / 2, 0, t * 0.3, ['#ffffff', '#c9ffe6', '#ffffff', '#ffd6f3', '#ffffff']), align: 'center', base: 'middle', ls: -2 });
    ctx.restore();
  }
  reveal([['Startale App is the ', 400, C.grey], ['preferred wallet', 700, C.ink]], 136, 718, 50, t, 11.3);
  reveal([['to earn with it ', 400, C.grey]], 136, 788, 50, t, 11.45);
  sparkle(136 + tw('to earn with it ', 50, 400) + 26, 772, 24, eo(p(t, 11.8, 12.2)) * (0.75 + 0.25 * Math.sin(t * 5)), t, '#ff8ad8');
  phone(t, 1390, 560, p(t, 10.2, 11.2));
}

// S4: step 01 — swap
function stepHead(n, title, t, t0) {
  const gx = 1530 - (t - t0) * 24;
  txt(n, gx, 1010, 560, { weight: 800, color: 'rgba(11,12,14,0.05)', align: 'center', alpha: eo(p(t, t0, t0 + 0.6)) });
  pill(`STEP ${n}`, W / 2, 150, p(t, t0 + 0.25, t0 + 0.7), { size: 22, bg: C.ink, color: C.mint, ls: 6 });
  kinetic(title, W / 2, 268, 96, t, t0 + 0.35, { align: 'center', stagger: 0.03 });
}
function swapIcon(x, y, r, k, rot) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); const sc = back(clamp(k), 2); ctx.scale(sc, sc);
  ctx.shadowColor = 'rgba(30,190,110,0.4)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.rotate(rot); ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of [1, -1]) {
    ctx.beginPath(); ctx.arc(0, 0, r * 0.5, s > 0 ? Math.PI * 1.1 : Math.PI * 0.1, s > 0 ? Math.PI * 1.85 : Math.PI * 0.85); ctx.stroke();
    const ea = s > 0 ? Math.PI * 1.85 : Math.PI * 0.85, ex = Math.cos(ea) * r * 0.5, ey = Math.sin(ea) * r * 0.5;
    ctx.beginPath(); ctx.moveTo(ex - Math.cos(ea - 0.9) * r * 0.2, ey - Math.sin(ea - 0.9) * r * 0.2); ctx.lineTo(ex, ey); ctx.lineTo(ex + Math.cos(ea + 0.6) * r * 0.2 * -1, ey - Math.sin(ea + 0.6) * r * 0.2 * -1); ctx.stroke();
  }
  ctx.restore();
}
function S4(t) {
  bgWhite(t, -600);
  glassField(t, -600);
  stepHead('01', 'Swap into ipUSD', t, 14.0);
  const Lp = { x: 560, y: 600 }, M = { x: 960, y: 600 }, Rp = { x: 1360, y: 600 }, B = TL.SWAP_BURST;
  // marching dashed track
  const tk = eo(p(t, 15.0, 15.5));
  if (tk > 0) {
    ctx.save(); ctx.setLineDash([4, 18]); ctx.lineDashOffset = -t * 60; ctx.lineCap = 'round';
    ctx.strokeStyle = rgba('#0b0c0e', 0.25 * tk); ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(Lp.x + 170, Lp.y); ctx.lineTo(lerp(Lp.x + 170, Rp.x - 170, tk), Rp.y); ctx.stroke(); ctx.restore();
  }
  // USDSC coin: pop, then sucked into the swap along an arc
  const uk = p(t, 14.6, 15.1), mv = eio(p(t, 15.6, B));
  if (t < B) {
    const x = lerp(Lp.x, M.x, mv), y = Lp.y - Math.sin(mv * Math.PI) * 170, s = lerp(1, 0.15, ei(mv));
    blob(x, y, 260 * s, '#8ab6ff', 0.4);
    coin(x, y, 150 * back(uk) * s, mv * 14 + Math.sin(t) * 0.3, t, { kind: 'usdsc', alpha: clamp(uk * 3) });
    if (mv > 0) for (let i = 0; i < 18; i++) { const q = clamp(mv - i * 0.025); sparkle(lerp(Lp.x, M.x, q), Lp.y - Math.sin(q * Math.PI) * 170 + Math.sin(i * 3) * 20, 10 * (1 - i / 18), (1 - i / 18) * 0.8, 0, i % 2 ? '#8ad7ff' : '#7ff3b5', false); }
  }
  reveal('100 USDSC', Lp.x, 830, 46, t, 14.85, { weight: 600, align: 'center', alpha: 1 - p(t, 15.6, 15.9) });
  swapIcon(M.x, M.y, 82 * (1 + 0.25 * pulse(t, B, 0.12)), p(t, 15.0, 15.45), eio(p(t, 15.6, B)) * Math.PI * 3 + Math.sin(t) * 0.1);
  // burst
  blob(M.x, M.y, 420, '#ff9be0', 0.7 * pulse(t, B, 0.25));
  shock(M.x, M.y, t, B, 520, '#7ff3b5', 18, 0.8);
  shock(M.x, M.y, t, B + 0.07, 360, '#ff8ad8', 8, 0.7);
  burst(M.x, M.y, t, B, 50, 41, { speed: 1300, grav: 400, size: 24 });
  // ipUSD coin flies out to the right
  if (t >= B) {
    const ok = p(t, B, B + 0.6), x = lerp(M.x, Rp.x, eo5(ok)), y = Rp.y - Math.sin(eo5(ok) * Math.PI) * 120 + Math.sin(t * 1.5) * 8;
    blob(x, y, 300, '#ffb7ec', 0.45);
    coin(x, y, 150 * lerp(0.2, 1, back(ok)), (1 - eo5(ok)) * 12 + Math.sin(t * 0.9) * 0.4, t, { kind: 'ip' });
  }
  reveal('100 ipUSD', Rp.x, 830, 46, t, B + 0.4, { weight: 600, align: 'center' });
  const c = TL.COUNT1;
  badge(M.x, 930, Math.round(c[2] * eo(p(t, c[0], c[1]))), p(t, 17.15, 17.6), t, { t0: 17.2 });
  burst(M.x, 930, t, c[1], 30, 43, { speed: 900, grav: -200, dir: -Math.PI / 2, spread: 2.2, size: 20 });
}

// S5: step 02 — deposit into the vault
function vault(cx, cy, w, t, o = {}) {
  const h = w * 0.94, dx = w * 0.14, dy = w * 0.1, x0 = cx - w / 2, y0 = cy - h / 2, x1 = x0 + w, y1 = y0 + h;
  const sq = o.squash || 0;
  ctx.save(); ctx.translate(cx, y1); ctx.scale(1 + sq * 0.6, 1 - sq); ctx.translate(-cx, -y1);
  ctx.save(); ctx.globalAlpha *= 0.3; ctx.translate(cx + dx * 0.4, y1 + 30); ctx.scale(1, 0.14); blob(0, 0, w * 0.75, '#163a28', 1); ctx.restore();
  ctx.fillStyle = '#d9dee4'; rrect(x0 + w * 0.1, y1 - 10, w * 0.16, 44, 10); ctx.fill(); rrect(x1 - w * 0.2, y1 - 10, w * 0.16, 44, 10); ctx.fill();
  ctx.lineJoin = 'round'; ctx.lineWidth = 46;
  const poly = (pts, fill) => { ctx.beginPath(); pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.closePath(); ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.stroke(); ctx.fill(); };
  const i = 23;  // half stroke so rounded joins stay inside the outline
  poly([[x1 - i, y0 + i], [x1 + dx - i, y0 - dy + i], [x1 + dx - i, y1 - dy - i], [x1 - i, y1 - i]], '#c4cbd3');
  const tg = ctx.createLinearGradient(0, y0 - dy, 0, y0); tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#eef1f4');
  poly([[x0 + i, y0 + i], [x0 + dx + i, y0 - dy + i], [x1 + dx - i, y0 - dy + i], [x1 - i, y0 + i]], tg);
  const fg = ctx.createLinearGradient(x0, y0, x1, y1); fg.addColorStop(0, '#ffffff'); fg.addColorStop(1, '#dde2e8');
  rrect(x0, y0, w, h, 48); ctx.fillStyle = fg; ctx.fill();
  // slot
  const sx = cx + dx * 0.5, sy = y0 - dy * 0.5, sw = w * 0.56;
  ctx.save(); ctx.translate(sx, sy); ctx.transform(1, 0, -dx / dy * 0.5, 1, 0, 0);
  rrect(-sw / 2, -14, sw, 28, 12); const sg = ctx.createLinearGradient(0, -14, 0, 14); sg.addColorStop(0, '#5b636c'); sg.addColorStop(1, '#2b3036'); ctx.fillStyle = sg; ctx.fill();
  if (o.glow) { ctx.save(); ctx.globalAlpha *= o.glow; ctx.shadowColor = '#7ff3b5'; ctx.shadowBlur = 40; rrect(-sw / 2, -14, sw, 28, 12); ctx.fillStyle = '#e8fff4'; ctx.fill(); ctx.restore(); }
  ctx.restore();
  // door
  const dX = x0 + w * 0.08, dY = y0 + h * 0.09, dW = w * 0.74, dH = h * 0.8;
  rrect(dX, dY, dW, dH, 30); const dg = ctx.createLinearGradient(dX, dY, dX + dW, dY + dH); dg.addColorStop(0, '#f3f5f7'); dg.addColorStop(1, '#d8dde3'); ctx.fillStyle = dg; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();
  rrect(dX + 3, dY + 3, dW - 6, dH - 6, 28); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(120,130,140,0.25)'; ctx.stroke();
  if (o.edge) { ctx.save(); ctx.globalAlpha *= o.edge; ctx.shadowColor = '#7ff3b5'; ctx.shadowBlur = 40; rrect(dX, dY, dW, dH, 30); ctx.lineWidth = 6; ctx.strokeStyle = '#7ff3b5'; ctx.stroke(); ctx.restore(); }
  // hinges
  ctx.fillStyle = '#bdb3a6'; rrect(dX + dW + 4, dY + dH * 0.18, 22, 66, 8); ctx.fill(); rrect(dX + dW + 4, dY + dH * 0.68, 22, 66, 8); ctx.fill();
  // dial
  const kx = dX + dW * 0.5, ky = dY + dH * 0.52, kr = w * 0.2;
  const mg = ctx.createRadialGradient(kx - kr * 0.3, ky - kr * 0.3, 0, kx, ky, kr);
  mg.addColorStop(0, '#e7dfd4'); mg.addColorStop(1, '#a89c8e');
  ctx.beginPath(); ctx.arc(kx, ky, kr, 0, Math.PI * 2); ctx.fillStyle = mg; ctx.fill();
  ctx.save(); ctx.translate(kx, ky); ctx.rotate(o.dial || 0);
  ctx.strokeStyle = 'rgba(80,70,60,0.35)'; ctx.lineWidth = 2;
  for (let j = 0; j < 24; j++) { const a = (j / 24) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * kr * 0.82, Math.sin(a) * kr * 0.82); ctx.lineTo(Math.cos(a) * kr * 0.95, Math.sin(a) * kr * 0.95); ctx.stroke(); }
  ctx.fillStyle = '#9b8f81'; ctx.beginPath(); ctx.arc(0, 0, kr * 0.62, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d8d0c6'; ctx.lineCap = 'round'; ctx.lineWidth = kr * 0.16;
  for (let j = 0; j < 3; j++) { const a = (j / 3) * Math.PI * 2 - Math.PI / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * kr * 1.15, Math.sin(a) * kr * 1.15); ctx.stroke(); }
  ctx.fillStyle = '#e9e2d9'; ctx.beginPath(); ctx.arc(0, 0, kr * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
  return { sx, sy, sw };
}
function S5(t) {
  bgWhite(t, -900);
  glassField(t, -900);
  stepHead('02', 'Deposit into IP Vault', t, 20.0);
  const D = TL.COIN_DROP, vk = p(t, 20.4, 21.1), vx = 960, vy = 705 + (1 - back(vk, 1.3)) * 700;
  const squash = 0.08 * pulse(t, D, 0.08) * Math.cos((t - D) * 50) + (t > vk ? 0 : 0);
  const dial = eio(p(t, TL.DIAL[0], TL.DIAL[1])) * Math.PI * 4.25 + Math.sin(t * 0.7) * 0.03;
  const edge = pulse(t, TL.DIAL[1], 0.5) + 0.25 * p(t, TL.DIAL[1], TL.DIAL[1] + 0.5);
  // light from the slot after the drop
  const lk = pulse(t, D, 1.2) * 0.9 + 0.25 * p(t, D, D + 0.4);
  blob(vx, vy - 180, 520, '#ffb7ec', 0.35 * clamp(vk * 2));
  const geo = vault(vx, vy, 440, t, { squash, dial, edge, glow: lk });
  if (lk > 0) {
    ctx.save(); ctx.translate(geo.sx, geo.sy); ctx.scale(1, 1);
    for (const [c, off] of [['#9ff5cf', 0], ['#ff9be0', 0.15], ['#8ad7ff', -0.15]]) {
      const g = ctx.createLinearGradient(0, 0, 0, -620);
      g.addColorStop(0, rgba(c, 0.55 * lk)); g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-geo.sw * 0.45, 0); ctx.lineTo(geo.sw * 0.45, 0);
      ctx.lineTo(geo.sw * (0.9 + off) + Math.sin(t * 2) * 30, -620); ctx.lineTo(-geo.sw * (0.9 - off) + Math.cos(t * 2) * 30, -620); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // coin hovers, then drops into the slot (clipped at the slot line)
  const ak = p(t, 21.0, 21.5);
  if (t < D + 0.05 && ak > 0) {
    const dk = ei(p(t, 21.9, D)), cy = lerp(372 + Math.sin(t * 2) * 6, geo.sy + 130, dk);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, geo.sy + 2); ctx.clip();
    if (dk < 0.5) blob(geo.sx, cy, 200, "#ffb7ec", 0.35 * (1 - dk * 2));
    coin(geo.sx, cy, 92 * back(ak, 2), (1 - eo5(ak)) * 10 + Math.sin(t * 1.3) * 0.25 * (1 - dk), t, { kind: 'ip', shadow: false });
    ctx.restore();
  }
  shock(geo.sx, geo.sy, t, D, 520, '#7ff3b5', 16, 0.8, 0.35);
  shock(geo.sx, geo.sy, t, D + 0.08, 360, '#ff8ad8', 8, 0.7, 0.35);
  burst(geo.sx, geo.sy, t, D, 46, 51, { speed: 1300, grav: 900, dir: -Math.PI / 2, spread: 1.6, size: 22 });
  burst(vx, vy, t, TL.DIAL[1], 18, 53, { speed: 700, grav: 0, size: 14, cols: ['#7ff3b5', '#2fdc86', '#9ff5cf', '#c9ffe6', '#7ff3b5'] });
  // left label
  const lk2 = p(t, 21.2, 21.7);
  if (lk2 > 0) {
    reveal('DEPOSIT', 170, 560, 26, t, 21.2, { weight: 600, color: C.grey, ls: 8 });
    reveal('100 ipUSD', 170, 640, 72, t, 21.3, { weight: 700, ls: -2 });
    reveal('into IP Vault', 170, 700, 40, t, 21.45, { weight: 400, color: C.grey });
  }
  const c = TL.COUNT2;
  badge(1530, 620, Math.round(c[2] * eo(p(t, c[0], c[1]))), p(t, 23.85, 24.3), t, { t0: 24 });
  burst(1530, 620, t, c[1], 34, 57, { speed: 1000, grav: -150, dir: -Math.PI / 2, spread: 2.6, size: 22 });
}

// S6 27–31: dark — 30 + 200 collide into 230
function S6(t) {
  const Hh = TL.BIG_HIT, cx = W / 2, cy = H / 2 + 10;
  bgDark(t, { warp: 0.1 + 0.6 * pulse(t, Hh, 0.6) + 0.1 * p(t, 27, 28), cy, a: 0.6 + 0.6 * p(t, 27.8, 28.2) });
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const after = p(t, Hh, Hh + 0.3);
  rays(cx, cy, 26, 1300, t * 0.25, after * (0.35 + 0.6 * pulse(t, Hh, 0.6)), '#9ff5cf', 0.05, 7);
  rays(cx, cy, 14, 1000, -t * 0.18, after * 0.3, '#ff9be0', 0.04, 9);
  blob(cx, cy, 700, '#7ff3b5', 0.15 * after + 0.9 * pulse(t, Hh, 0.3));
  ctx.restore();
  if (t < Hh) {
    const k1 = p(t, 27.15, 27.75), k2 = p(t, 27.25, 27.85), m = ei(p(t, 27.82, Hh));
    const ax = lerp(lerp(-200, 690, eo5(k1)), cx, m), bx = lerp(lerp(W + 300, 1230, eo5(k2)), cx, m), s = 1 - m * 0.9;
    const glow = ['rgba(127,243,181,0.9)', 40];
    ctx.save(); ctx.translate(ax, cy); ctx.scale(s, s); txt('30', 0, 0, 210, { color: '#ffffff', align: 'center', base: 'middle', shadow: glow, ls: -4 }); ctx.restore();
    ctx.save(); ctx.translate(bx, cy); ctx.scale(s, s); txt('200', 0, 0, 210, { color: '#ffffff', align: 'center', base: 'middle', shadow: glow, ls: -4 }); ctx.restore();
    txt('+', cx, cy, 120, { color: C.mint, align: 'center', base: 'middle', weight: 400, alpha: eo(p(t, 27.6, 27.8)) * (1 - m) });
    txt('STAR Points', 690, cy + 150, 34, { color: '#bfeedd', align: 'center', weight: 500, alpha: eo(k1) * (1 - m * 3), ls: 2 });
    txt('STAR Points', 1230, cy + 150, 34, { color: '#bfeedd', align: 'center', weight: 500, alpha: eo(k2) * (1 - m * 3), ls: 2 });
  } else {
    const k = p(t, Hh, Hh + 0.9), sc = lerp(1.6, 1, elastic(k)) * (1 + Math.sin(t * 1.5) * 0.008);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; txt('230', 0, 0, 400, { color: 'rgba(255,140,220,0.6)', align: 'center', base: 'middle', weight: 800, ls: -10, shadow: ['#ff8ad8', 90] }); ctx.restore();
    txt('230', 0, 0, 400, { color: iriLinear(-420, 420, -100, t * 0.35, ['#ffd0f2', '#d6c2ff', '#b8ecff', '#c8ffe4', '#fff6c8', '#ffd0f2']), align: 'center', base: 'middle', weight: 800, ls: -10 });
    ctx.restore();
    reveal('EARN UP TO', cx, cy - 250, 34, t, Hh + 0.25, { weight: 600, color: C.mint, ls: 14, align: 'center' });
    reveal('STAR Points', cx, cy + 285, 92, t, Hh + 0.35, { weight: 700, color: '#ffffff', align: 'center', ls: -2 });
    reveal('Swap 30  +  Deposit 200', cx, cy + 360, 30, t, Hh + 0.6, { weight: 400, color: '#9fb8ae', align: 'center', ls: 3 });
  }
  shock(cx, cy, t, Hh, 1300, '#ffffff', 30, 1.0);
  shock(cx, cy, t, Hh + 0.06, 900, '#ff9be0', 14, 0.9);
  shock(cx, cy, t, Hh + 0.12, 650, '#9ff5cf', 10, 0.8);
  burst(cx, cy, t, Hh, 110, 61, { speed: 2400, grav: 200, add: true, size: 26, life: 1.8, cols: ['#ffffff', '#9ff5cf', '#ff9be0', '#8ad7ff', '#fff1a6'] });
  flare(cx, cy, pulse(t, Hh, 0.5) * 1.5);
  flare(cx + 520, cy - 230, 0.35 * after * (0.8 + 0.2 * Math.sin(t * 3)), '#ff9be0');
  const bugA = p(t, 27.1, 27.5);
  ctx.save(); ctx.globalAlpha = bugA * 0.9; lockup(78, 82, 44, { color: '#ffffff' }); ctx.restore();
}

// S7: deadline + gas note
function glassCard(x, y, w, h, k, t) {
  ctx.save(); const e = back(clamp(k), 1.4);
  ctx.translate(x + w / 2, y + h / 2 + (1 - eo5(k)) * 160 + Math.sin(t * 1.1 + x) * 6); ctx.transform(1, 0, 0, lerp(0.2, 1, e), 0, 0);
  ctx.globalAlpha *= clamp(k * 2.5);
  ctx.shadowColor = 'rgba(20,90,55,0.16)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 30;
  rrect(-w / 2, -h / 2, w, h, 40); ctx.fillStyle = 'rgba(255,255,255,0.78)'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,1)'; ctx.stroke();
  ctx.translate(-w / 2, -h / 2);
}
function S7(t, exit = 0) {
  bgWhite(t, -1200);
  glassField(t, -1200);
  const ox = -ei(exit) * 1400;
  pill('BEFORE YOU START', W / 2, 205, p(t, 31.0, 31.45) * (1 - exit), { size: 22, bg: C.ink, color: C.mint, ls: 6 });
  // calendar card
  ctx.save(); ctx.translate(ox, 0);
  glassCard(150, 300, 740, 500, p(t, 31.1, 31.7), t);
  {
    ctx.fillStyle = C.ink; rrect(60, 60, 96, 96, 24); ctx.fill();
    ctx.fillStyle = C.mint; ctx.fillRect(60, 84, 96, 8);
    for (const xx of [84, 132]) { ctx.fillStyle = '#fff'; rrect(xx - 5, 50, 10, 26, 5); ctx.fill(); }
    txt('1', 108, 140, 44, { color: '#fff', align: 'center', weight: 700 });
    txt('Runs until', 190, 122, 40, { weight: 500, color: C.grey });
    kinetic('Nov 1', 60, 320, 170, t, 31.45, { stagger: 0.05, ls: -5 });
    // clock
    const ccx = 90, ccy = 410, cr = 30;
    ctx.beginPath(); ctx.arc(ccx, ccy, cr, 0, Math.PI * 2); ctx.lineWidth = 6; ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.lineCap = 'round'; ctx.lineWidth = 6;
    const hr = t * 0.6, mn = t * 6;
    ctx.beginPath(); ctx.moveTo(ccx, ccy); ctx.lineTo(ccx + Math.sin(hr) * cr * 0.5, ccy - Math.cos(hr) * cr * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ccx, ccy); ctx.lineTo(ccx + Math.sin(mn) * cr * 0.75, ccy - Math.cos(mn) * cr * 0.75); ctx.stroke();
    txt('13:00 UTC', 142, 432, 62, { weight: 600, alpha: eo(p(t, 31.8, 32.2)) });
  }
  ctx.restore(); ctx.restore();
  // gas card
  ctx.save(); ctx.translate(-ox * 0.8, 0);
  glassCard(950, 300, 820, 500, p(t, 31.5, 32.1), t);
  {
    ctx.save(); ctx.translate(108, 108);
    ctx.beginPath(); ctx.arc(0, 0, 48, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
    ctx.rotate(Math.sin(t * 1.4) * 0.12);
    ctx.fillStyle = iriConic(0, 0, t);
    ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(20, 2); ctx.lineTo(0, 12); ctx.lineTo(-20, 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 17); ctx.lineTo(20, 7); ctx.lineTo(0, 34); ctx.lineTo(-20, 7); ctx.closePath(); ctx.fill();
    ctx.restore();
    txt('Gas tip', 180, 122, 40, { weight: 500, color: C.grey });
    reveal([['Keep some ', 700, C.ink], ['ETH', 700, C.green]], 60, 262, 72, t, 32.0, { ls: -2 });
    reveal('on Soneium', 60, 342, 72, t, 32.1, { weight: 700, ls: -2 });
    reveal('in your Startale App wallet to cover gas', 60, 412, 32, t, 32.35, { weight: 400, color: C.grey });
    reveal('when depositing into IP Vault.', 60, 456, 32, t, 32.45, { weight: 400, color: C.grey });
  }
  ctx.restore(); ctx.restore();
  for (let i = 0; i < 4; i++) sparkle(260 + i * 470, 262 + Math.sin(t * 2 + i) * 14, 12, eo(p(t, 32.2, 32.6)) * (0.4 + 0.6 * Math.abs(Math.sin(t * 3 + i))) * (1 - exit), 0, i % 2 ? '#ff8ad8' : '#7ff3b5');
}

// S8 35–40: end card
function S8(t) {
  bgWhite(t, -1500);
  glassField(t, -1500);
  const F = 118, s = F * 0.27, total = lockupW(F), cy = 380;
  const lx = W / 2 - total / 2, mx = lx + markHalf(s);
  const hit = TL.END_HIT;
  blob(mx, cy, 420, '#9ff5cf', 0.6 * pulse(t, hit, 0.6));
  const ps = 1 + 0.1 * pulse(t, hit, 0.12) * Math.cos((t - hit) * 40);
  ctx.save(); ctx.translate(mx, cy); ctx.scale(ps, ps); ctx.translate(-mx, -cy);
  logoMark(mx, cy, s, { color: C.ink, spin: -(1 - eo5(p(t, 35.0, hit))) * 2, from: 12, trail: true, piece: (i) => p(t, 35.05 + i * 0.07, 35.55 + i * 0.07) });
  ctx.restore();
  shock(mx, cy, t, hit, 600, '#2fdc86', 12, 0.8);
  burst(mx, cy, t, hit, 30, 71, { speed: 1000, grav: 300, size: 18 });
  const wk = eo5(p(t, hit, hit + 0.7));
  if (wk > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(mx + markHalf(s) + 8, 0, W, H); ctx.clip(); ctx.translate(-(1 - wk) * 240, 0);
    wordmark(lx + 2 * markHalf(s) + F * 0.36, cy, F, C.ink); ctx.restore();
  }
  reveal([['Swap', 600, C.ink], ['  →  ', 400, C.soft], ['Deposit', 600, C.ink], ['  →  ', 400, C.soft], ['Earn up to 230 STAR Points', 700, C.ink]], W / 2, 560, 44, t, 36.4, { align: 'center' });
  // CTA
  const ck = p(t, 36.8, 37.3);
  if (ck > 0) {
    const label = 'Join now', bw = tw(label, 44, 600) + 170, bh = 104, by = 690;
    ctx.save(); ctx.translate(W / 2, by); const sc = back(ck, 2) * (1 + 0.015 * Math.sin(t * 5)); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(ck * 3);
    ctx.shadowColor = 'rgba(30,190,110,0.4)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
    rrect(-bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fillStyle = C.ink; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.lineWidth = 3; ctx.strokeStyle = iriConic(0, 0, t * 2); ctx.stroke();
    txt(label, -40, 2, 44, { weight: 600, color: '#fff', align: 'center', base: 'middle' });
    const ay = Math.sin(t * 6) * 6;
    ctx.strokeStyle = C.mint; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(bw / 2 - 66, -18 + ay); ctx.lineTo(bw / 2 - 66, 18 + ay); ctx.moveTo(bw / 2 - 80, 4 + ay); ctx.lineTo(bw / 2 - 66, 18 + ay); ctx.lineTo(bw / 2 - 52, 4 + ay); ctx.stroke();
    ctx.save(); rrect(-bw / 2, -bh / 2, bw, bh, bh / 2); ctx.clip();
    const bx = lerp(-bw, bw, fract((t - 36.8) * 0.6)), g = ctx.createLinearGradient(bx - 70, 0, bx + 70, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.restore(); ctx.restore();
  }
  txt('Runs until Nov 1, 13:00 UTC  ·  Live on Soneium', W / 2, 805, 26, { weight: 500, color: C.grey, align: 'center', ls: 1, alpha: eo(p(t, 37.1, 37.5)) });
  // floating coins
  const fk = eo5(p(t, 36.2, 37));
  coin(250, 520 + Math.sin(t * 1.3) * 18, 120 * fk, Math.sin(t * 0.8) * 0.6 + 0.4, t, { kind: 'ip', alpha: fk });
  coin(1680, 470 + Math.cos(t * 1.1) * 18, 90 * fk, Math.cos(t * 0.7) * 0.6 - 0.4, t + 2, { kind: 'ip', alpha: fk });
  // disclaimer
  const da = eo(p(t, 37.3, 37.8));
  if (da > 0) {
    ctx.save(); setFont(15, 400, 0); const lines = []; let cur = '';
    for (const w of DISCLAIMER.split(' ')) { const tst = cur ? cur + ' ' + w : w; if (ctx.measureText(tst).width > 1760 && cur) { lines.push(cur); cur = w; } else cur = tst; }
    lines.push(cur); ctx.restore();
    lines.forEach((l, i) => txt(l, 80, 955 + i * 22, 15, { weight: 400, color: C.soft, alpha: da }));
  }
}

// ================= transitions & compositing =================
function drawTo(cv, fn) {
  const prev = ctx; ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.clearRect(0, 0, W, H);
  fn(); ctx = prev;
}
// running average of several shifted copies = motion blur
function whip(A, B, t, t0, d) {
  const k = p(t, t0, t0 + d), e = eio(k), v = eio(clamp(k + 1 / (30 * d))) - e;
  drawTo(BUF[0], () => A(t)); drawTo(BUF[1], () => B(t));
  const N = 12, spread = v * W * 2.2;
  for (let i = 0; i < N; i++) {
    const off = e * W + (i / (N - 1) - 0.5) * spread;
    ctx.globalAlpha = 1 / (i + 1);
    ctx.drawImage(BUF[0], -off, 0); ctx.drawImage(BUF[1], W - off, 0);
  }
  ctx.globalAlpha = 1;
}
function zoomBlur(buf, cx, cy, z, amt, N = 10) {
  for (let i = 0; i < N; i++) {
    const s = z * (1 + (i / (N - 1)) * amt);
    ctx.globalAlpha = 1 / (i + 1);
    ctx.setTransform(s, 0, 0, s, cx - cx * s, cy - cy * s);
    ctx.drawImage(buf, 0, 0);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
}
function compose(t) {
  if (t < 3.45) S1(t);
  else if (t < 4) {
    const L = s1Layout(), k = p(t, 3.45, 4), z = Math.exp(Math.log(45) * k * k);
    drawTo(BUF[0], () => S1(t));
    const save = ctx.getTransform();
    zoomBlur(BUF[0], L.mx, H / 2 - 20, z, 0.25 * k);
    ctx.setTransform(save);
    ctx.fillStyle = `rgba(250,252,250,${Math.pow(p(t, 3.72, 4), 2)})`; ctx.fillRect(0, 0, W, H);
  } else if (t < 9.65) S2(t);
  else if (t < 10.35) whip(S2, S3, t, 9.65, 0.7);
  else if (t < 13.7) S3(t);
  else if (t < 14.3) {
    const k = p(t, 13.7, 14.3);
    drawTo(BUF[0], () => S3(t)); drawTo(BUF[1], () => S4(t));
    const save = ctx.getTransform();
    zoomBlur(BUF[0], 960, 540, 1 + ei(k) * 0.8, 0.12 * Math.sin(k * Math.PI), 8);
    ctx.setTransform(save);
    ctx.globalAlpha = eo(clamp(k * 1.4)); ctx.filter = `blur(${(1 - k) * 18}px)`;
    const s = lerp(0.8, 1, eo(k)); ctx.translate(960 - 960 * s, 540 - 540 * s); ctx.scale(s, s); ctx.drawImage(BUF[1], 0, 0);
    ctx.setTransform(save); ctx.filter = 'none'; ctx.globalAlpha = 1;
  } else if (t < 19.65) S4(t);
  else if (t < 20.35) whip(S4, S5, t, 19.65, 0.7);
  else if (t < 26.4) S5(t);
  else if (t < 27) {
    const k = p(t, 26.4, 27);
    drawTo(BUF[0], () => S5(t));
    const save = ctx.getTransform();
    zoomBlur(BUF[0], 960, 600, 1 + ei(k) * 1.2, 0.3 * ei(k), 10);
    ctx.setTransform(save);
    ctx.fillStyle = `rgba(255,255,255,${Math.pow(p(t, 26.75, 27), 2)})`; ctx.fillRect(0, 0, W, H);
  } else if (t < 30.5) S6(t);
  else if (t < 31.05) {
    const k = eio(p(t, 30.5, 31.05));
    drawTo(BUF[1], () => S7(t));
    S6(t);
    const r = k * 1200;
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(BUF[1], 0, 0); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
    ctx.lineWidth = 30 * (1 - k) + 4; ctx.strokeStyle = rgba('#9ff5cf', 0.9 * (1 - k * 0.7)); ctx.shadowColor = '#7ff3b5'; ctx.shadowBlur = 50; ctx.stroke(); ctx.restore();
  } else if (t < 35) S7(t, p(t, 34.45, 35));
  else S8(t);
  // brand bug is a fixed HUD layer so transitions don't smear it
  if (t >= 4 && t < 27) brandBug(t, 4.6, 1 - p(t, 26.5, 26.9));
  else if (t >= 30.5 && t < 35) brandBug(t, 30.7, 1 - p(t, 34.5, 34.9));
}

const IMPACTS = [[2.5, 1], [4.0, 0.5], [16.4, 0.45], [22.5, 0.7], [27.0, 0.6], [28.0, 1.3], [36.0, 0.45]];
const FLASHES = [[2.5, 0.75, 0.22, '255,255,255'], [4.0, 1, 0.5, '250,252,250'], [16.4, 0.35, 0.18, '255,255,255'], [22.5, 0.35, 0.18, '255,255,255'], [27.0, 1, 0.35, '255,255,255'], [28.0, 0.95, 0.4, '255,255,255'], [36.0, 0.3, 0.25, '255,255,255']];
const isDark = (t) => t < 3.9 || (t >= 27 && t < 30.8);

function chroma(px) {
  const cp = FX[3].getContext('2d'); cp.setTransform(1, 0, 0, 1, 0, 0); cp.globalCompositeOperation = 'copy'; cp.drawImage(out, 0, 0);
  const ch = [['#ff0000', 1 + (2 * px) / W], ['#00ff00', 1 + px / W], ['#0000ff', 1]];
  ch.forEach(([col, s], j) => {
    const c = FX[j].getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over'; c.fillStyle = col; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'multiply'; c.setTransform(s, 0, 0, s, W / 2 - (W / 2) * s, H / 2 - (H / 2) * s); c.drawImage(FX[3], 0, 0);
  });
  octx.setTransform(1, 0, 0, 1, 0, 0); octx.globalCompositeOperation = 'source-over'; octx.fillStyle = '#000'; octx.fillRect(0, 0, W, H);
  octx.globalCompositeOperation = 'lighter'; for (let j = 0; j < 3; j++) octx.drawImage(FX[j], 0, 0);
  octx.globalCompositeOperation = 'source-over';
}

function renderFrame(t) {
  ctx = octx;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.shadowColor = 'transparent';
  let sh = 0; for (const [ti, s] of IMPACTS) sh += s * pulse(t, ti, 0.14);
  // slow handheld drift + impact shake
  const dz = 1.02 + sh * 0.03, sx = Math.sin(t * 0.7) * 6 + (hash(Math.floor(t * 30)) - 0.5) * 40 * sh, sy = Math.cos(t * 0.53) * 5 + (hash(Math.floor(t * 30) + 7) - 0.5) * 40 * sh;
  ctx.translate(W / 2 + sx, H / 2 + sy); ctx.rotate(Math.sin(t * 0.31) * 0.003 + (hash(Math.floor(t * 30) + 3) - 0.5) * 0.01 * sh); ctx.scale(dz, dz); ctx.translate(-W / 2, -H / 2);
  compose(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
  // post
  if (sh > 0.03) chroma(Math.min(26, sh * 22));
  ctx = octx;
  for (const [ti, a, d, c] of FLASHES) { const f = a * pulse(t, ti, d); if (f > 0.005) { ctx.fillStyle = `rgba(${c},${f})`; ctx.fillRect(0, 0, W, H); } }
  const dark = isDark(t);
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, dark ? 'rgba(0,0,0,0.65)' : 'rgba(10,40,25,0.10)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = dark ? 0.12 : 0.07;
  ctx.drawImage(GRAIN[Math.floor(t * 30) % 4], 0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  if (t < 0.5) { ctx.fillStyle = `rgba(0,0,0,${1 - eo(p(t, 0, 0.5))})`; ctx.fillRect(0, 0, W, H); }
  if (t > 39.5) { ctx.fillStyle = `rgba(250,252,250,${eo(p(t, 39.5, 40))})`; ctx.fillRect(0, 0, W, H); }
}
window.renderFrame = renderFrame;

// ---------- boot + preview player
(async function boot() {
  const faces = [[400, 'Regular'], [500, 'Medium'], [600, 'SemiBold'], [700, 'Bold'], [800, 'ExtraBold']];
  await Promise.all(faces.map(async ([w, n]) => { const f = new FontFace('Poppins', `url(fonts/Poppins-${n}.ttf)`, { weight: String(w) }); await f.load(); document.fonts.add(f); }));
  buildTextures();
  renderFrame(6.5);
  window.READY = true;
  if (location.search.includes('render')) return;
  const audio = document.getElementById('a'), btn = document.getElementById('play'), bar = document.getElementById('bar');
  let playing = false;
  btn.onclick = () => { if (playing) audio.pause(); else audio.play(); };
  audio.onplay = () => { playing = true; btn.textContent = 'Pause'; loop(); };
  audio.onpause = () => { playing = false; btn.textContent = 'Play'; };
  bar.oninput = () => { audio.currentTime = (bar.value / 1000) * TL.DUR; renderFrame(audio.currentTime); };
  function loop() { renderFrame(audio.currentTime); bar.value = (audio.currentTime / TL.DUR) * 1000; if (playing) requestAnimationFrame(loop); }
})();
