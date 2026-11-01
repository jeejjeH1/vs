// Vector rebuild of the Action Model starburst icon (traced from logo_reference.jpg).
// Coordinates are in the reference's 800px space; the icon is drawn as stroked bands so
// every branch can "grow" outward from the trunk crossing.
(function (root) {
  const CX = 400, CY = 396, SPAN = 540; // visual centre + width of the icon in source units
  const LEG = 50, BR = 42;
  const half = [
    // trunk: two crossing bands, split at the crossing so they grow outward from it
    { p0: [400, 392], p1: [302, 136], w: LEG, d: 0 },
    { p0: [400, 392], p1: [498, 136], w: LEG, d: 0 },
    { p0: [400, 392], p1: [497, 654], w: LEG, d: 0.05 },
    { p0: [400, 392], p1: [303, 654], w: LEG, d: 0.05 },
  ];
  const branches = [
    { p0: [382, 400], c: [298, 302], p1: [196, 212], w: BR, d: 0.18 },
    { p0: [371, 476], c: [326, 392], p1: [134, 352], w: BR, d: 0.26 },
    { p0: [328, 588], c: [310, 494], p1: [146, 490], w: BR, d: 0.34 },
  ];
  const STROKES = [...half];
  for (const b of branches) {
    STROKES.push(b);
    STROKES.push({ p0: [800 - b.p0[0], b.p0[1]], c: [800 - b.c[0], b.c[1]], p1: [800 - b.p1[0], b.p1[1]], w: b.w, d: b.d + 0.03 });
  }
  const DOT = { x: 400, y: 634, r: 25 };

  function pt(s, u) {
    if (!s.c) return [s.p0[0] + (s.p1[0] - s.p0[0]) * u, s.p0[1] + (s.p1[1] - s.p0[1]) * u];
    const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
    return [a * s.p0[0] + b * s.c[0] + c * s.p1[0], a * s.p0[1] + b * s.c[1] + c * s.p1[1]];
  }

  // grow: 0..1 overall build progress (1 = finished icon)
  function drawIcon(ctx, cx, cy, size, { grow = 1, fill = '#fff', glow = 0, glowColor = '#A855F7', alpha = 1 } = {}) {
    if (alpha <= 0 || grow <= 0) return;
    const k = size / SPAN;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(cx, cy);
    ctx.scale(k, k);
    ctx.translate(-CX, -CY);
    ctx.strokeStyle = fill;
    ctx.fillStyle = fill;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    if (glow) { ctx.shadowColor = glowColor; ctx.shadowBlur = glow; }
    ctx.beginPath();
    for (const s of STROKES) {
      const u = Math.max(0, Math.min(1, (grow - s.d) / 0.55));
      if (u <= 0) continue;
      const e = 1 - Math.pow(1 - u, 3);
      ctx.lineWidth = s.w;
      ctx.beginPath();
      const n = s.c ? 28 : 1;
      for (let i = 0; i <= n; i++) { const q = pt(s, (i / n) * e); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
      ctx.stroke();
    }
    const du = Math.max(0, Math.min(1, (grow - 0.72) / 0.28));
    if (du > 0) {
      const c1 = 1.7, c3 = c1 + 1, x = du - 1, b = 1 + c3 * x * x * x + c1 * x * x;
      ctx.beginPath();
      ctx.arc(DOT.x, DOT.y, DOT.r * Math.max(0, b), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const api = { drawIcon, SPAN };
  if (typeof module !== 'undefined') module.exports = api; else root.AMLogo = api;
})(this);
