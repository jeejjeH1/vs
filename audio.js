// Original Persian-style score, synthesized offline -> soundtrack.wav
// Dastgah-e Shur on D (E is koron: a quarter-tone flat), 6/8 rhythm.
// Santur (struck strings + riz tremolo), tonbak (tom/bak), daf jingles, tanbur drone.
const fs = require('fs');
const path = require('path');
const TL = require('./timeline.js');

const SR = 48000, N = Math.floor(SR * TL.DUR), TAU = Math.PI * 2;
const L = new Float32Array(N), R = new Float32Array(N), SEND = new Float32Array(N);
let seed = 7;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const noise = () => rand() * 2 - 1;
const at = (t) => Math.floor(t * SR);
function put(i, v, pan = 0, send = 0.2) { if (i < 0 || i >= N) return; L[i] += v * Math.min(1, 1 - pan); R[i] += v * Math.min(1, 1 + pan); SEND[i] += v * send; }

// Shur scale on D4, cents from tonic (E koron = 150 cents)
const D4 = 293.66;
const CENTS = { '-2': -500 /*A3*/, '-1': -200 /*C4*/, 0: 0, 1: 150, 2: 300, 3: 500, 4: 700, 5: 800, 6: 1000, 7: 1200, 8: 1350, 9: 1500 };
const hz = (deg) => D4 * Math.pow(2, CENTS[deg] / 1200);

// ---------- santur: two detuned courses, inharmonic partials, bright attack
function santur(t0, f, amp, len = 1.6, pan = 0) {
  const n = Math.floor(len * SR), i0 = at(t0);
  const parts = [[1, 1, 3.2], [2.003, 0.45, 5], [3.01, 0.25, 7], [4.03, 0.12, 10], [5.06, 0.06, 14]];
  const det = [1, 1.0025];
  for (let j = 0; j < n; j++) {
    const s = j / SR;
    let v = 0;
    for (const [m, a, d] of parts) for (const dt of det) v += Math.sin(TAU * f * m * dt * s) * a * Math.exp(-s * d);
    const click = j < 200 ? noise() * 0.25 * (1 - j / 200) : 0;
    put(i0 + j, (v * 0.5 + click) * amp * Math.min(1, j / 40), pan, 0.35);
  }
}
// riz: fast alternating-hammer tremolo across a long note
function riz(t0, f, dur, amp) {
  santur(t0, f, amp, Math.min(1.6, dur + 0.6));
  for (let s = 0.06, k = 0; s < dur - 0.04; s += 0.055, k++) santur(t0 + s, f, amp * (k % 2 ? 0.38 : 0.5) * (1 - 0.3 * s / dur), 0.35, k % 2 ? 0.15 : -0.15);
}

// ---------- tonbak
function tom(t0, amp = 0.8) {
  let ph = 0;
  for (let j = 0; j < SR * 0.45; j++) {
    const s = j / SR; ph += TAU * (70 + 90 * Math.exp(-s * 30)) / SR;
    put(at(t0) + j, (Math.sin(ph) * Math.exp(-s * 6) + (j < 120 ? noise() * 0.2 : 0)) * amp, 0, 0.08);
  }
}
function bak(t0, amp = 0.35) {
  let lp = 0, prev = 0, hp = 0;
  for (let j = 0; j < SR * 0.09; j++) {
    const s = j / SR, n = noise(); hp = 0.6 * (hp + n - prev); prev = n; lp += 0.4 * (hp - lp);
    put(at(t0) + j, (lp * 1.4 + Math.sin(TAU * 820 * s) * 0.4) * Math.exp(-s * 55) * amp, 0.1, 0.15);
  }
}
function jingle(t0, amp = 0.07) {
  let prev = 0, hp = 0;
  for (let j = 0; j < SR * 0.16; j++) {
    const s = j / SR, n = noise(); hp = 0.92 * (hp + n - prev); prev = n;
    put(at(t0) + j, hp * Math.exp(-s * 22) * (1 + 0.5 * Math.sin(s * 900)) * amp, -0.3, 0.2);
  }
}
function boom(t0, amp = 1) {
  let ph = 0, lp = 0;
  for (let j = 0; j < SR * 1.6; j++) {
    const s = j / SR; ph += TAU * (38 + 70 * Math.exp(-s * 9)) / SR; lp += 0.05 * (noise() - lp);
    put(at(t0) + j, (Math.sin(ph) * Math.exp(-s * 2.6) + lp * 2 * Math.exp(-s * 5)) * amp, 0, 0.3);
  }
}
function riser(t0, t1, amp = 0.2) {
  let lp = 0;
  for (let i = at(t0); i < at(t1); i++) {
    const x = (i - at(t0)) / (at(t1) - at(t0)); lp += (0.02 + 0.3 * x) * (noise() - lp);
    put(i, lp * x * x * amp * 3, 0, 0.4);
  }
}

// ---------- tanbur drone (D2 + A2), slow pulse
function drone(t0, t1) {
  const f = [73.42, 110.0, 146.83];
  for (let i = at(t0); i < Math.min(N, at(t1)); i++) {
    const s = i / SR, env = Math.min(1, (s - t0) / 2) * Math.min(1, (t1 - s) / 1.5);
    let v = 0;
    f.forEach((fr, k) => { for (let h = 1; h <= 5; h++) v += Math.sin(TAU * fr * h * s + k) / (h * h) * (k === 2 ? 0.4 : 1); });
    v *= 0.55 + 0.45 * Math.pow(Math.sin(TAU * s / (TL.BAR * 2)) * 0.5 + 0.5, 2);
    put(i, v * 0.045 * env, 0, 0.3);
  }
}

// ---------- score (durations in eighth notes, 6 per bar)
const A = [
  [3, 2], [2, 1], [1, 2], [2, 1],
  [3, 3], [4, 3],
  [5, 1], [4, 1], [3, 1], [2, 2], [3, 1],
  [2, 3], [1, 3],
  [0, 1], [1, 1], [2, 1], [3, 2], [2, 1],
  [1, 2], [2, 1], [3, 3],
  [2, 1], [1, 1], [0, 1], [1, 2], [0, 1],
  [0, 6],
];
const B = [
  [7, 2], [6, 1], [5, 2], [6, 1],
  [7, 3], [8, 3],
  [7, 1], [8, 1], [9, 1], [8, 2], [7, 1],
  [4, 6],
  [4, 1], [5, 1], [4, 1], [3, 2], [2, 1],
  [3, 2], [4, 1], [3, 3],
  [2, 1], [3, 1], [2, 1], [1, 2], [2, 1],
  [1, 3], [0, 3],
];
const E = TL.EIGHTH;
let t = TL.MELODY_IN;
const song = [A, B, A, B, A, B];
for (let ph = 0; ph < song.length && t < TL.FINAL_HIT - 0.01; ph++) {
  for (const [deg, d] of song[ph]) {
    if (t >= TL.FINAL_HIT - 0.01) break;
    const amp = 0.16 * (ph >= 2 ? 1.1 : 1);
    if (d >= 3) riz(t, hz(deg), d * E, amp); else santur(t, hz(deg), amp * (d === 1 ? 0.85 : 1));
    // lower-octave doubling on downbeats from the second pass
    if (ph >= 2 && Math.abs(((t - TL.MELODY_IN) / TL.BAR) % 1) < 1e-6) santur(t, hz(deg) / 2, amp * 0.5, 1.2, -0.3);
    t += d * E;
  }
}

// rhythm: 6/8 tonbak  (tom . bak tom . bak) + daf jingles
for (let b = 0; b * TL.BAR < TL.FINAL_HIT - 0.01; b++) {
  const bt = b * TL.BAR;
  if (bt < 1.2) { if (bt === 0) { bak(0.6, 0.2); bak(0.8, 0.25); bak(1.0, 0.3); } continue; }
  const busy = bt >= 18 && bt < 48;
  tom(bt, 0.55);
  bak(bt + 2 * E, 0.32);
  tom(bt + 3 * E, 0.35);
  bak(bt + 5 * E, 0.3);
  if (busy) { bak(bt + 1 * E, 0.14); bak(bt + 4 * E, 0.16); }
  if (bt >= 6) { jingle(bt + 1.5 * E); jingle(bt + 4.5 * E); }
  if (b % 4 === 3) { bak(bt + 5.5 * E, 0.22); }
}

drone(0, TL.DUR);
boom(TL.VS_HIT, 0.6);
riser(1.2, TL.VS_HIT, 0.25);
TL.CUTS.forEach((c) => { boom(c, 0.25); jingle(c, 0.12); });
riser(53.0, 55.2, 0.2);
// finale: D chord on santur + big hit
boom(TL.FINAL_HIT, 0.6);
[[0, 0.2], [4, 0.16], [7, 0.16], [-2, 0.12]].forEach(([d, a]) => riz(TL.FINAL_HIT, hz(d), 1.2, a));
santur(TL.FINAL_HIT, hz(0) / 2, 0.2, 2.0);

// ---------- reverb (feedback comb + allpass), mix, normalize
function reverb(src) {
  const out = new Float32Array(N);
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => ({ d, buf: new Float32Array(d), i: 0, lp: 0 }));
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (const c of combs) { const y = c.buf[c.i]; c.lp = y * 0.7 + c.lp * 0.3; c.buf[c.i] = src[i] + c.lp * 0.84; c.i = (c.i + 1) % c.d; s += y; }
    out[i] = s / combs.length;
  }
  for (const d of [225, 556, 441]) { const buf = new Float32Array(d); let k = 0; for (let i = 0; i < N; i++) { const b = buf[k]; const y = -out[i] + b; buf[k] = out[i] + b * 0.5; k = (k + 1) % d; out[i] = y; } }
  return out;
}
const wet = reverb(SEND);
let peak = 0;
for (let i = 0; i < N; i++) { L[i] += wet[i] * 0.9; R[i] += wet[i] * 0.9; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
const fadeIn = at(0.05), fadeOut = at(1.5);
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
const g = 0.89 / peak;
for (let i = 0; i < N; i++) {
  const env = Math.min(1, i / fadeIn) * Math.min(1, (N - i) / fadeOut);
  const sat = (x) => Math.tanh(x * 1.2) / Math.tanh(1.2);
  buf.writeInt16LE(Math.round(sat(L[i] * g) * env * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(sat(R[i] * g) * env * 32767), 46 + i * 4);
}
fs.writeFileSync(path.join(__dirname, 'soundtrack.wav'), buf);
console.log('wrote soundtrack.wav', TL.DUR + 's, peak', peak.toFixed(2));
