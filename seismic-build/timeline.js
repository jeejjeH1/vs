// One timeline drives picture (main.js), score (audio.py) and sound events.
// 120 BPM: beat = 0.5 s, bar = 2 s. Use-case stations are 5 s (10 beats) each.
(function (root) {
  const BEAT = 0.5, BAR = 2;
  const USE0 = 13, USE_LEN = 5;
  const TL = {
    FPS: 30,
    DUR: 60,
    BPM: 120,
    BEAT,
    BAR,
    USE0,
    USE_LEN,
    SCENES: {
      title:   [0, 6],      // Swiss type on a white grid: "What can developers actually build on @SeismicSys?"
      more:    [6, 13],     // one token on the table; "More than just private transactions." -> "Think about:" table reveal
      uses:    [13, 38],    // five turntables, one continuous track (5 x 5 s)
      tools:   [38, 45],    // crane up over the table; all five wire into one contract
      transp:  [45, 52],    // everything readable: "needs more than transparency."
      conf:    [52, 60],    // frost wave sweeps the frame; "It needs confidentiality, too." -> logo
    },
    HITS: [1.0, 10.5, 52],   // full-frame moves (≤3): title slam, table reveal, frost wave
    SILENCES: [[51.55, 52]],
    LOGO_AT: 56.3,
    USES: [
      { n: '01', title: ['Shielded tokens', 'with private balances'] },
      { n: '02', title: ['Confidential', 'DeFi protocols'] },
      { n: '03', title: ['Private lending', 'and trading'] },
      { n: '04', title: ['On-chain voting', 'with hidden votes'] },
      { n: '05', title: ['Financial applications', 'with controlled data access'] },
    ],
    FROST_AT: 1.7,          // seconds into each station when the glass frosts over
    EV: [
      { t: 0.0, s: 'text/typewriter-hit-soft', g: 0.5 },
      { t: 0.35, s: 'text/typewriter-hit-soft', g: 0.4 },
      { t: 1.0, s: 'impact/impact-zoom-quick', g: 0.7 },
      { t: 1.5, s: 'transition/sweep-short', g: 0.35 },
      { t: 2.0, s: 'transition/sweep-fast-small', g: 0.4 },
      { t: 5.6, s: 'transition/air-woosh-quick', g: 0.55 },
      { t: 6.5, s: 'mech/metal-drop-scifi-small', g: 0.6 },
      { t: 10.5, s: 'transition/air-whoosh-powerful', g: 0.6 },
      { t: 10.5, s: 'impact/impact-deep-whoosh', g: 0.4 },
      { t: 12.4, s: 'camera/zoom-air-fast', g: 0.45 },
      { t: 13.3, s: 'mech/metal-drop-scifi-small', g: 0.4 },
      { t: 13.8, s: 'mech/metal-drop-scifi-small', g: 0.35 },
      { t: 18.5, s: 'transition/swoosh-slow', g: 0.3 },
      { t: 27.5, s: 'mech/metal-drop-scifi-small', g: 0.25 },
      { t: 28.5, s: 'mech/metal-drop-scifi-small', g: 0.25 },
      { t: 33.0, s: 'paper/paper-slide', g: 0.4 },
      { t: 33.5, s: 'paper/paper-slide', g: 0.35 },
      { t: 34.0, s: 'paper/paper-slide', g: 0.35 },
      { t: 36.6, s: 'mech/lock-quick', g: 0.5 },
      { t: 38.0, s: 'camera/zoom-air-fast', g: 0.5 },
      { t: 40.5, s: 'mech/gear-lock-metallic', g: 0.45 },
      { t: 45.0, s: 'glass/glass-plate-slide', g: 0.45 },
      { t: 46.5, s: 'paper/paper-book-browse-fast', g: 0.3 },
      { t: 52.0, s: 'glass/glass-debris-sweep', g: 0.7 },
      { t: 52.0, s: 'light/shimmer-sparkle-sweep', g: 0.45 },
      { t: 56.3, s: 'light/sparkle-touch', g: 0.45 },
      { t: 56.3, s: 'glass/glass-hit-cine', g: 0.35 },
    ],
  };
  // per station: glass plate on the frost, metal sweep on the move to the next one
  for (let i = 0; i < 5; i++) {
    const s0 = USE0 + i * USE_LEN;
    TL.EV.push({ t: s0 + TL.FROST_AT, s: 'glass/glass-plate-slide', g: 0.55 });
    if (i < 4) TL.EV.push({ t: s0 + 4.35, s: 'transition/sweep-metal-quick', g: 0.45 });
  }
  if (typeof module !== 'undefined') module.exports = TL; else root.TL = TL;
})(this);
