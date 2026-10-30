# Original score + sound design for "What can developers build on Seismic?" -> out/mix.wav
# F lydian / D minor colour, 120 BPM (bar = 2 s), driven by timeline.js. Music is synthesized here (numpy only);
# foley/impacts are Mixkit SFX (free licence) from the video-shotcraft library, placed on picture events.
import json, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.loads(subprocess.check_output(['node', '-e', 'process.stdout.write(JSON.stringify(require("./timeline.js")))'], cwd=HERE))
SFX_DIR = os.environ.get('SFX_DIR', '/home/user/vincentwei1021/video-shotcraft/assets/audio/sfx')
SR = 48000
DUR = TL['DUR']
N = int(SR * DUR)
BEAT, BAR = TL['BEAT'], TL['BAR']
S = TL['SCENES']
rng = np.random.default_rng(7)
TAU = 2 * np.pi

def at(t): return int(round(t * SR))
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)

music = np.zeros((2, N)); send = np.zeros((2, N)); sfx = np.zeros((2, N))

def add(buf, x, t, gain=1.0, pan=0.0):
    """mono or stereo x added at time t with equal-power pan"""
    i = at(t)
    if x.ndim == 1: x = np.stack([x * np.cos((pan + 1) * np.pi / 4), x * np.sin((pan + 1) * np.pi / 4)]) * np.sqrt(2)
    if i >= N: return
    j = min(N, i + x.shape[1])
    if i < 0: x = x[:, -i:]; j = min(N, x.shape[1]); i = 0
    buf[:, i:j] += x[:, : j - i] * gain

def env_adsr(n, a, d, s, r, sus_len):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    sl = max(0, int(sus_len * SR) - a - d)
    e = np.concatenate([np.linspace(0, 1, max(1, a)), np.linspace(1, s, max(1, d)), np.full(sl, s), np.linspace(s, 0, max(1, r))])
    return e[:n] if len(e) >= n else np.pad(e, (0, n - len(e)))

def saw(f, n, ph=0.0):
    t = np.arange(n) / SR
    return 2 * ((f * t + ph) % 1.0) - 1

# ---------- STFT filter with time-varying cutoff (fast sweeps without per-sample loops)
def lp(x, fc, q=2.0, hp=False):
    """x: (n,) ; fc: float or callable(t_seconds_array)->Hz"""
    n = len(x); F = 4096; H = 1024
    pad = np.pad(x, (F, F + H))
    win = np.hanning(F)
    nfr = (len(pad) - F) // H + 1
    idx = np.arange(F)[None, :] + H * np.arange(nfr)[:, None]
    fr = pad[idx] * win
    X = np.fft.rfft(fr, axis=1)
    freqs = np.fft.rfftfreq(F, 1 / SR)
    tc = (np.arange(nfr) * H + F / 2 - F) / SR
    cut = np.full(nfr, fc) if not callable(fc) else np.maximum(20, fc(tc))
    r = freqs[None, :] / cut[:, None]
    g = 1 / np.sqrt(1 + r ** (2 * q)) if not hp else 1 - 1 / np.sqrt(1 + r ** (2 * q))
    y = np.fft.irfft(X * g, n=F, axis=1) * win
    out = np.zeros(len(pad))
    np.add.at(out, idx, y) if False else None
    for k in range(nfr): out[k * H: k * H + F] += y[k]
    norm = np.zeros(len(pad)); w2 = win ** 2
    for k in range(nfr): norm[k * H: k * H + F] += w2
    out /= np.maximum(norm, 1e-6)
    return out[F: F + n]

# ---------- instruments
def braam(t0, root=26, dur=3.2, gain=0.6):
    """trailer brass hit: detuned saw cluster, filter blooms then closes"""
    n = int(dur * SR); x = np.zeros(n)
    for m, a in [(root, 1.0), (root + 12, 0.8), (root + 19, 0.55), (root + 24, 0.4), (root + 15, 0.35)]:
        for d in (-0.12, 0.0, 0.11):
            x += saw(mtof(m) * 2 ** (d / 12), n, rng.random()) * a
    tt = np.arange(n) / SR
    y = lp(x, lambda tc: 180 + 2600 * np.exp(-np.maximum(tc, 0) * 1.6) * np.minimum(1, np.maximum(tc, 0) / 0.05))
    e = np.minimum(1, tt / 0.02) * np.exp(-tt * 0.9)
    y = np.tanh(y * e * 0.25) * gain
    add(music, y, t0, 1.0, -0.1); add(music, np.roll(y, 300), t0, 1.0, 0.1); add(send, y, t0, 0.5)

def sub_boom(t0, f0=70, f1=32, dur=2.2, gain=0.9):
    n = int(dur * SR); tt = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-tt * 7)
    ph = TAU * np.cumsum(f) / SR
    y = (np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)) * np.exp(-tt * 1.6) * np.minimum(1, tt / 0.004)
    add(music, y * gain, t0)

def riser(t0, t1, gain=0.35, stop_hard=True):
    n = at(t1) - at(t0); tt = np.arange(n) / SR; u = tt / (t1 - t0)
    noise = rng.standard_normal(n)
    y = lp(noise, lambda tc: 300 + 9000 * np.clip(tc / (t1 - t0), 0, 1) ** 2.2, q=1.5)
    f = 110 * 2 ** (u * 3)
    tone = np.sin(TAU * np.cumsum(f) / SR) * 0.3 + np.sin(TAU * np.cumsum(f * 1.5) / SR) * 0.15
    e = u ** 2.4
    if not stop_hard: e *= np.minimum(1, (1 - u) / 0.05)
    y = (y * 0.8 + tone) * e * gain
    add(music, y, t0, 1.0, -0.3); add(music, np.roll(y, 480), t0, 1.0, 0.3); add(send, y, t0, 0.6)

def kick(t0, gain=0.8):
    n = int(0.5 * SR); tt = np.arange(n) / SR
    f = 45 + 120 * np.exp(-tt * 28)
    ph = TAU * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-tt * 7) + 0.3 * np.sin(2 * ph) * np.exp(-tt * 12)
    click = rng.standard_normal(200) * np.linspace(1, 0, 200) * 0.3
    y[:200] += click
    add(music, np.tanh(y * 1.4) * gain, t0)

def hat(t0, gain=0.12, dec=60, pan=0.25):
    n = int(0.12 * SR); tt = np.arange(n) / SR
    y = rng.standard_normal(n); y = np.diff(np.concatenate([[0], y])) # crude high-pass
    y = y * np.exp(-tt * dec)
    add(music, y * gain, t0, 1.0, pan); add(send, y * gain, t0, 0.15)

def clap(t0, gain=0.35):
    n = int(0.35 * SR); tt = np.arange(n) / SR
    y = rng.standard_normal(n)
    e = sum(np.exp(-np.maximum(tt - o, 0) * 60) * (tt >= o) for o in (0, 0.011, 0.023)) + 0.4 * np.exp(-tt * 12)
    y = lp(y * e, 3500, hp=False) - lp(y * e, 800)
    add(music, y * gain, t0); add(send, y * gain, t0, 0.8)

def tom(t0, f=90, gain=0.5):
    n = int(0.7 * SR); tt = np.arange(n) / SR
    fr = f * (1 + 0.6 * np.exp(-tt * 20)); ph = TAU * np.cumsum(fr) / SR
    y = np.sin(ph) * np.exp(-tt * 5) + rng.standard_normal(n) * 0.08 * np.exp(-tt * 30)
    add(music, y * gain, t0); add(send, y * gain, t0, 0.5)

def pluck(t0, m, gain=0.12, dec=9.0, cutoff=2400, pan=0.0):
    n = int(0.6 * SR); tt = np.arange(n) / SR
    x = saw(mtof(m), n) + 0.6 * saw(mtof(m) * 1.004, n, 0.3)
    e = np.exp(-tt * dec) * np.minimum(1, tt / 0.002)
    return x * e * gain, n

def bell(t0, m, gain=0.18, dur=3.0, pan=0.0):
    n = int(dur * SR); tt = np.arange(n) / SR; f = mtof(m)
    mod = np.sin(TAU * f * 3.5 * tt) * 2.2 * np.exp(-tt * 2.5)
    y = np.sin(TAU * f * tt + mod) * np.exp(-tt * 1.6) + 0.3 * np.sin(TAU * f * 2.01 * tt) * np.exp(-tt * 3)
    y *= np.minimum(1, tt / 0.003)
    add(music, y * gain, t0, 1.0, pan); add(send, y * gain, t0, 0.9)

def pad(t0, t1, notes, gain=0.08, cutoff=1200, bright=None):
    n = at(t1) - at(t0); x = np.zeros(n)
    for m in notes:
        for d in (-0.08, -0.03, 0.03, 0.08):
            x += saw(mtof(m) * 2 ** (d / 12), n, rng.random())
    tt = np.arange(n) / SR
    fc = cutoff if bright is None else (lambda tc: cutoff + bright * np.clip(tc / (t1 - t0), 0, 1))
    y = lp(x, fc, q=1.5)
    e = np.minimum(1, tt / 0.6) * np.minimum(1, (t1 - t0 - tt) / 0.5)
    y *= e * gain / len(notes)
    l = y; r = np.roll(y, 700)
    add(music, np.stack([l, r]), t0); add(send, np.stack([l, r]), t0, 0.7)

def drone(t0, t1, m=26, gain=0.22):
    n = at(t1) - at(t0); tt = np.arange(n) / SR; f = mtof(m)
    y = np.sin(TAU * f * tt) + 0.35 * np.sin(TAU * 2 * f * tt + 0.3) + 0.15 * np.sin(TAU * 3 * f * tt)
    y *= (0.8 + 0.2 * np.sin(TAU * 0.13 * tt))
    e = np.minimum(1, tt / 1.0) * np.minimum(1, (t1 - t0 - tt) / 0.8)
    add(music, y * e * gain, t0)

# ---------- chords (i - VI - III - VII in D minor) and the pulse
CHORDS = {'Dm': [50, 53, 57], 'Bb': [46, 50, 53], 'F': [41, 45, 48], 'C': [48, 52, 55], 'Gm': [43, 46, 50], 'A': [45, 49, 52]}
PROG = ['Dm', 'Bb', 'F', 'C']
def chord_at(t):
    return PROG[int(t // BAR) % 4]

def pulse(t0, t1, div=4, gain=0.1, cut=(600, 3000), octave=12, accel=None):
    """16th-note arpeggio on the current chord; one STFT filter pass over the whole run"""
    n = at(t1) - at(t0); buf = np.zeros(n)
    step = BEAT / div; k = 0; t = t0
    while t < t1 - 1e-6:
        notes = CHORDS[chord_at(t)]
        m = notes[[0, 1, 2, 1][k % 4]] + octave + (12 if k % 8 == 6 else 0)
        y, ln = pluck(t, m, 1.0, dec=14)
        i = at(t) - at(t0); j = min(n, i + ln); buf[i:j] += y[: j - i] * (1.0 if k % 4 == 0 else 0.7)
        k += 1
        if accel: step = accel(t)
        t += step
    y = lp(buf, lambda tc: cut[0] + (cut[1] - cut[0]) * np.clip(tc / (t1 - t0), 0, 1) ** 1.5, q=2.5)
    add(music, y * gain, t0, 1.0, -0.2); add(music, np.roll(y, 360) * gain, t0, 1.0, 0.2); add(send, y * gain, t0, 0.4)

# =====================================================================================
# THE SCORE: a clean process piece. Two mallet voices play one pattern; the second drifts a 16th
# against the first during the list (phasing), one note is added per station, everything falls away
# for the frost and resolves on one chord with the mark.
# =====================================================================================
def mallet(t0, m, gain=0.12, pan=0.0, dec=5.5):
    n = int(1.2 * SR); tt = np.arange(n) / SR; f = mtof(m)
    y = (np.sin(TAU * f * tt) + 0.25 * np.sin(TAU * f * 3.99 * tt) * np.exp(-tt * 18) + 0.12 * np.sin(TAU * f * 10.2 * tt) * np.exp(-tt * 40))
    y *= np.exp(-tt * dec) * np.minimum(1, tt / 0.0015)
    add(music, y * gain, t0, 1.0, pan); add(send, y * gain, t0, 0.5)

def glass_tap(t0, m, gain=0.06, pan=0.0):
    n = int(2.0 * SR); tt = np.arange(n) / SR; f = mtof(m)
    y = sum(np.sin(TAU * f * r * tt) * a * np.exp(-tt * d) for r, a, d in [(1, 1, 2.2), (2.76, 0.5, 4), (5.4, 0.3, 7), (8.9, 0.15, 11)])
    add(music, y * gain * np.minimum(1, tt / 0.001), t0, 1.0, pan); add(send, y * gain, t0, 1.0)

def shaker(t0, gain=0.05, pan=0.15):
    n = int(0.09 * SR); tt = np.arange(n) / SR
    y = rng.standard_normal(n); y = np.diff(np.concatenate([[0], y])); y = np.diff(np.concatenate([[0], y]))
    y *= np.sin(np.pi * np.minimum(1, tt / 0.07)) ** 2
    add(music, y * gain, t0, 1.0, pan)

def bass(t0, m, dur, gain=0.16):
    n = int(dur * SR); tt = np.arange(n) / SR; f = mtof(m)
    y = np.sin(TAU * f * tt) + 0.3 * np.sin(TAU * 2 * f * tt) + 0.12 * np.sin(TAU * 3 * f * tt)
    y *= np.minimum(1, tt / 0.01) * np.minimum(1, (dur - tt) / 0.05) * (0.75 + 0.25 * np.exp(-tt * 6))
    add(music, y * gain, t0)

PAT = [65, 72, 69, 74, 72, 67, 69, 76]          # F A C E colour (F lydian-ish), 8 x 16ths
CH2 = {0: [41, 48, 53, 57, 64], 1: [38, 45, 50, 53, 60], 2: [46, 53, 58, 62, 69], 3: [43, 50, 55, 59, 62]}  # Fmaj7, Dm7, Bbmaj7, G
BASSN = {0: 29, 1: 26, 2: 34, 3: 31}
def bar_ix(t): return int(t // BAR) % 4
STEP = BEAT / 4

# title (0-6): caret ticks, the slam on 1.0, voice A alone
for k in range(4): glass_tap(0.0 + k * 0.125 * (k < 2), 84, 0.0)
sub_boom(1.0, 90, 40, 1.4, 0.55)
glass_tap(1.0, 77, 0.07); glass_tap(1.0, 84, 0.05, 0.3)
t = 1.0
while t < 6.0 - 1e-6:
    k = int(round((t - 1.0) / STEP)); mallet(t, PAT[k % 8], 0.075 if k % 2 else 0.1, -0.25)
    t += STEP
pad(1.0, 6.2, CH2[0], 0.05, 1500)
riser(4.6, 6.0, 0.22)

# more (6-13): add bass + soft kick; table reveal at 10.5 opens the filter
for b in range(int((13 - 6) / BAR)): bass(6 + b * BAR, BASSN[bar_ix(6 + b * BAR)], BAR - 0.05)
for k in range(14): kick(6 + k * BEAT, 0.42)
t = 6.0
while t < 13 - 1e-6:
    k = int(round(t / STEP)); mallet(t, PAT[k % 8], 0.07 if k % 2 else 0.095, -0.25); t += STEP
pad(6, 10.6, CH2[1], 0.05, 1300); pad(10.5, 13.1, CH2[2], 0.06, 1800, bright=1500)
riser(9.2, 10.5, 0.25); sub_boom(10.5, 70, 36, 1.6, 0.45)

# uses (13-38): voice B enters and drifts (phasing), one extra note per station, hats + claps
for b in range(int((38 - 13) / BAR) + 1):
    t0 = 13 + b * BAR
    if t0 < 38: bass(t0, BASSN[bar_ix(t0)], min(BAR, 38 - t0) - 0.05)
    if t0 < 38: pad(t0, min(38, t0 + BAR) + 0.15, CH2[bar_ix(t0)], 0.045, 1600)
for k in range(50): kick(13 + k * BEAT, 0.5)
for k in range(25): clap(13 + BEAT + k * 2 * BEAT, 0.16)
t = 13.0
while t < 38 - 1e-6:
    k = int(round(t / STEP)); kk = k - int(13 / STEP)
    mallet(t, PAT[k % 8], 0.065 if k % 2 else 0.09, -0.3)
    drift = min(7, kk // 24)                                  # voice B slips one 16th every 1.5 bars
    mallet(t, PAT[(k + drift) % 8] + 12, 0.04, 0.35, 7)
    shaker(t, 0.035 if k % 2 else 0.05)
    t += STEP
for i in range(5):
    s0 = TL['USE0'] + i * TL['USE_LEN']
    for j in range(i + 1): glass_tap(s0 + TL['FROST_AT'] + j * BEAT / 2, [79, 84, 86, 88, 91][j], 0.05, -0.3 + 0.15 * j)

# tools (38-45): the beat thins, a chord climbs; the wiring locks on 40.5
for b in range(4): bass(38 + b * BAR, [26, 34, 31, 29][b], BAR - 0.05, 0.14) if 38 + b * BAR < 45 else None
for k in range(14): kick(38 + k * BEAT, 0.38) if k % 2 == 0 else None
pad(38, 45.1, [50, 57, 62, 65, 69], 0.07, 1200, bright=2200)
t = 38.0
while t < 45 - 1e-6:
    k = int(round(t / STEP)); mallet(t, PAT[k % 8] + (12 if k % 16 > 11 else 0), 0.06, (k % 4 - 1.5) * 0.25); t += STEP
glass_tap(40.5, 72, 0.08); glass_tap(40.5, 79, 0.06, 0.3)

# transp (45-52): busy and exposed: full groove, hats everywhere, then cut to silence at 51.55
for b in range(4): bass(45 + b * BAR, BASSN[bar_ix(45 + b * BAR)], min(BAR, 51.55 - (45 + b * BAR)) - 0.03) if 45 + b * BAR < 51.5 else None
for k in range(14): kick(45 + k * BEAT, 0.55) if 45 + k * BEAT < 51.5 else None
for k in range(7): clap(45 + BEAT + k * 2 * BEAT, 0.2) if 45 + BEAT + k * 2 * BEAT < 51.5 else None
t = 45.0
while t < 51.5:
    k = int(round(t / STEP)); mallet(t, PAT[k % 8], 0.08, -0.3); mallet(t, PAT[(k + 3) % 8] + 12, 0.05, 0.35, 7); hat(t, 0.05, 80, 0.3); t += STEP
pad(45, 51.6, CH2[2], 0.06, 2600)
riser(49.6, 51.55, 0.3)

# conf (52-60): the frost: no beat. a wash, glass, one resolving chord on the mark
sub_boom(52.0, 60, 30, 3.0, 0.5)
pad(52.0, 60.0, [41, 53, 57, 60, 64, 69], 0.10, 900, bright=1800)
for k, m in enumerate([77, 84, 88, 91, 96]): glass_tap(52.0 + k * 0.09, m, 0.05, -0.4 + 0.2 * k)
for k, m in enumerate([72, 76, 79, 84]): mallet(53.0 + k * BEAT, m, 0.07, -0.2 + 0.13 * k, 3.0)
glass_tap(TL['LOGO_AT'], 77, 0.09); glass_tap(TL['LOGO_AT'], 84, 0.07, 0.3); glass_tap(TL['LOGO_AT'] + 0.05, 89, 0.05, -0.3)
bass(TL['LOGO_AT'], 29, 3.3, 0.14)

# =====================================================================================
# SFX on picture events (Mixkit library). Decode once with ffmpeg.
# =====================================================================================
cache = {}
def load(name):
    if name in cache: return cache[name]
    pth = os.path.join(SFX_DIR, name + '.mp3')
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', pth, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'])
    x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).T.astype(np.float64)
    cache[name] = x; return x
used = []
for ev in TL['EV']:
    if '/' not in ev['s'] or ev['g'] <= 0: continue
    x = load(ev['s'])
    if 'dur' in ev:
        n = int(ev['dur'] * SR); x = x[:, :n] * np.minimum(1, (n - np.arange(min(n, x.shape[1]))) / (0.15 * SR))
    # align the transient (first sample above -20 dB of peak) to the event time, except risers/whooshes
    pk = np.abs(x).max(); on = np.argmax(np.abs(x).max(0) > pk * 0.1)
    lead = 0 if any(k in ev['s'] for k in ('whoosh', 'swoosh', 'sweep', 'vacuum', 'zoom-futuristic', 'typewriter', 'scan')) else on / SR
    add(sfx, x / max(pk, 1e-6) * 0.5, ev['t'] - lead, ev['g'])
    used.append(ev['s'])

# =====================================================================================
# reverb (FFT convolution with a synthetic stereo hall IR), duck, silences, master
# =====================================================================================
def ir(sec=2.8, seed=0):
    r = np.random.default_rng(seed); n = int(sec * SR); tt = np.arange(n) / SR
    x = r.standard_normal(n) * np.exp(-tt * 6.9 / sec) * np.minimum(1, tt / 0.01)
    return lp(x, 6000)
def conv(a, h):
    L = len(a) + len(h) - 1; nf = 1 << (L - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(a, nf) * np.fft.rfft(h, nf), nf)[: len(a)]
hl, hr = ir(2.8, 1), ir(2.8, 2)
wet = np.stack([conv(send[0], hl), conv(send[1], hr)]) * 0.045
sfx_wet = np.stack([conv(sfx[0], ir(1.6, 3)), conv(sfx[1], ir(1.6, 4))]) * 0.02

mbus = music + wet
# duck music under the big hits so the impact lands
duck = np.ones(N); tt = np.arange(N) / SR
for h in TL["HITS"]:
    d = tt - h; m = (d > 0) & (d < 1.5)
    duck[m] *= 1 - 0.35 * np.exp(-d[m] * 3)
mbus *= duck
# silences: digital near-zero before the two turns (first sound after = the hit)
gate = np.ones(N)
for a, b in TL['SILENCES']:
    fa, fb = at(a), at(b)
    gate[fa:fb] = 0.0
    ramp = int(0.06 * SR); gate[fa - ramp: fa] = np.minimum(gate[fa - ramp: fa], np.linspace(1, 0, ramp))
mix = mbus * gate + (sfx + sfx_wet) * gate
# end fade
fo = at(DUR - 1.6); mix[:, fo:] *= np.linspace(1, 0, N - fo) ** 1.5
# tame the synthetic low end: shelf 20-120 Hz down ~5 dB so the score speaks on small speakers
mix = np.stack([ch - 0.3 * lp(ch, 120, q=2) for ch in mix])
# gentle glue + soft clip
mix = np.tanh(mix * 1.1) / 1.1
mix /= np.abs(mix).max() / 0.89
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
pcm = (mix.T * 32767).astype(np.int16)
import wave
with wave.open(os.path.join(HERE, 'out', 'mix.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
with open(os.path.join(HERE, 'out', 'sfx_used.json'), 'w') as f: json.dump(sorted(set(used)), f, indent=1)
print('wrote out/mix.wav', mix.shape[1] / SR, 's;', len(set(used)), 'sfx files')
