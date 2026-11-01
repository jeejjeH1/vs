// Shared timing for the visuals (main.js) and the soundtrack (audio.js), in seconds.
// 120 BPM: one beat = 0.5s, so every scene cut (3, 6, 9, 12) lands on a downbeat.
(function (root) {
  const TL = {
    FPS: 30,
    DUR: 15,
    BPM: 120,
    CUTS: [3, 6, 9, 12],

    // scene 1 – lines draw a cursor
    linesIn: 0.15,
    cursorPop: 2.15,

    // scene 2 – cursor operates a glass browser
    clicks: [3.55, 5.0, 5.62],
    typeStart: 3.72,
    typeRate: 0.04,
    typeText: 'Book a flight to Tokyo',
    popup: 5.15,

    // scene 3 – people connect to the core
    people: 16,
    connectStart: 6.3,
    connectStep: 0.105,
    connectTravel: 0.32,

    // scene 4 – core becomes the icon, sparks go back to the people
    squeeze: 9.0,
    burst: 9.3,
    sparkWaves: [9.38, 10.55],
    sparkTravel: 0.55,

    // scene 5 – logo reveal
    logoHit: 12.0,
    wordmark: 12.3,
    shine: 12.75,
    tagline: 12.8,
    handle: 13.15,
    pulse2: 14.0,
  };
  TL.typeEnd = TL.typeStart + TL.typeText.length * TL.typeRate;
  TL.appear = (i) => TL.connectStart + i * TL.connectStep;
  TL.arrive = (i) => TL.appear(i) + TL.connectTravel;
  if (typeof module !== 'undefined') module.exports = TL; else root.TL = TL;
})(this);
