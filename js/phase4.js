/* GroceryRun — Phase 4: the glitch-out and the Kedai Blitz arcade.
   Written against plain canvas so the finale cannot fail on a CDN hiccup. */
(function (global) {
  'use strict';

  var S = global.GRState;
  var A = global.GRAudio;

  /* ---------------- glitch transition ---------------- */

  var glitchEl = {};
  var glitchTimer = null;
  var GLITCH_MS = 4200;

  var LOG_LINES = [
    '> closing registers...',
    '> reconciling inventory...',
    '> terminating employee session...',
    '> ERROR: manager is not an employee',
    '> ERROR: manager is the birthday boy',
    '> overriding shift schedule...',
    '> launching arcade lockdown...'
  ];

  function cacheGlitch() {
    glitchEl.screen = document.getElementById('screen-glitch');
    glitchEl.bar = document.getElementById('error-loader-bar');
    glitchEl.log = document.getElementById('error-log');
    glitchEl.reason = document.getElementById('error-reason');
  }

  function runGlitch(done) {
    cacheGlitch();
    if (glitchEl.log) glitchEl.log.innerHTML = '';
    if (glitchEl.bar) glitchEl.bar.style.width = '0%';

    global.GR.show('glitch');
    A.play('glitch');

    var started = performance.now();
    var logIndex = 0;

    if (glitchTimer) global.clearInterval(glitchTimer);
    glitchTimer = global.setInterval(function () {
      var t = (performance.now() - started) / GLITCH_MS;
      if (glitchEl.bar) glitchEl.bar.style.width = Math.min(100, Math.round(t * 100)) + '%';

      if (logIndex < LOG_LINES.length && t > logIndex / (LOG_LINES.length + 1)) {
        var line = document.createElement('div');
        line.className = 'error-log-line';
        line.textContent = LOG_LINES[logIndex];
        if (glitchEl.log) glitchEl.log.appendChild(line);
        logIndex++;
        A.play('blip');
      }

      if (t >= 1) {
        global.clearInterval(glitchTimer);
        glitchTimer = null;
        if (done) done();
      }
    }, 90);
  }

  function stopGlitch() {
    if (glitchTimer) { global.clearInterval(glitchTimer); glitchTimer = null; }
  }

  /* ---------------- arcade ---------------- */

  var GAME_MS = 30000;

  /* falling things */
  var GOOD = [
    { id: 'coffee', label: 'ZUS', color: '#c2410c', points: 10 },
    { id: 'pizza', label: 'PZA', color: '#d9a05b', points: 10 },
    { id: 'pad', label: 'PAD', color: '#2563eb', points: 15 },
    { id: 'bread', label: 'BRD', color: '#c98a4b', points: 8 }
  ];
  var BAD = [
    { id: 'clock', label: 'ALM', color: '#dc2626', points: -12 }
  ];

  var arc = {};
  var running = false;
  var rafId = null;

  var state = {
    timeLeft: GAME_MS,
    score: 0,
    misses: 0,
    items: [],
    basketX: 0.5,
    basketVX: 0,
    lastSpawn: 0,
    spawnGap: 620,
    shake: 0,
    flash: 0,
    flashColor: '255,255,255',
    pops: [],
    difficulty: 0
  };

  var keys = { left: false, right: false };
  var touchDir = 0;
  var lastFrame = 0;

  function cacheArcade() {
    arc.screen = document.getElementById('screen-arcade');
    arc.stage = document.getElementById('arcade-stage');
    arc.canvas = document.getElementById('arcade-canvas');
    arc.ctx = arc.canvas ? arc.canvas.getContext('2d') : null;
    arc.time = document.getElementById('arcade-time');
    arc.score = document.getElementById('arcade-score');
    arc.misses = document.getElementById('arcade-misses');
    arc.left = document.getElementById('arcade-left');
    arc.right = document.getElementById('arcade-right');
  }

  function resizeArcade() {
    if (!arc.canvas || !arc.stage) return false;
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    /* fall back to the window if the stage has not been laid out yet, so the
       play area can never end up NaN-sized */
    var w = arc.stage.clientWidth || global.innerWidth || 360;
    var h = arc.stage.clientHeight || Math.round((global.innerHeight || 640) * 0.5);
    if (!w || !h) return false;
    arc.canvas.width = Math.round(w * dpr);
    arc.canvas.height = Math.round(h * dpr);
    arc.w = w;
    arc.h = h;
    if (arc.ctx) {
      arc.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      arc.ctx.imageSmoothingEnabled = false;
    }
    return true;
  }

  function resetGame() {
    state.timeLeft = GAME_MS;
    state.score = 0;
    state.misses = 0;
    state.items = [];
    state.basketX = 0.5;
    state.basketVX = 0;
    state.lastSpawn = 0;
    state.spawnGap = 620;
    state.shake = 0;
    state.flash = 0;
    state.pops = [];
    state.difficulty = 0;
    updateArcadeHud();
  }

  function updateArcadeHud() {
    if (arc.time) arc.time.textContent = String(Math.ceil(state.timeLeft / 1000));
    if (arc.score) arc.score.textContent = String(state.score);
    if (arc.misses) arc.misses.textContent = String(state.misses);
  }

  function spawnItem() {
    var isBad = Math.random() < 0.24;
    var kind = isBad ? BAD[0] : GOOD[Math.floor(Math.random() * GOOD.length)];
    state.items.push({
      x: 0.1 + Math.random() * 0.8,
      y: -0.08,
      vy: 0.30 + Math.random() * 0.16 + state.difficulty * 0.10,
      vx: (Math.random() - 0.5) * 0.05,
      rot: 0,
      spin: (Math.random() - 0.5) * 2.2,
      kind: kind,
      bad: isBad,
      dead: false
    });
  }

  function drawItem(c, it) {
    var ctx = arc.ctx;
    var size = Math.round(Math.min(arc.w, arc.h) * 0.085);
    var cx = it.x * arc.w;
    var cy = it.y * arc.h;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(it.rot);

    if (it.bad) {
      /* alarm clock: disc + bells + hands */
      ctx.fillStyle = it.kind.color;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.44, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.30, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = it.kind.color;
      ctx.lineWidth = Math.max(2, size * 0.06);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -size * 0.20);
      ctx.moveTo(0, 0);
      ctx.lineTo(size * 0.16, 0);
      ctx.stroke();
      ctx.fillStyle = it.kind.color;
      ctx.beginPath();
      ctx.arc(-size * 0.30, -size * 0.32, size * 0.12, 0, Math.PI * 2);
      ctx.arc(size * 0.30, -size * 0.32, size * 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else {
      /* rounded parcel with a label */
      var s = size * 0.82;
      ctx.fillStyle = it.kind.color;
      roundRect(ctx, -s / 2, -s / 2, s, s, s * 0.22);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.30)';
      roundRect(ctx, -s / 2, -s / 2, s, s * 0.34, s * 0.22);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold ' + Math.round(size * 0.30) + 'px Rubik, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(it.kind.label, 0, size * 0.10);
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawBasket() {
    var ctx = arc.ctx;
    var bx = state.basketX * arc.w;
    var by = arc.h * 0.90;
    var bw = Math.min(arc.w * 0.26, 92);
    var bh = bw * 0.42;

    ctx.save();
    ctx.translate(bx, by);

    /* glow under the basket */
    ctx.fillStyle = 'rgba(45, 226, 197, 0.16)';
    ctx.beginPath();
    ctx.ellipse(0, bh * 0.7, bw * 0.55, bh * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    /* basket body */
    ctx.fillStyle = '#0f766e';
    roundRect(ctx, -bw / 2, -bh / 2, bw, bh, bh * 0.3);
    ctx.fill();

    /* rim */
    ctx.fillStyle = '#2de2c5';
    roundRect(ctx, -bw / 2 - 4, -bh / 2 - 5, bw + 8, 8, 4);
    ctx.fill();

    /* weave lines */
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    for (var i = 1; i < 4; i++) {
      var lx = -bw / 2 + (bw / 4) * i;
      ctx.beginPath();
      ctx.moveTo(lx, -bh / 2 + 2);
      ctx.lineTo(lx, bh / 2 - 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawBackground() {
    var ctx = arc.ctx;
    var grad = ctx.createLinearGradient(0, 0, 0, arc.h);
    grad.addColorStop(0, '#07131a');
    grad.addColorStop(0.55, '#0b1f2a');
    grad.addColorStop(1, '#123039');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, arc.w, arc.h);

    /* neon grid floor */
    ctx.strokeStyle = 'rgba(45, 226, 197, 0.16)';
    ctx.lineWidth = 1;
    var horizon = arc.h * 0.42;
    for (var i = 0; i <= 12; i++) {
      var x = (arc.w / 12) * i;
      ctx.beginPath();
      ctx.moveTo(arc.w / 2 + (x - arc.w / 2) * 0.18, horizon);
      ctx.lineTo(x, arc.h);
      ctx.stroke();
    }
    for (var j = 0; j < 7; j++) {
      var t = j / 7;
      var y = horizon + (arc.h - horizon) * (t * t);
      ctx.globalAlpha = 0.5 - t * 0.3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(arc.w, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    /* horizon glow */
    var hg = ctx.createLinearGradient(0, horizon - 30, 0, horizon + 30);
    hg.addColorStop(0, 'rgba(45,226,197,0)');
    hg.addColorStop(0.5, 'rgba(45,226,197,0.20)');
    hg.addColorStop(1, 'rgba(45,226,197,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, horizon - 30, arc.w, 60);
  }

  function drawPops() {
    var ctx = arc.ctx;
    for (var i = state.pops.length - 1; i >= 0; i--) {
      var p = state.pops[i];
      p.life -= 0.022;
      if (p.life <= 0) { state.pops.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.font = 'bold ' + Math.round(Math.min(arc.w, arc.h) * 0.05) + 'px Rubik, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.text, p.x * arc.w, p.y * arc.h);
      ctx.globalAlpha = 1;
      p.y -= 0.006;
    }
  }

  function updateItems(dt) {
    var basketW = Math.min(arc.w * 0.26, 92) / arc.w;
    var basketY = 0.90;
    var catchY = basketY - 0.045;

    for (var i = state.items.length - 1; i >= 0; i--) {
      var it = state.items[i];
      it.y += (it.vy * dt) / 1000;
      it.x += (it.vx * dt) / 1000;
      it.rot += (it.spin * dt) / 1000;

      if (it.x < 0.06) { it.x = 0.06; it.vx = Math.abs(it.vx); }
      if (it.x > 0.94) { it.x = 0.94; it.vx = -Math.abs(it.vx); }

      /* caught? */
      var dx = Math.abs(it.x - state.basketX);
      if (it.y >= catchY && it.y <= basketY + 0.04 && dx <= basketW * 0.5) {
        it.dead = true;
        if (it.bad) {
          state.score = Math.max(0, state.score + it.kind.points);
          state.misses++;
          state.shake = 1;
          state.flash = 1;
          state.flashColor = '220,38,38';
          state.pops.push({ x: it.x, y: it.y, text: it.kind.points + '', color: '#fca5a5', life: 1 });
          A.play('hit');
        } else {
          state.score += it.kind.points;
          state.flash = 0.6;
          state.flashColor = '45,226,197';
          state.pops.push({ x: it.x, y: it.y, text: '+' + it.kind.points, color: '#2de2c5', life: 1 });
          A.play('catch');
        }
        updateArcadeHud();
        state.items.splice(i, 1);
        continue;
      }

      /* missed a good one */
      if (it.y > 1.05) {
        state.items.splice(i, 1);
      }
    }
  }

  function drawFrame(dt) {
    var ctx = arc.ctx;
    if (!ctx) return;

    drawBackground();

    var shakeX = 0, shakeY = 0;
    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - dt / 240);
      shakeX = (Math.random() - 0.5) * 10 * state.shake;
      shakeY = (Math.random() - 0.5) * 10 * state.shake;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);
    for (var i = 0; i < state.items.length; i++) drawItem(ctx, state.items[i]);
    drawBasket();
    drawPops();
    ctx.restore();

    if (state.flash > 0) {
      state.flash = Math.max(0, state.flash - dt / 260);
      ctx.fillStyle = 'rgba(' + state.flashColor + ',' + (state.flash * 0.28) + ')';
      ctx.fillRect(0, 0, arc.w, arc.h);
    }

    /* low-time warning vignette */
    if (state.timeLeft < 6000) {
      var pulse = (Math.sin(performance.now() / 180) + 1) / 2;
      ctx.strokeStyle = 'rgba(220,38,38,' + (0.25 + pulse * 0.35) + ')';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, arc.w - 8, arc.h - 8);
    }
  }

  function loop(now) {
    if (!running) return;
    var dt = Math.min(48, now - (lastFrame || now));
    lastFrame = now;

    if (dt > 0) {
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        updateArcadeHud();
        endGame();
        return;
      }

      state.difficulty = 1 - state.timeLeft / GAME_MS;
      state.spawnGap = 620 - state.difficulty * 320;

      /* basket movement: keyboard, touch buttons, or drag.
         basketX is normalised 0..1, so acceleration and damping are tuned in
         that space: it reaches full width in roughly 0.4s of held input. */
      var accel = 0;
      if (keys.left) accel -= 1;
      if (keys.right) accel += 1;
      if (touchDir !== 0) accel += touchDir;

      state.basketVX += accel * dt * 0.00022;
      state.basketVX *= 0.86;
      if (accel === 0) state.basketVX *= 0.80;
      state.basketX += state.basketVX * dt * 0.06;
      if (state.basketX < 0.12) { state.basketX = 0.12; state.basketVX = 0; }
      if (state.basketX > 0.88) { state.basketX = 0.88; state.basketVX = 0; }

      state.lastSpawn += dt;
      if (state.lastSpawn >= state.spawnGap) {
        state.lastSpawn = 0;
        spawnItem();
      }

      updateItems(dt);
      updateArcadeHud();
    }

    drawFrame(dt);
    rafId = global.requestAnimationFrame(loop);
  }

  function startGame() {
    cacheArcade();
    resetGame();
    global.GR.show('arcade');

    /* give the layout a tick to settle, then keep retrying until the stage
       has real dimensions so the first frame is never mis-scaled */
    var tries = 0;
    function boot() {
      tries++;
      if (!resizeArcade() && tries < 12) {
        global.setTimeout(boot, 60);
        return;
      }
      running = true;
      lastFrame = performance.now();
      rafId = global.requestAnimationFrame(loop);
    }
    global.setTimeout(boot, 60);
  }

  function endGame() {
    running = false;
    if (rafId) global.cancelAnimationFrame(rafId);
    rafId = null;
    A.play('win');

    var st = S.get();
    st.arcadeScore = state.score;
    st.arcadeMisses = state.misses;
    st.arcadeDone = true;
    S.save();

    if (global.GRPhase5) global.GRPhase5.reveal(state.score, state.misses);
  }

  function bindControls() {
    global.document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    });
    global.document.addEventListener('keyup', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    });

    function press(btn, dir) {
      if (!btn) return;
      var start = function (e) { e.preventDefault(); touchDir = dir; };
      var end = function (e) { e.preventDefault(); touchDir = 0; };
      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', end, { passive: false });
      btn.addEventListener('touchcancel', end, { passive: false });
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', end);
      btn.addEventListener('mouseleave', end);
    }
    press(arc.left, -1);
    press(arc.right, 1);

    /* drag anywhere on the stage to steer */
    if (arc.stage) {
      var dragging = false;
      var steer = function (clientX) {
        var r = arc.stage.getBoundingClientRect();
        var t = (clientX - r.left) / Math.max(1, r.width);
        state.basketX = Math.max(0.12, Math.min(0.88, t));
        state.basketVX = 0;
      };
      arc.stage.addEventListener('touchstart', function (e) {
        dragging = true;
        steer(e.touches[0].clientX);
      }, { passive: true });
      arc.stage.addEventListener('touchmove', function (e) {
        if (!dragging) return;
        steer(e.touches[0].clientX);
      }, { passive: true });
      arc.stage.addEventListener('touchend', function () { dragging = false; }, { passive: true });
      arc.stage.addEventListener('mousedown', function (e) { dragging = true; steer(e.clientX); });
      arc.stage.addEventListener('mousemove', function (e) { if (dragging) steer(e.clientX); });
      arc.stage.addEventListener('mouseup', function () { dragging = false; });
      arc.stage.addEventListener('mouseleave', function () { dragging = false; });
    }

    global.addEventListener('resize', function () { if (running) resizeArcade(); });
    global.addEventListener('orientationchange', function () {
      global.setTimeout(function () { if (running) resizeArcade(); }, 220);
    });
  }

  function init() {
    cacheGlitch();
    cacheArcade();
    bindControls();
  }

  global.GRPhase4 = {
    init: init,
    runGlitch: runGlitch,
    stopGlitch: stopGlitch,
    startGame: startGame,
    endGame: endGame,
    basketX: function () { return state.basketX; },
    score: function () { return state.score; },
    spawnItem: spawnItem,
    state: state
  };
})(window);
