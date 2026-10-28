# Original score + sound design for the Seismic film -> out/mix.wav
# D minor, 96 BPM (bar = 2.5 s), driven by timeline.js. Music is synthesized here (numpy only);
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
# THE SCORE
# =====================================================================================
# open (0 - 7.5): hush, the seismograph kicks, riser into the stone landing at 2.5
drone(0, 7.6, 26, 0.18)
riser(0.8, 2.5, 0.32)
sub_boom(0.62, 60, 34, 1.2, 0.5); sub_boom(1.25, 64, 34, 1.2, 0.6)
sub_boom(2.5, 80, 30, 3.0, 1.0); braam(2.5, 26, 4.0, 0.55)
pad(2.6, 7.6, [50, 57, 62, 65], 0.10, 700, bright=900)
bell(3.6, 74, 0.08, 3.0, 0.3); bell(4.85, 81, 0.06, 3.0, -0.3)
riser(6.2, 7.5, 0.22)

# paths (7.5 - 15): the pulse starts, filter slowly opens
drone(7.5, 15.1, 26, 0.14)
pulse(7.5, 15.0, 4, 0.09, (500, 1800))
for b in range(12): kick(7.5 + b * 2 * BEAT, 0.45)
for i, c in enumerate(['Dm', 'Bb', 'F']): pad(7.5 + i * BAR, 7.5 + (i + 1) * BAR + 0.3, CHORDS[c] + [CHORDS[c][0] + 12], 0.07, 900)

# zk (15 - 25): hats in, more drive; riser into the silence before the slam
pulse(15.0, 24.55, 4, 0.1, (1200, 3800))
for b in range(16): kick(15 + b * BEAT, 0.55) if b % 2 == 0 else None
t = 15.0
while t < 24.4: hat(t + BEAT / 2, 0.08); t += BEAT
for i in range(4): c = PROG[(i + 2) % 4]; pad(15 + i * BAR, 15 + (i + 1) * BAR + 0.2, CHORDS[c] + [CHORDS[c][1] + 12], 0.08, 1100)
drone(15, 24.55, 26, 0.14)
for k, tt in enumerate([22.5, 22.5 + BEAT / 2]): bell(tt, [86, 81][k], 0.06, 2.0)
riser(22.6, 24.55, 0.4)
tom(23.75, 80, 0.4); tom(24.06, 95, 0.45); tom(24.22, 110, 0.5); tom(24.38, 130, 0.5)

# seismic (25 - 30): the slam. four-on-floor, braam, toms
sub_boom(25.0, 90, 28, 3.5, 1.1); braam(25.0, 26, 4.5, 0.65)
for b in range(8): kick(25 + b * BEAT, 0.75)
for b in range(4): clap(25 + BEAT + b * 2 * BEAT, 0.3)
t = 25.0
while t < 30: hat(t + BEAT / 2, 0.1); hat(t + BEAT / 4, 0.04, 90, -0.3); t += BEAT
pulse(25.0, 30.0, 4, 0.11, (2600, 4200))
drone(25, 30.1, 26, 0.2)

# tee (30 - 37.5): driving but leaves room for the typing; bells on the shielded types
pulse(30.0, 37.4, 4, 0.10, (2200, 5200), octave=12)
for b in range(12): kick(30 + b * BEAT, 0.65)
for b in range(6): clap(30 + BEAT + b * 2 * BEAT, 0.26)
t = 30.0
while t < 37.2: hat(t + BEAT / 2, 0.09); t += BEAT
for i, c in enumerate(['Dm', 'Bb', 'Gm']): pad(30 + i * BAR, 30 + (i + 1) * BAR + 0.2, CHORDS[c] + [CHORDS[c][0] + 12], 0.09, 1400)
for k, m in enumerate([74, 77, 81]): bell(35.3 + k * BEAT / 2, m, 0.07, 2.5, -0.3 + 0.3 * k)
riser(36.0, 37.5, 0.42)

# goal (37.5 - 47.5): white light. F major, bells, soft pulse, lighter kick
sub_boom(37.5, 70, 36, 2.0, 0.6)
pad(37.5, 47.6, [53, 57, 60, 65, 69], 0.10, 1600, bright=1400)
for i in range(16):
    m = [77, 81, 84, 81, 76, 79, 84, 79, 74, 77, 81, 77, 72, 76, 79, 84][i]
    bell(38.75 + i * BEAT / 2, m, 0.05, 2.2, [-0.4, 0.4][i % 2])
for b in range(8): kick(42.5 + b * BEAT, 0.4)
t = 42.5
while t < 47.3: hat(t + BEAT / 2, 0.06); t += BEAT
for tt in [41.25, 41.875, 42.5, 43.125]: tom(tt, 70, 0.3)
drone(40, 47.6, 29, 0.12)  # F

# different (47.5 - 54.3): tension, the pulse divides faster (8ths -> 16ths -> 32nds), then silence
drone(47.5, 54.3, 26, 0.18)
pad(47.5, 54.35, [50, 53, 58, 62], 0.10, 800, bright=2200)
def accel(t):
    u = np.clip((t - 50.0) / 4.0, 0, 1)
    return BEAT / (2 + 6 * u ** 1.5)
pulse(47.5, 54.3, 2, 0.11, (900, 5200), octave=12, accel=accel)
for b in range(10): kick(47.5 + b * BEAT, 0.5 + 0.3 * b / 10)
riser(51.5, 54.3, 0.5)

# question (55 - 65): the biggest hit, then air. bell motif, low drone, ends unresolved
sub_boom(55.0, 100, 26, 4.0, 1.2); braam(55.0, 26, 5.5, 0.7)
pad(55.2, 64.8, [50, 57, 62, 65, 69], 0.11, 900, bright=1100)
drone(55, 65, 26, 0.2)
for k, (tt, m) in enumerate([(56.25, 74), (56.875, 81), (57.5, 77), (58.75, 76), (59.6, 74), (60.85, 69), (62.1, 74)]): bell(tt, m, 0.07, 3.0, [-0.3, 0.3][k % 2])
sub_boom(59.6, 60, 34, 2.0, 0.45)

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
for h in TL['HITS'] + [TL['FLASH']]:
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
mix = np.stack([ch - 0.58 * lp(ch, 120, q=2) for ch in mix])
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
