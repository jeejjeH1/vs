// Shared timing for visuals (main.js) and music (audio.js).
// Music: 6/8, eighth note = 0.2s, one bar = 1.2s. Every scene cut lands on a bar line.
(function (root) {
  const TL = {
    FPS: 30,
    DUR: 62,
    EIGHTH: 0.2,
    BAR: 1.2,
    MELODY_IN: 2.4,            // santur enters on the VS hit
    VS_HIT: 2.4,
    CUTS: [6, 12, 18, 24, 30, 36, 42, 48, 55.2],
    SCENES: {
      intro: [0, 6],
      gpt: [6, 12],
      claude: [12, 18],
      rounds: [18, 48],        // 5 rounds x 6s
      summary: [48, 55.2],
      outro: [55.2, 62],
    },
    FINAL_HIT: 60,
  };
  if (typeof module !== 'undefined') module.exports = TL; else root.TL = TL;
})(this);
