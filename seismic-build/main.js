// "What can developers build on Seismic?" — white-model studio film. render(t) is pure: same t -> same frame.
// A long white table with five turntables (one per use case). Glass panels go from clear (readable data)
// to frosted (confidential). three.js draws the world; a 2D canvas draws labels, frost, type and the title cards.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode } from 'postprocessing';

const TL = window.TL;
const W = 1920, H = 1080;
const S = TL.SCENES;
const C = {
  mauve: '#825A6D', purple: '#523542', white: '#FFFFFF', g50: '#FCFCFC', g200: '#E8E8E8', g300: '#D4D4D4',
  g400: '#A4A3A1', g500: '#737373', g800: '#282826', black: '#161616',
};
const DISPLAY = "'Inter Display', Inter, sans-serif";
const MONO = "'JB Mono', 'JetBrains Mono', monospace";

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const p = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, x) => a + (b - a) * x;
const eo3 = (x) => 1 - Math.pow(1 - x, 3);
const eo5 = (x) => 1 - Math.pow(1 - x, 5);
const ei2 = (x) => x * x;
const ei3 = (x) => x * x * x;
const eio3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eio5 = (x) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2);
const back = (x, s = 1.4) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// =====================================================================================
// GL: a bright white studio
// =====================================================================================
const glCanvas = document.createElement('canvas'); glCanvas.width = W; glCanvas.height = H;
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true, stencil: false });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const BG = new THREE.Color(1.22, 1.22, 1.22);
scene.background = BG; scene.fog = new THREE.Fog(BG, 30, 80);
const camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 300);
const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
composer.addPass(new RenderPass(scene, camera));
const bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 1.6, intensity: 0.25, radius: 0.6 });
composer.addPass(new EffectPass(camera, new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL ?? ToneMappingMode.ACES_FILMIC })));

const pmrem = new THREE.PMREMGenerator(renderer);
(function env() {
  const es = new THREE.Scene(); es.background = new THREE.Color(0.55, 0.55, 0.56);
  const strip = (w, h, pos, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide })); m.position.set(...pos); m.lookAt(0, 0, 0); es.add(m); };
  strip(30, 12, [0, 14, 0], 3.2); strip(4, 20, [-12, 4, 6], 2.6); strip(4, 20, [12, 4, -4], 2.0); strip(30, 6, [0, 2, 16], 1.4);
  scene.environment = pmrem.fromScene(es, 0.04).texture;
  scene.environmentIntensity = 0.35;
})();
const hemi = new THREE.HemisphereLight(0xffffff, 0xb5aab0, 0.7); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfffaf6, 3.0); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 4; sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 });
scene.add(sun); scene.add(sun.target);

// materials (the white-model palette + the brand accents)
const M = {
  clay: new THREE.MeshPhysicalMaterial({ color: 0xeeeeee, roughness: 0.62, clearcoat: 0.15, envMapIntensity: 0.32 }),
  grey: new THREE.MeshPhysicalMaterial({ color: 0xbdbdbd, roughness: 0.55, envMapIntensity: 0.32 }),
  grey4: new THREE.MeshPhysicalMaterial({ color: 0x8f8e8c, roughness: 0.5, envMapIntensity: 0.32 }),
  dark: new THREE.MeshPhysicalMaterial({ color: 0x282826, roughness: 0.38, clearcoat: 0.6, envMapIntensity: 1 }),
  mauve: new THREE.MeshPhysicalMaterial({ color: C.mauve, roughness: 0.34, clearcoat: 0.7, envMapIntensity: 1 }),
  purple: new THREE.MeshPhysicalMaterial({ color: C.purple, roughness: 0.34, clearcoat: 0.7, envMapIntensity: 1 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.1, depthWrite: false, envMapIntensity: 1.4, side: THREE.DoubleSide }),
};
const edgeMat = new THREE.LineBasicMaterial({ color: 0xb8b8b8, transparent: true, opacity: 0.9 });
function mesh(geo, mat, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m; }

// floor + the long table
const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
floor.material.color.set(0xe4e4e4); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const SP = 9; // station spacing along x
const XS = [0, 1, 2, 3, 4].map((i) => i * SP);
const TOKEN_X = -SP;
const table = mesh(new RoundedBoxGeometry(62, 0.5, 9, 4, 0.12), M.clay, 14, 0.25, 0, scene);
const TT = 0.5; // table top

// glass panel helper: geometry + the local rectangle used for 2D frost
function glassPanel(parent, w, h, x, y, z, rx = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.x = rx; parent.add(g);
  const pane = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), M.glass); g.add(pane);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, 0.04)), edgeMat); g.add(e);
  const foot = mesh(new THREE.BoxGeometry(w * 0.9, 0.06, 0.3), M.grey, 0, -h / 2 - 0.03, 0, g);
  return { g, w, h };
}
function panelCorners(pn, wipe = 1) {
  const hw = pn.w / 2, hh = pn.h / 2;
  const xr = lerp(-hw, hw, wipe);
  return [[-hw, hh], [xr, hh], [xr, -hh], [-hw, -hh]].map(([x, y]) => pn.g.localToWorld(new THREE.Vector3(x, y, 0.03)));
}

// =====================================================================================
// stations (turntables + dioramas). Each returns { grp, labels(u,t) -> [{v3, lines, ...}], frost(u,t) -> [...] , update(u,t) }
// =====================================================================================
const stations = [];
function turntable(i) {
  const grp = new THREE.Group(); grp.position.set(XS[i], TT, 0); scene.add(grp);
  mesh(new THREE.CylinderGeometry(3.5, 3.6, 0.22, 96), M.clay, 0, 0.11, 0, grp);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.52, 0.025, 8, 160), M.mauve); ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; grp.add(ring);
  const top = new THREE.Group(); top.position.y = 0.22; grp.add(top);
  return { grp, top };
}
const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.14, 56);

// 01 shielded tokens
(function st0() {
  const { grp, top } = turntable(0);
  const stacks = [[-1.6, -0.5, 6], [-0.45, -1.15, 9], [-1.75, 0.85, 4]];
  const coins = [];
  stacks.forEach(([x, z, n], s) => { for (let k = 0; k < n; k++) { const m = mesh(coinGeo, s === 1 && k === n - 1 ? M.mauve : k % 3 === 2 ? M.grey : M.clay, x, 0.07 + k * 0.145, z, top); coins.push({ m, x, z, y: 0.07 + k * 0.145, k, s, n }); } });
  mesh(new THREE.BoxGeometry(1.2, 0.12, 0.5), M.grey, 1.0, 0.06, 0.55, top);
  const card = mesh(new RoundedBoxGeometry(2.5, 1.55, 0.1, 4, 0.08), M.dark, 1.0, 0.95, 0.55, top); card.rotation.x = -0.1;
  const pn = glassPanel(top, 2.9, 1.95, 1.0, 1.08, 1.05, -0.1);
  stations.push({
    grp, top, pn,
    update(u) { coins.forEach((c) => { if (c.k >= c.n - 2) { const d = 0.25 + (c.s * 2 + (c.k - (c.n - 2))) * 0.18; const f = ei2(p(u, d - 0.3, d)); c.m.position.y = c.y + (1 - f) * 3; c.m.visible = u > d - 0.3 || u < -1; } }); },
    labels: () => [{ v3: card.localToWorld(new THREE.Vector3(-1.05, 0.48, 0.06)), lines: [['BALANCE', 22, 500, MONO, '#A4A3A1'], ['12,480.50', 62, 500, DISPLAY, '#FFFFFF'], ['sUSD · 0x7f3a…c21e', 22, 400, MONO, '#A4A3A1']], align: 'left' }],
    frosts: [pn],
  });
})();

// 02 confidential DeFi: two pools and a swap
(function st1() {
  const { grp, top } = turntable(1);
  const tanks = [-1.05, 1.05].map((x, k) => {
    mesh(new THREE.CylinderGeometry(0.78, 0.82, 0.22, 64), M.clay, x, 0.11, 0, top);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 2.1, 64, 1, true), M.glass); shell.position.set(x, 1.27, 0); top.add(shell);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.025, 8, 64), M.grey); rim.rotation.x = Math.PI / 2; rim.position.set(x, 2.32, 0); top.add(rim);
    const liq = mesh(new THREE.CylinderGeometry(0.58, 0.58, 1, 64), k ? M.purple : M.mauve, x, 0.7, 0, top);
    return liq;
  });
  mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 16), M.grey4, 0, 0.55, 0, top).rotation.z = Math.PI / 2;
  const blob = mesh(new THREE.SphereGeometry(0.11, 16, 12), M.mauve, 0, 0.55, 0, top);
  const pn = glassPanel(top, 3.9, 2.4, 0, 1.38, 1.0);
  const lvl = (t) => 0.95 + 0.55 * Math.sin(t * 1.1);
  stations.push({
    grp, top, pn,
    update(u, t) {
      const a = lvl(t), b = 2.0 - a;
      [a, b].forEach((h, k) => { tanks[k].scale.y = h; tanks[k].position.y = 0.22 + h / 2; });
      blob.position.x = Math.sin(t * 2.2) * 0.42;
    },
    labels: (u, t) => {
      const a = lvl(t), b = 2.0 - a;
      return [
        { v3: top.localToWorld(new THREE.Vector3(-1.05, 2.75, 0)), lines: [['POOL A', 22, 500, MONO, C.g500], [(a / 2 * 100).toFixed(1) + '%', 48, 500, DISPLAY, C.black]] },
        { v3: top.localToWorld(new THREE.Vector3(1.05, 2.75, 0)), lines: [['POOL B', 22, 500, MONO, C.g500], [(b / 2 * 100).toFixed(1) + '%', 48, 500, DISPLAY, C.black]] },
        { v3: top.localToWorld(new THREE.Vector3(0, 1.15, 0.2)), lines: [['SWAP 4,200 → 3.91', 22, 500, MONO, C.purple]] },
      ];
    },
    frosts: [pn],
  });
})();

// 03 private lending & trading: an order book + a coin passing between two pedestals
(function st2() {
  const { grp, top } = turntable(2);
  const bars = [];
  for (let k = 0; k < 12; k++) { const x = -1.65 + k * 0.3; const m = mesh(new THREE.BoxGeometry(0.22, 1, 0.5), k < 6 ? M.grey : M.mauve, x, 0.5, -0.4, top); bars.push(m); }
  const pedA = mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.5, 48), M.clay, -1.6, 0.25, 1.55, top);
  const pedB = mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.5, 48), M.clay, 1.6, 0.25, 1.55, top);
  const coin = mesh(coinGeo, M.purple, 0, 0.6, 1.55, top);
  const pn = glassPanel(top, 4.1, 2.0, 0, 1.12, 0.35);
  const hgt = (k, t) => { const d = Math.abs(k - 5.5); return 0.35 + d * 0.22 + 0.18 * Math.sin(t * 2.5 + k * 1.3); };
  stations.push({
    grp, top, pn,
    update(u, t) {
      bars.forEach((m, k) => { const h = hgt(k, t); m.scale.y = h; m.position.y = h / 2; });
      const ph = (t * 0.8) % 1, dir = Math.floor(t * 0.8) % 2 ? -1 : 1;
      const x = lerp(-1.6, 1.6, dir > 0 ? eio3(ph) : 1 - eio3(ph));
      coin.position.set(x, 0.57 + Math.sin(ph * Math.PI) * 1.0, 1.55); coin.rotation.z = ph * Math.PI * 2 * dir;
    },
    labels: (u, t) => [
      { v3: top.localToWorld(new THREE.Vector3(-0.9, 2.1, -0.4)), lines: [['BID', 22, 500, MONO, C.g500], ['1.0012', 40, 500, DISPLAY, C.black]] },
      { v3: top.localToWorld(new THREE.Vector3(0.9, 2.1, -0.4)), lines: [['ASK', 22, 500, MONO, C.g500], ['1.0015', 40, 500, DISPLAY, C.mauve]] },
      { v3: top.localToWorld(new THREE.Vector3(0, 0.9, 1.55)), lines: [['LOAN 50,000 @ 4.2%', 22, 500, MONO, C.purple]] },
    ],
    frosts: [pn],
  });
})();

// 04 on-chain voting: ballots drop into a box, the tally stays hidden
(function st3() {
  const { grp, top } = turntable(3);
  const box = mesh(new RoundedBoxGeometry(1.5, 1.15, 1.1, 4, 0.06), M.clay, -1.15, 0.58, 0.6, top);
  mesh(new THREE.BoxGeometry(0.8, 0.02, 0.1), M.dark, -1.15, 1.165, 0.6, top);
  const ballots = [0, 1, 2, 3, 4].map((k) => { const m = mesh(new THREE.BoxGeometry(0.62, 0.42, 0.02), k % 2 ? M.mauve : M.clay, -1.15, 3, 0.6, top); return m; });
  mesh(new THREE.BoxGeometry(1.2, 0.12, 0.5), M.grey, 1.0, 0.06, -0.3, top);
  const board = mesh(new RoundedBoxGeometry(2.3, 1.6, 0.1, 4, 0.08), M.dark, 1.0, 0.98, -0.3, top);
  const pn = glassPanel(top, 2.7, 2.0, 1.0, 1.1, 0.2);
  stations.push({
    grp, top, pn,
    update(u, t) {
      ballots.forEach((m, k) => {
        const per = 0.5, ph = ((t - k * per) % 2.5 + 2.5) % 2.5;   // one ballot per beat, cycle of 5
        const f = ei2(clamp(ph / 0.45));
        m.position.y = lerp(3.2, 1.0, f); m.visible = ph < 0.45; m.rotation.y = 0.2 * Math.sin(k);
      });
    },
    labels: () => [{ v3: board.localToWorld(new THREE.Vector3(-0.95, 0.5, 0.06)), lines: [['TALLY', 22, 500, MONO, '#A4A3A1'], ['YES   312', 46, 500, DISPLAY, '#FFFFFF'], ['NO    288', 46, 500, DISPLAY, '#D4D4D4']], align: 'left' }],
    frosts: [pn],
  });
})();

// 05 controlled data access: the data is frosted; only the key lens sees through
(function st4() {
  const { grp, top } = turntable(4);
  mesh(new THREE.BoxGeometry(1.6, 0.12, 0.5), M.grey, 0, 0.06, -0.5, top);
  const board = mesh(new RoundedBoxGeometry(3.4, 1.9, 0.1, 4, 0.08), M.dark, 0, 1.12, -0.5, top);
  const pn = glassPanel(top, 3.8, 2.3, 0, 1.25, 0.05);
  const lens = new THREE.Group(); top.add(lens);
  const ring = mesh(new THREE.TorusGeometry(0.42, 0.06, 16, 64), M.mauve, 0, 0, 0, lens);
  const handle = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 12), M.purple, 0.45, -0.45, 0, lens); handle.rotation.z = Math.PI / 4;
  const lensPath = (u) => { const k = eio3(p(u, 2.0, 3.4)); return new THREE.Vector3(lerp(-1.3, -0.35, k), lerp(1.75, 1.43, k), 0.6); };
  stations.push({
    grp, top, pn,
    update(u) { const v = lensPath(u); lens.position.copy(v); lens.visible = u > 1.6 || u < -50; lens.scale.setScalar(back(p(u, 1.6, 2.0))); },
    labels: () => [{ v3: board.localToWorld(new THREE.Vector3(-1.5, 0.62, 0.06)), lines: [
      ['ACCOUNT          BALANCE', 20, 500, MONO, '#A4A3A1'], ['0x7f3a…c21e   98,112.47', 30, 400, MONO, '#FFFFFF'], ['0x51b0…9e04   12,004.10', 30, 400, MONO, '#FFFFFF'],
      ['0x9c2d…11af      441.00', 30, 400, MONO, '#FFFFFF'], ['0xe810…7b3c    6,250.75', 30, 400, MONO, '#FFFFFF']], align: 'left', lh: 1.45 }],
    frosts: [pn],
    hole: (u) => (u > 1.9 || u < -50 ? { v3: lens.localToWorld(new THREE.Vector3(0, 0, 0)), r: 0.36 } : null),
    chip: (u) => (u > 3.5 || u < -50 ? { v3: top.localToWorld(new THREE.Vector3(0.9, 2.65, 0.6)), text: 'ACCESS GRANTED' } : null),
  });
})();

// the single token of "More than just private transactions"
const tokenGrp = new THREE.Group(); tokenGrp.position.set(TOKEN_X, TT, 0); scene.add(tokenGrp);
mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.2, 80), M.clay, 0, 0.1, 0, tokenGrp);
const bigCoin = mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.2, 80), M.mauve, 0, 1.25, 0, tokenGrp); bigCoin.rotation.x = Math.PI / 2;
const coinFace = new THREE.Mesh(new THREE.CircleGeometry(0.7, 64), M.purple); coinFace.position.z = 0.101; bigCoin.add(coinFace); coinFace.rotation.x = -Math.PI / 2; coinFace.rotation.set(Math.PI / 2, 0, 0);

// the contract block (tools)
const contract = new THREE.Group(); contract.position.set(18, TT, 7.2); scene.add(contract);
const cBlock = mesh(new RoundedBoxGeometry(2.6, 1.0, 2.6, 4, 0.12), M.purple, 0, 0.5, 0, contract);
mesh(new RoundedBoxGeometry(1.6, 0.3, 1.6, 4, 0.08), M.mauve, 0, 1.15, 0, contract);

// =====================================================================================
// 2D
// =====================================================================================
const out = document.getElementById('out');
const ctx = out.getContext('2d');
const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const tctx = tmp.getContext('2d');
const tmp2 = document.createElement('canvas'); tmp2.width = W; tmp2.height = H; const t2 = tmp2.getContext('2d');
let PAGE = '#f7f7f7'; // sampled from the GL background at boot so 2D and 3D pages match
const font = (s, w = 500, f = DISPLAY) => `${w} ${s}px ${f}`;
function toScreen(v) { const q = v.clone().project(camera); return [(q.x * 0.5 + 0.5) * W, (-q.y * 0.5 + 0.5) * H, q.z]; }

// mask-rise: each word rises from behind a baseline mask (hard out-quint), the Swiss counterpart of a fade
function maskRise(lines, x, y, t, t0, { align = 'left', gap = 0.06, dur = 0.55, lh = 1.08, tOut = 1e9, outDur = 0.4, wipe = false, color = C.black } = {}) {
  let k = 0, yy = y;
  lines.forEach((ln) => {
    const size = ln.size, words = ln.text.split(' ');
    ctx.save(); ctx.font = font(size, ln.weight ?? 600, ln.fam ?? DISPLAY); ctx.letterSpacing = (ln.ls ?? -size * 0.035) + 'px'; ctx.textBaseline = 'alphabetic';
    const sp = ctx.measureText(' ').width, ws = words.map((w) => ctx.measureText(w).width);
    const tot = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
    let xx = align === 'center' ? x - tot / 2 : x;
    const outK = eio5(p(t, tOut, tOut + outDur));
    words.forEach((w, i) => {
      const st = t0 + (ln.delay ?? 0) + k * gap;
      const q = eo5(p(t, st, st + dur));
      if (q > 0 && outK < 1) {
        ctx.save();
        ctx.beginPath(); ctx.rect(xx - 10, yy - size * 1.05, ws[i] + 20, size * 1.35); ctx.clip();
        const acc = ln.accent && ln.accent.includes(w.replace(/[.,:?]/g, ''));
        ctx.fillStyle = acc ? C.mauve : (ln.color ?? color);
        ctx.fillText(w, xx, yy + (1 - q) * size * 1.1 - outK * size * 1.2);
        if (wipe) { // a mauve block wipes across the word as it lands
          const a = p(t, st, st + 0.16), b = p(t, st + 0.14, st + 0.34);
          if (a > 0 && b < 1) { ctx.fillStyle = C.mauve; const x0 = xx - 6 + (ws[i] + 12) * eo3(b), x1 = xx - 6 + (ws[i] + 12) * eo3(a); ctx.fillRect(x0, yy - size * 0.8, Math.max(0, x1 - x0), size * 0.95); }
        }
        ctx.restore();
      }
      xx += ws[i] + sp; k++;
    });
    ctx.restore(); yy += size * lh;
  });
}
function label(txt, x, y, { size = 24, color = C.g500, weight = 500, fam = MONO, ls = 4, align = 'left', a = 1 } = {}) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.font = font(size, weight, fam); ctx.letterSpacing = ls + 'px'; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y); ctx.restore();
}
// world labels: text pinned to 3D points (they are what the frost hides)
function worldLabel(L, a = 1) {
  const [sx, sy, z] = toScreen(L.v3); if (z > 1 || a <= 0) return;
  const d = camera.position.distanceTo(L.v3); const sc = clamp(13 / d, 0.45, 1.4);
  let yy = sy;
  ctx.save(); ctx.globalAlpha = a; ctx.textBaseline = 'top'; ctx.textAlign = L.align === 'left' ? 'left' : 'center';
  L.lines.forEach(([txt, size, w, fam, col]) => { ctx.font = font(size * sc, w, fam); ctx.letterSpacing = (fam === MONO ? 2 : -1) * sc + 'px'; ctx.fillStyle = col; ctx.fillText(txt, sx, yy); yy += size * sc * (L.lh ?? 1.2); });
  ctx.restore();
}
// frost: blur what is already on the canvas inside a projected quad, tint it, light its edge
function frostQuad(corners, k, hole = null, edgeA = 1) {
  if (k <= 0.001) return;
  const pts = corners.map((v) => toScreen(v));
  ctx.save();
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
  if (hole) { const [hx, hy] = toScreen(hole.v3); const e = toScreen(hole.v3.clone().add(new THREE.Vector3(hole.r, 0, 0))); const r = Math.hypot(e[0] - hx, e[1] - hy); ctx.moveTo(hx + r, hy); ctx.arc(hx, hy, r, 0, Math.PI * 2, true); }
  ctx.clip('evenodd');
  ctx.filter = `blur(${(16 * k).toFixed(1)}px)`; ctx.drawImage(tmp, 0, 0); ctx.filter = 'none';
  ctx.fillStyle = `rgba(255,255,255,${0.42 * k})`; ctx.fillRect(0, 0, W, H);
  // fine frost grain
  ctx.globalAlpha = 0.5 * k; ctx.drawImage(grain, Math.floor(hash(k * 7) * 64), 0); ctx.globalAlpha = 1;
  ctx.restore();
  ctx.save(); ctx.globalAlpha = edgeA;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2;
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke();
  ctx.restore();
}
// fine noise tile for the frost surface (deterministic)
const grain = document.createElement('canvas'); grain.width = W + 64; grain.height = H;
(function () { const g = grain.getContext('2d'); const id = g.createImageData(grain.width, H); for (let i = 0; i < id.data.length; i += 4) { const v = hash(i * 0.37) * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 26; } g.putImageData(id, 0, 0); })();

// tilt-shift: blur the top and bottom bands of the world (miniature look)
function tiltShift(amt = 1, center = 0.55) {
  if (amt <= 0) return;
  t2.clearRect(0, 0, W, H); t2.filter = `blur(${(7 * amt).toFixed(1)}px)`; t2.drawImage(out, 0, 0); t2.filter = 'none';
  t2.globalCompositeOperation = 'destination-in';
  const g = t2.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(Math.max(0, center - 0.32), 'rgba(0,0,0,0)'); g.addColorStop(Math.min(1, center + 0.3), 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  t2.fillStyle = g; t2.fillRect(0, 0, W, H); t2.globalCompositeOperation = 'source-over';
  ctx.drawImage(tmp2, 0, 0);
}
function hMotionBlur(k) {
  if (k <= 0.02) return;
  tctx.clearRect(0, 0, W, H); tctx.drawImage(out, 0, 0);
  for (let i = 1; i <= 6; i++) { ctx.globalAlpha = 0.22; ctx.drawImage(tmp, -i * k * 9, 0); ctx.drawImage(tmp, i * k * 9, 0); }
  ctx.globalAlpha = 1;
}
function grid12(a, t, t0 = 0) {
  if (a <= 0) return;
  ctx.save(); ctx.strokeStyle = `rgba(22,22,22,${0.07 * a})`; ctx.lineWidth = 1;
  const m = 150, cw = (W - 2 * m) / 12;
  for (let i = 0; i <= 12; i++) { const k = eo3(p(t, t0 + i * 0.03, t0 + 0.6 + i * 0.03)); const x = Math.round(m + i * cw) + 0.5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H * k); ctx.stroke(); }
  ctx.restore();
}
// the logo, flat (brand mark), drawn from its five facets
const FACETS = [
  [[[199, 49], [275, 90], [265, 192], [195, 100]], '#6E4A5B'], [[[118, 190], [190, 59], [188, 99], [118, 193]], '#5E3F4E'],
  [[[95, 233], [190, 107], [263, 203], [167, 345]], C.purple], [[[271, 197], [280, 108], [300, 229]], '#A08896'],
  [[[170, 353], [269, 206], [300, 248], [261, 354]], C.mauve],
];
function flatLogo(cx, cy, size, t, t0) {
  const s = size / 305;
  FACETS.forEach(([pts, col], i) => {
    const mx = pts.reduce((a, q) => a + q[0], 0) / pts.length - 197.5, my = pts.reduce((a, q) => a + q[1], 0) / pts.length - 201.5;
    const st = t0 - 0.45 + i * 0.06, k = eo5(p(t, st, t0 + i * 0.03));
    if (k <= 0) return;
    const ang = Math.atan2(my, mx), dist = (1 - k) * 260;
    ctx.save(); ctx.translate(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist); ctx.rotate((1 - k) * (hash(i) - 0.5) * 1.2); ctx.globalAlpha = k;
    ctx.fillStyle = col; ctx.beginPath(); pts.forEach(([x, y], j) => { const X = (x - 197.5) * s - 0 , Y = (y - 201.5) * s; j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); ctx.fill();
    ctx.restore();
  });
}

// =====================================================================================
// camera: one keyframed path for the whole film (the oner)
// =====================================================================================
const STA = (i) => ({ pos: [XS[i] + 6.0, 6.0, 13.6], tgt: [XS[i] + 0.3, 1.25, 0], off: -0.2 });
const K = [];
const key = (t, k) => K.push({ t, ...k });
key(6.0, { pos: [TOKEN_X + 3.6, 2.9, 9.0], tgt: [TOKEN_X, 1.2, 0], off: -0.16 });
key(10.3, { pos: [TOKEN_X + 2.8, 2.6, 7.6], tgt: [TOKEN_X, 1.2, 0], off: -0.16 });
key(11.2, { pos: [-6, 10.5, 25], tgt: [14, 0.5, -1.5], off: 0 });
key(12.3, { pos: [-5, 10, 24], tgt: [14, 0.5, -1.5], off: 0 });
for (let i = 0; i < 5; i++) { const s0 = TL.USE0 + i * TL.USE_LEN; key(s0, STA(i)); const h = STA(i); key(s0 + 4.3, { pos: [h.pos[0] + 0.6, h.pos[1] - 0.3, h.pos[2] - 0.7], tgt: h.tgt, off: h.off }); }
key(38.0, { pos: [XS[4] + 6.6, 5.7, 12.9], tgt: [XS[4] + 0.3, 1.25, 0], off: -0.2 });
key(40.0, { pos: [18, 27, 27], tgt: [18, 0, 1.2], off: 0 });
key(45.0, { pos: [17, 28, 26], tgt: [18, 0, 1.2], off: 0 });
key(45.9, { pos: [-7.5, 3.4, 12.5], tgt: [15, 1.0, -1], off: 0 });
key(52.0, { pos: [-4.5, 3.8, 12.0], tgt: [15, 1.0, -1], off: 0 });
key(60.0, { pos: [-3.0, 4.2, 11.6], tgt: [15, 1.0, -1], off: 0 });
function camAt(t) {
  let a = K[0], b = K[0];
  for (let i = 0; i < K.length - 1; i++) if (t >= K[i].t && t <= K[i + 1].t) { a = K[i]; b = K[i + 1]; break; }
  if (t > K[K.length - 1].t) a = b = K[K.length - 1];
  const moving = b.t - a.t < 1.6;               // short gaps are moves (eased hard), long ones are slow drifts (linear-ish)
  const u = a === b ? 0 : moving ? eio3(p(t, a.t, b.t)) : p(t, a.t, b.t);
  const L = (x, y) => x.map((v, i) => lerp(v, y[i], u));
  const pos = L(a.pos, b.pos), tgt = L(a.tgt, b.tgt), off = lerp(a.off, b.off, u);
  camera.position.set(...pos); camera.up.set(0, 1, 0); camera.lookAt(...tgt);
  camera.updateProjectionMatrix();
  if (Math.abs(off) > 1e-4) camera.setViewOffset(W, H, off * W, 0, W, H); else camera.clearViewOffset();
  const speed = moving ? Math.sin(p(t, a.t, b.t) * Math.PI) : 0;
  sun.position.set(tgt[0] - 9, 13, tgt[2] - 6); sun.target.position.set(tgt[0], 0, tgt[2]);
  return speed;
}

// =====================================================================================
// state per frame
// =====================================================================================
function stationLocal(i, t) { return t - (TL.USE0 + i * TL.USE_LEN); }
function frostK(i, t) {
  if (t < S.uses[0]) return 0;
  const u = stationLocal(i, t);
  let k = eo3(p(u, TL.FROST_AT, TL.FROST_AT + 0.7));         // wipe-in on its own station
  k *= 1 - eio3(p(t, S.transp[0], S.transp[0] + 0.7));        // glass clears for "transparency"
  return k;
}

function render(t) {
  // ---- world animation
  const speed = camAt(t);
  stations.forEach((s, i) => {
    const u = t >= S.uses[0] ? stationLocal(i, t) : -99;
    s.update(u < -1 && t < S.uses[0] ? -99 : u, t);
    s.top.rotation.y = 0.42 + 0.1 * Math.sin(t * 0.5 + i);
  });
  bigCoin.rotation.z = t * 0.9; bigCoin.position.y = 1.3 + 0.06 * Math.sin(t * 2);
  const cRise = back(p(t, 39.3, 39.9));
  contract.visible = t > 39.2 && t < 45.5; contract.scale.setScalar(Math.max(0.001, cRise));
  composer.render(1 / TL.FPS);

  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = PAGE; ctx.fillRect(0, 0, W, H);

  const inTitle = t < S.title[1];
  const push = eio3(p(t, 5.55, 6.05));   // title pushes up, the world rises from below
  if (!inTitle || push > 0) {
    ctx.save(); ctx.translate(0, inTitle ? H * (1 - push) : 0);
    ctx.drawImage(glCanvas, 0, 0);
    tiltShift(t > S.tools[0] + 1 && t < S.tools[1] ? 0.5 : 1, 0.56);
    // world labels (readable when glass is clear)
    stations.forEach((s, i) => {
      const vis = clamp(1 - Math.abs(XS[i] - camera.position.x + 6.0) / 26);
      const a = (t > 10.6 ? 1 : 0) * (t >= S.uses[0] ? 1 : p(t, 11.0, 11.6));
      s.labels(t >= S.uses[0] ? stationLocal(i, t) : 0, t).forEach((L) => worldLabel(L, a * Math.max(vis, t > S.transp[0] ? 1 : 0)));
    });
    // extra exposure tags for "transparency": addresses and amounts everywhere
    if (t > S.transp[0] + 0.8 && t < S.conf[0] + 0.9) {
      for (let k = 0; k < 18; k++) {
        const ap = eo3(p(t, S.transp[0] + 1.0 + k * 0.17, S.transp[0] + 1.3 + k * 0.17));
        if (ap <= 0) continue;
        const v = new THREE.Vector3(-4 + hash(k * 3.3) * 40, 2.6 + hash(k * 5.1) * 2.2, -3 + hash(k * 7.7) * 4);
        const [sx, sy, z] = toScreen(v); if (z > 1) continue;
        const txt = ['0x' + Math.floor(hash(k) * 0xffff).toString(16).padStart(4, '0') + '…' + Math.floor(hash(k * 9) * 0xffff).toString(16).padStart(4, '0'), (hash(k * 2) * 90000).toFixed(2) + ' sUSD', 'vote: ' + (k % 2 ? 'YES' : 'NO'), 'pos: ' + (hash(k * 4) * 500).toFixed(0) + ' ETH'][k % 4];
        ctx.save(); ctx.globalAlpha = ap; ctx.font = font(22, 500, MONO); ctx.letterSpacing = '1px';
        const w = ctx.measureText(txt).width + 24;
        ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.strokeStyle = 'rgba(22,22,22,0.18)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(sx - w / 2, sy - 18 - (1 - ap) * 14, w, 36, 18); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.black; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, sx, sy - (1 - ap) * 14);
        ctx.restore();
      }
    }
    // frost panels
    tctx.clearRect(0, 0, W, H); tctx.drawImage(out, 0, 0);
    stations.forEach((s, i) => {
      const k = frostK(i, t);
      const hole = s.hole ? s.hole(t >= S.uses[0] ? stationLocal(i, t) : -99) : null;
      if (k > 0) frostQuad(panelCorners(s.pn, k), Math.min(1, k * 1.3), t < S.transp[0] ? hole : null);
      if (s.chip) {
        const c = s.chip(stationLocal(i, t)); const u = stationLocal(i, t);
        if (c && t < S.uses[1] + 0.2) {
          const [sx, sy] = toScreen(c.v3); const a = eo3(p(u, 3.5, 3.8));
          ctx.save(); ctx.globalAlpha = a; ctx.font = font(22, 500, MONO); ctx.letterSpacing = '4px';
          const w = ctx.measureText(c.text).width + 56;
          ctx.fillStyle = C.mauve; ctx.beginPath(); ctx.roundRect(sx - w / 2, sy - 22, w, 44, 22); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓  ' + c.text, sx, sy + 1); ctx.restore();
        }
      }
    });
    hMotionBlur(speed * (t > S.uses[0] && t < S.uses[1] ? 1 : 0.6));
    ctx.restore();
  }

  // ---- type layers per scene
  if (inTitle) titleCard(t, push);
  if (t >= S.more[0] && t < S.more[1]) moreCard(t);
  if (t >= S.uses[0] && t < S.uses[1]) useCard(t);
  if (t >= S.tools[0] && t < S.tools[1]) toolsCard(t);
  if (t >= S.transp[0] && t < S.transp[1]) transpCard(t);
  if (t >= S.conf[0] - 0.01) confCard(t);
}

function scrimLeft(a = 1) {
  const g = ctx.createLinearGradient(0, 0, 980, 0); g.addColorStop(0, `rgba(250,250,250,${0.7 * a})`); g.addColorStop(0.6, `rgba(250,250,250,${0.35 * a})`); g.addColorStop(1, 'rgba(250,250,250,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 980, H);
}
function scrimTop(a = 1, h = 420) {
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, `rgba(250,250,250,${0.95 * a})`); g.addColorStop(0.6, `rgba(250,250,250,${0.7 * a})`); g.addColorStop(1, 'rgba(250,250,250,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, h);
}

function titleCard(t, push) {
  ctx.save(); ctx.translate(0, -H * push);
  ctx.fillStyle = PAGE; ctx.fillRect(0, 0, W, H);
  grid12(1, t, 0.05);
  // caret then the question
  const typed = 'build'.slice(0, Math.floor(p(t, 0.0, 0.5) * 5 + 0.0001));
  const ca = t < 0.95;
  if (ca) {
    ctx.font = font(34, 500, MONO); ctx.fillStyle = C.g500; ctx.textBaseline = 'middle'; ctx.fillText('> ' + typed, 150, 300);
    if (Math.floor(t * 4) % 2 === 0) { const w = ctx.measureText('> ' + typed).width; ctx.fillStyle = C.mauve; ctx.fillRect(150 + w + 6, 282, 16, 36); }
  }
  const tOut = 5.25;
  label('DEVELOPERS  ·  SEISMIC', 150, 250, { a: eo3(p(t, 1.05, 1.5)) * (1 - p(t, tOut, tOut + 0.3)), color: C.g500 });
  maskRise([
    { text: 'What can developers', size: 150 },
    { text: 'actually build on', size: 150, delay: 0.45 },
    { text: '@SeismicSys?', size: 150, delay: 0.85, accent: ['@SeismicSys'] },
  ], 150, 470, t, 1.0, { gap: 0.07, wipe: true, tOut, outDur: 0.35 });
  // the punch on the hit: a 2-frame scale pulse on the whole card is replaced by a mauve bar that slams in
  const bar = eo5(p(t, 1.0, 1.25)) * (1 - eio3(p(t, tOut, tOut + 0.3)));
  ctx.fillStyle = C.mauve; ctx.fillRect(150, 920, 380 * bar, 10);
  ctx.restore();
}

function moreCard(t) {
  const u = t - S.more[0];
  scrimLeft(1 - p(t, 10.2, 10.6));
  label('NOT JUST', 150, 330, { a: eo3(p(u, 0.4, 0.8)) * (1 - p(t, 10.0, 10.3)), color: C.mauve, size: 26 });
  maskRise([{ text: 'More than just', size: 104 }, { text: 'private transactions.', size: 104, accent: ['private'] }], 150, 470, t, S.more[0] + 0.45, { tOut: 10.0, outDur: 0.35 });
  // chip by the coin
  const [cx, cy] = toScreen(new THREE.Vector3(TOKEN_X, 2.6, 0)); const a = eo3(p(u, 0.9, 1.3)) * (1 - p(t, 10.0, 10.3));
  if (a > 0) { ctx.save(); ctx.globalAlpha = a; ctx.font = font(22, 500, MONO); ctx.letterSpacing = '4px'; const w = ctx.measureText('PRIVATE TX').width + 48; ctx.fillStyle = C.black; ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - 22, w, 44, 22); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('PRIVATE TX', cx, cy + 1); ctx.restore(); }
  // "Think about:" over the wide reveal
  scrimTop(p(t, 10.6, 11.0) * (1 - p(t, 12.6, 13)), 360);
  maskRise([{ text: 'Think about:', size: 120, accent: ['about'] }], W / 2, 230, t, 10.75, { align: 'center', tOut: 12.55, outDur: 0.35 });
}

function useCard(t) {
  const i = Math.min(4, Math.floor((t - TL.USE0) / TL.USE_LEN)), u = stationLocal(i, t);
  const d = TL.USES[i];
  const tOut = 4.15;
  scrimLeft(eo3(p(u, -0.2, 0.3)) * (1 - p(u, 4.6, 5.0) * (i === 4 ? 1 : 0)));
  // index: huge outlined number + counter
  const na = eo5(p(u, 0.05, 0.6)) * (1 - p(u, tOut, tOut + 0.3));
  if (na > 0) {
    ctx.save(); ctx.globalAlpha = na; ctx.font = font(260, 600, DISPLAY); ctx.letterSpacing = '-12px'; ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 2; ctx.strokeStyle = C.mauve; ctx.strokeText(d.n, 140, 470 + (1 - na) * 40);
    ctx.restore();
    label(`${d.n} / 05`, 150, 560, { a: na, color: C.g500 });
    // progress ticks
    for (let k = 0; k < 5; k++) { ctx.fillStyle = k <= i ? C.mauve : C.g300; ctx.globalAlpha = na; ctx.fillRect(300 + k * 34, 557, 26, 4); ctx.globalAlpha = 1; }
  }
  maskRise([{ text: d.title[0], size: 84 }, { text: d.title[1], size: 84, color: C.g500 }], 150, 680, t, TL.USE0 + i * TL.USE_LEN + 0.25, { gap: 0.05, tOut: TL.USE0 + i * TL.USE_LEN + tOut, outDur: 0.3 });
  // tiny status line under the title, flips to PRIVATE when the glass frosts
  const fr = p(u, TL.FROST_AT, TL.FROST_AT + 0.4);
  const sa = eo3(p(u, 0.6, 1.0)) * (1 - p(u, tOut, tOut + 0.3));
  if (sa > 0) {
    ctx.save(); ctx.globalAlpha = sa; ctx.fillStyle = fr > 0.5 ? C.mauve : C.g400; ctx.beginPath(); ctx.arc(158, 880, 7, 0, 7); ctx.fill(); ctx.restore();
    label(fr > 0.5 ? 'CONFIDENTIAL' : 'PUBLIC', 180, 880, { a: sa, color: fr > 0.5 ? C.mauve : C.g400, size: 24 });
  }
}

function toolsCard(t) {
  const u = t - S.tools[0];
  scrimTop(eo3(p(u, 0.6, 1.2)) * (1 - p(t, S.tools[1] - 0.4, S.tools[1])), 460);
  maskRise([{ text: 'Seismic gives developers the tools', size: 76 }, { text: 'to bring privacy into smart contracts.', size: 76, accent: ['privacy'], color: C.g500 }],
    150, 190, t, S.tools[0] + 0.9, { gap: 0.04, tOut: S.tools[1] - 0.45, outDur: 0.35 });
  // wires: every station to the contract block, data dots travelling inward
  const [cx, cy] = toScreen(new THREE.Vector3(18, TT + 1.3, 7.2));
  const wa = eo3(p(u, 1.6, 2.4)) * (1 - p(t, S.tools[1] - 0.4, S.tools[1]));
  if (wa > 0) {
    stations.forEach((s, i) => {
      const [sx, sy] = toScreen(new THREE.Vector3(XS[i], TT + 2.6, 0));
      const g = eo3(p(u, 1.6 + i * 0.12, 2.3 + i * 0.12));
      const mx = (sx + cx) / 2, my = Math.max(sy, cy) + 60;
      ctx.save(); ctx.globalAlpha = wa; ctx.strokeStyle = C.mauve; ctx.lineWidth = 2.5; ctx.setLineDash([2, 10]); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, sy);
      const N = 30; for (let k = 1; k <= N * g; k++) { const q = k / N; const x = (1 - q) ** 2 * sx + 2 * (1 - q) * q * mx + q * q * cx, y = (1 - q) ** 2 * sy + 2 * (1 - q) * q * my + q * q * cy; ctx.lineTo(x, y); }
      ctx.stroke(); ctx.setLineDash([]);
      const q = ((t * 0.7 + i * 0.2) % 1); const x = (1 - q) ** 2 * sx + 2 * (1 - q) * q * mx + q * q * cx, y = (1 - q) ** 2 * sy + 2 * (1 - q) * q * my + q * q * cy;
      if (g >= 1) { ctx.fillStyle = C.purple; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); }
      ctx.fillStyle = C.mauve; ctx.beginPath(); ctx.arc(sx, sy, 6, 0, 7); ctx.fill();
      ctx.restore();
    });
    label('SMART CONTRACT', cx, cy + 92, { a: wa, color: C.black, align: 'center', size: 24 });
    label('shielded types', cx, cy + 126, { a: wa, color: C.g500, align: 'center', size: 20, ls: 2 });
  }
}

function transpCard(t) {
  scrimTop(eo3(p(t, S.transp[0] + 0.5, S.transp[0] + 1.0)), 430);
  maskRise([{ text: 'The next generation of Web3 applications', size: 76 }, { text: 'needs more than transparency.', size: 76, accent: ['transparency'] }],
    W / 2, 200, t, S.transp[0] + 0.7, { align: 'center', gap: 0.04, tOut: S.conf[0] - 0.5, outDur: 0.3 });
}

function confCard(t) {
  const u = t - S.conf[0];
  // the frost wave: everything behind the front blurs and goes milky; a bright refracting edge leads it
  const wx = lerp(-140, W + 200, eio3(p(t, S.conf[0], S.conf[0] + 0.95)));
  tctx.clearRect(0, 0, W, H); tctx.drawImage(out, 0, 0);
  ctx.save();
  ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(wx + 120, 0); ctx.lineTo(wx - 120, H); ctx.lineTo(-10, H); ctx.closePath(); ctx.clip();
  ctx.filter = 'blur(26px)'; ctx.drawImage(tmp, 0, 0); ctx.filter = 'none';
  ctx.fillStyle = 'rgba(252,252,252,0.62)'; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.6; ctx.drawImage(grain, 0, 0); ctx.globalAlpha = 1;
  ctx.restore();
  if (u < 1.1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(wx - 80, 0, wx + 80, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(wx + 40, 0); ctx.lineTo(wx + 200, 0); ctx.lineTo(wx - 40, H); ctx.lineTo(wx - 200, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(130,90,109,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx + 120, 0); ctx.lineTo(wx - 120, H); ctx.stroke();
    ctx.restore();
  }
  // type then the mark
  const tOut = TL.LOGO_AT - 0.55;
  maskRise([{ text: 'It needs', size: 110, weight: 500, color: C.g500 }, { text: 'confidentiality, too.', size: 150, accent: ['confidentiality'] }], W / 2, 480, t, S.conf[0] + 0.6, { align: 'center', gap: 0.08, tOut, outDur: 0.4 });
  flatLogo(W / 2, 470, 330, t, TL.LOGO_AT);
  label('@SeismicSys', W / 2, 720, { a: eo3(p(t, TL.LOGO_AT + 0.25, TL.LOGO_AT + 0.7)), color: C.black, align: 'center', size: 34, ls: 3 });
  const lw = 220 * eo3(p(t, TL.LOGO_AT + 0.35, TL.LOGO_AT + 0.9)); ctx.fillStyle = C.mauve; ctx.fillRect(W / 2 - lw / 2, 668, lw, 3);
  const fade = eio3(p(t, S.conf[1] - 0.9, S.conf[1]));
  if (fade > 0) { ctx.fillStyle = `rgba(252,252,252,${fade})`; ctx.fillRect(0, 0, W, H); }
}

window.render = render; window.DUR = TL.DUR;
(async () => {
  await Promise.all(['500 20px "Inter Display"', '600 20px "Inter Display"', '400 20px "JB Mono"', '500 20px "JB Mono"'].map((f) => document.fonts.load(f)));
  render(20);
  // sample the GL page colour so 2D cards match the 3D studio exactly
  const c = document.createElement('canvas'); c.width = 1; c.height = 1; const g = c.getContext('2d');
  camera.position.set(0, 60, 0); camera.lookAt(0, 200, 0); camera.clearViewOffset(); composer.render();
  g.drawImage(glCanvas, W / 2, 5, 1, 1, 0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; PAGE = `rgb(${d[0]},${d[1]},${d[2]})`;
  for (const tt of [3, 8, 15, 25, 35, 41, 48, 55]) render(tt);
  window.READY = true;
  if (!location.search.includes('render')) { const q = new URLSearchParams(location.search); render(parseFloat(q.get('t') || '15')); }
})();
