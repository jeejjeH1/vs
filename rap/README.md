# نبرد رپ: ChatGPT در برابر Claude

انیمیشن ۷۷ ثانیه‌ای (۱۹۲۰×۱۰۸۰، ۳۰ فریم) با **رپ فارسی باکلام**. دو ربات رپر (ChatGPT سبز با کلاه نقاب‌دار، Claude نارنجی با هدفون) روی صحنه رپ می‌خوانند،
دهانشان با صدا هماهنگ باز و بسته می‌شود، یک ربات دی‌جی مجری است و تماشاچی‌ها در همخوانی دست بالا می‌برند. زیرنویس کارائوکه‌ای فارسی دارد.

**فایل نهایی:** `rap_battle.mp4`

- بیت: هیپ‌هاپ ۹۰ BPM با ریف سنتور در دستگاه شور، ۸۰۸ و درام.
- صداها: متن‌به‌گفتار عصبی فارسی (صداهای piper از طریق sherpa-onnx) — ChatGPT با صدای `amir`، Claude با `reza_ibrahim`، مجری با `gyro`. هر نیم‌مصرع روی دو ضرب بیت چیده شده.
- ساختار: مقدمه ← مجری ← ورس ChatGPT (۸ بار) ← همخوانی ← ورس Claude (۸ بار) ← همخوانی ← «انتخاب با شماست!»

## ساخت دوباره
```bash
pip install sherpa-onnx soundfile numpy
mkdir voices && cd voices && for v in amir gyro reza_ibrahim; do
  curl -L https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-fa_IR-$v-medium.tar.bz2 | tar xj; done; cd ..
python3 audio.py   # -> soundtrack.wav + data.js (متن، زمان‌بندی، حرکت دهان)
node render.js     # -> rap_battle.mp4
```
