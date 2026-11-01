// Action Model — 15s 1080x1080 motion graphic. renderFrame(t) is pure: same t -> same frame.
'use strict';
const W = 1080, H = 1080;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

const C = {
  bg: '#0D0018', v1: '#7B2CFF', v2: '#A855F7', v3: '#C084FC', v4: '#D8B4FE', v5: '#F3E8FF', deep: '#4C1D95',
};
const F = 'Inter, system-ui, sans-serif';

// ---------- math
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const p = (t, a, b) => clamp((t - a) / (b - a));
const eo = (x) => 1 - Math.pow(1 - x, 3);
const eo5 = (x) => 1 - Math.pow(1 - x, 5);
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const back = (x, s = 1.7) => { const c3 = s + 1; return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const lerp = (a, b, x) => a + (b - a) * x;
const bump = (t, t0, rise, fall) => (t < t0 ? 0 : t < t0 + rise ? (t - t0) / rise : Math.exp(-(t - t0 - rise) / fall));
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
function mulberry(seed) { return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = mulberry(20261101);
const quad = (a, c, b, u) => [(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * c[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * c[1] + u * u * b[1]];
const cubic = (a, b, c, d, u) => { const v = 1 - u; return [v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1]]; };

// ---------- drawing helpers
function glow(x, y, r, hex, a) {
  if (a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(hex, a));
  g.addColorStop(0.45, rgba(hex, a * 0.35));
  g.addColorStop(1, rgba(hex, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
}
function rrect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function text(s, x, y, size, { weight = 600, color = '#fff', alpha = 1, align = 'center', base = 'middle', glowC = null, blur = 0 } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${F}`;
  ctx.textAlign = align; ctx.textBaseline = base;
  if (glowC) { ctx.shadowColor = glowC; ctx.shadowBlur = blur; }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  ctx.restore();
}
function polyline(pts) { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); }

// glass panel: translucent body, rim light, top sheen, violet bloom
function glass(x, y, w, h, r, { alpha = 1, bloom = 0.5, tint = 0.07 } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.save();
  ctx.shadowColor = rgba(C.v1, 0.55 * bloom); ctx.shadowBlur = 70; ctx.shadowOffsetY = 18;
  rrect(x, y, w, h, r);
  const body = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
  body.addColorStop(0, `rgba(190,150,255,${tint + 0.07})`);
  body.addColorStop(0.5, `rgba(120,60,220,${tint})`);
  body.addColorStop(1, `rgba(40,10,80,${tint + 0.25})`);
  ctx.fillStyle = 'rgba(18,4,36,0.72)';
  ctx.fill();
  ctx.restore();
  rrect(x, y, w, h, r);
  ctx.fillStyle = body; ctx.fill();
  ctx.save();
  rrect(x, y, w, h, r); ctx.clip();
  const sheen = ctx.createLinearGradient(x, y, x + w * 0.25, y + h * 0.55);
  sheen.addColorStop(0, 'rgba(255,255,255,0.16)');
  sheen.addColorStop(0.55, 'rgba(255,255,255,0.03)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen; ctx.fillRect(x, y, w, h);
  ctx.restore();
  rrect(x + 0.75, y + 0.75, w - 1.5, h - 1.5, r);
  const rim = ctx.createLinearGradient(x, y, x + w, y + h);
  rim.addColorStop(0, 'rgba(240,220,255,0.75)');
  rim.addColorStop(0.35, 'rgba(192,132,252,0.30)');
  rim.addColorStop(0.7, 'rgba(123,44,255,0.25)');
  rim.addColorStop(1, 'rgba(216,180,254,0.55)');
  ctx.strokeStyle = rim; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

// ---------- cursor
const CUR = [[0, 0], [0, 16.4], [4.1, 12.6], [6.9, 18.6], [9.5, 17.4], [6.8, 11.5], [11.6, 11.5]];
function cursorPath(x, y, k) { polyline(CUR.map(([a, b]) => [x + a * k, y + b * k])); ctx.closePath(); }
function cursorPerimeter(k) { let L = 0; for (let i = 0; i < CUR.length; i++) { const a = CUR[i], b = CUR[(i + 1) % CUR.length]; L += Math.hypot(b[0] - a[0], b[1] - a[1]) * k; } return L; }
// glossy 3D cursor
function drawCursor(x, y, k, { alpha = 1, fill = 1, glowA = 0.8, violet = 0 } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineJoin = 'round';
  // extrusion
  ctx.save(); ctx.globalAlpha *= fill;
  for (let i = 4; i >= 1; i--) { cursorPath(x + k * 0.16 * i, y + k * 0.2 * i, k); ctx.fillStyle = i === 4 ? '#2a0a5c' : '#4a1a9a'; ctx.fill(); }
  ctx.restore();
  // body
  ctx.save();
  ctx.shadowColor = rgba(C.v2, glowA); ctx.shadowBlur = 8 + k * 2.4;
  cursorPath(x, y, k);
  const g = ctx.createLinearGradient(x, y, x + 10 * k, y + 18 * k);
  if (violet > 0) {
    g.addColorStop(0, '#F3E8FF'); g.addColorStop(0.45, lerpColor('#FFFFFF', '#C084FC', violet)); g.addColorStop(1, lerpColor('#E9D5FF', '#7B2CFF', violet));
  } else { g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.6, '#F5EEFF'); g.addColorStop(1, '#D9C2FF'); }
  ctx.globalAlpha *= fill;
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  // gloss + rim
  ctx.save(); ctx.globalAlpha *= fill;
  cursorPath(x, y, k); ctx.clip();
  const s = ctx.createLinearGradient(x, y, x + 6 * k, y + 6 * k);
  s.addColorStop(0, 'rgba(255,255,255,0.9)'); s.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = s; ctx.fillRect(x, y, 7 * k, 9 * k);
  ctx.restore();
  cursorPath(x, y, k);
  ctx.strokeStyle = rgba(C.v1, 0.9 * fill); ctx.lineWidth = Math.max(1.2, k * 0.42); ctx.stroke();
  ctx.restore();
}
function lerpColor(a, b, x) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const c = (s) => Math.round(lerp((A >> s) & 255, (B >> s) & 255, x));
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}
function ripple(x, y, t, tc, scale = 1) {
  for (let j = 0; j < 2; j++) {
    const q = p(t, tc + j * 0.08, tc + j * 0.08 + 0.5);
    if (q <= 0 || q >= 1) continue;
    ctx.beginPath(); ctx.arc(x, y, (8 + 62 * eo(q)) * scale, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(j ? C.v3 : C.v4, (1 - q) * 0.9); ctx.lineWidth = 3 * (1 - q) + 1; ctx.stroke();
  }
  const f = bump(t, tc, 0.02, 0.12);
  if (f > 0.01) glow(x, y, 60 * scale, C.v3, 0.7 * f);
}

// ---------- headline: words rise in one by one; *words* get the violet gradient
function headline(str, t, t0, t1, { size = 76, maxW = 960, cy = 172 } = {}) {
  if (t < t0 - 0.01 || t > t1 + 0.01) return;
  ctx.save();
  ctx.font = `800 ${size}px ${F}`;
  const words = []; let hl = false;
  for (const raw of str.replace(/\|/g, ' | ').split(' ').filter(Boolean)) {
    if (raw === '|') { words.push({ br: true }); continue; }
    let w = raw, on = hl;
    if (w.startsWith('*')) { w = w.slice(1); on = true; hl = true; }
    if (w.endsWith('*')) { w = w.slice(0, -1); hl = false; }
    words.push({ w, on, width: ctx.measureText(w).width });
  }
  const space = ctx.measureText(' ').width;
  const lines = [[]]; let cur = 0;
  for (const wd of words) {
    if (wd.br) { lines.push([]); cur = 0; continue; }
    const add = (lines[lines.length - 1].length ? space : 0) + wd.width;
    if (cur + add > maxW && lines[lines.length - 1].length) { lines.push([wd]); cur = wd.width; } else { lines[lines.length - 1].push(wd); cur += add; }
  }
  const lh = size * 1.12;
  const out = p(t, t1 - 0.28, t1);
  let k = 0;
  lines.forEach((line, li) => {
    const lw = line.reduce((s, wd) => s + wd.width, 0) + space * (line.length - 1);
    let x = W / 2 - lw / 2;
    const y = cy - ((lines.length - 1) * lh) / 2 + li * lh;
    for (const wd of line) {
      const a = eo5(p(t, t0 + k * 0.06, t0 + k * 0.06 + 0.42));
      const alpha = a * (1 - out);
      if (alpha > 0) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const yy = y + (1 - a) * 40 - out * 18;
        if (wd.on) {
          const g = ctx.createLinearGradient(x, yy - size / 2, x + wd.width, yy + size / 2);
          g.addColorStop(0, '#F0E2FF'); g.addColorStop(0.5, '#C084FC'); g.addColorStop(1, '#9D5CFF');
          ctx.shadowColor = rgba(C.v1, 0.9); ctx.shadowBlur = 28;
          ctx.fillStyle = g;
        } else {
          ctx.shadowColor = 'rgba(123,44,255,0.55)'; ctx.shadowBlur = 22;
          ctx.fillStyle = '#FFFFFF';
        }
        ctx.fillText(wd.w, x, yy);
        ctx.restore();
      }
      x += wd.width + space; k++;
    }
  });
  ctx.restore();
}

// ---------- precomputed scene data
const BOKEH = Array.from({ length: 70 }, () => ({ x: R() * W, y: R() * H, r: 0.7 + R() * 2.4, s: 8 + R() * 26, ph: R() * 6.28, a: 0.15 + R() * 0.55 }));
const ORBS = [
  { x: 975, y: 900, r: 62, ph: 0 }, { x: 98, y: 345, r: 36, ph: 2 }, { x: 948, y: 352, r: 20, ph: 4 }, { x: 120, y: 990, r: 24, ph: 1 },
];
const CORE = { x: 540, y: 628 };
const CODES = ['US', 'BR', 'NG', 'IN', 'JP', 'DE', 'KR', 'MX', 'FR', 'ID', 'KE', 'PH', 'TR', 'CA', 'VN', 'AR'];
const PEOPLE = [];
for (let i = 0; i < TL.people; i++) {
  const ang = (-90 + i * (360 / TL.people) + (R() - 0.5) * 9) * Math.PI / 180;
  const rad = 300 + R() * 80;
  const x = clamp(CORE.x + Math.cos(ang) * rad * 1.22, 70, 960);
  const y = clamp(CORE.y + Math.sin(ang) * rad * 0.98, 320, 1005);
  const mid = [(x + CORE.x) / 2, (y + CORE.y) / 2];
  const dx = CORE.x - x, dy = CORE.y - y, L = Math.hypot(dx, dy);
  const bend = (i % 2 ? 1 : -1) * (40 + R() * 40);
  PEOPLE.push({ x, y, c: [mid[0] - (dy / L) * bend, mid[1] + (dx / L) * bend], code: CODES[i], ph: R() });
}
// order of appearance hops around the ring instead of going clockwise
const ORDER = Array.from({ length: TL.people }, (_, k) => (k * 5) % TL.people);
ORDER.forEach((idx, k) => { PEOPLE[idx].k = k; });
const SPARKS = Array.from({ length: 70 }, (_, i) => ({ a: R() * Math.PI * 2, v: 260 + R() * 420, life: 0.7 + R() * 0.7, w: i < 45 ? TL.burst : TL.sparkWaves[1], len: 10 + R() * 26 }));
const FINALE = Array.from({ length: 34 }, () => ({ a: R() * Math.PI * 2, v: 300 + R() * 380, life: 0.8 + R() * 0.9, len: 12 + R() * 30 }));

// scene-1 flow lines: each flows in from the frame edge and lands on a cursor vertex
const CTIP = { x: 470, y: 505, k: 11.5 };
const FLOW_STARTS = [[-60, 250], [-60, 820], [300, 1140], [1140, 990], [1140, 640], [1140, 300], [760, -60], [-60, 560]];
const FLOW_TARGET = [0, 1, 2, 3, 4, 5, 6, 0];
const FLOWS = FLOW_STARTS.map((S, j) => {
  const v = CUR[FLOW_TARGET[j]], V = [CTIP.x + v[0] * CTIP.k, CTIP.y + v[1] * CTIP.k];
  const dx = V[0] - S[0], dy = V[1] - S[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, sg = j % 2 ? 1 : -1;
  return { S, V, c1: [S[0] + dx * 0.33 + nx * 170 * sg, S[1] + dy * 0.33 + ny * 170 * sg], c2: [S[0] + dx * 0.7 - nx * 110 * sg, S[1] + dy * 0.7 - ny * 110 * sg], t0: TL.linesIn + j * 0.085 };
});

// ---------- background: near-black violet, nebula glow, grid floor, flowing ribbons, bokeh
function background(t) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  glow(540 + 70 * Math.sin(t * 0.35), 540 + 40 * Math.cos(t * 0.28), 720, C.v1, 0.22);
  glow(900, 160, 520, '#5B21B6', 0.16);
  glow(150, 940, 520, C.v2, 0.10);

  // flat grid, masked to fade out away from centre
  ctx.save();
  ctx.lineWidth = 1;
  const off = (t * 6) % 60;
  for (let x = -60 + off; x < W + 60; x += 60) { ctx.strokeStyle = 'rgba(168,85,247,0.05)'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = -60 + off; y < H + 60; y += 60) { ctx.strokeStyle = 'rgba(168,85,247,0.05)'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();

  // perspective floor
  const y0 = 720;
  ctx.save();
  const vg = ctx.createLinearGradient(0, y0, 0, H);
  vg.addColorStop(0, 'rgba(168,85,247,0)'); vg.addColorStop(1, 'rgba(168,85,247,0.22)');
  ctx.strokeStyle = vg; ctx.lineWidth = 1.2;
  for (let i = -16; i <= 16; i++) { ctx.beginPath(); ctx.moveTo(540 + i * 14, y0); ctx.lineTo(540 + i * 150, H); ctx.stroke(); }
  for (let n = 0; n < 14; n++) {
    const z = 1 + n - ((t * 0.9) % 1);
    const y = y0 + (H - y0) / z;
    ctx.strokeStyle = `rgba(168,85,247,${0.2 / Math.sqrt(z)})`;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  const hz = ctx.createLinearGradient(0, 0, W, 0);
  hz.addColorStop(0, 'rgba(192,132,252,0)'); hz.addColorStop(0.5, 'rgba(192,132,252,0.35)'); hz.addColorStop(1, 'rgba(192,132,252,0)');
  ctx.fillStyle = hz; ctx.fillRect(0, y0 - 1, W, 2);
  ctx.restore();

  // flowing curved ribbons
  ribbon(t, 300, 70, 0.0047, 0.55, 0, 0.16);
  ribbon(t, 860, 60, 0.0039, -0.45, 2.1, 0.13);

  // bokeh
  for (const b of BOKEH) {
    const y = ((b.y - t * b.s) % H + H) % H;
    const a = b.a * (0.55 + 0.45 * Math.sin(t * 1.7 + b.ph));
    ctx.beginPath(); ctx.arc(b.x + Math.sin(t * 0.6 + b.ph) * 8, y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(216,180,254,${a * 0.5})`; ctx.fill();
  }
  // glossy glass orbs drifting at the edges
  for (const o of ORBS) glassOrb(o.x + Math.sin(t * 0.5 + o.ph) * 10, o.y + Math.cos(t * 0.4 + o.ph) * 14, o.r, 0.85);
}
function ribbon(t, base, amp, k, sp, ph, alpha) {
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(168,85,247,0)'); g.addColorStop(0.3, `rgba(168,85,247,${alpha})`);
  g.addColorStop(0.7, `rgba(192,132,252,${alpha})`); g.addColorStop(1, 'rgba(123,44,255,0)');
  ctx.strokeStyle = g; ctx.lineWidth = 1.3;
  for (let j = 0; j < 9; j++) {
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 18) {
      const y = base + j * 8 + amp * Math.sin(x * k + t * sp + ph + j * 0.18) + 26 * Math.sin(x * k * 2.3 - t * sp * 0.8 + j * 0.1);
      x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}
function glassOrb(x, y, r, a) {
  ctx.save();
  ctx.globalAlpha *= a;
  glow(x, y, r * 2.4, C.v1, 0.25);
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  g.addColorStop(0, 'rgba(243,232,255,0.85)'); g.addColorStop(0.35, 'rgba(168,85,247,0.55)');
  g.addColorStop(0.85, 'rgba(76,29,149,0.55)'); g.addColorStop(1, 'rgba(216,180,254,0.6)');
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.45, r * 0.42, r * 0.2, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
  ctx.restore();
}

// ---------- scene 1+2 (0–6s): lines draw a cursor, the cursor operates a glass browser
const CK = [ // t, tipX, tipY, k
  [0, CTIP.x, CTIP.y, CTIP.k], [2.68, CTIP.x, CTIP.y, CTIP.k], [3.06, 520, 600, 5], [3.42, 318, 498, 2.9],
  [3.62, 318, 498, 2.9], [4.55, 352, 528, 2.9], [4.92, 862, 502, 2.9], [5.18, 862, 502, 2.9], [5.5, 842, 660, 2.9], [6, 842, 660, 2.9],
];
function cursorAt(t) {
  let i = 0; while (i < CK.length - 2 && t > CK[i + 1][0]) i++;
  const a = CK[i], b = CK[i + 1], u = eio(p(t, a[0], b[0]));
  return { x: lerp(a[1], b[1], u), y: lerp(a[2], b[2], u), k: lerp(a[3], b[3], u) };
}
const BUBBLES = [
  { x: 92, y: 392, w: 252, h: 84, t: 0.2, side: 1 }, { x: 742, y: 560, w: 232, h: 84, t: 0.45, side: -1 }, { x: 126, y: 760, w: 214, h: 84, t: 0.7, side: 1 },
];
function bubbles(t) {
  for (const b of BUBBLES) {
    const a = back(p(t, b.t, b.t + 0.4));
    const out = eio(p(t, 1.45 + b.t * 0.3, 2.05 + b.t * 0.3));
    if (a <= 0 || out >= 1) continue;
    ctx.save();
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2 + out * 60;
    ctx.translate(cx, cy); ctx.scale(a, a); ctx.rotate(out * 0.12 * b.side); ctx.translate(-cx, -cy);
    ctx.globalAlpha = clamp(a) * (1 - out) * 0.9;
    glass(b.x, b.y + out * 60, b.w, b.h, 30, { bloom: 0.25, tint: 0.04 });
    for (let d = 0; d < 3; d++) {
      const bounce = Math.max(0, Math.sin(t * 9 - d * 0.9)) * 8 * (1 - out);
      ctx.beginPath(); ctx.arc(cx - 34 + d * 34, cy - bounce, 9, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(216,180,254,${0.75 - out * 0.5})`; ctx.fill();
    }
    ctx.restore();
  }
}
function flowLines(t) {
  for (const f of FLOWS) {
    const h = eio(p(t, f.t0, f.t0 + 1.05));
    const tail = eio(p(t, f.t0 + 0.32, f.t0 + 1.45));
    if (h <= 0 || tail >= 1) continue;
    const pts = [];
    for (let i = 0; i <= 40; i++) pts.push(cubic(f.S, f.c1, f.c2, f.V, lerp(tail, h, i / 40)));
    ctx.save(); ctx.lineCap = 'round';
    polyline(pts); ctx.strokeStyle = rgba(C.v2, 0.22); ctx.lineWidth = 9; ctx.stroke();
    polyline(pts); ctx.strokeStyle = rgba(C.v4, 0.95); ctx.lineWidth = 2.2; ctx.stroke();
    const hp = pts[pts.length - 1];
    glow(hp[0], hp[1], 26, C.v3, 0.9);
    ctx.beginPath(); ctx.arc(hp[0], hp[1], 3.5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();
    // node lights up on arrival
    const n = bump(t, f.t0 + 1.0, 0.05, 0.5);
    if (n > 0.02) glow(f.V[0], f.V[1], 40, C.v3, n);
  }
}
function scene1Cursor(t, c) {
  // outline traced by light
  const q = eio(p(t, 0.95, 2.0));
  const pop = p(t, TL.cursorPop, TL.cursorPop + 0.28);
  if (q > 0 && pop < 1) {
    ctx.save();
    const L = cursorPerimeter(c.k);
    ctx.setLineDash([L * q, L]);
    ctx.lineJoin = 'round';
    cursorPath(c.x, c.y, c.k);
    ctx.shadowColor = C.v2; ctx.shadowBlur = 24;
    ctx.strokeStyle = rgba(C.v4, 1 - pop); ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
  if (pop > 0) {
    const s = 1 + 0.12 * (1 - back(pop, 2.4)) * -1;
    const cx = c.x + 5.8 * c.k, cy = c.y + 9.3 * c.k;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
    drawCursor(c.x, c.y, c.k, { fill: eo(pop) });
    ctx.restore();
    // burst ring
    const rq = p(t, TL.cursorPop, TL.cursorPop + 0.6);
    if (rq < 1) {
      ctx.beginPath(); ctx.arc(cx, cy, 80 + 220 * eo(rq), 0, Math.PI * 2);
      ctx.strokeStyle = rgba(C.v3, 0.7 * (1 - rq)); ctx.lineWidth = 3; ctx.stroke();
      glow(cx, cy, 260, C.v2, 0.45 * (1 - rq));
    }
  }
}

const BR = { x: 110, y: 338, w: 860, h: 540 };
const FIELD = { x: 160, y: 470, w: 636, h: 74 };
const GO = { x: 812, y: 470, w: 108, h: 74 };
const POP = { x: 330, y: 568, w: 610, h: 296 };
function browser(t) {
  const a = eo(p(t, 2.82, 3.25));
  if (a <= 0) return;
  const s = lerp(0.9, 1, a);
  ctx.save();
  ctx.translate(540, 608); ctx.scale(s, s); ctx.translate(-540, -608);
  ctx.globalAlpha = a;
  const { x, y, w, h } = BR;
  glass(x, y, w, h, 28, { bloom: 0.8 });
  // chrome
  for (let d = 0; d < 3; d++) { ctx.beginPath(); ctx.arc(x + 34 + d * 24, y + 31, 7, 0, Math.PI * 2); ctx.fillStyle = ['#C084FC', '#A855F7', '#7B2CFF'][d]; ctx.fill(); }
  rrect(x + 130, y + 14, w - 170, 34, 17); ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill();
  ctx.strokeStyle = 'rgba(216,180,254,0.18)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.arc(x + 154, y + 31, 5, 0, Math.PI * 2); ctx.fillStyle = C.v3; ctx.fill();
  text('actionmodel.ai', x + 170, y + 32, 19, { weight: 500, color: 'rgba(233,213,255,0.75)', align: 'left' });
  ctx.fillStyle = 'rgba(216,180,254,0.15)'; ctx.fillRect(x, y + 62, w, 1);
  // loading bar after "Go"
  const lb = p(t, TL.clicks[1], TL.popup + 0.1);
  if (lb > 0 && lb < 1) { ctx.fillStyle = C.v3; ctx.shadowColor = C.v2; ctx.shadowBlur = 12; ctx.fillRect(x, y + 61, w * eo(lb), 3); ctx.shadowBlur = 0; }

  text('What should I do for you?', x + 50, y + 104, 26, { weight: 600, color: 'rgba(243,232,255,0.8)', align: 'left' });
  // field
  const focus = p(t, TL.clicks[0], TL.clicks[0] + 0.25);
  ctx.save();
  if (focus > 0) { ctx.shadowColor = C.v2; ctx.shadowBlur = 26 * focus; }
  rrect(FIELD.x, FIELD.y, FIELD.w, FIELD.h, 37);
  ctx.fillStyle = 'rgba(20,6,40,0.75)'; ctx.fill();
  ctx.strokeStyle = focus > 0 ? rgba(C.v3, 0.4 + 0.5 * focus) : 'rgba(216,180,254,0.3)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  const n = Math.floor(clamp((t - TL.typeStart) / TL.typeRate, 0, TL.typeText.length));
  const typed = TL.typeText.slice(0, n);
  if (focus < 1) text('Ask Action Model anything…', FIELD.x + 34, FIELD.y + 38, 27, { weight: 400, color: 'rgba(216,180,254,0.45)', align: 'left', alpha: 1 - focus });
  if (n > 0) text(typed, FIELD.x + 34, FIELD.y + 38, 30, { weight: 500, color: '#fff', align: 'left' });
  if (t > TL.clicks[0] && t < TL.clicks[1] + 0.1 && (Math.floor(t * 3.2) % 2 === 0 || (t > TL.typeStart && t < TL.typeEnd))) {
    ctx.font = `500 30px ${F}`;
    const cw = ctx.measureText(typed).width;
    ctx.fillStyle = C.v4; ctx.fillRect(FIELD.x + 36 + cw, FIELD.y + 20, 3, 36);
  }
  // go button
  const press = bump(t, TL.clicks[1] - 0.04, 0.04, 0.1);
  ctx.save();
  const gs = 1 - 0.08 * press;
  ctx.translate(GO.x + GO.w / 2, GO.y + GO.h / 2); ctx.scale(gs, gs); ctx.translate(-(GO.x + GO.w / 2), -(GO.y + GO.h / 2));
  rrect(GO.x, GO.y, GO.w, GO.h, 37);
  const gg = ctx.createLinearGradient(GO.x, GO.y, GO.x + GO.w, GO.y + GO.h);
  gg.addColorStop(0, '#B46CFF'); gg.addColorStop(1, C.v1);
  ctx.shadowColor = C.v1; ctx.shadowBlur = 24 + 30 * press; ctx.fillStyle = gg; ctx.fill();
  ctx.restore();
  text('Go', GO.x + GO.w / 2, GO.y + GO.h / 2 + 1, 30, { weight: 700 });

  // result cards (skeleton)
  for (let i = 0; i < 3; i++) {
    const cx = 160 + i * 262, cy = 588, cw = 238, ch = 250;
    const lit = p(t, TL.popup - 0.1 + i * 0.05, TL.popup + 0.2 + i * 0.05);
    rrect(cx, cy, cw, ch, 20); ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill();
    ctx.strokeStyle = 'rgba(216,180,254,0.14)'; ctx.lineWidth = 1; ctx.stroke();
    const ig = ctx.createLinearGradient(cx, cy, cx + cw, cy + 120);
    ig.addColorStop(0, `rgba(168,85,247,${0.22 + 0.15 * lit})`); ig.addColorStop(1, `rgba(76,29,149,${0.25 + 0.1 * lit})`);
    rrect(cx + 14, cy + 14, cw - 28, 118, 14); ctx.fillStyle = ig; ctx.fill();
    for (let l = 0; l < 3; l++) { rrect(cx + 16, cy + 152 + l * 28, (cw - 32) * [0.85, 0.6, 0.4][l], 12, 6); ctx.fillStyle = 'rgba(216,180,254,0.16)'; ctx.fill(); }
  }
  ctx.restore();
}
function popup(t) {
  const a = p(t, TL.popup, TL.popup + 0.42);
  if (a <= 0) return;
  const s = lerp(0.6, 1, back(a, 2));
  const cx = POP.x + POP.w / 2, cy = POP.y + POP.h / 2;
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
  ctx.globalAlpha = clamp(a * 2.5);
  glass(POP.x, POP.y, POP.w, POP.h, 24, { bloom: 1, tint: 0.12 });
  text('✈  SFO → Tokyo', POP.x + 32, POP.y + 40, 25, { weight: 700, align: 'left' });
  text('3 flights found', POP.x + POP.w - 32, POP.y + 40, 19, { weight: 500, color: 'rgba(216,180,254,0.7)', align: 'right' });
  ctx.fillStyle = 'rgba(216,180,254,0.15)'; ctx.fillRect(POP.x, POP.y + 72, POP.w, 1);
  const rows = [['NRT', '08:40', '$612'], ['HND', '11:15', '$648'], ['NRT', '17:05', '$590']];
  const booked = p(t, TL.clicks[2], TL.clicks[2] + 0.25);
  rows.forEach((r, i) => {
    const ra = eo(p(t, TL.popup + 0.15 + i * 0.07, TL.popup + 0.45 + i * 0.07));
    const ry = POP.y + 92 + i * 66 + (1 - ra) * 16;
    ctx.save(); ctx.globalAlpha *= ra;
    rrect(POP.x + 20, ry, POP.w - 40, 56, 14);
    ctx.fillStyle = i === 0 && booked > 0 ? rgba(C.v1, 0.28 * booked) : 'rgba(255,255,255,0.04)'; ctx.fill();
    if (i === 0 && booked > 0) { ctx.strokeStyle = rgba(C.v3, booked); ctx.lineWidth = 2; ctx.stroke(); }
    text(r[0], POP.x + 46, ry + 29, 23, { weight: 700, align: 'left' });
    text(r[1], POP.x + 140, ry + 29, 23, { weight: 500, color: 'rgba(243,232,255,0.8)', align: 'left' });
    text(r[2], POP.x + 260, ry + 29, 23, { weight: 600, color: C.v4, align: 'left' });
    const bx = POP.x + POP.w - 168, bw = 132;
    rrect(bx, ry + 9, bw, 38, 19);
    if (i === 0 && booked > 0) {
      const gg = ctx.createLinearGradient(bx, ry, bx + bw, ry + 40); gg.addColorStop(0, '#B46CFF'); gg.addColorStop(1, C.v1);
      ctx.save(); ctx.shadowColor = C.v1; ctx.shadowBlur = 20; ctx.fillStyle = gg; ctx.fill(); ctx.restore();
      text('Booked ✓', bx + bw / 2, ry + 29, 19, { weight: 700 });
    } else {
      ctx.strokeStyle = 'rgba(216,180,254,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
      text('Select', bx + bw / 2, ry + 29, 19, { weight: 600, color: C.v4 });
    }
    ctx.restore();
  });
  ctx.restore();
}
function sceneAct(t) {
  if (t >= 6.05) return;
  const out = eio(p(t, 5.72, 6.02));
  ctx.save();
  if (out > 0) {
    const z = 1 + 0.55 * out;
    ctx.translate(CORE.x, CORE.y); ctx.scale(z, z); ctx.translate(-CORE.x, -CORE.y);
    ctx.globalAlpha = 1 - out;
  }
  if (t < 2.4) bubbles(t);
  if (t < 2.7) flowLines(t);
  // browser gets a gentle 3D tilt once it is on screen
  const tilt = t < 3 ? 0 : lerp(0, -0.035, eo(p(t, 3, 3.5))) + 0.012 * eio(p(t, 3.5, 6));
  ctx.translate(540, 608); ctx.transform(1, tilt, 0, 1, 0, 0); ctx.translate(-540, -608);
  browser(t);
  popup(t);
  const c = cursorAt(t);
  if (t < 2.7) scene1Cursor(t, c);
  else {
    let press = 0;
    for (const tc of TL.clicks) press = Math.max(press, bump(t, tc - 0.05, 0.05, 0.1));
    const k = c.k * (1 - 0.15 * press);
    for (const tc of TL.clicks) ripple(c.x, c.y, t, tc);
    drawCursor(c.x, c.y, k, { glowA: 0.9 });
  }
  ctx.restore();
}

// ---------- scenes 3–5 (6–15s): network of people -> core -> logo
function globe(t, a) {
  if (a <= 0) return;
  const rot = t * 0.35, r = 300;
  ctx.save();
  for (let lat = -75; lat <= 75; lat += 15) {
    const la = lat * Math.PI / 180;
    for (let lon = 0; lon < 360; lon += 10) {
      const lo = lon * Math.PI / 180 + rot;
      const x = Math.cos(la) * Math.sin(lo), y = Math.sin(la), z = Math.cos(la) * Math.cos(lo);
      const yy = y * Math.cos(0.35) - z * Math.sin(0.35), zz = y * Math.sin(0.35) + z * Math.cos(0.35);
      const al = zz > 0 ? 0.42 * zz + 0.08 : 0.06;
      ctx.fillStyle = `rgba(192,132,252,${al * a})`;
      ctx.fillRect(CORE.x + x * r - 1.5, CORE.y + yy * r - 1.5, zz > 0 ? 3 : 2, zz > 0 ? 3 : 2);
    }
  }
  ctx.beginPath(); ctx.arc(CORE.x, CORE.y, r, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(192,132,252,${0.22 * a})`; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}
function coreOrb(t, r, intensity, a) {
  if (a <= 0 || r <= 0) return;
  const { x, y } = CORE;
  ctx.save();
  ctx.globalAlpha *= a;
  glow(x, y, r * 3.6, C.v1, 0.55 * intensity);
  glow(x, y, r * 1.9, C.v2, 0.5 * intensity);
  // orbit rings
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(t * (0.6 + i * 0.25) * (i % 2 ? -1 : 1) + i);
    ctx.beginPath(); ctx.ellipse(0, 0, r * (1.55 + i * 0.32), r * (0.48 + i * 0.1), 0, 0, Math.PI * 2);
    ctx.setLineDash([r * 0.5, r * 0.25]);
    ctx.strokeStyle = rgba(C.v4, 0.35 * intensity); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
  }
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  g.addColorStop(0, '#FBF5FF'); g.addColorStop(0.3, '#D8B4FE'); g.addColorStop(0.7, '#8B3DFF'); g.addColorStop(1, '#4C1D95');
  ctx.shadowColor = C.v2; ctx.shadowBlur = 50 * intensity;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.ellipse(x - r * 0.32, y - r * 0.45, r * 0.42, r * 0.2, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r - 1, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(243,232,255,0.6)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
function linkPts(P, u0, u1, n = 30) { const pts = []; for (let i = 0; i <= n; i++) pts.push(quad([P.x, P.y], P.c, [CORE.x, CORE.y], lerp(u0, u1, i / n))); return pts; }
function sparkArrival(P, t) { // time this person's spark reaches them (per wave)
  let best = -1;
  for (const w of TL.sparkWaves) { const ta = w + TL.sparkTravel + P.k * 0.008; if (t >= ta) best = ta; }
  return best;
}
function network(t, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  for (const P of PEOPLE) {
    const t0 = TL.appear(P.k), ta = TL.arrive(P.k);
    const app = p(t, t0 - 0.2, t0 + 0.15);
    if (app <= 0) continue;
    // link line drawn from the person to the core
    const lp = eio(p(t, t0, ta));
    if (lp > 0) {
      const pts = linkPts(P, 0, lp);
      polyline(pts); ctx.strokeStyle = rgba(C.v2, 0.18); ctx.lineWidth = 6; ctx.stroke();
      polyline(pts); ctx.strokeStyle = rgba(C.v3, 0.55); ctx.lineWidth = 1.6; ctx.stroke();
      if (lp < 1) { const h = pts[pts.length - 1]; glow(h[0], h[1], 22, C.v4, 0.9); }
    }
    // data pulses: people -> core before the burst, core -> people after
    if (t > ta) {
      for (let j = 0; j < 2; j++) {
        let u = ((t - ta) / 1.15 + P.ph + j * 0.5) % 1;
        const rev = t > TL.burst;
        if (rev) u = 1 - u;
        const fade = rev ? p(t, TL.burst, TL.burst + 0.3) : 1 - p(t, TL.squeeze, TL.burst);
        const q = quad([P.x, P.y], P.c, [CORE.x, CORE.y], u);
        ctx.beginPath(); ctx.arc(q[0], q[1], 3.2, 0, Math.PI * 2); ctx.fillStyle = rgba(C.v5, 0.9 * fade); ctx.fill();
        glow(q[0], q[1], 14, C.v3, 0.5 * fade);
      }
    }
    // spark waves travel out from the core along the link
    for (const w of TL.sparkWaves) {
      const sq = p(t, w + P.k * 0.008, w + TL.sparkTravel + P.k * 0.008);
      if (sq <= 0 || sq >= 1) continue;
      const u1 = 1 - eio(sq), u0 = Math.min(1, u1 + 0.22);
      const pts = linkPts(P, u0, u1, 14);
      ctx.save(); ctx.lineCap = 'round';
      polyline(pts); ctx.strokeStyle = rgba(C.v4, 0.95); ctx.lineWidth = 3; ctx.shadowColor = C.v2; ctx.shadowBlur = 16; ctx.stroke();
      ctx.restore();
      const h = pts[pts.length - 1]; glow(h[0], h[1], 30, '#FFFFFF', 0.8);
    }
    // person: glossy cursor + country tag
    const sa = sparkArrival(P, t);
    const hit = sa > 0 ? bump(t, sa, 0.03, 0.3) : 0;
    const owned = p(t, TL.sparkWaves[0] + TL.sparkTravel, TL.sparkWaves[0] + TL.sparkTravel + 0.3);
    const s = back(app, 2.2) * (1 + 0.3 * hit);
    const bob = Math.sin(t * 2 + P.ph * 6) * 3;
    if (hit > 0.02) glow(P.x + 8, P.y + 14 + bob, 70, C.v3, 0.8 * hit);
    if (owned > 0) glow(P.x + 8, P.y + 14 + bob, 44, C.v1, 0.35 * owned);
    ctx.save();
    ctx.translate(P.x, P.y + bob); ctx.scale(s, s);
    drawCursor(0, 0, 2.7, { violet: owned, glowA: 0.7 });
    rrect(24, 40, 56, 32, 16);
    ctx.fillStyle = owned > 0 ? `rgba(123,44,255,${0.45 + 0.4 * owned})` : 'rgba(30,10,60,0.85)'; ctx.fill();
    ctx.strokeStyle = rgba(C.v3, 0.6); ctx.lineWidth = 1; ctx.stroke();
    text(P.code, 52, 57, 19, { weight: 700, color: '#F3E8FF' });
    ctx.restore();
  }
  ctx.restore();
}
function freeSparks(t, list, origin, t0List) {
  for (const s of list) {
    const tw = s.w !== undefined ? s.w : t0List;
    const dt = t - tw;
    if (dt <= 0 || dt > s.life) continue;
    const q = dt / s.life, d = (s.v * (1 - Math.exp(-3 * dt))) / 3;
    const x = origin.x + Math.cos(s.a) * d, y = origin.y + Math.sin(s.a) * d;
    ctx.save(); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(s.a) * s.len * (1 - q), y - Math.sin(s.a) * s.len * (1 - q));
    ctx.strokeStyle = rgba(q < 0.4 ? '#FFFFFF' : C.v4, 1 - q); ctx.lineWidth = 2.6 * (1 - q) + 0.6;
    ctx.shadowColor = C.v2; ctx.shadowBlur = 10; ctx.stroke();
    ctx.restore();
  }
}

const TILE = { x: 540, y: 385, s: 320 };
function sceneNetwork(t) {
  if (t < 5.92) return;
  const netA = p(t, 5.95, 6.3) * (1 - eio(p(t, 11.72, 12.05)));
  globe(t, netA * (1 - 0.45 * p(t, 9.3, 10)));
  network(t, netA);

  // core orb
  const arrived = PEOPLE.reduce((n, P) => n + (t > TL.arrive(P.k) ? 1 : 0), 0);
  let flick = 0; for (const P of PEOPLE) flick = Math.max(flick, bump(t, TL.arrive(P.k), 0.02, 0.18));
  const squeeze = eio(p(t, TL.squeeze, TL.burst));
  const r = 92 * back(p(t, 5.95, 6.45), 2) * (1 - 0.32 * squeeze) * (1 + 0.06 * flick);
  const intensity = Math.min(1.4, 0.55 + 0.45 * (arrived / TL.people) + 0.3 * flick + 0.5 * squeeze);
  coreOrb(t, r, intensity, 1 - p(t, TL.burst, TL.burst + 0.22));

  // burst: flash + shock ring + free sparks
  const fl = bump(t, TL.burst, 0.03, 0.25);
  if (fl > 0.01) glow(CORE.x, CORE.y, 520, '#E9D5FF', 0.75 * fl);
  for (const [tr, max] of [[TL.burst, 520], [TL.sparkWaves[1], 380]]) {
    const rq = p(t, tr, tr + 0.7);
    if (rq > 0 && rq < 1) { ctx.beginPath(); ctx.arc(CORE.x, CORE.y, 60 + max * eo(rq), 0, Math.PI * 2); ctx.strokeStyle = rgba(C.v4, 0.8 * (1 - rq)); ctx.lineWidth = 4 * (1 - rq) + 1; ctx.stroke(); }
  }
  freeSparks(t, SPARKS, CORE);

  // the starburst icon grows out of the core, then flies into the app tile
  const grow = eo(p(t, TL.burst, TL.burst + 0.95)) * 1.0001;
  const mv = eio(p(t, 11.82, 12.22));
  const ix = lerp(CORE.x, TILE.x, mv), iy = lerp(CORE.y, TILE.y, mv);
  const isz = lerp(370, TILE.s * 0.64, mv);
  const tileA = p(t, 11.92, 12.12);
  if (t > TL.burst) {
    const pulse = bump(t, TL.sparkWaves[1], 0.05, 0.35);
    if (mv < 1) glow(ix, iy, isz * 0.95, C.v1, (0.5 + 0.3 * pulse) * (1 - tileA));
  }
  if (t > 11.9) logoTile(t);
  if (t > TL.burst) AMLogo.drawIcon(ctx, ix, iy, isz * (1 + 0.04 * bump(t, TL.sparkWaves[1], 0.05, 0.3)), { grow, glow: 34 - 18 * mv, glowColor: C.v2 });
  if (t > 12) finale(t);
}
function logoTile(t) {
  const a = p(t, 11.92, 12.4);
  const s = TILE.s * back(a, 1.6);
  if (s <= 0) return;
  const pulse = bump(t, TL.logoHit, 0.05, 0.6) + 0.6 * bump(t, TL.pulse2, 0.15, 0.5);
  const { x, y } = TILE;
  // light rays
  ctx.save();
  ctx.translate(x, y); ctx.rotate(t * 0.12);
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    const g = ctx.createLinearGradient(0, 0, 0, -560);
    g.addColorStop(0, rgba(C.v3, 0.10 * clamp(a))); g.addColorStop(1, rgba(C.v3, 0));
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-60, -560); ctx.lineTo(60, -560); ctx.lineTo(14, 0); ctx.fillStyle = g; ctx.fill();
  }
  ctx.restore();
  glow(x, y, 380 + 140 * pulse, C.v1, (0.45 + 0.35 * pulse) * clamp(a));
  for (const [tr, mx] of [[TL.logoHit, 460], [TL.pulse2, 360]]) {
    const rq = p(t, tr, tr + 0.9);
    if (rq > 0 && rq < 1) { rrectC(x, y, s + mx * eo(rq), 0.24); ctx.strokeStyle = rgba(C.v3, 0.7 * (1 - rq)); ctx.lineWidth = 3; ctx.stroke(); }
  }
  // tile body
  ctx.save();
  ctx.globalAlpha = clamp(a * 2);
  ctx.save();
  ctx.shadowColor = rgba(C.v1, 0.9); ctx.shadowBlur = 60 + 50 * pulse; ctx.shadowOffsetY = 20;
  rrectC(x, y, s, 0.24);
  const g = ctx.createLinearGradient(x - s / 2, y - s / 2, x + s / 2, y + s / 2);
  g.addColorStop(0, '#9A1BFF'); g.addColorStop(0.55, '#7F05EC'); g.addColorStop(1, '#5A00C4');
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  ctx.save();
  rrectC(x, y, s, 0.24); ctx.clip();
  const gl = ctx.createLinearGradient(x, y - s / 2, x, y);
  gl.addColorStop(0, 'rgba(255,255,255,0.28)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl; ctx.fillRect(x - s / 2, y - s / 2, s, s / 2);
  // shine sweep
  const sh = p(t, TL.shine, TL.shine + 0.55);
  if (sh > 0 && sh < 1) {
    const sx = lerp(x - s, x + s, eio(sh));
    const sg = ctx.createLinearGradient(sx - 90, y - s / 2, sx + 90, y + s / 2);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.45)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(x - s / 2, y - s / 2, s, s);
  }
  ctx.restore();
  rrectC(x, y, s - 2, 0.24);
  const rim = ctx.createLinearGradient(x - s / 2, y - s / 2, x + s / 2, y + s / 2);
  rim.addColorStop(0, 'rgba(255,255,255,0.7)'); rim.addColorStop(0.5, 'rgba(255,255,255,0.12)'); rim.addColorStop(1, 'rgba(216,180,254,0.5)');
  ctx.strokeStyle = rim; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
function rrectC(x, y, s, rr) { rrect(x - s / 2, y - s / 2, s, s, s * rr); }
function finale(t) {
  freeSparks(t, FINALE, TILE, TL.logoHit);
  // wordmark: "Action" bold + "Model" light, wiped in with a glowing edge
  const size = 112, y = 672;
  ctx.save();
  ctx.font = `800 ${size}px ${F}`; const w1 = ctx.measureText('Action').width;
  ctx.font = `300 ${size}px ${F}`; const w2 = ctx.measureText('Model').width;
  const x0 = W / 2 - (w1 + w2) / 2;
  const wq = eio(p(t, TL.wordmark, TL.wordmark + 0.6));
  if (wq > 0) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x0 - 20, y - 100, (w1 + w2 + 40) * wq, 200); ctx.clip();
    const pulse = bump(t, TL.pulse2, 0.15, 0.5);
    ctx.shadowColor = rgba(C.v2, 0.7 + 0.3 * pulse); ctx.shadowBlur = 26 + 20 * pulse;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 ${size}px ${F}`; ctx.fillText('Action', x0, y);
    ctx.font = `300 ${size}px ${F}`; ctx.fillText('Model', x0 + w1, y);
    ctx.restore();
    if (wq < 1) {
      const ex = x0 - 20 + (w1 + w2 + 40) * wq;
      const eg = ctx.createLinearGradient(ex - 40, 0, ex + 4, 0);
      eg.addColorStop(0, 'rgba(216,180,254,0)'); eg.addColorStop(1, 'rgba(243,232,255,0.95)');
      ctx.fillStyle = eg; ctx.fillRect(ex - 40, y - 70, 44, 140);
      glow(ex, y, 90, C.v3, 0.7);
    }
  }
  ctx.restore();
  // tagline
  const ta = eo5(p(t, TL.tagline, TL.tagline + 0.5));
  if (ta > 0) {
    ctx.save();
    ctx.globalAlpha = ta;
    ctx.font = `700 60px ${F}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText('Community-Owned AI').width, ty = 782 + (1 - ta) * 30;
    const g = ctx.createLinearGradient(W / 2 - tw / 2, 0, W / 2 + tw / 2, 0);
    g.addColorStop(0, '#E9D5FF'); g.addColorStop(0.5, '#C084FC'); g.addColorStop(1, '#E9D5FF');
    ctx.shadowColor = rgba(C.v1, 0.8); ctx.shadowBlur = 24; ctx.fillStyle = g;
    ctx.fillText('Community-Owned AI', W / 2, ty);
    ctx.restore();
  }
  // handle pill
  const ha = back(p(t, TL.handle, TL.handle + 0.45), 1.8);
  if (ha > 0) {
    ctx.save();
    ctx.globalAlpha = clamp(ha);
    ctx.translate(W / 2, 882); ctx.scale(ha, ha);
    ctx.font = `600 42px ${F}`;
    const hw = ctx.measureText('@ActionModelAI').width + 70;
    rrect(-hw / 2, -36, hw, 72, 36);
    ctx.fillStyle = 'rgba(123,44,255,0.22)'; ctx.fill();
    ctx.shadowColor = C.v1; ctx.shadowBlur = 20;
    ctx.strokeStyle = rgba(C.v3, 0.8); ctx.lineWidth = 2; ctx.stroke();
    ctx.shadowBlur = 0;
    text('@ActionModelAI', 0, 1, 42, { weight: 600, color: '#F3E8FF' });
    ctx.restore();
  }
}

// ---------- frame
function cameraScale(t) {
  const i = Math.min(4, Math.floor(t / 3)), local = (t - i * 3) / 3;
  return 1 + 0.045 * eio(local) - (i > 0 ? 0.0 : 0);
}
function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  background(t);
  ctx.save();
  const s = cameraScale(t);
  ctx.translate(540, 600); ctx.scale(s, s); ctx.translate(-540, -600);
  sceneAct(t);
  sceneNetwork(t);
  ctx.restore();
  // cut flash (keeps the cuts snappy)
  for (const c of [3, 6, 9]) { const f = bump(t, c - 0.04, 0.04, 0.16); if (f > 0.01) { ctx.fillStyle = `rgba(168,85,247,${0.12 * f})`; ctx.fillRect(0, 0, W, H); } }
  headline('AI that talks is *old news.*', t, 0.55, 2.9);
  headline('Action Model|learns to *ACT.*', t, 3.12, 5.88);
  headline('Trained by *real people.*', t, 6.2, 8.9);
  headline('Owned by the people|*who build it.*', t, 9.3, 11.85);
  // vignette
  const v = ctx.createRadialGradient(540, 560, 380, 540, 560, 800);
  v.addColorStop(0, 'rgba(5,0,12,0)'); v.addColorStop(1, 'rgba(5,0,12,0.7)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  // fade in from black at the very start
  const fi = 1 - p(t, 0, 0.35);
  if (fi > 0) { ctx.fillStyle = `rgba(0,0,0,${fi})`; ctx.fillRect(0, 0, W, H); }
}
window.renderFrame = renderFrame;

// ---------- preview player
(async () => {
  await Promise.all(['300', '500', '600', '700', '800'].map((w) => document.fonts.load(`${w} 40px Inter`)));
  renderFrame(0);
  window.READY = true;
  if (document.body.classList.contains('render')) return;
  const audio = document.getElementById('a'), bar = document.getElementById('bar'), btn = document.getElementById('play');
  let playing = false, start = 0, pos = 0;
  const now = () => (playing ? (audio.readyState > 2 && !audio.paused ? audio.currentTime : (performance.now() - start) / 1000) : pos);
  function loop() {
    let t = now();
    if (t >= TL.DUR) { playing = false; pos = TL.DUR - 1e-3; btn.textContent = 'Play'; t = pos; audio.pause(); }
    renderFrame(t); bar.value = (t / TL.DUR) * 1000;
    if (playing) requestAnimationFrame(loop);
  }
  btn.onclick = () => {
    if (playing) { pos = now(); playing = false; audio.pause(); btn.textContent = 'Play'; return; }
    if (pos >= TL.DUR - 0.01) pos = 0;
    playing = true; start = performance.now() - pos * 1000; audio.currentTime = pos; audio.play().catch(() => {});
    btn.textContent = 'Pause'; loop();
  };
  bar.oninput = () => { pos = (bar.value / 1000) * TL.DUR; if (playing) { start = performance.now() - pos * 1000; audio.currentTime = pos; } else renderFrame(pos); };
})();
