// Shared timing for visuals (main.js) and sound (audio.js). 120 BPM: beat = 0.5s, bar = 2s.
(function (root) {
  const TL = {
    FPS: 30,
    DUR: 40,
    BEAT: 0.5,
    // scene windows (overlaps are transitions)
    S1: [0, 4],          // dark: logo assembles, fly through its core
    S2: [4, 10.35],      // hero: ipUSD Is Live on Startale App
    S3: [9.65, 14.3],    // IP Vault live on Soneium + phone
    S4: [13.7, 20.35],   // step 01: swap
    S5: [19.65, 27],     // step 02: deposit into the vault
    S6: [27, 31.05],     // dark: 30 + 200 = 230
    S7: [30.5, 35],      // deadline + gas note
    S8: [35, 40],        // end card
    // sound/visual sync points
    LOGO_HIT: 2.5,
    DROP: 4.0,
    WHOOSH: [3.75, 10.0, 14.0, 20.0, 27.4, 27.5, 30.75, 34.7],
    SWAP_BURST: 16.4,
    COUNT1: [17.3, 18.0, 30],
    COIN_DROP: 22.5,
    DIAL: [22.6, 23.8],
    COUNT2: [24.0, 25.0, 200],
    DARK_HIT: 27.0,
    BIG_HIT: 28.0,
    END_HIT: 36.0,
    BEAT_OFF: [26.0, 28.0],  // drums drop out for the build
    BEAT_END: 36.0,
  };
  if (typeof module !== 'undefined') module.exports = TL; else root.TL = TL;
})(this);
