// Original soft electronic score + synced SFX, synthesized offline -> soundtrack.wav
// 120 BPM, A minor (Am – F – C – G, one chord per 2s bar). All hits come from timeline.js.
const fs = require('fs');
const path = require('path');
const TL = require('./timeline.js');

const SR = 48000, N = Math.floor(SR * TL.DUR), TAU = Math.PI * 2;
const L = new Float32Array(N), R = new Float32Array(N), SEND = new Float32Array(N), DUCK = new Float32Array(N).fill(1);
let seed = 11;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const noise = () => rand() * 2 - 1;
const at = (t) => Math.floor(t * SR);
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function put(i, v, pan = 0, send = 0.2, duck = false) {
  if (i < 0 || i >= N) return;
  if (duck) v *= DUCK[i];
  L[i] += v * Math.min(1, 1 - pan); R[i] += v * Math.min(1, 1 + pan); SEND[i] += v * send;
}
// state-variable filter
function svf() { let lo = 0, bp = 0; return (x, fc, q = 0.7) => { const f = 2 * Math.sin(Math.PI * Math.min(fc, SR / 6) / SR); lo += f * bp; const hi = x - lo - q * bp; bp += f * hi; return { lo, bp, hi }; }; }

const BEAT = 60 / TL.BPM;
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // Am F C G
const chordAt = (t) => CHORDS[Math.floor(t / (BEAT * 4)) % 4];

// ---------- drums
const kicks = [];
for (let t = 3; t < 14.6; t += BEAT) if (!(t > 11.45 && t < 12)) kicks.push(t);
// sidechain envelope first so pad/bass can duck under the kick
for (const t of kicks) for (let j = 0; j < SR * 0.3; j++) { const i = at(t) + j; if (i < N) DUCK[i] = Math.min(DUCK[i], 1 - 0.55 * Math.exp(-j / SR * 9)); }
function kick(t0, amp = 0.75) {
  let ph = 0;
  for (let j = 0; j < SR * 0.35; j++) {
    const s = j / SR; ph += TAU * (48 + 110 * Math.exp(-s * 38)) / SR;
    put(at(t0) + j, (Math.sin(ph) * Math.exp(-s * 9) + (j < 90 ? noise() * 0.15 * (1 - j / 90) : 0)) * amp, 0, 0.03);
  }
}
function clap(t0, amp = 0.22) {
  const f = svf();
  for (let j = 0; j < SR * 0.22; j++) {
    const s = j / SR, env = (s < 0.03 ? Math.exp(-((s % 0.01) * 300)) : 1) * Math.exp(-s * 22);
    put(at(t0) + j, f(noise(), 1600, 1.2).bp * env * amp * 2.2, 0.05, 0.35);
  }
}
function hat(t0, amp = 0.06, open = false) {
  let prev = 0, hp = 0;
  for (let j = 0; j < SR * (open ? 0.18 : 0.05); j++) {
    const s = j / SR, n = noise(); hp = 0.88 * (hp + n - prev); prev = n;
    put(at(t0) + j, hp * Math.exp(-s * (open ? 18 : 70)) * amp, 0.25, 0.1);
  }
}
for (const t of kicks) kick(t, t >= 12 ? 0.55 : 0.42);
for (let t = 6 + BEAT; t < 14.6; t += BEAT * 2) if (!(t > 11.4 && t < 12)) clap(t);
for (let t = 3 + BEAT / 2; t < 14.6; t += BEAT) if (!(t > 11.5 && t < 12)) hat(t, 0.07, (Math.round((t - 3) / BEAT * 2) % 4) === 3);
for (let t = 9; t < 11.5; t += BEAT / 2) hat(t + BEAT / 4, 0.035);

// ---------- pad: detuned saws through a slow low-pass, swelling with the story
{
  const fL = svf(), fR = svf();
  const ph = new Float64Array(12);
  for (let i = 0; i < N; i++) {
    const t = i / SR, ch = chordAt(t);
    const level = 0.05 + 0.05 * Math.min(1, t / 3) + (t > 12 ? 0.03 : 0);
    const fade = t > TL.DUR - 0.6 ? (TL.DUR - t) / 0.6 : 1;
    let l = 0, r = 0;
    for (let k = 0; k < 3; k++) for (let d = 0; d < 4; d++) {
      const idx = k * 4 + d;
      const f = mtof(ch[k] - 12 + (d === 3 ? 12 : 0)) * (1 + (d - 1.5) * 0.004);
      ph[idx] = (ph[idx] + f / SR) % 1;
      const v = ph[idx] * 2 - 1;
      if (d % 2) l += v; else r += v;
    }
    const cut = 700 + 900 * (0.5 + 0.5 * Math.sin(t * 0.8)) + (t > 9 ? 900 : 0) + (t > 12 ? 600 : 0);
    const amp = level * fade * Math.min(1, t / 0.8) * (0.45 + 0.55 * DUCK[i]);
    const lo = fL(l, cut).lo * amp * 0.35, ro = fR(r, cut).lo * amp * 0.35;
    L[i] += lo; R[i] += ro; SEND[i] += (lo + ro) * 0.25;
  }
}
// ---------- sub bass on roots, 8th-note pulse from 3s
{
  let ph = 0;
  for (let i = at(3); i < N; i++) {
    const t = i / SR;
    if (t > 11.5 && t < 12) continue;
    const root = chordAt(t)[0] - 24;
    ph += TAU * mtof(root) / SR;
    const s8 = ((t - 3) % (BEAT / 2)) / (BEAT / 2);
    const env = Math.exp(-s8 * 3) * 0.8 + 0.2;
    const fade = t > TL.DUR - 0.5 ? (TL.DUR - t) / 0.5 : 1;
    const v = (Math.sin(ph) + 0.25 * Math.sin(2 * ph)) * env * 0.2 * fade;
    put(i, v, 0, 0, true);
  }
}
// ---------- pluck arp (lift from 9s)
function pluck(t0, f, amp, pan) {
  const flt = svf();
  let ph = 0;
  for (let j = 0; j < SR * 0.35; j++) {
    const s = j / SR; ph = (ph + f / SR) % 1;
    const v = flt(ph * 2 - 1 + (ph < 0.5 ? 0.4 : -0.4), 600 + 4500 * Math.exp(-s * 18), 0.4).lo;
    put(at(t0) + j, v * Math.exp(-s * 9) * amp, pan, 0.4);
  }
}
for (let n = 0, t = 9; t < 14.2; t += BEAT / 2, n++) {
  if (t > 11.5 && t < 12) continue;
  const ch = chordAt(t), notes = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 24];
  pluck(t, mtof(notes[n % 4]), t >= 12 ? 0.07 : 0.09, n % 2 ? 0.35 : -0.35);
}

// ---------- SFX
function whoosh(t0, dur, amp = 0.25, up = true) {
  const f = svf();
  for (let j = 0; j < SR * dur; j++) {
    const x = j / (SR * dur), env = Math.sin(Math.PI * Math.pow(x, up ? 0.7 : 0.4));
    const fc = up ? 300 + 5000 * x * x : 5000 - 4500 * x;
    put(at(t0) + j, f(noise(), fc, 0.6).bp * env * amp, (x - 0.5) * 0.8, 0.3);
  }
}
function click(t0, amp = 0.75) {
  for (let j = 0; j < SR * 0.04; j++) {
    const s = j / SR;
    const v = Math.sin(TAU * 3200 * s) * Math.exp(-s * 900) + Math.sin(TAU * 1300 * s) * Math.exp(-s * 300) * 0.6 + (j < 40 ? noise() * 0.5 : 0);
    put(at(t0) + j, v * amp, 0.1, 0.08);
  }
}
function key(t0, amp) {
  const f = svf(), tone = 1800 + rand() * 900;
  for (let j = 0; j < SR * 0.035; j++) {
    const s = j / SR;
    put(at(t0) + j, (f(noise(), 4000, 0.8).hi * 0.6 + Math.sin(TAU * tone * s) * 0.4) * Math.exp(-s * 160) * amp, -0.15 + rand() * 0.3, 0.05);
  }
}
function bell(t0, f, amp = 0.15, dec = 4, pan = 0) {
  for (let j = 0; j < SR * 1.2; j++) {
    const s = j / SR;
    const v = Math.sin(TAU * f * s + 1.8 * Math.exp(-s * 6) * Math.sin(TAU * f * 3.5 * s)) * Math.exp(-s * dec) * Math.min(1, j / 60);
    put(at(t0) + j, v * amp, pan, 0.5);
  }
}
function blip(t0, f, amp = 0.12, pan = 0) {
  let ph = 0;
  for (let j = 0; j < SR * 0.18; j++) {
    const s = j / SR; ph += TAU * f * (1 + 0.5 * Math.exp(-s * 60)) / SR;
    put(at(t0) + j, (Math.sin(ph) + 0.3 * Math.sin(2 * ph)) * Math.exp(-s * 22) * amp * Math.min(1, j / 30), pan, 0.4);
  }
}
function impact(t0, amp = 0.9) {
  let ph = 0; const f = svf();
  for (let j = 0; j < SR * 2; j++) {
    const s = j / SR; ph += TAU * (36 + 80 * Math.exp(-s * 10)) / SR;
    put(at(t0) + j, (Math.sin(ph) * Math.exp(-s * 2.4) * 0.9 + f(noise(), 900 * Math.exp(-s * 3) + 200, 0.7).lo * Math.exp(-s * 4) * 0.8) * amp, 0, 0.45);
  }
}
function riser(t0, t1, amp = 0.2) {
  const f = svf(); let ph = 0;
  for (let i = at(t0); i < at(t1); i++) {
    const x = (i - at(t0)) / (at(t1) - at(t0));
    ph += TAU * (200 + 900 * x * x) / SR;
    put(i, (f(noise(), 400 + 7000 * x * x, 0.5).bp * 1.5 + Math.sin(ph) * 0.15) * x * x * amp, 0, 0.5);
  }
}
function sparkle(t0, dur, count, amp = 0.05) {
  const scale = [81, 84, 86, 88, 91, 93, 96];
  for (let k = 0; k < count; k++) bell(t0 + rand() * dur, mtof(scale[Math.floor(rand() * scale.length)]), amp * (0.6 + rand() * 0.4), 7, rand() * 1.4 - 0.7);
}

// scene 1: lines flowing in, cursor pops
for (let j = 0; j < 8; j++) whoosh(TL.linesIn + j * 0.085 + 0.1, 0.9, 0.05, true);
sparkle(0.9, 1.1, 8, 0.035);
bell(TL.cursorPop, mtof(76), 0.18, 3); bell(TL.cursorPop + 0.02, mtof(83), 0.1, 4, 0.3);
// transitions
whoosh(2.72, 0.42, 0.3); whoosh(5.72, 0.36, 0.3); riser(8.4, 9.3, 0.16); riser(11.0, 12.0, 0.28); whoosh(11.75, 0.3, 0.25);
// scene 2: clicks, typing, popup
for (const t of TL.clicks) click(t);
for (let c = 0; c < TL.typeText.length; c++) if (TL.typeText[c] !== ' ' || c % 2) key(TL.typeStart + c * TL.typeRate + (rand() - 0.5) * 0.008, 0.3 + rand() * 0.1);
whoosh(TL.popup - 0.05, 0.3, 0.16, false); blip(TL.popup + 0.05, mtof(81), 0.1);
bell(TL.clicks[2] + 0.04, mtof(88), 0.08, 5);
// scene 3: a soft pentatonic blip as each person connects
const PENTA = [69, 72, 74, 76, 79, 81, 84, 86];
for (let k = 0; k < TL.people; k++) blip(TL.arrive(k), mtof(PENTA[k % PENTA.length]), 0.07, ((k * 5) % 7) / 3.5 - 1);
// scene 4: squeeze, burst, sparks fly out to the people
impact(TL.burst, 0.55); sparkle(TL.burst, 0.8, 14, 0.05);
for (const w of TL.sparkWaves) { whoosh(w, TL.sparkTravel, 0.12, false); sparkle(w + TL.sparkTravel, 0.15, 6, 0.04); }
// scene 5: logo hit, shine glint, final pulse
impact(TL.logoHit, 1.0); bell(TL.logoHit, mtof(69), 0.12, 1.2); bell(TL.logoHit, mtof(76), 0.08, 1.2, 0.3);
whoosh(TL.wordmark, 0.5, 0.08, true);
bell(TL.shine + 0.2, mtof(96), 0.06, 5, 0.4);
blip(TL.handle, mtof(84), 0.07);
bell(TL.pulse2, mtof(81), 0.07, 2.2); sparkle(TL.pulse2, 0.5, 5, 0.03);

// ---------- reverb (Schroeder) on the send bus
{
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ b: new Float32Array(Math.floor(d * SR / 44100)), i: 0 }));
  const aps = [225, 556].map((d) => ({ b: new Float32Array(Math.floor(d * SR / 44100)), i: 0 }));
  for (let i = 0; i < N; i++) {
    let y = 0;
    for (const c of combs) { const o = c.b[c.i]; c.b[c.i] = SEND[i] * 0.5 + o * 0.8; c.i = (c.i + 1) % c.b.length; y += o; }
    for (const a of aps) { const o = a.b[a.i], v = -y * 0.5 + o; a.b[a.i] = y + o * 0.5; a.i = (a.i + 1) % a.b.length; y = v; }
    L[i] += y * 0.18; R[i] += y * 0.18 * 0.97;
  }
}

// ---------- master: soft clip, normalise, 16-bit WAV
let peak = 0;
for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * 1.2); R[i] = Math.tanh(R[i] * 1.2); peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
const g = 0.89 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
}
fs.writeFileSync(path.join(__dirname, 'soundtrack.wav'), buf);
console.log('wrote soundtrack.wav', (N / SR).toFixed(1) + 's', 'peak', peak.toFixed(2));
