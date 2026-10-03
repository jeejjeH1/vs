// نبرد رپ: ChatGPT در برابر Claude — animated robots, lip-synced to the vocal envelopes in data.js.
const W = 1920, H = 1080;
const D = window.DATA;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const C = {
  ink: '#0a0c1e', ink2: '#151a38', ink3: '#232a52',
  text: '#f6f0e4', muted: '#a8acc9', gold: '#f0c060',
  gpt: '#22d3a6', gptDark: '#0d6b55', cl: '#f08c5a', clDark: '#8a3f22', dj: '#b9a3ff', djDark: '#4b3c8f',
};
const DISPLAY = 'Lalezar, Vazirmatn, Tahoma, sans-serif';
const BODY = 'Vazirmatn, Tahoma, sans-serif';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const p = (t, a, b) => clamp((t - a) / (b - a));
const eo = (x) => 1 - Math.pow(1 - x, 3);
const back = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = (a, b, x) => a + (b - a) * x;
const S16 = D.BEAT / 4;

function text(s, x, y, size, { font = BODY, weight = 700, color = C.text, alpha = 1, align = 'center', glow = 0, glowColor = null, stroke = 0 } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.direction = 'rtl'; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = stroke; ctx.strokeStyle = C.ink; ctx.strokeText(s, x, y); }
  if (glow) { ctx.shadowColor = glowColor || color; ctx.shadowBlur = glow; }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
  ctx.restore();
}
function rrect(x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function star8(cx, cy, r1, r2, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 16; i++) { const a = rot + (i * Math.PI) / 8, r = i % 2 ? r2 : r1; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  ctx.closePath();
}

// ---------- music clock helpers
const beatPhase = (t) => ((t / D.BEAT) % 1 + 1) % 1;
function kickPulse(t) {
  if (t < D.BAR) return 0;
  const b = Math.floor(t / D.BAR), tb = t - b * D.BAR;
  let last = -1;
  for (const k of [0, 7, 10]) if (tb >= k * S16) last = k * S16;
  if (b >= D.END_BAR) return Math.exp(-(t - D.END_BAR * D.BAR) * 3);
  return Math.exp(-(tb - last) * 9);
}
const mouth = (who, t) => { const a = D.mouth[who], i = Math.floor(t * D.FPS); return a[i] || 0; };
const lineAt = (t) => { let cur = null; for (const l of D.lyrics) if (t >= l.t && t < l.t + D.BAR) cur = l; return cur; };
const singing = (who, t) => { const l = lineAt(t); return !!l && (l.who === who || (l.who === 'b' && who !== 'h')); };
function activeAmt(who, t) { // smoothed 0..1: how much this rapper "has the stage"
  let s = 0;
  for (const l of D.lyrics) {
    if (!(l.who === who || (l.who === 'b' && who !== 'h'))) continue;
    s = Math.max(s, p(t, l.t - 0.35, l.t) * (1 - p(t, l.t + D.BAR - 0.1, l.t + D.BAR + 0.4)));
  }
  return s;
}

// ---------- backdrop
function stage(t, k) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0c0f27'); g.addColorStop(0.75, '#1a1640'); g.addColorStop(1, '#0a0c1e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // LED wall with eight-pointed star tiles
  ctx.save();
  for (let i = 0; i < 16; i++) for (let j = 0; j < 6; j++) {
    const x = 60 + i * 120, y = 60 + j * 115;
    const wave = 0.5 + 0.5 * Math.sin(t * 2 + i * 0.5 - j * 0.7);
    star8(x, y, 34, 22, Math.PI / 16);
    ctx.fillStyle = `rgba(240,192,96,${0.03 + 0.05 * wave + 0.06 * k})`; ctx.fill();
  }
  ctx.restore();

  // big screen
  const sx = W / 2, sy = 200;
  ctx.save();
  rrect(sx - 420, sy - 130, 840, 260, 26); ctx.fillStyle = 'rgba(10,12,30,0.85)'; ctx.fill();
  ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.globalAlpha = 0.6 + 0.4 * k; ctx.stroke();
  ctx.restore();
  text('نبرد رپ', sx, sy - 55, 74, { font: DISPLAY, weight: 400, color: C.gold, glow: 20 + 30 * k });
  text('ChatGPT', sx + 200, sy + 55, 62, { font: DISPLAY, weight: 400, color: C.gpt });
  text('Claude', sx - 200, sy + 55, 62, { font: DISPLAY, weight: 400, color: C.cl });
  star8(sx, sy + 55, 44, 31, Math.PI / 16 + t * 0.6); ctx.fillStyle = C.gold; ctx.fill();
  text('VS', sx, sy + 58, 30, { font: DISPLAY, weight: 400, color: C.ink, align: 'center' });

  // speakers
  for (const sxp of [120, W - 120]) {
    ctx.save(); ctx.translate(sxp, 640);
    rrect(-90, -250, 180, 420, 18); ctx.fillStyle = '#121530'; ctx.fill(); ctx.strokeStyle = '#2b3160'; ctx.lineWidth = 4; ctx.stroke();
    for (const [cy, r] of [[-150, 50], [40, 70]]) {
      ctx.beginPath(); ctx.arc(0, cy, r * (1 + 0.08 * k), 0, Math.PI * 2); ctx.fillStyle = '#05060f'; ctx.fill();
      ctx.strokeStyle = C.gold; ctx.globalAlpha = 0.5 + 0.5 * k; ctx.lineWidth = 4; ctx.stroke(); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(0, cy, r * 0.3, 0, Math.PI * 2); ctx.fillStyle = '#2b3160'; ctx.fill();
    }
    ctx.restore();
  }
  // floor
  const fg = ctx.createLinearGradient(0, 800, 0, H);
  fg.addColorStop(0, '#221d4a'); fg.addColorStop(1, '#0a0c1e');
  ctx.fillStyle = fg; ctx.fillRect(0, 820, W, H - 820);
  ctx.strokeStyle = 'rgba(240,192,96,0.25)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 822); ctx.lineTo(W, 822); ctx.stroke();
}

function spotlight(x, amt, col, t) {
  if (amt <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const sway = Math.sin(t * 0.8 + x) * 30;
  const g = ctx.createLinearGradient(0, 0, 0, 860);
  g.addColorStop(0, col + '00'); g.addColorStop(1, col + '55');
  ctx.globalAlpha = amt;
  ctx.beginPath(); ctx.moveTo(x - 40 + sway, 0); ctx.lineTo(x + 40 + sway, 0); ctx.lineTo(x + 260, 860); ctx.lineTo(x - 260, 860); ctx.closePath();
  ctx.fillStyle = g; ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, 840, 260, 40, 0, 0, Math.PI * 2); ctx.fillStyle = col + '40'; ctx.fill();
  ctx.restore();
}

// ---------- robot rapper
function limb(sx, sy, tx, ty, l1, l2, bendSign) {
  let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
  d = Math.min(d, l1 + l2 - 1);
  const a = Math.atan2(dy, dx);
  const cosB = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const e = a + bendSign * Math.acos(cosB);
  const ex = sx + Math.cos(e) * l1, ey = sy + Math.sin(e) * l1;
  const hx = sx + Math.cos(a) * d, hy = sy + Math.sin(a) * d;
  return [ex, ey, hx, hy];
}
function robot(o, t) {
  const { x, face, col, dark, hat, who } = o;          // face: -1 looks left, +1 looks right
  const act = activeAmt(who, t), sing = singing(who, t);
  const ph = beatPhase(t), bounce = Math.abs(Math.sin(Math.PI * ph));
  const m = sing ? mouth(who, t) : 0;
  const scale = 1 + 0.06 * act;
  const bob = (8 + 14 * act) * bounce;
  const blink = (t * 0.73 + x) % 3.7 < 0.12 ? 0.1 : 1;

  ctx.save();
  ctx.translate(x + face * 30 * act, 830);
  ctx.scale(scale * 0.95, scale * 0.95);

  // shadow
  ctx.beginPath(); ctx.ellipse(0, 0, 150, 22, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();

  // legs (knees bend with the bounce)
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.strokeStyle = '#2a2f55'; ctx.lineWidth = 40;
    ctx.beginPath(); ctx.moveTo(s * 45, -160 + bob); ctx.lineTo(s * (50 + bob * 0.6), -80 + bob * 0.5); ctx.lineTo(s * 45, -20); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(s * 50 + face * 10, -12, 46, 22, 0, 0, Math.PI * 2); ctx.fillStyle = '#f6f0e4'; ctx.fill();
    ctx.fillStyle = col; ctx.fillRect(s * 50 + face * 10 - 40, -16, 80, 8);
  }

  ctx.translate(0, bob);
  // torso
  const tg = ctx.createLinearGradient(-110, -400, 110, -150);
  tg.addColorStop(0, col); tg.addColorStop(1, dark);
  rrect(-115, -410, 230, 260, 46); ctx.fillStyle = tg; ctx.fill();
  // chest screen eq
  rrect(-72, -360, 144, 100, 16); ctx.fillStyle = '#070815'; ctx.fill();
  for (let i = 0; i < 6; i++) {
    const lv = sing ? clamp(m * (0.5 + 0.5 * Math.abs(Math.sin(t * 13 + i * 1.7)))) : 0.12 + 0.1 * bounce * ((i % 2) + 0.5);
    const bh = 10 + 76 * lv;
    ctx.fillStyle = i % 2 ? col : C.gold; rrect(-62 + i * 22, -268 - bh, 14, bh, 4); ctx.fill();
  }
  // gold chain + star pendant (Persian girih star)
  ctx.strokeStyle = C.gold; ctx.lineWidth = 7; ctx.setLineDash([9, 6]);
  ctx.beginPath(); ctx.moveTo(-70, -405); ctx.quadraticCurveTo(0, -200, 70, -405); ctx.stroke(); ctx.setLineDash([]);
  star8(0, -240, 26, 17, Math.PI / 16 + t * 2); ctx.fillStyle = C.gold; ctx.shadowColor = C.gold; ctx.shadowBlur = 15 + 25 * act; ctx.fill(); ctx.shadowBlur = 0;

  // head transform: bob + tilt toward the beat
  const headTilt = (sing ? 0.08 : 0.04) * Math.sin(Math.PI * 2 * ph) + face * 0.04 * act;
  const headY = -420 - 6 * bounce;
  // arms (drawn before head so the mic hand sits in front of the body but under the head)
  const shoulderY = -385;
  const micSide = face;                // the arm on the side the robot faces holds the mic
  const micRaise = sing ? 1 : 0.15 + 0.85 * act * 0;
  const gest = sing ? Math.sin(t * Math.PI * 2 / D.BEAT) : 0;
  const arms = [
    // mic arm
    { s: micSide, tx: lerp(micSide * 170, micSide * 70, micRaise), ty: lerp(-210, headY - 20, micRaise), mic: true },
    // gesture arm
    { s: -micSide, tx: sing ? -micSide * (230 + 30 * gest) : -micSide * 165, ty: sing ? -470 - 90 * Math.max(0, gest) : -215 + 10 * bounce, mic: false },
  ];
  const drawArm = (a) => {
    const sx = a.s * 115, sy = shoulderY;
    const [ex, ey, hx, hy] = limb(sx, sy, a.tx, a.ty, 130, 125, a.s > 0 ? 1 : -1);
    ctx.strokeStyle = dark; ctx.lineWidth = 36; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 22;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
    if (a.mic) {
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(a.s * 0.35);
      rrect(-11, -10, 22, 80, 8); ctx.fillStyle = '#20243f'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, -22, 24, 0, Math.PI * 2); ctx.fillStyle = '#c9cbe0'; ctx.fill();
      ctx.strokeStyle = '#7d809c'; ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-20, -22 + i * 8); ctx.lineTo(20, -22 + i * 8); ctx.stroke(); }
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(hx, hy, 26, 0, Math.PI * 2); ctx.fillStyle = '#f6f0e4'; ctx.fill();
  };
  drawArm(arms[1]);
  if (!sing) drawArm(arms[0]);

  // neck + head
  ctx.fillStyle = '#2a2f55'; ctx.fillRect(-28, -440, 56, 40);
  ctx.save();
  ctx.translate(0, headY); ctx.rotate(headTilt);
  // antenna
  ctx.strokeStyle = '#2a2f55'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-face * 50, -225); ctx.lineTo(-face * 70, -300); ctx.stroke();
  ctx.beginPath(); ctx.arc(-face * 70, -300, 15, 0, Math.PI * 2); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 20 + 40 * kickPulse(t); ctx.fill(); ctx.shadowBlur = 0;
  // head shell
  const hg = ctx.createLinearGradient(0, -235, 0, 0);
  hg.addColorStop(0, col); hg.addColorStop(1, dark);
  rrect(-140, -235, 280, 230, 70); ctx.fillStyle = hg; ctx.fill();
  // visor
  rrect(-112, -200, 224, 165, 48); ctx.fillStyle = '#070815'; ctx.fill();
  // eyes (look toward the face direction, squint on the beat when singing)
  const look = face * 14, eh = 52 * blink * (sing ? 0.75 + 0.25 * (1 - bounce) : 1);
  for (const s of [-1, 1]) {
    rrect(s * 48 - 18 + look, -150 - eh / 2, 36, eh, 14);
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 18; ctx.fill(); ctx.shadowBlur = 0;
  }
  // mouth: opens with the vocal envelope
  const mh = 8 + 48 * m;
  rrect(-42 + look, -80 - mh / 2, 84, mh, Math.min(16, mh / 2));
  ctx.fillStyle = sing ? C.text : col; ctx.globalAlpha = sing ? 1 : 0.7; ctx.fill(); ctx.globalAlpha = 1;
  if (!sing) { // idle smirk
    ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(look, -100, 30, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();
  }
  // hats
  if (hat === 'cap') { // backwards cap
    ctx.beginPath(); ctx.ellipse(0, -232, 150, 70, 0, Math.PI, 0); ctx.fillStyle = '#16233a'; ctx.fill();
    ctx.fillStyle = col; ctx.fillRect(-150, -240, 300, 14);
    ctx.beginPath(); ctx.ellipse(-face * 175, -236, 70, 16, 0, 0, Math.PI * 2); ctx.fillStyle = '#16233a'; ctx.fill();
    text('GPT', 0, -265, 40, { font: DISPLAY, weight: 400, color: col });
  } else { // headphones + beanie
    ctx.beginPath(); ctx.ellipse(0, -228, 148, 78, 0, Math.PI, 0); ctx.fillStyle = '#3a1f2e'; ctx.fill();
    ctx.fillStyle = col;
    for (let i = -140; i < 140; i += 28) ctx.fillRect(i, -246, 14, 18);
    ctx.beginPath(); ctx.arc(0, -312, 24, 0, Math.PI * 2); ctx.fillStyle = C.gold; ctx.fill();
    ctx.strokeStyle = '#20243f'; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(0, -120, 160, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    for (const s of [-1, 1]) { rrect(s * 150 - 26, -150, 52, 90, 20); ctx.fillStyle = '#20243f'; ctx.fill(); rrect(s * 150 - 16, -138, 32, 66, 12); ctx.fillStyle = col; ctx.fill(); }
  }
  ctx.restore();
  if (sing) drawArm(arms[0]);
  ctx.restore();
}

function dj(t, k) {
  const sing = singing('h', t), m = sing ? mouth('h', t) : 0, ph = beatPhase(t), bounce = Math.abs(Math.sin(Math.PI * ph));
  ctx.save(); ctx.translate(W / 2, 720); ctx.scale(0.62, 0.62);
  // body behind the deck
  ctx.translate(0, -10 * bounce);
  rrect(-90, -330, 180, 200, 40); ctx.fillStyle = C.djDark; ctx.fill();
  rrect(-110, -540, 220, 190, 60); ctx.fillStyle = C.dj; ctx.fill();
  rrect(-88, -510, 176, 135, 40); ctx.fillStyle = '#070815'; ctx.fill();
  for (const s of [-1, 1]) { rrect(s * 38 - 14, -480, 28, 34, 10); ctx.fillStyle = C.dj; ctx.fill(); }
  const mh = 6 + 34 * m; rrect(-30, -410 - mh / 2, 60, mh, Math.min(12, mh / 2)); ctx.fillStyle = sing ? C.text : C.dj; ctx.fill();
  // headphones
  ctx.strokeStyle = '#20243f'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(0, -440, 125, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  for (const s of [-1, 1]) { rrect(s * 118 - 22, -480, 44, 74, 16); ctx.fillStyle = '#20243f'; ctx.fill(); }
  // scratch arm
  const sc = Math.sin(t * Math.PI * 4 / D.BEAT) * 50;
  ctx.strokeStyle = C.dj; ctx.lineWidth = 26; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(80, -300); ctx.lineTo(170, -200); ctx.lineTo(200 + sc, -130); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-80, -300); ctx.lineTo(-170, -200); ctx.lineTo(-200, -130); ctx.stroke();
  ctx.translate(0, 10 * bounce);
  // deck
  rrect(-420, -150, 840, 170, 20); ctx.fillStyle = '#121530'; ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.stroke();
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * 220, -150); ctx.scale(1, 0.32);
    ctx.beginPath(); ctx.arc(0, 0, 120, 0, Math.PI * 2); ctx.fillStyle = '#05060f'; ctx.fill();
    ctx.rotate(t * 4 * s); star8(0, 0, 40, 26, 0); ctx.fillStyle = C.gold; ctx.fill();
    ctx.restore();
  }
  text('مجری', 0, -60, 64, { font: DISPLAY, weight: 400, color: C.gold, glow: 10 + 20 * k });
  ctx.restore();
}

function crowd(t, hook) {
  for (let i = 0; i < 26; i++) {
    const x = (i + 0.5) * (W / 26) + Math.sin(i * 7.3) * 20;
    const ph = beatPhase(t + (i % 3) * 0.03), bob = Math.abs(Math.sin(Math.PI * ph)) * (12 + (i % 4) * 4);
    const y = 1010 + (i % 2) * 30 - bob;
    ctx.fillStyle = i % 2 ? '#06070f' : '#0b0d1c';
    ctx.beginPath(); ctx.arc(x, y - 70, 36, 0, Math.PI * 2); ctx.fill();
    rrect(x - 62, y - 36, 124, 160, 50); ctx.fill();
    if (hook > 0.01 && i % 2 === 0) {
      const up = hook * (0.8 + 0.2 * Math.sin(t * 8 + i));
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 22; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + 40, y - 20); ctx.lineTo(x + 70, y - 20 - 120 * up); ctx.stroke();
      // phone lights
      ctx.fillStyle = `rgba(255,240,200,${0.6 * up})`; ctx.fillRect(x + 60, y - 30 - 130 * up, 18, 26);
    }
  }
}

function subtitles(t) {
  const l = lineAt(t);
  if (!l) return;
  const col = { g: C.gpt, c: C.cl, h: C.dj, b: C.gold }[l.who];
  const name = { g: 'ChatGPT', c: 'Claude', h: 'مجری', b: 'همخوانی — ChatGPT و Claude' }[l.who];
  const a = p(t, l.t - 0.1, l.t + 0.1);
  ctx.save(); ctx.globalAlpha = a;
  rrect(160, 930, W - 320, 120, 30); ctx.fillStyle = 'rgba(7,8,21,0.86)'; ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
  // name tag
  ctx.save(); ctx.font = `400 34px ${DISPLAY}`; const nw = ctx.measureText(name).width + 50; ctx.restore();
  ctx.save(); ctx.globalAlpha = a; rrect(W - 200 - nw, 905, nw, 52, 26); ctx.fillStyle = col; ctx.fill(); ctx.restore();
  text(name, W - 200 - nw / 2, 932, 34, { font: DISPLAY, weight: 400, color: C.ink, alpha: a });
  // two halves, RTL: first half on the right
  const full = l.halves.map((h) => h.text).join('  ⟵  ');
  ctx.save(); ctx.font = `900 50px ${BODY}`; ctx.direction = 'rtl';
  const sizes = l.halves.map((h) => ctx.measureText(h.text).width); const sepW = ctx.measureText('   •   ').width; ctx.restore();
  const total = sizes.reduce((s, v) => s + v, 0) + sepW;
  let xr = W / 2 + total / 2;
  l.halves.forEach((h, i) => {
    const on = t >= h.t;
    const prog = clamp((t - h.t) / Math.max(0.3, h.d));
    // base text
    text(h.text, xr, 998, 50, { weight: 900, color: on ? C.text : C.muted, alpha: a * (on ? 1 : 0.55), align: 'right' });
    // karaoke wipe (right-to-left)
    if (on && prog < 1) {
      ctx.save(); ctx.beginPath(); ctx.rect(xr - sizes[i] * prog, 960, sizes[i] * prog + 4, 80); ctx.clip();
      text(h.text, xr, 998, 50, { weight: 900, color: col, align: 'right' });
      ctx.restore();
    } else if (on) text(h.text, xr, 998, 50, { weight: 900, color: col, align: 'right', alpha: 0.35 });
    xr -= sizes[i];
    if (i === 0) { text('•', xr - sepW / 2, 998, 50, { weight: 900, color: C.gold, alpha: a }); xr -= sepW; }
  });
  void full;
}

const SECTIONS = [
  { bar: 3, title: 'راند اول: ChatGPT', col: C.gpt },
  { bar: 11, title: 'همخوانی', col: C.gold },
  { bar: 15, title: 'راند دوم: Claude', col: C.cl },
  { bar: 23, title: 'همخوانی', col: C.gold },
];
function sectionCard(t) {
  for (const s of SECTIONS) {
    const t0 = s.bar * D.BAR - 0.5, a = p(t, t0, t0 + 0.3) * (1 - p(t, t0 + 1.6, t0 + 2.0));
    if (a <= 0) continue;
    const sc = back(p(t, t0, t0 + 0.4));
    ctx.save(); ctx.translate(W / 2, 470); ctx.scale(sc, sc); ctx.rotate(-0.04);
    ctx.globalAlpha = a;
    rrect(-330, -60, 660, 120, 24); ctx.fillStyle = s.col; ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(W / 2, 470); ctx.scale(sc, sc); ctx.rotate(-0.04);
    text(s.title, 0, 4, 68, { font: DISPLAY, weight: 400, color: C.ink, alpha: a });
    ctx.restore();
  }
}

function intro(t) {
  // bar 0: title slam over the beat intro
  const a = 1 - p(t, D.BAR - 0.4, D.BAR + 0.2);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a * 0.75; ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H); ctx.restore();
  const s1 = back(p(t, 0.2, 0.7)), s2 = back(p(t, 0.9, 1.3)), s3 = eo(p(t, 1.5, 2.0));
  ctx.save(); ctx.translate(W / 2, 420); ctx.scale(s1, s1);
  star8(0, 0, 230, 170, Math.PI / 16 + t * 0.5); ctx.fillStyle = C.gold; ctx.globalAlpha = a; ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(W / 2, 420); ctx.scale(s1, s1);
  text('نبرد رپ', 0, 10, 110, { font: DISPLAY, weight: 400, color: C.ink, alpha: a });
  ctx.restore();
  ctx.save(); ctx.translate(W / 2, 720); ctx.scale(s2, s2);
  text('ChatGPT', 300, 0, 110, { font: DISPLAY, weight: 400, color: C.gpt, alpha: a, glow: 30 });
  text('در برابر', 0, 0, 64, { font: DISPLAY, weight: 400, color: C.text, alpha: a });
  text('Claude', -300, 0, 110, { font: DISPLAY, weight: 400, color: C.cl, alpha: a, glow: 30 });
  ctx.restore();
  text('یک رپ فارسی از دو هوش مصنوعی', W / 2, 860, 44, { weight: 700, color: C.text, alpha: a * s3 });
}

function outro(t) {
  const t0 = D.END_BAR * D.BAR;
  const a = p(t, t0 - 0.1, t0 + 0.3);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a * 0.78; ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H); ctx.restore();
  const s = back(p(t, t0, t0 + 0.5));
  ctx.save(); ctx.translate(W / 2, 470); ctx.scale(s, s);
  star8(0, 0, 380, 290, Math.PI / 16 + t * 0.2); ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.globalAlpha = a * 0.5; ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.translate(W / 2, 470); ctx.scale(s, s);
  text('انتخاب با شماست!', 0, -20, 130, { font: DISPLAY, weight: 400, color: C.gold, alpha: a, glow: 40 });
  text('ChatGPT یا Claude؟ در کامنت‌ها بنویسید', 0, 120, 50, { weight: 700, color: C.text, alpha: a });
  ctx.restore();
  const f = p(t, D.DUR - 1.2, D.DUR);
  if (f > 0) { ctx.fillStyle = `rgba(3,4,10,${f})`; ctx.fillRect(0, 0, W, H); }
}

function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  const k = kickPulse(t);
  const ag = activeAmt('g', t), ac = activeAmt('c', t);
  const hook = D.lyrics.some((l) => l.who === 'b' && t >= l.t - 0.2 && t < l.t + D.BAR) ? 1 : 0;
  // camera: drift toward whoever raps, tiny punch on kicks
  const camX = (ag - ac) * (hook ? 0 : 60), zoom = 1 + 0.035 * Math.max(ag, ac) * (hook ? 0.3 : 1) + 0.008 * k;
  ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2 - camX, -H / 2);
  stage(t, k);
  spotlight(1440, ag, C.gpt, t);
  spotlight(480, ac, C.cl, t);
  spotlight(960, activeAmt('h', t) * 0.7, C.dj, t);
  dj(t, k);
  robot({ x: 480, face: 1, col: C.cl, dark: C.clDark, hat: 'beanie', who: 'c' }, t);
  robot({ x: 1440, face: -1, col: C.gpt, dark: C.gptDark, hat: 'cap', who: 'g' }, t);
  crowd(t, hook);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // hook confetti
  if (hook) {
    for (let i = 0; i < 70; i++) {
      const x = (Math.sin(i * 12.9) * 0.5 + 0.5) * W, sp = 120 + (i % 5) * 40;
      const y = ((t * sp + i * 97) % (H + 40)) - 20;
      ctx.save(); ctx.translate(x + Math.sin(t * 2 + i) * 30, y); ctx.rotate(t * 3 + i);
      ctx.fillStyle = [C.gpt, C.cl, C.gold][i % 3]; ctx.fillRect(-7, -4, 14, 8); ctx.restore();
    }
  }
  subtitles(t);
  sectionCard(t);
  intro(t);
  outro(t);
}
window.renderFrame = renderFrame;

(async function boot() {
  await Promise.all([document.fonts.load('400 80px Lalezar'), document.fonts.load('700 40px Vazirmatn'), document.fonts.load('900 40px Vazirmatn')]);
  renderFrame(D.BAR * 3 + 1.0);
  window.READY = true;
  if (location.search.includes('render')) return;
  const audio = document.getElementById('a'), btn = document.getElementById('play'), bar = document.getElementById('bar');
  let playing = false;
  btn.onclick = () => (playing ? audio.pause() : audio.play());
  audio.onplay = () => { playing = true; btn.textContent = 'توقف'; loop(); };
  audio.onpause = () => { playing = false; btn.textContent = 'پخش'; };
  bar.oninput = () => { audio.currentTime = (bar.value / 1000) * D.DUR; renderFrame(audio.currentTime); };
  function loop() { renderFrame(audio.currentTime); bar.value = (audio.currentTime / D.DUR) * 1000; if (playing) requestAnimationFrame(loop); }
})();
