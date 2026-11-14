/* GroceryRun — audio manager (WebAudio, gesture-unlocked).
   Full sound design lands in Phase 4/5; Phase 1 wires the bus + mute toggle. */
(function (global) {
  'use strict';

  var ctx = null;
  var unlocked = false;

  function ensure() {
    if (ctx) return ctx;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    return ctx;
  }

  function unlock() {
    var c = ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(function () {});
    unlocked = true;
  }

  function isMuted() { return !!global.GRState.get().muted; }

  function blip(freq, dur, type, gain) {
    if (isMuted()) return;
    var c = ensure();
    if (!c || !unlocked) return;
    try {
      var osc = c.createOscillator();
      var g = c.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, c.currentTime);
      g.gain.setValueAtTime(gain == null ? 0.05 : gain, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      osc.connect(g);
      g.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + dur);
    } catch (e) { /* ignore */ }
  }

  var SFX = {
    tap:     function () { blip(720, 0.06, 'square', 0.035); },
    coin:    function () { blip(1180, 0.08, 'triangle', 0.045); setTimeout(function () { blip(1560, 0.07, 'triangle', 0.03); }, 55); },
    click:   function () { blip(520, 0.05, 'square', 0.04); },
    confirm: function () { blip(660, 0.09, 'square', 0.05); setTimeout(function () { blip(990, 0.13, 'square', 0.05); }, 90); },
    error:   function () { blip(200, 0.13, 'sawtooth', 0.045); },

    /* phase 3: a papery two-tone when a receipt prints */
    receipt: function () {
      blip(880, 0.04, 'square', 0.028);
      setTimeout(function () { blip(1320, 0.05, 'square', 0.024); }, 70);
    },

    /* phase 4 */
    blip: function () { blip(1500, 0.02, 'square', 0.02); },
    catch: function () {
      blip(880, 0.06, 'triangle', 0.05);
      setTimeout(function () { blip(1320, 0.07, 'triangle', 0.045); }, 50);
    },
    hit: function () { blip(140, 0.18, 'sawtooth', 0.07); },
    glitch: function () {
      /* a descending broken sweep */
      for (var i = 0; i < 6; i++) {
        (function (n) {
          setTimeout(function () { blip(900 - n * 110, 0.07, 'sawtooth', 0.04); }, n * 70);
        })(i);
      }
    },

    /* phase 5 */
    win: function () {
      var notes = [523, 659, 784, 1047];
      for (var i = 0; i < notes.length; i++) {
        (function (f, n) {
          setTimeout(function () { blip(f, 0.16, 'triangle', 0.055); }, n * 110);
        })(notes[i], i);
      }
    },
    fanfare: function () {
      var seq = [523, 523, 659, 784, 1047, 1319];
      for (var i = 0; i < seq.length; i++) {
        (function (f, n) {
          setTimeout(function () { blip(f, 0.22, 'triangle', 0.05); }, n * 130);
        })(seq[i], i);
      }
    }
  };

  function play(name) {
    if (isMuted()) return;
    var f = SFX[name];
    if (f) f();
  }

  global.GRAudio = {
    unlock: unlock,
    play: play,
    blip: blip,
    isMuted: isMuted
  };
})(window);
