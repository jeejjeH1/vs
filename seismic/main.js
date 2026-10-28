// Seismic — "What should remain private?" Cinematic motion film. render(t) is pure: same t -> same frame.
// 3D (three.js + postprocessing) renders into an offscreen WebGL canvas; type and light FX are drawn on a 2D canvas on top.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ChromaticAberrationEffect, ToneMappingEffect, ToneMappingMode } from 'postprocessing';

const TL = window.TL;
const W = 1920, H = 1080;
const S = TL.SCENES;

// ---------- brand palette (from the colour sheet)
const C = {
  mauve: '#825A6D', purple: '#523542', white: '#FFFFFF', g50: '#FCFCFC', g200: '#E8E8E8', g300: '#D4D4D4',
  g400: '#A4A3A1', g500: '#737373', g800: '#282826', black: '#161616',
  mauveLt: '#C39AAE',   // mauve lifted for type on black (same hue, readable)
  glow: '#F2D6E3',      // the light inside the stone
};
const DISPLAY = "'Inter Display', Inter, sans-serif";
const MONO = "'JB Mono', 'JetBrains Mono', monospace";

// ---------- math
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const p = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, x) => a + (b - a) * x;
const eo3 = (x) => 1 - Math.pow(1 - x, 3);
const eo5 = (x) => 1 - Math.pow(1 - x, 5);
const ei2 = (x) => x * x;
const ei3 = (x) => x * x * x;
const eio3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const back = (x, s = 1.3) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const smooth = (x) => x * x * (3 - 2 * x);
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// cubic-bezier(x1,y1,x2,y2) easing
function bez(x1, y1, x2, y2) {
  return (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const cx = 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3 - x;
      const d = 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t;
      if (Math.abs(d) < 1e-6) break;
      t = clamp(t - cx / d);
    }
    return 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
  };
}
const eFrac = bez(0.42, 0, 0.3, 1);      // fracture landing (long deceleration)
const eDemote = bez(0.6, 0, 0.18, 1);    // title demote

// =====================================================================================
// GL
// =====================================================================================
const glCanvas = document.createElement('canvas');
glCanvas.width = W; glCanvas.height = H; glCanvas.id = 'gl';
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance', stencil: false, depth: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 200);

const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
composer.addPass(new RenderPass(scene, camera));
const bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.62, luminanceSmoothing: 0.25, intensity: 1.1, radius: 0.72, levels: 7 });
const tone = new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL ?? ToneMappingMode.ACES_FILMIC });
composer.addPass(new EffectPass(camera, bloom, tone));
const ca = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0, 0), radialModulation: true, modulationOffset: 0.15 });
composer.addPass(new EffectPass(camera, ca));

// ---------- studio environments: strip lights baked to PMREM (no HDRI clutter on metal)
const pmrem = new THREE.PMREMGenerator(renderer);
function stripEnv(light) {
  const es = new THREE.Scene();
  es.background = new THREE.Color(light ? 0x8a8a8a : 0x000000);
  const strip = (w, h, pos, k, tint = [1, 1, 1]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k * tint[0], k * tint[1], k * tint[2]), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); es.add(m);
  };
  if (light) {
    strip(30, 10, [0, 12, 0], 3.0); strip(20, 20, [0, 0, 14], 1.6); strip(20, 20, [-14, 2, 0], 1.2); strip(20, 20, [14, 2, 0], 1.4);
  } else {
    strip(1.2, 14, [-7, 0, -5], 6.0);           // tall strips behind: silhouettes
    strip(1.2, 14, [7, 0, -5], 5.0);
    strip(14, 3.5, [0, 9, 1], 2.4);             // soft top box
    strip(30, 0.8, [0, -1, -10], 2.0, [1, 0.82, 0.92]); // far horizon rim, faint mauve
    strip(3, 6, [-5, 2, 7], 0.9);               // weak front card
  }
  const rt = pmrem.fromScene(es, 0.03);
  return rt.texture;
}
const envDark = stripEnv(false);
const envLight = stripEnv(true);

function gradientTex(stops, cx = 0.5, cy = 0.42, r = 0.9) {
  const c = document.createElement('canvas'); c.width = 960; c.height = 540;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(cx * 960, cy * 540, 0, cx * 960, cy * 540, r * 960);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, 960, 540);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
const bgDark = gradientTex([[0, '#221b20'], [0.45, '#121012'], [1, '#070607']]);
const bgDarkLow = gradientTex([[0, '#1d171b'], [0.5, '#0f0d0f'], [1, '#060506']], 0.5, 0.75);
const bgLight = gradientTex([[0, '#ffffff'], [0.6, '#fbfbfb'], [1, '#ececec']], 0.6, 0.3, 1.1);

// ---------- lights
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-4, 6, 6); scene.add(key);
const rim = new THREE.PointLight(0xf2d6e3, 30, 30, 2); rim.position.set(0, 1, -3); scene.add(rim);
const sweep = new THREE.PointLight(0xffffff, 0, 14, 2); scene.add(sweep);
const sun = new THREE.DirectionalLight(0xffffff, 0); sun.position.set(-5, 10, 4); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); sun.shadow.radius = 6; sun.shadow.bias = -0.0004;
Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
scene.add(sun); scene.add(sun.target);
const amb = new THREE.HemisphereLight(0xffffff, 0x222222, 0); scene.add(amb);

// ---------- shared materials
const graphite = new THREE.MeshPhysicalMaterial({ color: 0x252225, metalness: 0.65, roughness: 0.33, clearcoat: 0.6, clearcoatRoughness: 0.15, envMapIntensity: 1.0 });
const glowMat = (hex, k = 1) => { const c = new THREE.Color(hex).multiplyScalar(k); return new THREE.MeshBasicMaterial({ color: c, toneMapped: false }); };
const lineMat = (hex, k = 1, op = 1) => new THREE.LineBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), transparent: op < 1, opacity: op, toneMapped: false });

// ---------- fake volumetric beam (additive cone, fresnel + length falloff + drifting density)
const beamMatProto = new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(1, 1, 1) }, uOpacity: { value: 1 }, uTime: { value: 0 } },
  vertexShader: `varying vec3 vN; varying vec3 vV; varying float vH; varying vec3 vW;
    void main(){ vH = uv.y; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz);
    vW = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform float uTime; varying vec3 vN; varying vec3 vV; varying float vH; varying vec3 vW;
    void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 2.2); float along = pow(vH, 1.7);
    float n = 0.72 + 0.28*sin(vW.x*2.1 + vW.y*1.3 + uTime*0.7)*sin(vW.z*1.7 - vW.y*0.9 - uTime*0.45);
    gl_FragColor = vec4(uColor * f * along * n * uOpacity, 1.0); }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});
function makeBeam(color, radius, height) {
  const g = new THREE.ConeGeometry(radius, height, 48, 1, true);
  const m = beamMatProto.clone(); m.uniforms.uColor.value = new THREE.Color(color);
  const mesh = new THREE.Mesh(g, m); mesh.userData.h = height; mesh.renderOrder = 10;
  return mesh;
}
const _up = new THREE.Vector3(0, -1, 0);
function aimBeam(b, from, to, op, time) {
  const dir = new THREE.Vector3().subVectors(to, from).normalize();
  b.quaternion.setFromUnitVectors(_up, dir);
  b.position.copy(from).addScaledVector(dir, b.userData.h / 2);
  b.material.uniforms.uOpacity.value = op; b.material.uniforms.uTime.value = time;
  b.visible = op > 0.001;
}

// ---------- dust motes (deterministic drift)
function makeDust(n, box, size, color) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (hash(i * 3.1) - 0.5) * box[0];
    pos[i * 3 + 1] = (hash(i * 5.7) - 0.5) * box[1];
    pos[i * 3 + 2] = (hash(i * 9.3) - 0.5) * box[2];
    seed[i] = hash(i * 1.37);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSize: { value: size }, uBoxY: { value: box[1] }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 } },
    vertexShader: `attribute float aSeed; uniform float uTime; uniform float uSize; uniform float uBoxY; varying float vA;
      void main(){ vec3 p = position; p.y = mod(p.y + uTime*(0.04+0.12*aSeed) + uBoxY*0.5, uBoxY) - uBoxY*0.5;
      p.x += sin(uTime*0.25 + aSeed*40.)*0.35; p.z += cos(uTime*0.2 + aSeed*17.)*0.25;
      vec4 mv = modelViewMatrix*vec4(p,1.); gl_PointSize = uSize*(0.35 + aSeed*aSeed*1.6)/max(0.5,-mv.z);
      vA = 0.25 + 0.75*fract(aSeed*7.31); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vA;
      void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5, 0.0, d); a *= a; gl_FragColor = vec4(uColor*a*vA*uOpacity, 1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; return pts;
}
const dust = makeDust(1400, [26, 14, 20], 46, 0xe9d3de); scene.add(dust);

// =====================================================================================
// The logo: five facets traced from the mark, extruded into a stone of metal; light lives in the gaps.
// =====================================================================================
const FACETS = [
  { pts: [[199, 49], [275, 90], [265, 192], [195, 100]], col: '#6E4A5B' },
  { pts: [[118, 190], [190, 59], [188, 99], [118, 193]], col: '#5E3F4E' },
  { pts: [[95, 233], [190, 107], [263, 203], [167, 345]], col: '#523542' },
  { pts: [[271, 197], [280, 108], [300, 229]], col: '#A08896' },
  { pts: [[170, 353], [269, 206], [300, 248], [261, 354]], col: '#825A6D' },
];
const LX = (x) => (x - 197.5) / 100, LY = (y) => -(y - 201.5) / 100;
function hull2(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of pts.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function makeLogo() {
  const grp = new THREE.Group();
  const pieces = [];
  FACETS.forEach((f, i) => {
    const pts = f.pts.map(([x, y]) => [LX(x), LY(y)]);
    const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length, cy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x - cx, y - cy)));
    const D = 0.3;
    const geo = new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.012, bevelSegments: 3 });
    geo.translate(0, 0, -D / 2);
    const mat = new THREE.MeshPhysicalMaterial({ color: f.col, metalness: 0.62, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.5 });
    const mesh = new THREE.Mesh(geo, mat);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), lineMat(C.glow, 1.4, 0));
    edge.material.transparent = true;
    const piv = new THREE.Group(); piv.add(mesh); piv.add(edge);
    piv.userData = { home: new THREE.Vector3(cx, cy, 0), idx: i, dist: Math.hypot(cx, cy) };
    grp.add(piv); pieces.push(piv);
  });
  // glow plate behind the facets: only seen through the gaps
  const all = []; FACETS.forEach((f) => f.pts.forEach(([x, y]) => all.push([LX(x), LY(y)])));
  const hs = hull2(all);
  const plate = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(hs.map(([x, y]) => new THREE.Vector2(x * 0.965, y * 0.965)))), glowMat(C.glow, 1));
  plate.position.z = -0.06; grp.add(plate);
  grp.userData = { pieces, plate };
  // wave order: pieces nearest the centre land first
  const order = pieces.slice().sort((a, b) => a.userData.dist - b.userData.dist);
  order.forEach((pc, k) => (pc.userData.rank = k));
  return grp;
}
const logo = makeLogo(); scene.add(logo);

// assembled = 1 => facets home; scatter seeds give each shard its own 3D pose (fracture card ±450/±300/-210..490 px, ±180°)
function poseLogo(L, t, tLand, { spread = 1, glow = 1, edge = 0, wobble = true, outT = null } = {}) {
  const { pieces, plate } = L.userData;
  pieces.forEach((pc) => {
    const u = pc.userData, i = u.idx;
    const land = tLand - (4 - u.rank) * 0.11;          // ripple: centre first, last piece lands on the hit
    const dur = 1.05;
    const k = eFrac(p(t, land - dur, land));          // 0 scattered -> 1 home
    const s = (1 - k) * spread;
    const dx = (hash(i * 3 + 1) - 0.5) * 9, dy = (hash(i * 3 + 2) - 0.5) * 6, dz = lerp(-4.2, 9.8, hash(i * 3 + 3)) * 0.55;
    const rx = (hash(i * 7 + 1) - 0.5) * Math.PI * 2, ry = (hash(i * 7 + 2) - 0.5) * Math.PI * 2, rz = (hash(i * 7 + 3) - 0.5) * Math.PI * 2;
    // idle drift while scattered
    const dr = Math.sin(t * 0.9 + i) * 0.12 * s;
    let wx = 0;
    if (wobble && t > land) { const d = t - land; wx = 0.044 * Math.exp(-d * 7) * Math.sin(d * 34); }
    let ox = 0, oy = 0, oz = 0, orot = 0;
    if (outT != null && t > outT) {               // exit: fly away from centre, accelerating
      const q = ei3(p(t, outT + u.rank * 0.03, outT + 0.55 + u.rank * 0.03));
      const ang = Math.atan2(u.home.y, u.home.x) + (hash(i * 11) - 0.5) * 0.8;
      const dist = 7 + hash(i * 13) * 3;
      ox = Math.cos(ang) * dist * q; oy = Math.sin(ang) * dist * q; oz = 3 * q; orot = q * 2.6 * (hash(i * 17) - 0.5) * 2;
    }
    pc.position.set(u.home.x + dx * s + ox, u.home.y + dy * s + dr + oy, dz * s + oz);
    pc.rotation.set(rx * s + wx + orot, ry * s + orot * 0.5, rz * s);
    pc.children[1].material.opacity = edge * (0.25 + 0.75 * (1 - s));
  });
  const kAll = p(t, tLand - 0.25, tLand);
  plate.material.color.set(C.glow).multiplyScalar(glow * kAll);
  plate.visible = glow * kAll > 0.001;
}

// =====================================================================================
// Chain of blocks (scene "paths") with a fork
// =====================================================================================
const chain = new THREE.Group(); scene.add(chain);
const blockGeo = new RoundedBoxGeometry(1, 1, 1, 4, 0.09);
const blockEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.04, 1.04, 1.04));
const CH = [];
(function buildChain() {
  const mk = (pos, kind, born) => {
    const g = new THREE.Group(); g.position.copy(pos);
    const m = new THREE.Mesh(blockGeo, graphite); g.add(m);
    const col = kind === 'zk' ? C.g200 : kind === 'tee' ? C.mauveLt : C.g400;
    const e = new THREE.LineSegments(blockEdges, lineMat(col, kind === 'tee' ? 1.6 : 1.0, 1)); e.material.transparent = true; g.add(e);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), glowMat(col, 1)); win.position.z = 0.505; g.add(win);
    g.userData = { kind, born, base: pos.clone() };
    chain.add(g); CH.push(g); return g;
  };
  for (let i = 0; i < 9; i++) mk(new THREE.Vector3(-13.6 + i * 1.7, 0, 0), 'main', -1);
  for (let i = 1; i <= 5; i++) {
    mk(new THREE.Vector3(i * 1.75, i * 0.95, -i * 0.9), 'zk', 10.4 + i * 0.32);
    mk(new THREE.Vector3(i * 1.75, -i * 0.95, i * 0.35), 'tee', 10.55 + i * 0.32);
  }
})();
// links + travelling pulses
const linkMatMain = glowMat(C.g400, 0.5), linkMatZk = glowMat(C.g200, 0.8), linkMatTee = glowMat(C.mauveLt, 1.2);
const LINKS = [];
(function buildLinks() {
  const by = (k) => CH.filter((b) => b.userData.kind === k);
  const main = by('main'), zk = by('zk'), tee = by('tee');
  const pairs = [];
  for (let i = 0; i < main.length - 1; i++) pairs.push([main[i], main[i + 1], linkMatMain]);
  const fork = main[main.length - 1];
  [[zk, linkMatZk], [tee, linkMatTee]].forEach(([arr, mat]) => { let prev = fork; arr.forEach((b) => { pairs.push([prev, b, mat]); prev = b; }); });
  pairs.forEach(([a, b, mat]) => {
    const A = a.userData.base, B = b.userData.base, len = A.distanceTo(B) - 1.0;
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 8), mat);
    cyl.position.copy(A).lerp(B, 0.5);
    cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(B, A).normalize());
    chain.add(cyl);
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), glowMat(mat === linkMatTee ? C.glow : '#ffffff', 3));
    chain.add(pulse);
    LINKS.push({ a, b, cyl, pulse, born: Math.max(a.userData.born, b.userData.born) });
  });
})();
const chainBeam = makeBeam(0xd9c2cd, 3.2, 12); scene.add(chainBeam);

function poseChain(t) {
  CH.forEach((b, i) => {
    const born = b.userData.born;
    const k = born < 0 ? 1 : back(p(t, born, born + 0.42), 1.5);
    b.scale.setScalar(Math.max(0.0001, k));
    b.visible = k > 0.001;
    b.rotation.y = Math.sin(t * 0.4 + i) * 0.05;
    b.position.y = b.userData.base.y + Math.sin(t * 0.8 + i * 0.7) * 0.04;
  });
  LINKS.forEach((L, i) => {
    const k = L.born < 0 ? 1 : p(t, L.born, L.born + 0.3);
    L.cyl.visible = k > 0.01; L.cyl.scale.set(1, Math.max(0.001, k), 1);
    const ph = ((t * 0.55 + hash(i) ) % 1);
    L.pulse.visible = k > 0.99;
    L.pulse.position.copy(L.a.position).lerp(L.b.position, ph);
  });
}

// =====================================================================================
// Seismic wave grid (instanced pillars), logo slams into its centre
// =====================================================================================
const GX = 46, GZ = 30, GS = 0.5;
const pillarGeo = new THREE.BoxGeometry(0.4, 1, 0.4); pillarGeo.translate(0, 0.5, 0);
const pillarMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.55, roughness: 0.38, clearcoat: 0.4, envMapIntensity: 0.8 });
pillarMat.onBeforeCompile = (sh) => {
  sh.uniforms.uGlow = { value: 0.9 }; pillarMat.userData.sh = sh;
  sh.fragmentShader = 'uniform float uGlow;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
    '#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n totalEmissiveRadiance += max(vColor.rgb - vec3(0.06), vec3(0.0)) * uGlow;\n#endif');
};
const pillars = new THREE.InstancedMesh(pillarGeo, pillarMat, GX * GZ);
pillars.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(GX * GZ * 3), 3);
scene.add(pillars);
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const cMauve = new THREE.Color(C.mauveLt), cBase = new THREE.Color(0x0b0a0b), cHot = new THREE.Color(C.glow);
function poseGrid(t, t0) {
  let n = 0;
  for (let ix = 0; ix < GX; ix++) for (let iz = 0; iz < GZ; iz++) {
    const x = (ix - (GX - 1) / 2) * GS, z = (iz - (GZ - 1) / 2) * GS;
    const d = Math.hypot(x, z);
    let h = 0.12 + 0.05 * Math.sin(ix * 0.7 + iz * 1.3 + t * 0.6), g = 0;
    // three rings, one per beat, decaying
    [[0, 1.0], [TL.BEAT, 0.55], [2 * TL.BEAT, 0.3]].forEach(([off, amp]) => {
      const dt = t - t0 - off; if (dt < 0) return;
      const r = dt * 6.2, w = 0.55 + dt * 0.25;
      const env = Math.exp(-((d - r) ** 2) / (w * w)) * amp * Math.exp(-dt * 0.55);
      h += env * 1.6; g += env;
    });
    // slow aftershock breathing
    if (t > t0) h += 0.08 * Math.sin(d * 1.4 - (t - t0) * 3) * Math.exp(-d * 0.12) * p(t, t0, t0 + 1);
    _v.set(x, 0, z); _s.set(1, Math.max(0.02, h), 1); _m4.compose(_v, _q, _s);
    pillars.setMatrixAt(n, _m4);
    _c.copy(cBase).lerp(cMauve, clamp(g * 1.2)).lerp(cHot, clamp(g - 0.7)).multiplyScalar(1 + g * 1.5);
    pillars.setColorAt(n, _c); n++;
  }
  pillars.instanceMatrix.needsUpdate = true; pillars.instanceColor.needsUpdate = true;
}

// =====================================================================================
// Enclave (TEE): glass shell, glowing core, orbit rings, data cubes that turn shielded inside
// =====================================================================================
const enclave = new THREE.Group(); scene.add(enclave);
const shell = new THREE.Mesh(new RoundedBoxGeometry(2.3, 2.3, 2.3, 4, 0.12), new THREE.MeshPhysicalMaterial({ color: 0x8a7380, metalness: 0.1, roughness: 0.08, transparent: true, opacity: 0.16, clearcoat: 1, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide }));
enclave.add(shell);
const shellEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.32, 2.32, 2.32)), lineMat(C.glow, 1.5, 1)); shellEdge.material.transparent = true; enclave.add(shellEdge);
const coreMat = new THREE.MeshPhysicalMaterial({ color: C.purple, metalness: 0.5, roughness: 0.25, clearcoat: 1, emissive: new THREE.Color(C.mauve), emissiveIntensity: 1.2, envMapIntensity: 1.2 });
const core = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.95, 0.95, 4, 0.1), coreMat); enclave.add(core);
const coreLight = new THREE.PointLight(0xf2d6e3, 0, 8, 2); enclave.add(coreLight);
const rings = [0, 1, 2].map((i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(1.75 + i * 0.2, 0.012, 8, 128), glowMat(i === 1 ? C.glow : C.mauveLt, 1.6)); enclave.add(r); return r; });
const NDATA = 48;
const dataMesh = new THREE.InstancedMesh(new RoundedBoxGeometry(0.16, 0.16, 0.16, 2, 0.03), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), NDATA);
dataMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NDATA * 3), 3);
dataMesh.frustumCulled = false;
scene.add(dataMesh);
const cData = new THREE.Color(0xdedede), cShield = new THREE.Color(C.mauveLt);
function poseEnclave(t, pos, scl, { data = true, power = 1 } = {}) {
  enclave.position.copy(pos); enclave.scale.setScalar(scl);
  enclave.rotation.y = t * 0.25; enclave.rotation.x = 0.12 * Math.sin(t * 0.3);
  core.rotation.set(t * 0.6, t * 0.9, 0);
  const pulse = 0.5 + 0.5 * Math.sin(t * TL.BPM / 60 * Math.PI);
  coreMat.emissiveIntensity = (0.8 + 0.9 * pulse) * power;
  coreLight.intensity = (6 + 6 * pulse) * power;
  rings.forEach((r, i) => { r.rotation.set(t * (0.4 + i * 0.25) + i, t * (0.3 - i * 0.2), i * 0.9); });
  dataMesh.visible = data;
  if (!data) return;
  for (let i = 0; i < NDATA; i++) {
    const per = 3.2, ph = ((t * 0.55 + hash(i * 2.3) * per) % per) / per; // 0..1 along the path
    const lane = (hash(i * 5.1) - 0.5) * 2.4, laneZ = (hash(i * 8.9) - 0.5) * 2.2;
    const x = lerp(8, 0, eo3(Math.min(1, ph * 1.25))), zIn = lerp(-7, 0, eo3(Math.min(1, ph * 1.25)));
    const inside = ph > 0.72;
    const y = lerp(lane, 0, smooth(Math.min(1, ph * 1.3))), z = lerp(laneZ, 0, smooth(Math.min(1, ph * 1.3))) + zIn;
    const s = inside ? lerp(1, 0.2, p(ph, 0.72, 1)) : 1;
    _v.set(pos.x + x * scl, pos.y + y * scl, pos.z + z * scl);
    _q.setFromEuler(new THREE.Euler(t + i, t * 0.7 + i, 0));
    _s.setScalar(s * scl);
    _m4.compose(_v, _q, _s); dataMesh.setMatrixAt(i, _m4);
    _c.copy(cData).lerp(cShield, p(ph, 0.62, 0.74)).multiplyScalar(inside ? 2.2 : 1.0);
    dataMesh.setColorAt(i, _c);
  }
  dataMesh.instanceMatrix.needsUpdate = true; dataMesh.instanceColor.needsUpdate = true;
}

// =====================================================================================
// Light scene: EVM base + app tiles (one private, mauve with a lock)
// =====================================================================================
const stack = new THREE.Group(); scene.add(stack);
function labelTex(draw, w = 512, h = 512) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx;
}
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.12 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.001; ground.receiveShadow = true; stack.add(ground);
const baseMat = new THREE.MeshPhysicalMaterial({ color: 0xf4f4f4, roughness: 0.55, metalness: 0, clearcoat: 0.3, envMapIntensity: 1 });
const base = new THREE.Mesh(new RoundedBoxGeometry(5.6, 0.42, 5.6, 4, 0.08), baseMat); base.position.y = 0.21; base.castShadow = true; base.receiveShadow = true; stack.add(base);
const evmLabel = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 0.36), new THREE.MeshBasicMaterial({ transparent: true, map: labelTex((g, w, h) => {
  g.fillStyle = '#737373'; g.font = `500 ${h * 0.62}px ${MONO}`; g.textBaseline = 'middle'; g.letterSpacing = '18px'; g.fillText('EVM  ·  EXECUTION LAYER', 24, h / 2 + 4);
}, 2048, 148) }));
evmLabel.position.set(0, 0.21, 2.805); stack.add(evmLabel);
const TILE_COL = ['#FCFCFC', '#D4D4D4', '#282826', '#825A6D'];
const tiles = TILE_COL.map((col, i) => {
  const m = new THREE.Mesh(new RoundedBoxGeometry(2.25, 0.62, 2.25, 4, 0.1), new THREE.MeshPhysicalMaterial({ color: col, roughness: i === 2 ? 0.3 : 0.45, metalness: i === 2 ? 0.3 : 0, clearcoat: 0.6, envMapIntensity: 1 }));
  m.castShadow = true; m.receiveShadow = true;
  const gx = i % 2 ? 1.25 : -1.25, gz = i < 2 ? -1.25 : 1.25;
  m.userData.home = new THREE.Vector3(gx, 0.42 + 0.31, gz);
  stack.add(m); return m;
});
const lockTop = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ transparent: true, map: labelTex((g, w) => {
  g.strokeStyle = '#ffffff'; g.fillStyle = '#ffffff'; g.lineWidth = w * 0.06; g.lineCap = 'round';
  g.beginPath(); g.arc(w / 2, w * 0.42, w * 0.17, Math.PI, 0); g.lineTo(w / 2 + w * 0.17, w * 0.5); g.moveTo(w / 2 - w * 0.17, w * 0.5); g.lineTo(w / 2 - w * 0.17, w * 0.42); g.stroke();
  g.beginPath(); g.roundRect(w * 0.27, w * 0.48, w * 0.46, w * 0.34, w * 0.05); g.fill();
  g.fillStyle = '#825A6D'; g.beginPath(); g.arc(w / 2, w * 0.63, w * 0.045, 0, 7); g.fill(); g.fillRect(w / 2 - w * 0.018, w * 0.63, w * 0.036, w * 0.1);
}) }));
lockTop.rotation.x = -Math.PI / 2; tiles[3].add(lockTop); lockTop.position.y = 0.315;
const tileGlyphs = [0, 1, 2].map((i) => {
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ transparent: true, map: labelTex((g, w) => {
    g.strokeStyle = i === 2 ? '#A4A3A1' : '#A4A3A1'; g.lineWidth = w * 0.025; g.lineCap = 'round';
    if (i === 0) { for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(w * 0.25, w * (0.38 + k * 0.12)); g.lineTo(w * (0.75 - k * 0.12), w * (0.38 + k * 0.12)); g.stroke(); } }
    if (i === 1) { g.beginPath(); g.arc(w / 2, w / 2, w * 0.2, 0, 7); g.stroke(); g.beginPath(); g.moveTo(w * 0.3, w / 2); g.lineTo(w * 0.7, w / 2); g.stroke(); }
    if (i === 2) { g.beginPath(); g.moveTo(w * 0.3, w * 0.62); g.lineTo(w * 0.44, w * 0.48); g.lineTo(w * 0.54, w * 0.56); g.lineTo(w * 0.7, w * 0.38); g.stroke(); }
  }) }));
  pl.rotation.x = -Math.PI / 2; pl.position.y = 0.315; tiles[i].add(pl); return pl;
});
const DROP = [41.25, 41.875, 42.5, 43.125];
function poseStack(t) {
  tiles.forEach((m, i) => {
    const t0 = DROP[i] - 0.32;                      // fall, land exactly on the beat
    const fall = ei2(p(t, t0, DROP[i]));
    const d = t - DROP[i];
    const bounce = d > 0 ? Math.exp(-d * 9) * Math.sin(d * 26) * 0.12 : 0;
    m.visible = t > t0;
    m.position.copy(m.userData.home); m.position.y += (1 - fall) * 5.5 + bounce;
    const sq = d > 0 ? 1 - Math.exp(-d * 14) * Math.cos(d * 30) * 0.12 : 1;
    m.scale.set(1 + (1 - sq) * 0.4, sq, 1 + (1 - sq) * 0.4);
  });
}

// =====================================================================================
// Duo: the two approaches side by side (ZK proof ring vs enclave)
// =====================================================================================
const zkRing = new THREE.Group(); scene.add(zkRing);
const chrome = new THREE.MeshPhysicalMaterial({ color: 0xd4d4d4, metalness: 1, roughness: 0.18, envMapIntensity: 1.5 });
zkRing.add(new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.075, 24, 160), chrome));
const zkInner = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.02, 12, 160), glowMat('#ffffff', 1.3)); zkRing.add(zkInner);
const zkDisc = new THREE.Mesh(new THREE.CircleGeometry(0.66, 64), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, map: labelTex((g, w) => {
  g.fillStyle = '#f4f4f4'; g.font = `300 ${w * 0.62}px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('π', w / 2, w * 0.47);
}) }));
zkRing.add(zkDisc);
const beamL = makeBeam(0xe6e6e6, 1.7, 9), beamR = makeBeam(0xe7c9d7, 1.7, 9); scene.add(beamL); scene.add(beamR);
const heroBeam = makeBeam(0xf2d6e3, 2.0, 14); scene.add(heroBeam);

// =====================================================================================
// 2D layer
// =====================================================================================
const out = document.getElementById('out');
const ctx = out.getContext('2d');

function font(size, weight = 500, fam = DISPLAY) { return `${weight} ${size}px ${fam}`; }
function measure(s, size, weight, fam, ls = 0) { ctx.save(); ctx.font = font(size, weight, fam); ctx.letterSpacing = ls + 'px'; const w = ctx.measureText(s).width; ctx.restore(); return w; }

// blur-slide: words rise out of focus. y, blur and opacity share one progress (blur-slide card: gap 4f, 22f per word, dy .38em, blur 18px)
// line = {text, size, weight, color, accent:{words:[...], color}}
function blurSlide(lines, x, y, t, t0, { align = 'left', gap = 4 / 30, dur = 22 / 30, lh = 1.12, blurMax = 18, tOut = 1e9, outDur = 0.35, fam = DISPLAY, ls = null, glow = 0 } = {}) {
  let k = 0, yy = y;
  const outK = eio3(p(t, tOut, tOut + outDur));
  lines.forEach((ln) => {
    const size = ln.size, weight = ln.weight ?? 500, words = ln.text.split(' ');
    const lsp = ls ?? -size * 0.022;
    ctx.save(); ctx.font = font(size, weight, ln.fam ?? fam); ctx.letterSpacing = lsp + 'px';
    const sp = ctx.measureText(' ').width;
    const widths = words.map((w) => ctx.measureText(w).width);
    const total = widths.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
    let xx = align === 'center' ? x - total / 2 : x;
    words.forEach((w, i) => {
      const st = t0 + (ln.delay ?? 0) + k * gap;
      const q = eo5(p(t, st, st + dur * (ln.slow ?? 1)));
      const a = q * (1 - outK);
      if (a > 0.003) {
        const blur = (1 - q) * blurMax + outK * 14;
        ctx.globalAlpha = a;
        if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(1)}px)`;
        const acc = ln.accent && ln.accent.words.includes(w.replace(/[.,:?]/g, ''));
        ctx.fillStyle = acc ? ln.accent.color : ln.color;
        if (glow && acc) { ctx.shadowColor = ln.accent.color; ctx.shadowBlur = glow; }
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(w, xx, yy + (1 - q) * size * 0.38 - outK * size * 0.25);
        ctx.filter = 'none'; ctx.shadowBlur = 0;
      }
      xx += widths[i] + sp; k++;
    });
    ctx.restore();
    yy += size * lh;
  });
}

function eyebrow(text, x, y, t, t0, { color = C.g400, tOut = 1e9, num = null } = {}) {
  const q = eo3(p(t, t0, t0 + 0.6)), o = 1 - p(t, tOut, tOut + 0.3);
  if (q * o <= 0) return;
  ctx.save(); ctx.globalAlpha = q * o; ctx.font = font(26, 500, MONO); ctx.fillStyle = color;
  ctx.letterSpacing = lerp(14, 5, q) + 'px'; ctx.textBaseline = 'middle';
  let xx = x;
  if (num) { ctx.fillStyle = C.mauveLt; ctx.fillText(num, xx, y); xx += ctx.measureText(num).width + 22; ctx.fillStyle = color; }
  ctx.fillRect(xx, y - 1, 46 * q, 2); xx += 66;
  ctx.fillText(text, xx, y);
  ctx.restore();
}

function vignette(amt = 0.55, col = '0,0,0') {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${amt})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// anamorphic streak + ghosts
function flare(x, y, k, col = '242,214,227') {
  if (k <= 0.002) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [sy, a, r] of [[0.012, 0.9, 1100], [0.04, 0.35, 700], [0.2, 0.12, 320]]) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, sy);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(255,255,255,${a * k})`); g.addColorStop(0.25, `rgba(${col},${a * k * 0.5})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.restore();
  }
  // ghosts along the axis through frame centre
  [-0.6, -0.3, 0.45, 0.9].forEach((f, i) => {
    const gx = x + (W / 2 - x) * (1 + f) , gy = y + (H / 2 - y) * (1 + f);
    const r = [60, 26, 90, 40][i];
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    g.addColorStop(0, `rgba(${col},${0.08 * k})`); g.addColorStop(0.7, `rgba(${col},${0.05 * k})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r, 0, 7); ctx.fill();
  });
  ctx.restore();
}

// god rays from a point
function rays(cx, cy, k, t, { n = 26, col = '242,214,227', len = 1500 } = {}) {
  if (k <= 0.002) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const a = hash(i * 4.1) * Math.PI * 2 + t * 0.03 * (hash(i * 2.2) - 0.5);
    const w = 0.015 + hash(i * 7.7) * 0.05;
    const L = len * (0.5 + hash(i * 3.3) * 0.7);
    const flick = 0.6 + 0.4 * Math.sin(t * (0.8 + hash(i) * 1.5) + i);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, L);
    g.addColorStop(0, `rgba(${col},${0.22 * k * flick})`); g.addColorStop(0.35, `rgba(${col},${0.07 * k * flick})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, L, a - w, a + w); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// shockwave ring (impact-burst: diameter grows out-cubic, fades linearly)
function shock(cx, cy, t, t0, { maxR = 1300, dur = 0.9, col = '242,214,227', w0 = 10 } = {}) {
  const u = (t - t0) / dur; if (u < 0 || u > 1) return;
  const r = 30 + maxR * eo3(u), a = 1 - u;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(255,255,255,${0.85 * a})`; ctx.lineWidth = Math.max(1.5, w0 * (1 - u));
  ctx.shadowColor = `rgba(${col},${a})`; ctx.shadowBlur = 40;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = `rgba(${col},${0.4 * a})`; ctx.beginPath(); ctx.arc(cx, cy, r * 0.82, 0, 7); ctx.stroke();
  ctx.restore();
}

// radial white burst from a point (white-flash card: radius 80 -> 1580 px, t² ease-in)
function whiteBurst(cx, cy, k) {
  if (k <= 0) return;
  const r = lerp(80, 2300, k * k);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.7, `rgba(255,255,255,${0.9 * k})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// seismograph trace: the opening hook and the closing echo
function seismo(y, t, k, spikes, { x0 = 0, x1 = W, col = '242,214,227' } = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const draw = (lw, a, blur) => {
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 3) {
      const u = (x - W / 2) / (W / 2);
      let v = Math.sin(x * 0.045 + t * 9) * 1.2 + Math.sin(x * 0.013 - t * 4) * 1.6 + (hash(Math.floor(x / 3) + Math.floor(t * 30) * 7) - 0.5) * 1.6;
      spikes.forEach(([ts, amp]) => {
        const d = t - ts; if (d < 0 || d > 1.2) return;
        const front = d * 2600; const env = Math.exp(-Math.abs(Math.abs(x - W / 2) - front * 0.25) / 60) * Math.exp(-d * 3.5);
        v += Math.sin(x * 0.35 + d * 60) * amp * env + Math.sin(x * 0.11) * amp * 0.4 * Math.exp(-(u * u) * 6) * Math.exp(-d * 5);
      });
      const yy = y + v * (1 - Math.abs(u) * 0.3);
      x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.strokeStyle = `rgba(${col},${a * k})`; ctx.lineWidth = lw; ctx.shadowColor = `rgba(${col},${k})`; ctx.shadowBlur = blur; ctx.stroke();
  };
  draw(6, 0.25, 30); draw(1.6, 0.95, 8);
  ctx.restore();
}

function panel(x, y, w, h, { a = 1, r = 14, fill = 'rgba(22,20,22,0.82)', stroke = 'rgba(255,255,255,0.10)' } = {}) {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
  ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.beginPath(); ctx.moveTo(x + r, y + 1.5); ctx.lineTo(x + w - r, y + 1.5); ctx.stroke();
  ctx.restore();
}

const GLYPHS = '0123456789abcdef#%&@$*+=<>/\\|{}[]';
function scramble(str, g, seed, t) {
  const b = Math.floor(t * 15);
  return str.split('').map((ch, i) => (ch !== ' ' && hash(i * 31 + b * 17 + seed * 97) < g ? GLYPHS[Math.floor(hash(i * 13 + b * 7 + seed) * GLYPHS.length)] : ch)).join('');
}

// zoom blur of whatever is on the canvas (camera dive transitions)
const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const tctx = tmp.getContext('2d');
function zoomBlur(k, cx = W / 2, cy = H / 2) {
  if (k <= 0.01) return;
  tctx.clearRect(0, 0, W, H); tctx.drawImage(out, 0, 0);
  ctx.save();
  const n = 7;
  for (let i = 1; i <= n; i++) {
    const s = 1 + k * 0.09 * i;
    ctx.globalAlpha = 0.5 / i + 0.12;
    ctx.setTransform(s, 0, 0, s, cx * (1 - s), cy * (1 - s));
    ctx.drawImage(tmp, 0, 0);
  }
  ctx.restore();
}

// world -> screen (one function for everything that follows a 3D subject)
function toScreen(v3) { const v = v3.clone().project(camera); return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H]; }

// =====================================================================================
// shot state
// =====================================================================================
function setCam(px, py, pz, tx, ty, tz, fov = 30, roll = 0) {
  camera.position.set(px, py, pz); camera.up.set(Math.sin(roll), Math.cos(roll), 0);
  camera.lookAt(tx, ty, tz); camera.fov = fov; camera.updateProjectionMatrix();
}
function hideAll() {
  [logo, chain, pillars, enclave, dataMesh, stack, zkRing, chainBeam, beamL, beamR, heroBeam].forEach((o) => (o.visible = false));
  sweep.intensity = 0; sun.intensity = 0; amb.intensity = 0; rim.intensity = 0; key.intensity = 2.2; coreLight.intensity = 0;
  dust.visible = true; dust.material.uniforms.uOpacity.value = 1;
  scene.environment = envDark; scene.background = bgDark;
  bloom.intensity = 1.1; bloom.luminanceMaterial.threshold = 0.62;
  ca.offset.set(0, 0);
  camera.clearViewOffset();
  logo.scale.setScalar(1); logo.position.set(0, 0, 0); logo.rotation.set(0, 0, 0);
}

// full-frame impacts only at TL.HITS (≤3 per film)
function hitEnv(t) { let e = 0; for (const h of TL.HITS) { const d = t - h; if (d >= 0 && d < 0.6) e = Math.max(e, Math.exp(-d * 9)); } return e; }
function shakeXY(t) {
  for (const h of TL.HITS) { const d = t - h; if (d >= 0 && d < 0.45) { const a = 18 * Math.exp(-d / 0.075); return [Math.sin(d * 97) * a * 0.6, Math.cos(d * 83) * a]; } }
  return [0, 0];
}

// =====================================================================================
// SCENES
// =====================================================================================
const UI = []; // 2D draw jobs for this frame, run after the GL frame is on the canvas
let glFilter = 'none', glAlpha = 1, glOn = true;

function sceneOpen(t) {
  const L = S.open;
  hideAll();
  logo.visible = true; heroBeam.visible = true;
  const hit = 2.5;
  // camera: push in during the scatter, settle on the hit, slow pull back, then dive into the stone
  const push = eio3(p(t, 0, 2.5));
  let z = lerp(13.5, 9.2, push) + lerp(0, 2.2, eio3(p(t, 3.6, 6.6)));
  const dive = ei3(p(t, 6.55, 7.5));
  z = lerp(z, 1.6, dive);
  const orbit = lerp(0.32, -0.18, eio3(p(t, 2.3, 7.5)));
  setCam(Math.sin(orbit) * z, lerp(0.6, 0.15, push) - dive * 0.4, Math.cos(orbit) * z, 0, lerp(0.15, -0.05, push) - dive * 0.6, 0, 30);
  poseLogo(logo, t, hit, { glow: 1.7 + 2.5 * hitEnv(t) + 1.3 * Math.exp(-((t - 4.1) ** 2) / 0.12), edge: 0.6 });
  // sheen: a light sweeps across the facets once (light-play B: one pass, only on the hero)
  const sw = p(t, 3.4, 4.8);
  sweep.intensity = 90 * Math.sin(sw * Math.PI); sweep.position.set(lerp(-5, 5, eio3(sw)), 2.5, 3.5);
  rim.intensity = 25 + 60 * hitEnv(t);
  aimBeam(heroBeam, new THREE.Vector3(1.2, 8, -6), new THREE.Vector3(0, -1.5, -2.5), (0.22 + 0.25 * p(t, 0.3, 2.5)) * (1 - 0.5 * dive), t);
  key.intensity = 1.3;
  bloom.intensity = 1.1 + 2.2 * hitEnv(t);
  ca.offset.set(0.006 * hitEnv(t), 0.004 * hitEnv(t));
  dust.material.uniforms.uOpacity.value = 0.6 + 0.6 * hitEnv(t);

  UI.push(() => {
    // the hook: a seismograph line that wakes up, kicks twice, then pulls into the stone
    const k = p(t, 0, 0.25) * (1 - p(t, 1.9, 2.5));
    const shrink = eio3(p(t, 1.7, 2.45));
    seismo(H / 2, t, k, [[0.62, 26], [1.25, 40], [1.95, 18]], { x0: lerp(0, W / 2 - 4, shrink), x1: lerp(W, W / 2 + 4, shrink) });
    const [lx, ly] = toScreen(new THREE.Vector3(0, 0, 0));
    whiteBurst(lx, ly, p(t, hit - 0.08, hit) * (1 - p(t, hit + 0.02, hit + 0.18)) * 0.9);
    shock(lx, ly, t, hit, { maxR: 1500, dur: 1.0 });
    shock(lx, ly, t, hit + 0.12, { maxR: 1000, dur: 0.9, w0: 4 });
    flare(lx, ly, hitEnv(t) * 1.2 + 0.25 * Math.exp(-((t - 4.1) ** 2) / 0.15));
    // kicker under the mark
    const ky = 990;
    blurSlide([{ text: 'PRIVACY  ON  THE  BLOCKCHAIN', size: 30, weight: 500, color: C.g300, fam: MONO }], W / 2, ky, t, 4.35, { align: 'center', ls: 9, blurMax: 10, tOut: 6.4, outDur: 0.3 });
    const lw = 420 * eo3(p(t, 4.2, 5.0)) * (1 - p(t, 6.3, 6.6));
    ctx.fillStyle = 'rgba(195,154,174,0.8)'; ctx.fillRect(W / 2 - lw / 2, ky - 52, lw, 1.5);
    vignette(0.6);
    zoomBlur(dive * 1.4);
  });
}

function scenePaths(t) {
  const u = t - S.paths[0];
  hideAll();
  chain.visible = true; chainBeam.visible = true; scene.background = bgDarkLow;
  poseChain(t);
  // lateral track that brakes as the fork grows
  const tr = eo3(p(u, 0, 7.5));
  const cx = lerp(-10.5, -0.6, tr);
  const lift = p(u, 4.6, 7.5);
  setCam(cx, lerp(1.0, 1.6, lift), lerp(8.2, 9.6, lift), cx + lerp(2.2, 3.2, lift), lerp(0.1, 0.2, lift), 0, 32, -0.02);
  aimBeam(chainBeam, new THREE.Vector3(cx + 2.5, 8, -2), new THREE.Vector3(cx + 3.5, -1.5, 0), 0.42, t);
  key.intensity = 1.6;
  rim.intensity = 30; rim.position.set(cx + 3, 2, -3);
  UI.push(() => {
    const ent = 1 - eo3(p(u, 0, 0.6));
    vignette(0.65);
    const scrim = ctx.createLinearGradient(0, 0, 0, 520); scrim.addColorStop(0, 'rgba(8,7,8,0.75)'); scrim.addColorStop(1, 'rgba(8,7,8,0)');
    ctx.fillStyle = scrim; ctx.fillRect(0, 0, W, 520);
    blurSlide([
      { text: 'Not all privacy-focused blockchains', size: 84, color: C.white },
      { text: 'take the same approach.', size: 84, color: C.white, accent: { words: ['same', 'approach'], color: C.mauveLt }, delay: 0.15 },
    ], 150, 225, t, S.paths[0] + 0.35, { tOut: S.paths[1] - 0.45 });
    // labels on the two branches once they exist
    const lab = (txt, v3, t0, col) => {
      const [sx, sy] = toScreen(v3); const a = eo3(p(u, t0, t0 + 0.5)) * (1 - p(u, 7.05, 7.4));
      if (a <= 0) return;
      ctx.save(); ctx.globalAlpha = a; ctx.font = font(26, 500, MONO); ctx.letterSpacing = '5px'; ctx.fillStyle = col; ctx.textBaseline = 'middle';
      ctx.fillRect(sx - 2, sy - 2, 4, 4); ctx.fillRect(sx + 12, sy - 0.75, 40 * a, 1.5); ctx.fillText(txt, sx + 64, sy); ctx.restore();
    };
    lab('PATH A', new THREE.Vector3(5 * 1.75 + 0.8, 5 * 0.95 + 0.2, -5 * 0.9), 5.4, C.g200);
    lab('PATH B', new THREE.Vector3(5 * 1.75 + 0.8, -5 * 0.95 - 0.2, 5 * 0.35), 5.7, C.mauveLt);
    zoomBlur(ent * 1.2);
  });
}

function sceneZK(t) {
  const u = t - S.zk[0];
  hideAll();
  chain.visible = true; chainBeam.visible = true; scene.background = bgDarkLow;
  poseChain(t);
  // whip up along path A, then a slow drift
  const wh = eio3(p(u, 0, 0.9));
  const cx = lerp(-0.6, 6.4, wh) + u * 0.08, cy = lerp(1.6, 4.4, wh), cz = lerp(9.6, 6.2, wh);
  setCam(cx, cy, cz, cx + 1.2, cy - 0.9, -3.5, 34, 0.04 * wh);
  aimBeam(chainBeam, new THREE.Vector3(cx, 10, -3), new THREE.Vector3(cx + 1, 2, -3), 0.35, t);
  key.intensity = 1.4; rim.intensity = 30; rim.position.set(cx, 4, -5);
  glFilter = `blur(${(lerp(0, 7, p(u, 0.4, 1.2))).toFixed(1)}px) brightness(${lerp(1, 0.5, p(u, 0.4, 1.2)).toFixed(2)})`;
  UI.push(() => {
    vignette(0.7);
    const whip = Math.sin(p(u, 0, 0.9) * Math.PI);
    const tOut = S.zk[1] - 0.45;
    eyebrow('ZERO-KNOWLEDGE PROOFS', 150, 268, t, S.zk[0] + 0.5, { num: '01', tOut });
    blurSlide([
      { text: 'ZK-based chains use', size: 80, color: C.white },
      { text: 'cryptographic proofs', size: 80, color: C.white, accent: { words: ['cryptographic', 'proofs'], color: C.g300 } },
    ], 150, 380, t, S.zk[0] + 0.7, { tOut });
    blurSlide([
      { text: 'to verify computations without', size: 50, weight: 400, color: C.g400 },
      { text: 'revealing sensitive information.', size: 50, weight: 400, color: C.g400 },
    ], 150, 590, t, S.zk[0] + 1.9, { tOut, gap: 2.4 / 30, dur: 20 / 30, blurMax: 9 });
    zkCard(t, u, tOut);
    if (whip > 0.01) zoomBlur(whip * 0.8, W * 0.7, H * 0.3);
  });
}

function zkCard(t, u, tOut) {
  const X = 1060, Y = 240, Wc = 700, Hc = 540;
  const ent = eo3(p(u, 1.0, 1.6)), o = 1 - p(t, tOut, tOut + 0.35);
  if (ent * o <= 0) return;
  ctx.save();
  ctx.globalAlpha = ent * o;
  ctx.translate(0, (1 - ent) * 40);
  if (ent < 1) ctx.filter = `blur(${((1 - ent) * 10).toFixed(1)}px)`;
  panel(X, Y, Wc, Hc);
  ctx.filter = 'none';
  // header
  ctx.font = font(24, 500, MONO); ctx.letterSpacing = '4px'; ctx.fillStyle = C.g500; ctx.textBaseline = 'middle';
  ctx.fillText('COMPUTATION', X + 36, Y + 44);
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(X, Y + 80, Wc, 1);
  const rows = [['tx.sender', '0x7f3a…c21e'], ['tx.amount', '12,480.00'], ['balance', '98,112.47'], ['call', 'transfer(to, amt)']];
  const scan = p(u, 2.9, 3.7);              // scan line passes
  const g = u < 3.75 ? 0 : u < 4.6 ? [1, 0.6, 1, 0.8][Math.floor(p(u, 3.75, 4.6) * 3.99)] : 0;
  const masked = u >= 4.6;
  rows.forEach(([k, v], i) => {
    const ry = Y + 140 + i * 64;
    const typed = p(u, 1.3 + i * 0.25, 1.65 + i * 0.25);
    if (typed <= 0) return;
    ctx.font = font(30, 400, MONO); ctx.letterSpacing = '0px';
    ctx.fillStyle = C.g500; ctx.fillText(k, X + 36, ry);
    let val = v.slice(0, Math.ceil(v.length * typed));
    if (g > 0) val = scramble(val, g, i, t);
    if (masked && i < 3) {
      // shielded: value replaced by a bar
      const bw = measure(v, 30, 400, MONO);
      const sh = 0.5 + 0.5 * Math.sin(t * 6 + i);
      ctx.fillStyle = `rgba(212,212,212,${0.18 + 0.1 * sh})`; ctx.beginPath(); ctx.roundRect(X + 300, ry - 15, bw, 30, 4); ctx.fill();
      ctx.fillStyle = C.g500; ctx.font = font(22, 500, MONO); ctx.fillText('hidden', X + 300 + bw + 18, ry);
    } else {
      ctx.fillStyle = g > 0 ? C.mauveLt : C.white; ctx.fillText(val, X + 300 + (g > 0 ? (hash(Math.floor(t * 15) + i) - 0.5) * 10 * g : 0), ry);
    }
  });
  if (scan > 0 && scan < 1) {
    const sy = Y + 90 + scan * (Hc - 120);
    const gr = ctx.createLinearGradient(0, sy - 60, 0, sy + 4); gr.addColorStop(0, 'rgba(232,232,232,0)'); gr.addColorStop(1, 'rgba(232,232,232,0.22)');
    ctx.fillStyle = gr; ctx.fillRect(X + 1, sy - 60, Wc - 2, 64); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(X + 1, sy, Wc - 2, 1.5);
  }
  // proof: a ring with π forms under the card, then VERIFIED
  const pr = eo3(p(u, 5.4, 6.4));
  if (pr > 0) {
    const cx = X + 120, cy = Y + Hc - 40 + 0;
    ctx.save();
    ctx.translate(cx, Y + Hc - 70);
    ctx.globalAlpha *= pr;
    ctx.strokeStyle = 'rgba(232,232,232,0.9)'; ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 40;
    ctx.beginPath(); ctx.arc(0, 0, 38 * pr, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(0, 0, 28 * pr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p(u, 5.6, 7.2)); ctx.strokeStyle = C.white; ctx.lineWidth = 3; ctx.stroke();
    ctx.font = font(34, 300, DISPLAY); ctx.fillStyle = C.white; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('π', 0, 1);
    ctx.textAlign = 'left'; ctx.font = font(26, 500, MONO); ctx.letterSpacing = '4px'; ctx.fillStyle = C.g300;
    ctx.fillText('PROOF', 70, -12); ctx.fillStyle = C.g500; ctx.font = font(20, 400, MONO); ctx.letterSpacing = '1px';
    ctx.fillText(scramble('0x9e4c…a1f0 · 288 bytes', u < 7.4 ? 0.5 * (1 - p(u, 6.2, 7.4)) : 0, 9, t), 70, 20);
    ctx.restore();
  }
  const vf = p(u, 7.5, 7.75);
  if (vf > 0) {
    const s = 1 + 0.35 * (1 - back(vf, 2)) ;
    ctx.save(); ctx.translate(X + Wc - 150, Y + Hc - 70); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(232,232,232,0.12)'; ctx.strokeStyle = 'rgba(232,232,232,0.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-110, -26, 220, 52, 26); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.white; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath();
    const ck = p(u, 7.55, 7.8);
    ctx.moveTo(-82, 0); ctx.lineTo(-82 + 9 * Math.min(1, ck * 2), 9 * Math.min(1, ck * 2));
    if (ck > 0.5) ctx.lineTo(-73 + 18 * (ck - 0.5) * 2, 9 - 20 * (ck - 0.5) * 2);
    ctx.stroke();
    ctx.font = font(24, 500, MONO); ctx.letterSpacing = '4px'; ctx.fillStyle = C.white; ctx.textBaseline = 'middle'; ctx.fillText('VERIFIED', -48, 1);
    ctx.restore();
    // one sheen across the badge only
    flare(X + Wc - 150, Y + Hc - 70, 0.5 * Math.exp(-(u - 7.6) * 4) * (u > 7.5 ? 1 : 0), '232,232,232');
  }
  ctx.restore();
}

function sceneSeismic(t) {
  const u = t - S.seismic[0];
  hideAll();
  pillars.visible = true; logo.visible = true; heroBeam.visible = true;
  scene.background = bgDarkLow;
  poseGrid(t, S.seismic[0]);
  // crane: top-down -> 3/4 as the wave rolls out
  const cr = eio3(p(u, 0, 5));
  setCam(Math.sin(0.5 * cr) * 3, lerp(15, 5.4, cr), lerp(3.5, 11.5, cr), 0, lerp(0, 1.2, cr), 0, 34);
  // score-slam: logo hangs near the lens, then ease-in drops onto the hit (B: 2.6x, ease-in quad over 6f)
  const fall = ei2(p(t, S.seismic[0] - 0.2, S.seismic[0]));
  const d = Math.max(0, t - S.seismic[0]);
  const settle = d > 0 ? 1 - Math.exp(-d * 10) * Math.cos(d * 24) * 0.06 : 0;
  logo.scale.setScalar(lerp(2.6, 1, fall) * (d > 0 ? settle : 1) * 0.62);
  const camP = camera.position.clone();
  const home = new THREE.Vector3(0, 1.9, 0);
  logo.position.copy(camP.clone().lerp(home, lerp(0.55, 1, fall)));
  logo.lookAt(camera.position); logo.rotateY(Math.sin(t * 0.5) * 0.25);
  poseLogo(logo, t, -10, { glow: 2.2 + 3 * hitEnv(t), edge: 0.5, wobble: false });
  aimBeam(heroBeam, new THREE.Vector3(0, 12, -1), new THREE.Vector3(0, -0.5, 0), 0.45 * p(t, S.seismic[0], S.seismic[0] + 0.4), t);
  rim.intensity = 40; rim.position.set(0, 3, -2);
  pillarMat.userData.sh && (pillarMat.userData.sh.uniforms.uGlow.value = 0.9);
  bloom.intensity = 1.2 + 2.5 * hitEnv(t);
  ca.offset.set(0.007 * hitEnv(t), 0.005 * hitEnv(t));
  key.intensity = 1.4;
  const tOut = S.seismic[1] - 0.4;
  UI.push(() => {
    const [lx, ly] = toScreen(home);
    if (u >= 0) {
      ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - p(u, 0, 0.07))})`; if (u < 0.07) ctx.fillRect(0, 0, W, H); // 2f white
      shock(lx, ly, t, S.seismic[0], { maxR: 1700, dur: 1.1 });
      shock(lx, ly, t, S.seismic[0] + TL.BEAT, { maxR: 1400, dur: 1.0, w0: 5 });
      flare(lx, ly, hitEnv(t) * 1.3);
    }
    vignette(0.7);
    const scrim = ctx.createLinearGradient(0, H - 420, 0, H); scrim.addColorStop(0, 'rgba(8,7,8,0)'); scrim.addColorStop(1, 'rgba(8,7,8,0.85)');
    ctx.fillStyle = scrim; ctx.fillRect(0, H - 420, W, 420);
    blurSlide([
      { text: 'Seismic takes a different path.', size: 92, color: C.white, accent: { words: ['different', 'path'], color: C.mauveLt } },
    ], W / 2, H - 150, t, S.seismic[0] + 0.7, { align: 'center', tOut });
  });
}

function sceneTEE(t) {
  const u = t - S.tee[0];
  hideAll();
  enclave.visible = true; heroBeam.visible = true;
  scene.background = bgDark;
  const tOut = S.tee[1] - 0.6;
  // orbit around the enclave; it sits right of frame
  const ang = lerp(-0.5, 0.25, eio3(p(u, 0, 7.5)));
  const r = lerp(8.6, 7.4, eio3(p(u, 0, 3)));
  const ec = new THREE.Vector3(0, 0.1, 0);
  setCam(Math.sin(ang) * r, lerp(1.6, 0.9, p(u, 0, 7.5)), Math.cos(ang) * r, 0, 0.1, 0, 32);
  camera.setViewOffset(W, H, -W * 0.24, -H * 0.02, W, H);
  const charge = p(t, S.goal[0] - 0.45, S.goal[0]);
  poseEnclave(t, ec, lerp(0.5, 0.8, eo3(p(u, -0.2, 0.9))), { power: 1 + charge * 3 });
  aimBeam(heroBeam, new THREE.Vector3(ec.x + 0.5, 9, -3), new THREE.Vector3(ec.x, -1.5, 0), 0.4, t);
  rim.intensity = 30; rim.position.set(ec.x, 2, -3);
  bloom.intensity = 1.2 + charge * 2;
  UI.push(() => {
    const ent = 1 - eo3(p(u, 0, 0.5));
    vignette(0.65);
    eyebrow('TRUSTED EXECUTION ENVIRONMENTS', 150, 268, t, S.tee[0] + 0.3, { num: '02', tOut });
    blurSlide([
      { text: 'using Trusted Execution', size: 80, color: C.white },
      { text: 'Environments (TEEs)', size: 80, color: C.white, accent: { words: ['(TEEs)'], color: C.mauveLt } },
    ], 150, 380, t, S.tee[0] + 0.5, { tOut });
    blurSlide([
      { text: 'alongside shielded', size: 56, weight: 400, color: C.g300, accent: { words: ['shielded'], color: C.mauveLt } },
      { text: 'Solidity types.', size: 56, weight: 400, color: C.g300, accent: { words: ['Solidity', 'types'], color: C.mauveLt } },
    ], 150, 590, t, S.tee[0] + 2.6, { tOut, gap: 3 / 30 });
    codePanel(t, u, tOut);
    const [ex, ey] = toScreen(ec);
    flare(ex, ey, charge * 1.6);
    whiteBurst(ex, ey, p(t, S.goal[0] - 0.2, S.goal[0]));
    zoomBlur(ent * 1.0, W * 0.7, H / 2);
  });
}

function codePanel(t, u, tOut) {
  const X = 1010, Y = 600, Wc = 760, Hc = 340;
  const ent = eo3(p(u, 2.3, 2.9)), o = 1 - p(t, tOut, tOut + 0.35);
  if (ent * o <= 0) return;
  ctx.save(); ctx.globalAlpha = ent * o; ctx.translate((1 - ent) * 60, 0);
  if (ent < 1) ctx.filter = `blur(${((1 - ent) * 10).toFixed(1)}px)`;
  panel(X, Y, Wc, Hc, { fill: 'rgba(18,16,18,0.88)', stroke: 'rgba(195,154,174,0.35)' });
  ctx.filter = 'none';
  ctx.font = font(22, 500, MONO); ctx.letterSpacing = '3px'; ctx.fillStyle = C.g500; ctx.textBaseline = 'middle';
  ctx.fillText('PrivateVault.sol', X + 30, Y + 34);
  [0, 1, 2].forEach((i) => { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(X + Wc - 40 - i * 22, Y + 34, 5, 0, 7); ctx.fill(); });
  ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(X, Y + 64, Wc, 1);
  const lines = [
    [['contract ', C.g500], ['PrivateVault', C.white], [' {', C.g500]],
    [['    ', C.g500], ['suint256', 'S'], [' balance;', C.g200]],
    [['    ', C.g500], ['saddress', 'S'], [' owner;', C.g200]],
    [['    ', C.g500], ['sbool', 'S'], ['    isMember;', C.g200]],
    [['}', C.g500]],
  ];
  const total = lines.reduce((s, l) => s + l.reduce((a, [x]) => a + x.length, 0), 0);
  let shown = Math.floor(total * p(u, 2.6, 5.0));
  const shine = p(u, 5.3, 6.3);
  ctx.font = font(34, 400, MONO); ctx.letterSpacing = '0px';
  lines.forEach((ln, li) => {
    let x = X + 34; const y = Y + 112 + li * 50;
    ln.forEach(([txt, col]) => {
      const n = Math.max(0, Math.min(txt.length, shown)); shown -= n;
      const s = txt.slice(0, n);
      if (col === 'S') {
        ctx.save();
        ctx.fillStyle = C.mauveLt;
        if (shine > 0) { ctx.shadowColor = C.mauveLt; ctx.shadowBlur = 18 * Math.sin(shine * Math.PI) + 6 * (shine >= 1); }
        ctx.fillText(s, x, y); ctx.restore();
      } else { ctx.fillStyle = col; ctx.fillText(s, x, y); }
      x += ctx.measureText(txt).width;
      if (n < txt.length && n > 0 && Math.floor(t * 3) % 2 === 0) { ctx.fillStyle = C.white; ctx.fillRect(x - ctx.measureText(txt.slice(n)).width + 2, y - 18, 3, 36); }
    });
    // shielded value readout, masked
    if (li >= 1 && li <= 3 && shine > 0) {
      const a = eo3(p(u, 5.4 + li * 0.12, 5.9 + li * 0.12));
      ctx.save(); ctx.globalAlpha *= a; ctx.font = font(26, 400, MONO); ctx.fillStyle = C.g500;
      ctx.fillText('// ' + '•'.repeat(6 + li) , X + 470, y); ctx.restore();
    }
  });
  ctx.restore();
}

function sceneGoal(t) {
  const u = t - S.goal[0];
  hideAll();
  stack.visible = true; dust.visible = false;
  scene.environment = envLight; scene.background = bgLight;
  key.intensity = 0.4; sun.intensity = 2.4; amb.intensity = 0.9;
  bloom.intensity = 0.25; bloom.luminanceMaterial.threshold = 1.2;
  poseStack(t);
  const orb = lerp(0.62, 0.86, p(u, 0, 10));
  const R = 19;
  setCam(Math.sin(orb) * R, 9.5, Math.cos(orb) * R, 0, 0.4, 0, 26);
  camera.setViewOffset(W, H, -W * 0.31, -H * 0.07, W, H);
  stack.position.set(0, 0, 0);
  sun.target.position.set(0, 0, 0); sun.position.set(-5, 12, 6);
  scene.background = new THREE.Color(1.45, 1.45, 1.45);
  const show3D = p(u, 2.0, 2.9);
  glAlpha = show3D;
  glFilter = 'none';
  UI.push(() => {
    // light page
    ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = C.g50; ctx.fillRect(0, 0, W, H); ctx.restore();
    // "The goal?" big, then demotes to a label (title-demote: 26f asymmetric, scale -> ~0.25)
    const dm = eDemote(p(u, 2.1, 2.1 + 26 / 30));
    const sc = lerp(1, 0.23, dm);
    const gx = lerp(W / 2, 150, dm), gy = lerp(H / 2 + 60, 236, dm);
    const rise = eo5(p(u, 0.1, 0.8));
    ctx.save(); ctx.translate(gx, gy); ctx.scale(sc, sc);
    ctx.font = font(220, 500, DISPLAY); ctx.letterSpacing = '-6px'; ctx.textBaseline = 'alphabetic';
    const tw = ctx.measureText('The goal').width, qw = ctx.measureText('?').width;
    const ox = lerp(-(tw + qw) / 2, 0, dm);
    ctx.globalAlpha = rise; ctx.fillStyle = C.black;
    if (rise < 1) ctx.filter = `blur(${((1 - rise) * 16).toFixed(1)}px)`;
    ctx.fillText('The goal', ox, (1 - rise) * 60);
    const qp = back(p(u, 0.45, 0.85), 2.2);
    ctx.save(); ctx.translate(ox + tw + qw / 2, -80); ctx.scale(qp, qp); ctx.fillStyle = C.mauve; ctx.fillText('?', -qw / 2, 80); ctx.restore();
    ctx.restore();
    blurSlide([
      { text: 'Building private onchain', size: 74, color: C.black, accent: { words: ['private'], color: C.mauve } },
      { text: 'applications within a familiar', size: 74, color: C.black },
      { text: 'EVM development environment.', size: 74, color: C.black, accent: { words: ['EVM'], color: C.mauve } },
    ], 150, 380, t, S.goal[0] + 2.5, { tOut: 1e9, gap: 3 / 30 });
    // white flash falls off (quint-out, like eyes adapting)
    const wf = 1 - eo5(p(u, 0.0, 0.75));
    if (wf > 0) { ctx.fillStyle = `rgba(255,255,255,${wf})`; ctx.fillRect(0, 0, W, H); }
    // exit: an ink ring from the centre wipes to the dark stage
    const wp = ei2(p(t, S.goal[1] - 0.32, S.goal[1]));
    if (wp > 0) { ctx.fillStyle = '#0b0a0b'; ctx.beginPath(); ctx.arc(W * 0.62, H * 0.55, 2300 * wp, 0, 7); ctx.fill(); }
  });
}

function sceneDifferent(t) {
  const u = t - S.different[0];
  hideAll();
  zkRing.visible = true; enclave.visible = true; beamL.visible = beamR.visible = true;
  scene.background = bgDark;
  const conv = eio3(p(u, 3.75, 6.7));
  const xL = lerp(-3.9, -0.95, conv), xR = lerp(3.9, 0.95, conv), yy = lerp(-0.35, -0.6, conv);
  setCam(0, 0.55, lerp(12.5, 10.8, eio3(p(u, 0, 7))), 0, -0.1, 0, 30);
  zkRing.position.set(xL, yy, 0); zkRing.rotation.set(0.2 * Math.sin(t * 0.6), t * 0.5, 0); zkRing.scale.setScalar(lerp(1, 0.6, conv));
  zkInner.rotation.z = t;
  poseEnclave(t, new THREE.Vector3(xR, yy, 0), lerp(0.62, 0.38, conv), { data: false, power: 1 + conv });
  aimBeam(beamL, new THREE.Vector3(lerp(-4.6, 0, conv), 7, -1), new THREE.Vector3(xL, yy - 1.5, 0), 0.5 + conv * 0.4, t);
  aimBeam(beamR, new THREE.Vector3(lerp(4.6, 0, conv), 7, -1), new THREE.Vector3(xR, yy - 1.5, 0), 0.5 + conv * 0.4, t);
  rim.intensity = 30; rim.position.set(0, 2, -3);
  bloom.intensity = 1.1 + conv * 1.6;
  const dark = t > S.different[1] - 0.7;
  glOn = !dark;
  UI.push(() => {
    vignette(0.65);
    const ent = 1 - eo3(p(u, 0, 0.5));
    blurSlide([{ text: 'Different approaches.', size: 104, color: C.white }], W / 2, 230, t, S.different[0] + 0.3, { align: 'center', tOut: S.different[0] + 3.5 });
    blurSlide([{ text: 'One important question:', size: 104, color: C.white, accent: { words: ['question'], color: C.mauveLt } }], W / 2, 230, t, S.different[0] + 3.85, { align: 'center', tOut: S.different[1] - 0.75, outDur: 0.12 });
    const lab = (txt, v3, col) => {
      const [sx, sy] = toScreen(v3); const a = eo3(p(u, 0.9, 1.5)) * (1 - p(u, 3.3, 3.75));
      if (a <= 0) return;
      ctx.save(); ctx.globalAlpha = a; ctx.font = font(28, 500, MONO); ctx.letterSpacing = '6px'; ctx.textAlign = 'center'; ctx.fillStyle = col; ctx.fillText(txt, sx, sy); ctx.restore();
    };
    lab('ZERO-KNOWLEDGE', new THREE.Vector3(xL, yy - 1.75, 0), C.g200);
    lab('TEE + SHIELDED TYPES', new THREE.Vector3(xR, yy - 1.75, 0), C.mauveLt);
    const [cx, cy] = toScreen(new THREE.Vector3(0, yy, 0));
    flare(cx, cy, conv * conv * 1.3);
    if (dark) {
      // near-silence: everything gone except one point of light
      ctx.fillStyle = '#050405'; ctx.fillRect(0, 0, W, H);
      const pulse = 0.7 + 0.3 * Math.sin((t - (S.different[1] - 0.7)) * 14);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90); g.addColorStop(0, `rgba(255,255,255,${pulse})`); g.addColorStop(0.08, `rgba(242,214,227,${0.6 * pulse})`); g.addColorStop(1, 'rgba(242,214,227,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    zoomBlur(ent * 0.8);
  });
}

function sceneQuestion(t) {
  const u = t - S.question[0];
  hideAll();
  logo.visible = true;
  scene.background = bgDark;
  setCam(0, 0, 9 + u * 0.05, 0, 0, 0, 30);
  const land = S.question[0] + 4.6;  // 59.6
  logo.position.set(0, 1.72, 0); logo.scale.setScalar(0.4);
  logo.rotation.y = 0.18 * Math.sin(u * 0.4);
  poseLogo(logo, t, land, { glow: 1.6 + 2 * Math.exp(-Math.max(0, t - land) * 4) * (t > land ? 1 : 0), edge: 0.6, spread: 0.7 });
  rim.intensity = 30; rim.position.set(0, 2.5, -2);
  bloom.intensity = 1.1 + 2.6 * hitEnv(t);
  ca.offset.set(0.007 * hitEnv(t), 0.005 * hitEnv(t));
  const end = p(t, S.question[1] - 1.1, S.question[1]);
  UI.push(() => {
    const cx = W / 2, cy = H * 0.56;
    rays(cx, cy, (0.9 * Math.exp(-u * 1.2) + 0.35) * (1 - end), t);
    shock(cx, cy, t, S.question[0], { maxR: 1700, dur: 1.2 });
    if (u < 0.12) { ctx.fillStyle = `rgba(255,255,255,${1 - u / 0.12})`; ctx.fillRect(0, 0, W, H); }
    flare(cx, cy, hitEnv(t) * 1.4);
    blurSlide([{ text: 'What should remain', size: 78, weight: 400, color: C.g200 }], W / 2, 520, t, S.question[0] + 0.25, { align: 'center' });
    // "private": a redaction bar sweeps over the word, glitches, then lifts to reveal it
    const yP = 700;
    ctx.save(); ctx.font = font(200, 600, DISPLAY); ctx.letterSpacing = '-6px'; ctx.textBaseline = 'alphabetic';
    const pw = ctx.measureText('private').width; ctx.restore();
    const x0 = W / 2 - pw / 2;
    const bar = eo3(p(u, 1.0, 1.55)), lift = eio3(p(u, 2.2, 2.75));
    const reveal = p(u, 2.2, 2.75);
    if (reveal > 0) {
      ctx.save(); ctx.font = font(200, 600, DISPLAY); ctx.letterSpacing = '-6px'; ctx.fillStyle = C.white; ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = C.mauveLt; ctx.shadowBlur = 40 + 30 * Math.exp(-(u - 2.6) * 2) * (u > 2.6 ? 1 : 0);
      ctx.beginPath(); ctx.rect(x0 - 20, yP - 200, (pw + 40) * reveal, 260); ctx.clip();
      ctx.fillText('private', x0, yP); ctx.restore();
    }
    if (bar > 0 && lift < 1) {
      const g = u > 1.6 && u < 2.1 ? (Math.floor(t * 15) % 3 === 0 ? 1 : 0.3) : 0;
      const jx = g ? (hash(Math.floor(t * 15)) - 0.5) * 24 : 0;
      ctx.save(); ctx.globalAlpha = 1 - lift;
      ctx.fillStyle = C.mauve; ctx.fillRect(x0 - 20 + jx + (pw + 40) * lift, yP - 160, (pw + 40) * bar * (1 - lift), 190);
      if (g) { ctx.fillStyle = 'rgba(242,214,227,0.5)'; ctx.fillRect(x0 - 20 - jx * 1.5, yP - 160 + hash(Math.floor(t * 30)) * 150, pw + 40, 6); }
      ctx.font = font(26, 500, MONO); ctx.letterSpacing = '8px'; ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.textBaseline = 'middle';
      if (bar > 0.9) ctx.fillText(scramble('[ SHIELDED ]', g, 3, t), x0 + 30 + jx, yP - 65);
      ctx.restore();
    }
    blurSlide([{ text: 'on the blockchain?', size: 78, weight: 400, color: C.g200, accent: { words: ['blockchain?'], color: C.mauveLt } }], W / 2, 850, t, S.question[0] + 2.9, { align: 'center' });
    // echo of the opening: the seismograph, kicked once when the stone lands
    seismo(985, t, p(u, 3.2, 4.0) * 0.8 * (1 - end), [[land, 22]], { x0: 260, x1: W - 260 });
    vignette(0.7);
    if (end > 0) { ctx.fillStyle = `rgba(0,0,0,${eio3(end)})`; ctx.fillRect(0, 0, W, H); }
  });
}

// =====================================================================================
// master render
// =====================================================================================
const ORDER = [['open', sceneOpen], ['paths', scenePaths], ['zk', sceneZK], ['seismic', sceneSeismic], ['tee', sceneTEE], ['goal', sceneGoal], ['different', sceneDifferent], ['question', sceneQuestion]];
function render(t) {
  UI.length = 0; glFilter = 'none'; glAlpha = 1; glOn = true;
  let fn = sceneQuestion;
  for (const [k, f] of ORDER) if (t >= S[k][0] && t < S[k][1]) { fn = f; break; }
  fn(t);
  dust.material.uniforms.uTime.value = t;
  composer.render(1 / TL.FPS);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.clearRect(0, 0, W, H);
  const [sx, sy] = shakeXY(t);
  ctx.save();
  ctx.translate(sx, sy);
  if (glOn) {
    ctx.globalAlpha = glAlpha;
    if (glFilter !== 'none') ctx.filter = glFilter;
    ctx.drawImage(glCanvas, sx ? -20 : 0, sx ? -20 : 0, sx ? W + 40 : W, sx ? H + 40 : H);
    ctx.filter = 'none'; ctx.globalAlpha = 1;
  } else { ctx.fillStyle = '#050405'; ctx.fillRect(0, 0, W, H); }
  for (const job of UI) { ctx.save(); job(); ctx.restore(); }
  ctx.restore();
  // fade in from black at the very start
  const fi = 1 - p(t, 0, 0.35);
  if (fi > 0) { ctx.fillStyle = `rgba(0,0,0,${fi})`; ctx.fillRect(0, 0, W, H); }
}
window.render = render;
window.DUR = TL.DUR;

// ---------- boot
(async () => {
  const faces = ['300 20px "Inter Display"', '400 20px "Inter Display"', '500 20px "Inter Display"', '600 20px "Inter Display"', '400 20px "JB Mono"', '500 20px "JB Mono"', '400 20px Inter'];
  await Promise.all(faces.map((f) => document.fonts.load(f)));
  // labels drawn into textures before fonts loaded: redraw them now
  scene.traverse((o) => { if (o.material && o.material.map && o.material.map.isCanvasTexture) o.material.map.needsUpdate = true; });
  rebuildLabels();
  for (const tt of [1, 9, 17, 26, 32, 40, 50, 58]) render(tt);
  window.READY = true;
  if (!location.search.includes('render')) preview();
})();

function rebuildLabels() {
  evmLabel.material.map = labelTex((g, w, h) => { g.fillStyle = '#737373'; g.font = `500 ${h * 0.62}px ${MONO}`; g.textBaseline = 'middle'; g.letterSpacing = '18px'; g.fillText('EVM  ·  EXECUTION LAYER', 24, h / 2 + 4); }, 2048, 148);
  zkDisc.material.map = labelTex((g, w) => { g.fillStyle = '#f4f4f4'; g.font = `300 ${w * 0.62}px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('π', w / 2, w * 0.47); });
  evmLabel.material.needsUpdate = true; zkDisc.material.needsUpdate = true;
}

function preview() {
  const bar = document.getElementById('bar'), btn = document.getElementById('play'), tc = document.getElementById('tc');
  const audio = new Audio('out/mix.wav');
  let playing = false, t0 = 0, start = 0, cur = 0;
  const show = (t) => { cur = t; render(t); bar.value = (t / TL.DUR) * 1000; tc.textContent = t.toFixed(2); };
  bar.oninput = () => { show((bar.value / 1000) * TL.DUR); if (playing) { start = performance.now(); t0 = cur; audio.currentTime = cur; } };
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? 'Pause' : 'Play'; if (playing) { start = performance.now(); t0 = cur; audio.currentTime = cur; audio.play().catch(() => {}); loop(); } else audio.pause(); };
  const loop = () => { if (!playing) return; const t = t0 + (performance.now() - start) / 1000; if (t >= TL.DUR) { playing = false; btn.textContent = 'Play'; return; } show(t); requestAnimationFrame(loop); };
  const q = new URLSearchParams(location.search); show(parseFloat(q.get('t') || '3'));
}
