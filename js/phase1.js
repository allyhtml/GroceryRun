/* GroceryRun — Phase 1: HUD, core tap loop, customers, canvas store scene */
(function (global) {
  'use strict';

  var S = global.GRState;
  var A = global.GRAudio;

  var GRID_W = 48;
  var GRID_H = 64;

  var el = {};
  var canvas, ctx, stage, fxLayer, tapHint;

  var scale = 8;
  var offX = 0, offY = 0;
  var vw = GRID_W, vh = GRID_H;

  var running = false;
  var rafId = null;
  var lastFrame = 0;

  var customers = [];
  var nextSpawnAt = 0;
  var customerSeq = 0;

  var hudCache = { cash: null, sat: null, income: null, level: null };

  var PAL = {
    floorA: '#232a34',
    floorB: '#1e242d',
    floorLine: '#151a21',
    wallTop: '#182029',
    wallBottom: '#11171f',
    shelfBack: '#2a333f',
    shelfFrame: '#3a4653',
    shelfGlow: '#2de2c5',
    itemA: '#d9694a',
    itemB: '#4a8fd9',
    itemC: '#d9b44a',
    itemD: '#7ac46a',
    itemE: '#b06ad9',
    counter: '#3c2f26',
    counterTop: '#54402f',
    counterEdge: '#2a211a',
    registerBody: '#2e3a46',
    registerFace: '#3d4d5c',
    registerScreen: '#2de2c5',
    registerKey: '#ffc857',
    neonPink: '#ff5d8f',
    skin: '#e8b58f',
    skinAlt: '#c78a63',
    skinAlt2: '#b17a56',
    text: '#e8f0f7',
    textDim: '#7d90a4'
  };

  /* ---------------- canvas plumbing ---------------- */

  function resize() {
    if (!canvas || !stage) return;
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var w = stage.clientWidth;
    var h = stage.clientHeight;
    if (!w || !h) return;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    scale = Math.max(w / GRID_W, h / GRID_H);
    vw = Math.ceil(w / scale);
    vh = Math.ceil(h / scale);
    offX = (w - vw * scale) / 2;
    offY = (h - vh * scale) / 2;

    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, dpr * offY);
    ctx.imageSmoothingEnabled = false;
    render();
  }

  function px(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function text(str, x, y, size, color, align) {
    ctx.save();
    ctx.fillStyle = color || PAL.text;
    ctx.font = size + 'px "Press Start 2P", monospace';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  /* ---------------- scene ---------------- */

  function drawFloor() {
    var horizon = 26;
    px(0, 0, vw, horizon, PAL.wallTop);
    px(0, 8, vw, 1, '#1d2731');
    px(0, 17, vw, 1, '#1d2731');

    px(0, horizon, vw, vh - horizon, PAL.floorA);
    for (var y = horizon; y < vh; y += 2) {
      px(0, y, vw, 1, PAL.floorB);
    }
    for (var x = -8; x < vw + 8; x += 6) {
      for (var yy = horizon; yy < vh; yy += 4) {
        var off = Math.floor((yy - horizon) / 4) * 2;
        px(x + off, yy, 1, 1, PAL.floorLine);
      }
    }
  }

  function drawShelf(x, y, w, h) {
    px(x, y, w, h, PAL.shelfBack);
    px(x, y, w, 1, PAL.shelfFrame);
    px(x, y, 1, h, PAL.shelfFrame);
    px(x + w - 1, y, 1, h, PAL.shelfFrame);
    px(x, y + h - 1, w, 1, PAL.shelfFrame);

    var colors = [PAL.itemA, PAL.itemB, PAL.itemC, PAL.itemD, PAL.itemE];
    var shelves = Math.max(1, Math.floor(h / 6));
    for (var s = 1; s <= shelves; s++) {
      var sy = y + s * Math.floor(h / (shelves + 1));
      px(x + 1, sy + 3, w - 2, 1, PAL.shelfFrame);
      var idx = 0;
      for (var ix = x + 2; ix < x + w - 2; ix += 3) {
        var c = colors[(idx + s + Math.floor(x)) % colors.length];
        px(ix, sy, 2, 3, c);
        idx++;
      }
    }
    px(x + 1, y + 1, w - 2, 1, PAL.shelfGlow);
  }

  function drawCounter() {
    var cw = Math.min(18, Math.max(12, Math.round(vw * 0.42)));
    var cx = Math.round(vw / 2 - cw / 2);
    var cy = vh - 17;

    px(cx, cy, cw, 9, PAL.counter);
    px(cx, cy, cw, 2, PAL.counterTop);
    px(cx, cy + 8, cw, 1, PAL.counterEdge);
    px(cx, cy + 2, 1, 6, PAL.counterEdge);
    px(cx + cw - 1, cy + 2, 1, 6, PAL.counterEdge);

    drawRegister(cx + Math.round(cw / 2) - 4, cy - 7);
    drawBasket(cx - 4, cy + 1);
    drawBasket(cx + cw + 1, cy + 1);

    return { x: cx, y: cy, w: cw, h: 9 };
  }

  function drawRegister(x, y) {
    px(x, y, 9, 6, PAL.registerBody);
    px(x + 1, y + 1, 7, 2, PAL.registerScreen);
    px(x + 1, y + 1, 7, 1, '#7ff0e0');
    px(x + 2, y + 4, 1, 1, PAL.registerKey);
    px(x + 4, y + 4, 1, 1, PAL.registerKey);
    px(x + 6, y + 4, 1, 1, PAL.registerKey);
    px(x, y + 6, 9, 1, '#1d252e');
    px(x + 1, y - 1, 7, 1, '#1d252e');
  }

  function drawBasket(x, y) {
    px(x, y, 4, 3, '#7a5b3d');
    px(x, y, 4, 1, '#96724d');
    px(x + 1, y - 1, 1, 1, '#557a3d');
    px(x + 3, y - 1, 1, 1, PAL.itemA);
  }

  function drawNeonSign() {
    var label = 'GROCERYRUN';
    var w = label.length * 5 + 4;
    if (w > vw - 4) return;
    var x = Math.round(vw / 2 - w / 2);
    var y = 3;

    px(x, y, w, 8, '#0d1a1e');
    px(x, y, w, 1, PAL.shelfGlow);
    px(x, y + 7, w, 1, PAL.shelfGlow);
    px(x, y, 1, 8, PAL.shelfGlow);
    px(x + w - 1, y, 1, 8, PAL.shelfGlow);

    text(label, x + 2, y + 2, 4, '#8ff5e6', 'left');
  }

  function drawAisleLabels(horizon) {
    var lx = 2;
    px(lx, horizon + 1, 9, 5, '#0f151b');
    px(lx, horizon + 1, 9, 1, PAL.neonPink);
    text('AISLE 1', lx + 1, horizon + 2, 2, PAL.neonPink, 'left');
  }

  /* ---------------- customers ---------------- */

  var SKINS = [PAL.skin, PAL.skinAlt, PAL.skinAlt2];
  var SHIRTS = ['#d9694a', '#4a8fd9', '#7ac46a', '#b06ad9', '#ffc857', '#5ac4c4'];

  function spawnCustomer() {
    var fromLeft = Math.random() > 0.38;
    var c = {
      id: ++customerSeq,
      x: fromLeft ? -4 : vw + 4,
      y: 30 + Math.random() * Math.max(1, (vh - 52)),
      dir: fromLeft ? 1 : -1,
      speed: 0.055 + Math.random() * 0.045,
      state: 'walking',
      pauseUntil: 0,
      skin: SKINS[Math.floor(Math.random() * SKINS.length)],
      shirt: SHIRTS[Math.floor(Math.random() * SHIRTS.length)],
      targetX: 0,
      bob: Math.random() * 6
    };
    c.targetX = Math.round(vw / 2 + (Math.random() * 6 - 3));
    customers.push(c);
  }

  function drawCustomer(c, t) {
    var bob = c.state === 'walking' ? Math.floor(Math.sin((t + c.bob * 40) / 110) * 1) : 0;
    var x = Math.round(c.x);
    var y = Math.round(c.y) + bob;
    if (x < -8 || x > vw + 8) return;

    px(x - 1, y + 7, 3, 1, 'rgba(0,0,0,0.42)');

    px(x, y + 5, 2, 3, '#2a303a');
    px(x + 1, y + 5, 1, 3, '#1f252d');

    px(x - 1, y + 2, 4, 3, c.shirt);
    px(x - 1, y + 2, 1, 3, 'rgba(0,0,0,0.22)');

    px(x, y, 2, 2, c.skin);

    if (c.dir < 0) {
      px(x, y + 3, 1, 1, '#1b1f27');
    } else {
      px(x + 1, y + 3, 1, 1, '#1b1f27');
    }

    if (c.state === 'paying') {
      px(x + (c.dir > 0 ? 3 : -2), y + 2, 1, 1, PAL.registerKey);
    }
  }

  function updateCustomers(dt, now) {
    if (now >= nextSpawnAt) {
      spawnCustomer();
      var rate = 2600 - Math.min(1600, S.get().upgradesOwned.length * 170);
      nextSpawnAt = now + rate + Math.random() * 900;
    }

    for (var i = customers.length - 1; i >= 0; i--) {
      var c = customers[i];

      if (c.state === 'walking') {
        var d = c.targetX - c.x;
        if (Math.abs(d) < 0.6) {
          c.state = 'paying';
          c.pauseUntil = now + 620;
        } else {
          c.x += Math.sign(d) * c.speed * dt;
          c.dir = Math.sign(d) || c.dir;
        }
      } else if (c.state === 'paying') {
        if (now >= c.pauseUntil) {
          var drop = S.customerDrop();
          S.addCash(drop);
          S.bumpSatisfaction(0.35);
          floatPlus(drop, c.x, c.y, true);
          A.play('coin');
          c.state = 'leaving';
          c.dir = c.x < vw / 2 ? -1 : 1;
          c.targetX = c.dir > 0 ? vw + 10 : -10;
          markHudDirty();
        }
      } else if (c.state === 'leaving') {
        c.x += c.dir * c.speed * dt * 1.2;
        if (c.x < -12 || c.x > vw + 12) customers.splice(i, 1);
      }
    }
  }

  /* ---------------- render ---------------- */

  function render() {
    if (!ctx) return;
    var now = performance.now();

    ctx.clearRect(0, 0, vw, vh);
    drawFloor();
    drawNeonSign();

    var horizon = 26;
    drawShelf(2, horizon + 2, Math.max(8, Math.round(vw * 0.22)), 14);
    drawShelf(vw - Math.max(8, Math.round(vw * 0.22)) - 2, horizon + 2, Math.max(8, Math.round(vw * 0.22)), 14);
    drawAisleLabels(horizon);

    for (var i = 0; i < customers.length; i++) {
      if (customers[i].y < vh - 22) drawCustomer(customers[i], now);
    }

    drawCounter();

    for (var j = 0; j < customers.length; j++) {
      if (customers[j].y >= vh - 22) drawCustomer(customers[j], now);
    }
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(64, now - (lastFrame || now));
    lastFrame = now;

    updateCustomers(dt, now);
    tickEconomy(dt);
    render();
    rafId = global.requestAnimationFrame(frame);
  }

  /* ---------------- economy loop ---------------- */

  var satAccum = 0;
  var saveAccum = 0;
  var incomeAccum = 0;

  function tickEconomy(dt) {
    var st = S.get();

    /* passive income from owned upgrades accrues continuously, so each
       upgrade pays exactly the $/sec its card advertises */
    var rate = S.passivePerSecond();
    if (rate > 0) {
      incomeAccum += (rate * dt) / 1000;
      if (incomeAccum >= 0.5) {
        var whole = Math.floor(incomeAccum);
        if (whole >= 1) {
          S.addCash(whole);
          incomeAccum -= whole;
          markHudDirty();
        }
      }
    }

    satAccum += dt;
    if (satAccum >= 1000) {
      satAccum = 0;
      S.decaySatisfaction(0.22);
      markHudDirty();
    }

    saveAccum += dt;
    if (saveAccum >= 4000) {
      saveAccum = 0;
      S.save();
    }

    if (st.firstTapDone) {
      var hint = el.tapHint;
      if (hint && !hint.classList.contains('hidden')) hint.classList.add('hidden');
    }
  }

  /* ---------------- interaction ---------------- */

  function floatPlus(amount, gx, gy, isCustomer) {
    var layer = el.fxLayer;
    if (!layer) return;

    var span = document.createElement('span');
    span.className = 'float-plus';
    span.textContent = '+' + S.formatMoney(amount);

    var left = offX + gx * scale;
    var top = offY + gy * scale;
    span.style.left = Math.max(8, Math.min(layer.clientWidth - 8, left)) + 'px';
    span.style.top = Math.max(8, Math.min(layer.clientHeight - 8, top)) + 'px';
    if (isCustomer) {
      span.style.fontSize = '19px';
      span.style.opacity = '0.85';
    }

    layer.appendChild(span);
    setTimeout(function () {
      if (span.parentNode) span.parentNode.removeChild(span);
    }, 900);
  }

  function onTap(e) {
    if (!running) return;
    A.unlock();

    var st = S.get();
    var gain = S.tapValue();
    S.addCash(gain);
    S.bumpSatisfaction(1.6);
    if (!st.firstTapDone) st.firstTapDone = true;

    var rect = stage.getBoundingClientRect();
    var point = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
    var gx = (point.clientX - rect.left - offX) / scale;
    var gy = (point.clientY - rect.top - offY) / scale;

    floatPlus(gain, gx, gy, false);
    A.play('tap');
    markHudDirty();
  }

  /* ---------------- HUD ---------------- */

  function markHudDirty() {
    hudCache.cash = null;
  }

  function updateHud() {
    var st = S.get();

    var cash = S.formatMoney(st.cash);
    if (cash !== hudCache.cash) {
      el.hudCash.textContent = cash;
      hudCache.cash = cash;
    }

    var sat = Math.round(st.satisfaction) + '%';
    if (sat !== hudCache.sat) {
      el.hudSatisfaction.textContent = sat;
      hudCache.sat = sat;
    }

    var inc = S.formatRate(S.passivePerSecond());
    if (inc !== hudCache.income) {
      el.hudIncome.textContent = inc;
      hudCache.income = inc;
    }

    var pct = Math.round(S.levelProgress() * 100);
    var label = S.levelLabel();
    if (label !== hudCache.level || pct !== hudCache.pct) {
      el.hudLevelLabel.textContent = label;
      el.hudLevelPct.textContent = pct + '%';
      el.levelFill.style.width = pct + '%';
      hudCache.level = label;
      hudCache.pct = pct;
    }
  }

  function setHudIdentity() {
    var st = S.get();
    el.hudStoreName.textContent = st.storeName || 'Kedai Runcit';
    el.hudManager.textContent = 'Manager ' + (st.managerName || '—');
  }

  function applyMuteUi() {
    var muted = A.isMuted();
    el.btnAudio.textContent = muted ? '🔇' : '🔊';
    el.btnAudio.classList.toggle('muted', muted);
  }

  /* ---------------- lifecycle ---------------- */

  function enter() {
    setHudIdentity();
    applyMuteUi();
    resize();

    var st = S.get();
    if (st.firstTapDone && el.tapHint) el.tapHint.classList.add('hidden');
    else if (el.tapHint) el.tapHint.classList.remove('hidden');

    hudCache.cash = null; hudCache.sat = null; hudCache.income = null; hudCache.level = null; hudCache.pct = null;
    updateHud();

    if (!running) {
      running = true;
      lastFrame = performance.now();
      nextSpawnAt = lastFrame + 500;
      rafId = global.requestAnimationFrame(frame);
    }
  }

  function leave() {
    running = false;
    if (rafId) global.cancelAnimationFrame(rafId);
    rafId = null;
    S.save();
  }

  function init() {
    el.hudStoreName = document.getElementById('hud-store-name');
    el.hudManager = document.getElementById('hud-manager');
    el.hudCash = document.getElementById('hud-cash');
    el.hudSatisfaction = document.getElementById('hud-satisfaction');
    el.hudIncome = document.getElementById('hud-income');
    el.hudLevelLabel = document.getElementById('hud-level-label');
    el.hudLevelPct = document.getElementById('hud-level-pct');
    el.levelFill = document.getElementById('level-fill');
    el.btnAudio = document.getElementById('btn-audio');
    el.fxLayer = document.getElementById('fx-layer');
    el.tapHint = document.getElementById('tap-hint');

    stage = document.getElementById('store-stage');
    canvas = document.getElementById('store-canvas');
    ctx = canvas.getContext('2d');

    stage.addEventListener('pointerdown', onTap, { passive: true });
    global.addEventListener('resize', function () { if (running) resize(); });
    global.addEventListener('orientationchange', function () { setTimeout(function () { if (running) resize(); }, 220); });

    el.btnAudio.addEventListener('click', function () {
      var st = S.get();
      st.muted = !st.muted;
      S.save();
      applyMuteUi();
      if (!st.muted) { A.unlock(); A.play('click'); }
    });

    global.setInterval(function () {
      if (running) updateHud();
    }, 250);

    global.addEventListener('pagehide', function () { S.save(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) S.save();
    });
  }

  global.GRPhase1 = {
    init: init,
    enter: enter,
    leave: leave
  };
})(window);
