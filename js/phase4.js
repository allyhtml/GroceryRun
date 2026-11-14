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

  /* ---------------- icon drawing ----------------
     Each collectable is drawn as a recognisable object rather than a
     labelled tile. Everything is vector so it stays sharp at any size. */

  /* ZUS coffee cup — takeaway cup, lid, sleeve, steam */
  function iconCoffee(ctx, s) {
    var w = s * 0.52, h = s * 0.70;
    var top = -h * 0.42, bot = h * 0.52;

    /* steam */
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = Math.max(1.5, s * 0.035);
    ctx.lineCap = 'round';
    for (var i = -1; i <= 1; i++) {
      var sx = i * s * 0.13;
      ctx.beginPath();
      ctx.moveTo(sx, top - h * 0.20);
      ctx.quadraticCurveTo(sx + s * 0.06, top - h * 0.30, sx, top - h * 0.40);
      ctx.stroke();
    }

    /* tapered cup body */
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-w / 2, top);
    ctx.lineTo(w / 2, top);
    ctx.lineTo(w * 0.34, bot);
    ctx.lineTo(-w * 0.34, bot);
    ctx.closePath();
    ctx.fill();

    /* sleeve band */
    ctx.fillStyle = '#c2410c';
    ctx.beginPath();
    ctx.moveTo(-w * 0.46, top + h * 0.34);
    ctx.lineTo(w * 0.46, top + h * 0.34);
    ctx.lineTo(w * 0.42, top + h * 0.60);
    ctx.lineTo(-w * 0.42, top + h * 0.60);
    ctx.closePath();
    ctx.fill();

    /* lid */
    ctx.fillStyle = '#0f766e';
    roundRect(ctx, -w * 0.60, top - h * 0.16, w * 1.20, h * 0.20, h * 0.07);
    ctx.fill();

    /* sip hole */
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(w * 0.20, top - h * 0.06, w * 0.10, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    /* base shadow */
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, bot, w * 0.34, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Pizza slice — crust edge, pointed tip, cheese, pepperoni */
  function iconPizza(ctx, s) {
    var w = s * 0.76, h = s * 0.78;
    var tipY = h * 0.46, crustY = -h * 0.42;

    /* slice body */
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.moveTo(0, tipY);
    ctx.lineTo(-w / 2, crustY);
    ctx.lineTo(w / 2, crustY);
    ctx.closePath();
    ctx.fill();

    /* crust */
    ctx.fillStyle = '#d9a05b';
    roundRect(ctx, -w / 2, crustY - h * 0.13, w, h * 0.16, h * 0.08);
    ctx.fill();

    /* pepperoni */
    ctx.fillStyle = '#c2410c';
    var peps = [[-w * 0.16, crustY + h * 0.20], [w * 0.17, crustY + h * 0.16], [0, crustY + h * 0.46]];
    for (var i = 0; i < peps.length; i++) {
      ctx.beginPath();
      ctx.arc(peps[i][0], peps[i][1], s * 0.075, 0, Math.PI * 2);
      ctx.fill();
    }

    /* outline */
    ctx.strokeStyle = 'rgba(120,70,20,0.45)';
    ctx.lineWidth = Math.max(1, s * 0.022);
    ctx.beginPath();
    ctx.moveTo(0, tipY);
    ctx.lineTo(-w / 2, crustY);
    ctx.lineTo(w / 2, crustY);
    ctx.closePath();
    ctx.stroke();
  }

  /* Game controller — body, d-pad, two face buttons */
  function iconController(ctx, s) {
    var w = s * 0.86, h = s * 0.44;

    /* grips + body as one rounded slab */
    ctx.fillStyle = '#2563eb';
    roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.42);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-w * 0.30, h * 0.16, h * 0.34, 0, Math.PI * 2);
    ctx.arc(w * 0.30, h * 0.16, h * 0.34, 0, Math.PI * 2);
    ctx.fill();

    /* highlight */
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    roundRect(ctx, -w / 2 + 2, -h / 2 + 2, w - 4, h * 0.34, h * 0.22);
    ctx.fill();

    /* d-pad */
    ctx.fillStyle = '#0f172a';
    var d = s * 0.052;
    roundRect(ctx, -w * 0.30 - d, -h * 0.09, d * 2, d * 3.4, d * 0.5);
    ctx.fill();
    roundRect(ctx, -w * 0.30 - d * 1.7, d * 0.28, d * 3.4, d * 2, d * 0.5);
    ctx.fill();

    /* face buttons */
    ctx.fillStyle = '#f97362';
    ctx.beginPath();
    ctx.arc(w * 0.27, -h * 0.04, s * 0.052, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.arc(w * 0.38, h * 0.13, s * 0.052, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Bread loaf — crust dome with slashes */
  function iconBread(ctx, s) {
    var w = s * 0.72, h = s * 0.46;

    ctx.fillStyle = '#c98a4b';
    roundRect(ctx, -w / 2, -h * 0.30, w, h, h * 0.62);
    ctx.fill();

    /* top highlight */
    ctx.fillStyle = '#e0a765';
    roundRect(ctx, -w / 2 + w * 0.06, -h * 0.26, w * 0.88, h * 0.34, h * 0.28);
    ctx.fill();

    /* slashes */
    ctx.strokeStyle = 'rgba(140,90,40,0.6)';
    ctx.lineWidth = Math.max(1, s * 0.026);
    ctx.lineCap = 'round';
    for (var i = -1; i <= 1; i++) {
      var sx = i * w * 0.24;
      ctx.beginPath();
      ctx.moveTo(sx - w * 0.07, -h * 0.14);
      ctx.lineTo(sx + w * 0.07, -h * 0.02);
      ctx.stroke();
    }

    /* base */
    ctx.fillStyle = '#a86f38';
    roundRect(ctx, -w / 2, h * 0.42, w, h * 0.18, h * 0.09);
    ctx.fill();
  }

  /* Alarm clock — the penalty. Bells, face, hands, feet */
  function iconClock(ctx, s) {
    var r = s * 0.40;

    /* bells */
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(-r * 0.78, -r * 0.80, r * 0.34, 0, Math.PI * 2);
    ctx.arc(r * 0.78, -r * 0.80, r * 0.34, 0, Math.PI * 2);
    ctx.fill();

    /* feet */
    ctx.fillStyle = '#991b1b';
    roundRect(ctx, -r * 0.92, r * 0.82, r * 0.46, r * 0.30, r * 0.12);
    ctx.fill();
    roundRect(ctx, r * 0.46, r * 0.82, r * 0.46, r * 0.30, r * 0.12);
    ctx.fill();

    /* body */
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    /* face */
    ctx.fillStyle = '#fffdf7';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.70, 0, Math.PI * 2);
    ctx.fill();

    /* ticks */
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = Math.max(1, s * 0.018);
    for (var t = 0; t < 12; t++) {
      var a = (Math.PI * 2 * t) / 12;
      var inner = r * 0.56, outer = r * 0.65;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      ctx.stroke();
    }

    /* hands */
    ctx.strokeStyle = '#2b3a42';
    ctx.lineWidth = Math.max(2, s * 0.036);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -r * 0.42);
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 0.36, r * 0.12);
    ctx.stroke();

    /* centre pin */
    ctx.fillStyle = '#2b3a42';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }

  var ICON_DRAW = {
    coffee: iconCoffee,
    pizza: iconPizza,
    pad: iconController,
    bread: iconBread,
    clock: iconClock
  };

  function drawItem(c, it) {
    var ctx = arc.ctx;
    var size = Math.round(Math.min(arc.w, arc.h) * 0.15);
    var cx = it.x * arc.w;
    var cy = it.y * arc.h;

    ctx.save();
    ctx.translate(cx, cy);
    /* gentle sway rather than a full spin, so the icon stays readable */
    ctx.rotate(Math.sin(it.rot) * 0.18);

    /* soft drop shadow so icons read against the neon grid */
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.44, size * 0.30, size * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = it.bad ? 'rgba(220,38,38,0.55)' : 'rgba(255,255,255,0.30)';
    ctx.shadowBlur = size * 0.22;

    var fn = ICON_DRAW[it.kind.id];
    if (fn) fn(ctx, size);
    else {
      ctx.fillStyle = it.kind.color;
      roundRect(ctx, -size * 0.4, -size * 0.4, size * 0.8, size * 0.8, size * 0.18);
      ctx.fill();
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
    /* icons are wide, so the catch test includes the item's own radius.
       Without this the sprite visually overlaps the basket yet misses. */
    var itemR = (Math.min(arc.w, arc.h) * 0.15 * 0.43) / arc.w;

    for (var i = state.items.length - 1; i >= 0; i--) {
      var it = state.items[i];
      it.y += (it.vy * dt) / 1000;
      it.x += (it.vx * dt) / 1000;
      it.rot += (it.spin * dt) / 1000;

      if (it.x < 0.06) { it.x = 0.06; it.vx = Math.abs(it.vx); }
      if (it.x > 0.94) { it.x = 0.94; it.vx = -Math.abs(it.vx); }

      /* caught? */
      var dx = Math.abs(it.x - state.basketX);
      if (it.y >= catchY && it.y <= basketY + 0.04 && dx <= basketW * 0.5 + itemR) {
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
    state: state,
    /* test seam: draw a single item against a supplied context */
    renderItemForTest: function (c, item, w, h) {
      var savedCtx = arc.ctx, savedW = arc.w, savedH = arc.h;
      arc.ctx = c;
      arc.w = w;
      arc.h = h;
      try { drawItem(c, item); }
      finally { arc.ctx = savedCtx; arc.w = savedW; arc.h = savedH; }
    },
    iconIds: function () { return Object.keys(ICON_DRAW); }
  };
})(window);
