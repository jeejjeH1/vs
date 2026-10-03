# Persian rap battle: ChatGPT vs Claude.
# Vocals: offline Persian neural TTS (piper voices via sherpa-onnx), each half-line fitted to 2 beats.
# Beat: 90 BPM boom-bap with a santur riff in Dastgah-e Shur. Output: soundtrack.wav + data.js (lyrics, timing, mouth envelopes).
import glob, json, os
import numpy as np
import soundfile as sf
import sherpa_onnx

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
BPM = 90
BEAT = 60 / BPM
BAR = 4 * BEAT
FPS = 30

# who: g = ChatGPT, c = Claude, h = host, b = both. Each line = one bar, "|" splits it into two halves (beats 1 and 3).
# 'say' is the spelling fed to the voice (English names written in Persian), 'show' is what appears on screen.
SONG = [
    # (bar, who, show, say)
    (1, 'h', 'خانم‌ها و آقایون | به نبرد خوش اومدین', 'خانم‌ها و آقایون | به نبرد خوش اومدین'),
    (2, 'h', 'ChatGPT در برابر Claude | بزن بریم!', 'چَت جی‌پی‌تی در برابر | کِلود! بزن بریم!'),
    # ChatGPT verse
    (3, 'g', 'من ChatGPT هستم | اسمم رو همه بلدن', 'من چَت جی‌پی‌تی‌اَم | اسمم رو همه بلدن'),
    (4, 'g', 'از تهران تا توکیو | همه با من حرف زدن', 'از تهران تا توکیو | همه با من حرف زدن'),
    (5, 'g', 'عکس می‌سازم با یه خط | صدام زنده و گرمه', 'عکس می‌سازم با یه خط | صدام زنده و گرمه'),
    (6, 'g', 'هر سؤالی داری بپرس | جوابم حاضر و نرمه', 'هر سؤالی داری بپرس | جوابم حاضر و نرمه'),
    (7, 'g', 'سال دو هزار و بیست و دو | اومدم ترکوندم', 'سال دو هزار و بیست و دو | اومدم ترکوندم'),
    (8, 'g', 'دنیا رو یه‌شبه | با یه چت تکوندم', 'دنیا رو یه‌شبه | با یه چت تکوندم'),
    (9, 'g', 'GPTهای سفارشی | یه لشکر پشت سرم', 'جی‌پی‌تی‌های سفارشی | یه لشکر پشت سرم'),
    (10, 'g', 'Claude جان آماده‌ای؟ | این راند رو من می‌برم!', 'کِلود جان آماده‌ای؟ | این راند رو من می‌برم!'),
    # hook
    (11, 'b', 'ChatGPT یا Claude | بگو کدوم سَره؟', 'چَت جی‌پی‌تی یا کِلود | بگو کدوم سَره؟'),
    (12, 'b', 'هوش مصنوعی اومده | دنیا داره می‌پره', 'هوش مصنوعی اومده | دنیا داره می‌پره'),
    (13, 'b', 'یکی سبز و یکی نارنجی | هر دو پر از هنره', 'یکی سبز و یکی نارنجی | هر دو پر از هنره'),
    (14, 'b', 'انتخاب با خودته | این نبرد آخره!', 'انتخاب با خودته | این نبرد آخره!'),
    # Claude verse
    (15, 'c', 'من Claude هستم، از Anthropic | آروم ولی دقیق', 'من کِلودَم از آنتروپیک | آروم ولی دقیق'),
    (16, 'c', 'کد می‌نویسم تمیز | مثل یه رفیق شفیق', 'کد می‌نویسم تمیز | مثل یه رفیق شفیق'),
    (17, 'c', 'یه کتاب کامل بده | تا تهش می‌خونم', 'یه کتاب کامل بده | تا تهش می‌خونم'),
    (18, 'c', 'هر فصلش رو با حوصله | خط به خط می‌دونم', 'هر فصلش رو با حوصله | خط به خط می‌دونم'),
    (19, 'c', 'ایمنی خط قرمزمه | صداقت قانونمه', 'ایمنی خط قرمزمه | صداقت قانونمه'),
    (20, 'c', 'حرف بی‌پایه نمی‌زنم | این اصل درونمه', 'حرف بی‌پایه نمی‌زنم | این اصل درونمه'),
    (21, 'c', 'ChatGPT رفیق خوبیه | ولی گوش کن داداش', 'چَت جی‌پی‌تی رفیق خوبیه | ولی گوش کن داداش'),
    (22, 'c', 'داوری با مردمه | تو فقط آماده باش!', 'داوری با مردمه | تو فقط آماده باش!'),
    # hook
    (23, 'b', 'ChatGPT یا Claude | بگو کدوم سَره؟', 'چَت جی‌پی‌تی یا کِلود | بگو کدوم سَره؟'),
    (24, 'b', 'هوش مصنوعی اومده | دنیا داره می‌پره', 'هوش مصنوعی اومده | دنیا داره می‌پره'),
    (25, 'b', 'یکی سبز و یکی نارنجی | هر دو پر از هنره', 'یکی سبز و یکی نارنجی | هر دو پر از هنره'),
    (26, 'b', 'انتخاب با خودته | این نبرد آخره!', 'انتخاب با خودته | این نبرد آخره!'),
    (27, 'h', 'شما کدوم رو انتخاب می‌کنید؟ | کامنت بذارید!', 'شما کدوم رو انتخاب می‌کنید؟ | کامنت بذارید!'),
]
END_BAR = 28
DUR = END_BAR * BAR + 2.5
N = int(DUR * SR)
VOICES = {'g': 'amir', 'c': 'reza_ibrahim', 'h': 'gyro'}
PITCH = {'g': 1.08, 'c': 1.0, 'h': 0.97}   # small resample so the two rappers sit further apart
PAN = {'g': 0.35, 'c': -0.35, 'h': 0.0}
SLOT = 2 * BEAT - 0.1

rng = np.random.default_rng(3)
t_ax = np.arange(N) / SR

def tts_engine(name):
    d = os.path.join(HERE, 'voices', f'vits-piper-fa_IR-{name}-medium')
    m = glob.glob(d + '/*.onnx')[0]
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=m, lexicon='', tokens=d + '/tokens.txt', data_dir=d + '/espeak-ng-data', length_scale=1.0, noise_scale=0.6, noise_scale_w=0.7),
        num_threads=4))
    return sherpa_onnx.OfflineTts(cfg)

def trim(x, sr):
    a = np.abs(x); thr = a.max() * 0.04
    idx = np.where(a > thr)[0]
    if len(idx) == 0: return x
    return x[max(0, idx[0] - int(0.01 * sr)): idx[-1] + int(0.03 * sr)]

def resample(x, ratio):  # ratio > 1 -> shorter and higher
    n = int(len(x) / ratio)
    return np.interp(np.arange(n) * ratio, np.arange(len(x)), x)

cache = os.path.join(HERE, 'vox'); os.makedirs(cache, exist_ok=True)
engines = {}
def say(who, text, slot, key):
    path = os.path.join(cache, f'{key}.wav')
    if os.path.exists(path):
        x, _ = sf.read(path); return x
    name = VOICES[who]
    if name not in engines: engines[name] = tts_engine(name)
    eng = engines[name]
    a = eng.generate(text, sid=0, speed=1.0)
    x = trim(np.array(a.samples), a.sample_rate)
    d = len(x) / a.sample_rate / PITCH[who]
    speed = float(np.clip(d / slot, 0.85, 2.6))
    a = eng.generate(text, sid=0, speed=speed)
    x = trim(np.array(a.samples), a.sample_rate)
    x = resample(x, a.sample_rate / SR * PITCH[who])  # to 48k with pitch lift
    print("   pre", key, round(len(x) / SR / slot, 2))
    if len(x) > slot * SR * 1.08:  # still too long: squeeze a bit more (slight pitch rise, reads as energy)
        x = resample(x, len(x) / (slot * SR * 1.08))
    print("   ", key, "speed", round(speed, 2), "len", round(len(x) / SR, 2))
    x = x / (np.abs(x).max() + 1e-9)
    sf.write(path, x, SR)
    return x

tracks = {k: np.zeros(N) for k in 'gch'}
lyrics = []
for bar, who, show, text in SONG:
    halves_show = [s.strip() for s in show.split('|')]
    halves_say = [s.strip() for s in text.split('|')]
    t0 = bar * BAR
    item = {'bar': bar, 'who': who, 't': round(t0, 3), 'halves': []}
    for hi, (hs, ht) in enumerate(zip(halves_show, halves_say)):
        st = t0 + hi * 2 * BEAT
        singers = ['g', 'c'] if who == 'b' else [who]
        dur = 0
        for s in singers:
            x = say(s, ht, SLOT, f'{bar}_{hi}_{s}')
            i0 = int(st * SR) + int(0.012 * SR)
            tracks[s][i0:i0 + len(x)] += x[: max(0, N - i0)] * (0.75 if who == 'b' else 1.0)
            dur = max(dur, len(x) / SR)
        item['halves'].append({'text': hs, 't': round(st, 3), 'd': round(dur, 3)})
    lyrics.append(item)
    print(bar, who, [h['d'] for h in item['halves']])

# ---------------- beat
def env_exp(n, k): return np.exp(-np.arange(n) / SR * k)
def add(buf, t, x, gain=1.0):
    i = int(t * SR)
    if i >= len(buf): return
    m = min(len(x), len(buf) - i); buf[i:i + m] += x[:m] * gain

def kick():
    n = int(0.5 * SR); s = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(45 + 110 * np.exp(-s * 25)) / SR
    return np.sin(ph) * np.exp(-s * 6) + np.r_[rng.uniform(-1, 1, 80) * 0.3, np.zeros(n - 80)]
def snare():
    n = int(0.3 * SR); s = np.arange(n) / SR
    nz = rng.uniform(-1, 1, n); nz = nz - np.convolve(nz, np.ones(6) / 6, 'same')
    return (nz * np.exp(-s * 16) * 0.8 + np.sin(2 * np.pi * 185 * s) * np.exp(-s * 25) * 0.6)
def hat(open_=False):
    n = int((0.2 if open_ else 0.05) * SR); s = np.arange(n) / SR
    nz = rng.uniform(-1, 1, n); nz = np.diff(np.r_[0, nz])
    return nz * np.exp(-s * (15 if open_ else 80)) * 0.5
def bass808(f, length):
    n = int(length * SR); s = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(f * (1 + 0.5 * np.exp(-s * 30))) / SR
    return np.tanh(np.sin(ph) * 1.6) * np.exp(-s * 1.4) * np.minimum(1, s / 0.004)
def santur(f, amp=1.0, length=1.4):
    n = int(length * SR); s = np.arange(n) / SR
    v = np.zeros(n)
    for m, a, d in [(1, 1, 3.2), (2.003, 0.45, 5), (3.01, 0.25, 7), (4.03, 0.12, 10)]:
        for dt in (1, 1.0025): v += np.sin(2 * np.pi * f * m * dt * s) * a * np.exp(-s * d)
    v[:200] += rng.uniform(-1, 1, 200) * 0.25 * np.linspace(1, 0, 200)
    return v * 0.5 * amp * np.minimum(1, np.arange(n) / 40)

D4 = 293.66
CENTS = {-2: -500, -1: -200, 0: 0, 1: 150, 2: 300, 3: 500, 4: 700, 5: 800, 6: 1000, 7: 1200}
hz = lambda d: D4 * 2 ** (CENTS[d] / 1200)
# 2-bar santur riff in Shur, positions in 16ths
RIFF = [(0, 4), (2, 3), (3, 2), (4, 3), (6, 1), (8, 2), (10, 1), (11, 0), (12, 1), (14, 2),
        (16, 4), (18, 5), (19, 4), (20, 3), (22, 2), (24, 1), (26, 2), (27, 1), (28, 0), (30, -1)]
ROOTS = [73.42, 73.42, 58.27, 65.41]  # D, D, Bb, C (per bar)

drums = np.zeros(N); bass = np.zeros(N); mel = np.zeros(N)
S16 = BEAT / 4
K, SN = kick(), snare()
for b in range(END_BAR):
    t0 = b * BAR
    hook = any(l[0] == b and l[1] == 'b' for l in SONG)
    intro = b == 0
    if not intro:
        for k16 in [0, 7, 10]: add(drums, t0 + k16 * S16, K, 0.9)
        for k16 in [4, 12]: add(drums, t0 + k16 * S16, SN, 0.7)
        for k8 in range(8):
            sw = 0.03 if k8 % 2 else 0
            add(drums, t0 + k8 * 2 * S16 + sw, hat(k8 == 7 and b % 2 == 1), 0.35 if k8 % 2 == 0 else 0.22)
        if hook:
            for k16 in [3, 11, 15]: add(drums, t0 + k16 * S16, hat(), 0.18)
        root = ROOTS[b % 4]
        add(bass, t0, bass808(root, 1.4), 0.55)
        add(bass, t0 + 10 * S16, bass808(root, 0.9), 0.45)
    for pos, d in RIFF:
        if pos // 16 != b % 2: continue
        amp = 0.32 if (hook or intro) else 0.2
        add(mel, t0 + (pos % 16) * S16, santur(hz(d), amp))
        if hook: add(mel, t0 + (pos % 16) * S16, santur(hz(d) * 2, amp * 0.35, 0.8))
# riser into bar 1 + final hit
add(drums, END_BAR * BAR, K, 1.0)
for d, a in [(0, 0.35), (4, 0.25), (7, 0.25)]: add(mel, END_BAR * BAR, santur(hz(d), a, 2.5))
add(bass, END_BAR * BAR, bass808(73.42, 2.4), 0.6)
sweep = rng.uniform(-1, 1, int(BAR * SR)) * np.linspace(0, 1, int(BAR * SR)) ** 2 * 0.15
add(drums, 0, sweep)

# ---------------- vocal chain: soft-clip compression + slapback + small room
def process(v):
    v = np.tanh(v * 2.2) / np.tanh(2.2)
    d = int(BEAT / 2 * SR)
    out = v.copy(); out[d:] += v[:-d] * 0.18
    return out
vox_l = np.zeros(N); vox_r = np.zeros(N)
for k, tr in tracks.items():
    p = process(tr) * (0.95 if k != 'h' else 0.9)
    pan = PAN[k]
    vox_l += p * min(1, 1 - pan); vox_r += p * min(1, 1 + pan)

# duck the beat under vocals
venv = np.abs(tracks['g']) + np.abs(tracks['c']) + np.abs(tracks['h'])
w = int(0.05 * SR); venv = np.convolve(venv, np.ones(w) / w, 'same')
duck = 1 - 0.35 * np.clip(venv / (venv.max() + 1e-9) * 3, 0, 1)
beat = drums * duck + bass * (0.6 + 0.4 * duck) + mel * duck
L = beat + vox_l; R = beat + vox_r
fade = np.minimum(1, (N - np.arange(N)) / (1.5 * SR))
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
L = np.tanh(L / peak * 1.3) / np.tanh(1.3) * 0.95; R = np.tanh(R / peak * 1.3) / np.tanh(1.3) * 0.95
sf.write(os.path.join(HERE, 'soundtrack.wav'), np.stack([L, R], 1), SR, subtype='PCM_16')

# ---------------- mouth envelopes (per video frame) + beat info for the animation
nf = int(DUR * FPS)
def envelope(tr):
    hop = SR // FPS
    e = np.array([np.sqrt(np.mean(tr[i * hop:(i + 1) * hop] ** 2)) for i in range(nf)])
    return np.round(np.clip(e / (np.percentile(e[e > 0.01], 95) if (e > 0.01).any() else 1), 0, 1), 2).tolist()
data = {'FPS': FPS, 'DUR': round(DUR, 3), 'BPM': BPM, 'BEAT': BEAT, 'BAR': BAR, 'END_BAR': END_BAR,
        'lyrics': lyrics, 'mouth': {k: envelope(tracks[k]) for k in 'gch'}}
with open(os.path.join(HERE, 'data.js'), 'w') as f:
    f.write('window.DATA = ' + json.dumps(data, ensure_ascii=False) + ';\n')
    f.write("if (typeof module !== 'undefined') module.exports = window.DATA;\n")
print('wrote soundtrack.wav + data.js', round(DUR, 2), 's')
