// One timeline drives picture (main.js), score (audio.py) and sound events.
// 96 BPM: one beat = 0.625 s, one bar = 2.5 s. Every scene cut lands on a bar line.
(function (root) {
  const BEAT = 0.625, BAR = 2.5;
  const TL = {
    FPS: 30,
    DUR: 65,
    BPM: 96,
    BEAT,
    BAR,
    SCENES: {
      open:      [0, 7.5],     // seismograph hook -> logo fracture-assembles (hit 2.5)
      paths:     [7.5, 15],    // "Not all privacy-focused blockchains take the same approach." chain forks
      zk:        [15, 25],     // ZK: data -> scramble -> proof -> verified
      seismic:   [25, 30],     // logo slams into a grid, seismic wave (hit 25)
      tee:       [30, 37.5],   // enclave + shielded Solidity types
      goal:      [37.5, 47.5], // white flash; "The goal?" then EVM app stack (light scene)
      different: [47.5, 55],   // two approaches, beams converge, silence
      question:  [55, 65],     // the question; logo returns (hit 55)
    },
    HITS: [2.5, 25, 55],       // the only full-frame impacts (shake + chromatic split)
    FLASH: 37.5,               // white-flash cut into the light scene
    SILENCES: [[24.55, 25], [54.3, 55]],
    // sound events placed on picture frames (audio.py reads these)
    EV: [
      { t: 0.05, s: 'scifi/space-intro-futuristic', g: 0.35 },
      { t: 0.62, s: 'impact/bass-hit-short', g: 0.5 },
      { t: 1.25, s: 'impact/bass-hit-short', g: 0.6 },
      { t: 2.5, s: 'impact/impact-epic-trailer', g: 1.0 },
      { t: 2.5, s: 'glass/glass-hit-cine', g: 0.35 },
      { t: 3.6, s: 'light/shimmer-sparkle-sweep', g: 0.45 },
      { t: 6.9, s: 'camera/zoom-futuristic', g: 0.6 },
      { t: 7.5, s: 'impact/impact-deep-whoosh', g: 0.55 },
      { t: 10.6, s: 'transition/sweep-metal-quick', g: 0.45 },
      { t: 14.6, s: 'transition/sweep-scifi-fast', g: 0.55 },
      { t: 15.7, s: 'data/data-scan', g: 0.4 },
      { t: 18.75, s: 'data/glitch-static', g: 0.45 },
      { t: 19.4, s: 'data/glitch-electric-small', g: 0.4 },
      { t: 20.65, s: 'data/data-compute', g: 0.45 },
      { t: 22.5, s: 'mech/lock-digital', g: 0.6 },
      { t: 22.5, s: 'light/sparkle-touch', g: 0.4 },
      { t: 25.0, s: 'impact/impact-movie-epic', g: 1.0 },
      { t: 25.0, s: 'impact/bass-hit-futuristic', g: 0.7 },
      { t: 29.6, s: 'transition/air-whoosh-powerful', g: 0.5 },
      { t: 30.2, s: 'mech/machine-activate-short', g: 0.45 },
      { t: 32.6, s: 'text/typewriter-digital', g: 0.3, dur: 2.4 },
      { t: 35.3, s: 'light/light-aura', g: 0.45 },
      { t: 37.0, s: 'transition/air-zoom-vacuum', g: 0.55 },
      { t: 37.5, s: 'impact/impact-zoom-quick', g: 0.7 },
      { t: 40.0, s: 'transition/swoosh-quick', g: 0.4 },
      { t: 41.25, s: 'mech/metal-drop-scifi-small', g: 0.45 },
      { t: 41.875, s: 'mech/metal-drop-scifi-small', g: 0.45 },
      { t: 42.5, s: 'mech/metal-drop-scifi-small', g: 0.45 },
      { t: 43.125, s: 'mech/gear-lock-metallic', g: 0.55 },
      { t: 47.3, s: 'transition/air-woosh-deep', g: 0.6 },
      { t: 51.25, s: 'transition/swoosh-slow', g: 0.4 },
      { t: 55.0, s: 'impact/impact-cine-big', g: 1.0 },
      { t: 55.0, s: 'impact/bass-hit-futuristic', g: 0.6 },
      { t: 56.6, s: 'data/glitch-virtual-quick', g: 0.35 },
      { t: 57.2, s: 'light/light-transition-magic', g: 0.4 },
      { t: 59.6, s: 'glass/glass-hit-cine', g: 0.4 },
      { t: 59.6, s: 'impact/bass-hit-short', g: 0.4 },
    ],
  };
  if (typeof module !== 'undefined') module.exports = TL; else root.TL = TL;
})(this);
