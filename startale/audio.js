// Original score + sound design, synthesized offline -> soundtrack.wav
// 120 BPM cinematic electronic in F minor (Fm–Db–Ab–Eb), hits synced to timeline.js.
const fs = require('fs');
const path = require('path');
const TL = require('./timeline.js');

const SR = 48000, N = Math.floor(SR * TL.DUR), TAU = Math.PI * 2;
// two buses: MUS gets sidechain-ducked by the kick, FX doesn't; SEND feeds the reverb
const ML = new Float32Array(N), MR = new Float32Array(N), FL = new Float32Array(N), FR = new Float32Array(N), SEND = new Float32Array(N);
let seed = 11;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const noise = () => rand() * 2 - 1;
const at = (t) => Math.floor(t * SR);
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function put(i, v, pan = 0, send = 0.15, mus = false) {
  if (i < 0 || i >= N) return;
  const l = v * Math.min(1, 1 - pan), r = v * Math.min(1, 1 + pan);
  if (mus) { ML[i] += l; MR[i] += r; } else { FL[i] += l; FR[i] += r; }
  SEND[i] += v * send;
}

// ---------- drums
const KICKS = [];
function kick(t0, amp = 1) {
  KICKS.push(t0);
  let ph = 0;
  for (let j = 0; j < SR * 0.5; j++) {
    const s = j / SR; ph += TAU * (46 + 130 * Math.exp(-s * 28)) / SR;
    put(at(t0) + j, (Math.tanh(Math.sin(ph) * 1.6) * Math.exp(-s * 6.5) + (j < 90 ? noise() * 0.4 * (1 - j / 90) : 0)) * amp, 0, 0.02);
  }
}
function clap(t0, amp = 0.45) {
  let lp = 0, prev = 0, hp = 0;
  for (let j = 0; j < SR * 0.3; j++) {
    const s = j / SR, n = noise(); hp = 0.75 * (hp + n - prev); prev = n; lp += 0.5 * (hp - lp);
    const env = (s < 0.03 ? (Math.floor(s / 0.01) % 2 ? 0.6 : 1) : 1) * Math.exp(-s * 14);
    put(at(t0) + j, lp * env * amp, 0.05, 0.35);
  }
}
function hat(t0, amp = 0.12, len = 0.05, pan = 0.25) {
  let prev = 0, hp = 0;
  for (let j = 0; j < SR * len * 3; j++) {
    const s = j / SR, n = noise(); hp = 0.97 * (hp + n - prev); prev = n;
    put(at(t0) + j, hp * Math.exp(-s / len * 2.5) * amp, pan, 0.06);
  }
}
function crash(t0, amp = 0.3, len = 2.2) {
  let prev = 0, hp = 0;
  for (let j = 0; j < SR * len; j++) {
    const s = j / SR, n = noise(); hp = 0.9 * (hp + n - prev); prev = n;
    const v = hp * Math.exp(-s * 2.2) * (1 + 0.3 * Math.sin(TAU * 5300 * s)) * amp;
    put(at(t0) + j, v, (j % 2 ? 0.4 : -0.4), 0.3);
  }
}

// ---------- tonal
function bass(t0, f, dur, amp = 0.32) {
  for (let j = 0; j < SR * dur; j++) {
    const s = j / SR, env = Math.min(1, s / 0.005) * Math.exp(-s * 5) * (s > dur - 0.02 ? (dur - s) / 0.02 : 1);
    let v = 0; for (let k = 1; k <= 7; k++) v += Math.sin(TAU * f * k * s) / k * Math.exp(-s * k * 3);
    put(at(t0) + j, Math.tanh(v * 1.4) * env * amp, 0, 0.03, true);
  }
}
function sub(t0, f, dur, amp = 0.3) {
  for (let j = 0; j < SR * dur; j++) {
    const s = j / SR, env = Math.min(1, s / 0.01) * Math.min(1, (dur - s) / 0.05);
    put(at(t0) + j, Math.sin(TAU * f * s) * env * amp, 0, 0, true);
  }
}
function pad(t0, notes, dur, amp = 0.05, att = 0.5, rel = 0.9) {
  const det = [-0.12, 0, 0.11];
  for (let j = 0; j < SR * (dur + rel); j++) {
    const s = j / SR, env = Math.min(1, s / att) * (s > dur ? Math.exp(-(s - dur) / rel * 3) : 1);
    let l = 0, r = 0;
    for (const m of notes) for (let d = 0; d < 3; d++) {
      const f = mtof(m + det[d]);
      let v = 0; for (let k = 1; k <= 5; k++) v += Math.sin(TAU * f * k * s + d * 1.7) / Math.pow(k, 1.6);
      if (d === 0) l += v; else if (d === 2) r += v; else { l += v * 0.6; r += v * 0.6; }
    }
    const i = at(t0) + j; if (i >= N) break;
    ML[i] += l * env * amp; MR[i] += r * env * amp; SEND[i] += (l + r) * env * amp * 0.4;
  }
}
function pluck(t0, m, amp = 0.09, pan = 0) {
  const f = mtof(m);
  for (let j = 0; j < SR * 0.45; j++) {
    const s = j / SR;
    let v = 0; for (let k = 1; k <= 6; k++) v += Math.sin(TAU * f * k * s) * Math.exp(-s * (6 + k * 7)) / k;
    put(at(t0) + j, v * amp * Math.min(1, j / 30), pan, 0.4, true);
  }
}

// ---------- sound design
function boom(t0, amp = 1) {
  let ph = 0, prev = 0, hp = 0;
  for (let j = 0; j < SR * 2.6; j++) {
    const s = j / SR; ph += TAU * (30 + 45 * Math.exp(-s * 5)) / SR;
    const n = noise(); hp = 0.5 * (hp + n - prev); prev = n;
    const v = Math.tanh(Math.sin(ph) * 2) * Math.exp(-s * 1.4) * 0.9 + hp * Math.exp(-s * 18) * 0.6;
    put(at(t0) + j, v * amp, 0, 0.25);
  }
}
function riser(t0, t1, amp = 0.25) {
  let lp = 0, ph = 0;
  for (let j = 0; j < SR * (t1 - t0); j++) {
    const s = j / SR, k = s / (t1 - t0);
    lp += (0.02 + 0.5 * k * k) * (noise() - lp); ph += TAU * (180 + 1400 * k * k) / SR;
    put(at(t0) + j, (lp * 0.8 + Math.sin(ph) * 0.15 * k) * Math.pow(k, 2.2) * amp, Math.sin(s * 9) * 0.4 * k, 0.3);
  }
}
function whoosh(tc, amp = 0.35, w = 0.35, pan = 0) {
  let lp = 0, lp2 = 0;
  for (let j = 0; j < SR * w * 2; j++) {
    const s = j / SR - w, x = s / w, env = Math.exp(-x * x * 4) * (s < 0 ? 1 : Math.exp(-s * 5));
    const c = 0.03 + 0.25 * env; lp += c * (noise() - lp); lp2 += c * (lp - lp2);
    put(at(tc - w) + j, lp2 * env * amp * 2.5, pan + x * 0.5, 0.3);
  }
}
function reverse(t0, t1, amp = 0.3) {
  let lp = 0;
  for (let j = 0; j < SR * (t1 - t0); j++) {
    const s = j / SR, k = s / (t1 - t0); lp += 0.2 * (noise() - lp);
    put(at(t0) + j, lp * Math.pow(k, 4) * amp, 0, 0.6);
  }
}
function shimmer(t0, amp = 0.05, notes = [77, 80, 84, 87, 89, 92, 96]) {
  notes.forEach((m, i) => {
    const f = mtof(m), d = 0.02 * i;
    for (let j = 0; j < SR * 1.6; j++) {
      const s = j / SR; put(at(t0 + d) + j, Math.sin(TAU * f * s) * Math.exp(-s * 2.2) * Math.min(1, j / 200) * amp, i % 2 ? 0.5 : -0.5, 0.6);
    }
  });
}
function clink(t0, amp = 0.25, base = 1900) {
  const parts = [[1, 1, 9], [2.76, 0.6, 14], [5.4, 0.35, 20], [8.93, 0.2, 28]];
  for (let j = 0; j < SR * 0.8; j++) {
    const s = j / SR; let v = 0; for (const [m, a, d] of parts) v += Math.sin(TAU * base * m * s) * a * Math.exp(-s * d);
    put(at(t0) + j, v * amp, 0.1, 0.4);
  }
}
function tick(t0, amp = 0.08, f = 2600) { for (let j = 0; j < SR * 0.03; j++) { const s = j / SR; put(at(t0) + j, Math.sin(TAU * f * s) * Math.exp(-s * 160) * amp, 0.2, 0.15); } }
function lock(t0, amp = 0.35) {
  for (let j = 0; j < SR * 0.12; j++) { const s = j / SR; put(at(t0) + j, (noise() * Math.exp(-s * 120) * 0.6 + Math.sin(TAU * 900 * s) * Math.exp(-s * 50)) * amp, 0, 0.2); }
  clink(t0 + 0.02, 0.08, 1200);
}

// ---------- arrangement
const PROG = [[41, [65, 68, 72]], [37, [65, 68, 73]], [44, [68, 72, 75]], [39, [67, 70, 75]]];  // Fm Db Ab Eb
const ARP = [0, 1, 2, 1, 0, 2, 1, 2];
const chordAt = (t) => PROG[Math.floor(Math.max(0, t - TL.DROP) / 2) % 4];
const inBeat = (t) => t >= TL.DROP && t < TL.BEAT_END && !(t >= TL.BEAT_OFF[0] && t < TL.BEAT_OFF[1]);

// intro 0–4
pad(0, [41, 48, 53, 56], 3.6, 0.035, 1.5, 0.6);
sub(0.2, mtof(29), 2.3, 0.18);
riser(0.2, TL.LOGO_HIT, 0.22);
for (let i = 0; i < 8; i++) tick(1.4 + i * 0.1, 0.12, 1800 + i * 150);
boom(TL.LOGO_HIT, 1); crash(TL.LOGO_HIT, 0.25); shimmer(TL.LOGO_HIT, 0.045);
reverse(3.0, TL.DROP, 0.35);

// main groove 4–36
boom(TL.DROP, 0.9); crash(TL.DROP, 0.35); shimmer(TL.DROP, 0.04, [72, 77, 80, 84, 89]);
for (let t = TL.DROP; t < TL.BEAT_END - 1e-6; t += TL.BEAT) {
  const b = Math.round((t - TL.DROP) / TL.BEAT);
  if (!inBeat(t)) continue;
  kick(t, 0.95);
  if (b % 2 === 1) clap(t);
  hat(t + 0.25, 0.14, 0.06);
  if (t >= 6) { hat(t + 0.125, 0.05, 0.03, -0.3); hat(t + 0.375, 0.05, 0.03, -0.3); }
  const [root] = chordAt(t);
  bass(t + 0.25, mtof(root), 0.22, 0.34);
  if (b % 4 === 3) bass(t + 0.375, mtof(root + 12), 0.1, 0.18);
}
for (let t = TL.DROP; t < TL.BEAT_END + 2; t += 2) {
  const [, notes] = chordAt(t);
  const dark = t >= TL.BEAT_OFF[0] && t < TL.BEAT_OFF[1];
  pad(t, notes, 2, dark ? 0.03 : 0.022, 0.25, 0.6);
}
for (let t = 6; t < TL.BEAT_END + 3; t += 0.125) {
  if (t >= TL.BEAT_OFF[0] && t < TL.BEAT_OFF[1]) continue;
  const i = Math.round((t - 6) / 0.125), [, notes] = chordAt(Math.min(t, TL.BEAT_END - 0.1));
  const tail = t >= TL.BEAT_END ? Math.max(0, 1 - (t - TL.BEAT_END) / 3) * (i % 2 ? 0 : 1) : 1;
  if (tail <= 0) continue;
  pluck(t, notes[ARP[i % 8]] + (i % 16 >= 8 ? 12 : 0), 0.07 * tail, Math.sin(i * 0.7) * 0.5);
}

// sync points
TL.WHOOSH.forEach((w, i) => whoosh(w, 0.4, 0.32, i % 2 ? 0.3 : -0.3));
boom(14.0, 0.35);
shimmer(TL.SWAP_BURST, 0.06); boom(TL.SWAP_BURST, 0.45); clink(TL.SWAP_BURST, 0.12, 2400);
{ const [a, b, n] = TL.COUNT1; for (let i = 0; i < 10; i++) tick(a + (b - a) * (1 - Math.pow(1 - i / 10, 2)), 0.09, 2400 + i * 60); clink(b, 0.15, 2100); }
clink(21.0, 0.12, 2200);
clink(TL.COIN_DROP, 0.3, 1500); boom(TL.COIN_DROP, 0.7); shimmer(TL.COIN_DROP + 0.05, 0.04, [80, 84, 87, 92]);
for (let i = 0; i < 14; i++) tick(TL.DIAL[0] + (TL.DIAL[1] - TL.DIAL[0]) * eioA(i / 14), 0.07, 1500);
lock(TL.DIAL[1]);
{ const [a, b] = TL.COUNT2; for (let i = 0; i < 16; i++) tick(a + (b - a) * (1 - Math.pow(1 - i / 16, 2)), 0.08, 2300 + i * 50); clink(b, 0.18, 2100); shimmer(b, 0.035); }
function eioA(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

// build + big hit
riser(25.0, TL.DARK_HIT, 0.3);
reverse(26.2, TL.DARK_HIT, 0.3);
boom(TL.DARK_HIT, 0.8); crash(TL.DARK_HIT, 0.2);
sub(TL.DARK_HIT, mtof(29), 0.95, 0.22);
for (let k = 0; k < 16; k++) { const t = TL.DARK_HIT + 0.9 * (1 - Math.pow(1 - k / 16, 1.6)); clap(t, 0.12 + 0.3 * k / 16); }
riser(27.0, TL.BIG_HIT - 0.04, 0.32);
boom(TL.BIG_HIT, 1.3); crash(TL.BIG_HIT, 0.4); shimmer(TL.BIG_HIT, 0.07, [65, 72, 77, 80, 84, 89, 92, 96]);

// outro
riser(34.9, TL.END_HIT, 0.18);
boom(TL.END_HIT, 0.7); crash(TL.END_HIT, 0.3); shimmer(TL.END_HIT, 0.05, [77, 80, 84, 89, 92]);
pad(TL.END_HIT, [53, 60, 65, 68, 72], 3.4, 0.03, 0.4, 0.8);

// ---------- mix: sidechain, Schroeder reverb, soft clip
const duck = new Float32Array(N).fill(1);
for (const k of KICKS) for (let j = 0; j < SR * 0.4; j++) { const i = at(k) + j; if (i < N) duck[i] = Math.min(duck[i], 1 - 0.65 * Math.exp(-(j / SR) / 0.09)); }
function reverb(src, off) {
  const outp = new Float32Array(N);
  for (const [d, fb] of [[1557, 0.84], [1617, 0.83], [1491, 0.85], [1422, 0.84], [1277, 0.83], [1356, 0.84]]) {
    const D = Math.floor(d * 1.6) + off, buf = new Float32Array(D); let lp = 0;
    for (let i = 0; i < N; i++) { const y = buf[i % D]; lp = y * 0.6 + lp * 0.4; buf[i % D] = src[i] + lp * fb; outp[i] += y; }
  }
  for (const d of [556, 441]) {
    const D = d + off, buf = new Float32Array(D);
    for (let i = 0; i < N; i++) { const b = buf[i % D], x = outp[i]; outp[i] = -x + b; buf[i % D] = x + b * 0.5; }
  }
  return outp;
}
const RL = reverb(SEND, 0), RR = reverb(SEND, 23);
const L = new Float32Array(N), R = new Float32Array(N);
let peak = 0;
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, (TL.DUR - i / SR) / 1.2);
  L[i] = Math.tanh((ML[i] * duck[i] + FL[i] + RL[i] * 0.05) * 1.1) * fade;
  R[i] = Math.tanh((MR[i] * duck[i] + FR[i] + RR[i] * 0.05) * 1.1) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const g = 0.95 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4); }
fs.writeFileSync(path.join(__dirname, 'soundtrack.wav'), buf);
console.log('wrote soundtrack.wav, peak', peak.toFixed(3));
