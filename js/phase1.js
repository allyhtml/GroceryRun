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
    floorA: '#f4f7f2',
    floorB: '#e9efe6',
    floorLine: '#d3ddd0',
    wallTop: '#faf3e0',
    wallBottom: '#eef6ea',
    wallBand: '#e6dcc4',
    shelfBack: '#ffffff',
    shelfFrame: '#c9a06a',
    shelfGlow: '#0f766e',
    itemA: '#dc2626',
    itemB: '#2563eb',
    itemC: '#ca8a04',
    itemD: '#16a34a',
    itemE: '#9333ea',
    counter: '#b8875a',
    counterTop: '#d3a373',
    counterEdge: '#8f6642',
    registerBody: '#d9e2e8',
    registerFace: '#eef3f6',
    registerShadow: '#b3c0c9',
    registerScreen: '#34d399',
    registerScreenLit: '#a7f3d0',
    registerKey: '#f59e0b',
    neonPink: '#c2410c',
    signBg: '#ffffff',
    signEdge: '#0f766e',
    signText: '#0f766e',
    aisleBg: '#ffffff',
    skin: '#e8b58f',
    skinAlt: '#c78a63',
    skinAlt2: '#b17a56',
    text: '#2b3a42',
    textDim: '#5c6b73',
    shadowSoft: 'rgba(43, 58, 66, 0.16)',
    basketA: '#b8875a',
    basketB: '#d3a373',
    basketGoods: '#15803d',

    /* --- upgrade fixtures --- */
    breadCrust: '#c98a4b',
    breadCrustDark: '#a86f38',
    breadCrumb: '#f0d9b5',
    breadBag: '#e8eef2',
    snackBagA: '#dc2626',
    snackBagB: '#ca8a04',
    snackBagC: '#2563eb',
    snackBagD: '#16a34a',
    shelfMetal: '#9aa7b0',
    coffeeBody: '#e8eef2',
    coffeeDark: '#4a5560',
    coffeeRed: '#c2410c',
    coffeeSteam: '#b6c2cb',
    coffeeCup: '#f5fafc',
    freezerBody: '#dbe7ee',
    freezerGlass: '#5aa8cc',
    freezerHandle: '#94a3b8',
    pizzaCrust: '#d9a05b',
    pizzaCheese: '#f2c14e',
    pizzaPepperoni: '#c2410c',
    phoneBody: '#33414f',
    phoneScreen: '#38bdf8',
    phoneGlow: '#7dd3fc',
    hourglassFrame: '#b8875a',
    hourglassSand: '#f2c14e',
    hourglassGlass: '#e8f4f8',
    bedFrame: '#8f6642',
    bedSheet: '#f5fafc',
    bedPillow: '#e2eef5',
    bedBlanket: '#2563eb',
    bedBlanketAlt: '#3b82f6',
    laneFlagCheck: '#ffffff',
    laneFlagDark: '#33414f',
    laneGlow: '#f2c14e',
    trophyGold: '#eab308',
    trophyGoldDark: '#ca8a04',
    wood: '#8f6642'
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
    LAYOUT = layoutFixtures();
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

  /* Horizon: units of wall at the top of the scene. Kept deliberately small —
     this is a shop floor, not a gallery wall. */
  var HORIZON = 11;

  function drawFloor() {
    px(0, 0, vw, HORIZON, PAL.wallTop);
    px(0, 3, vw, 1, PAL.wallBand);
    px(0, 7, vw, 1, PAL.wallBand);

    px(0, HORIZON, vw, vh - HORIZON, PAL.floorA);
    for (var y = HORIZON; y < vh; y += 2) {
      px(0, y, vw, 1, PAL.floorB);
    }
    for (var x = -8; x < vw + 8; x += 6) {
      for (var yy = HORIZON; yy < vh; yy += 4) {
        var off = Math.floor((yy - HORIZON) / 4) * 2;
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

  /* The till sits in the reserved bottom band, spanning the width like a
     store front counter. Fixtures never enter this band. */
  function drawCounter() {
    var cy = vh - COUNTER_H + 1;
    var cw = vw;

    px(0, cy, cw, COUNTER_H - 1, PAL.counter);
    px(0, cy, cw, 2, PAL.counterTop);
    px(0, cy + COUNTER_H - 2, cw, 1, PAL.counterEdge);
    px(0, cy, cw, 1, '#c99a68');

    /* register parks near the centre of the counter */
    var rx = Math.round(vw / 2 - 4);
    drawRegister(rx, cy - 6);
    drawBasket(rx - 6, cy + 3);
    drawBasket(rx + 10, cy + 3);

    return { x: 0, y: cy, w: cw, h: COUNTER_H };
  }

  function drawRegister(x, y) {
    px(x, y, 9, 6, PAL.registerBody);
    px(x + 1, y + 1, 7, 2, PAL.registerScreen);
    px(x + 1, y + 1, 7, 1, PAL.registerScreenLit);
    px(x + 2, y + 4, 1, 1, PAL.registerKey);
    px(x + 4, y + 4, 1, 1, PAL.registerKey);
    px(x + 6, y + 4, 1, 1, PAL.registerKey);
    px(x, y + 6, 9, 1, PAL.registerShadow);
    px(x + 1, y - 1, 7, 1, PAL.registerShadow);
  }

  function drawBasket(x, y) {
    px(x, y, 4, 3, PAL.basketA);
    px(x, y, 4, 1, PAL.basketB);
    px(x + 1, y - 1, 1, 1, PAL.basketGoods);
    px(x + 3, y - 1, 1, 1, PAL.itemA);
  }

  function drawNeonSign() {
    var label = 'GROCERYRUN';
    var w = label.length * 5 + 4;
    if (w > vw - 4) return;
    var x = Math.round(vw / 2 - w / 2);
    var y = 1;
    var h = 7;

    px(x, y, w, h, PAL.signBg);
    px(x, y, w, 1, PAL.signEdge);
    px(x, y + h - 1, w, 1, PAL.signEdge);
    px(x, y, 1, h, PAL.signEdge);
    px(x + w - 1, y, 1, h, PAL.signEdge);

    text(label, x + 2, y + 2, 3, PAL.signText, 'left');
  }

  /* ---------------- upgrade fixtures ----------------
     Each owned upgrade places a physical object in the shop.
     Origin (x, y) is the bottom-left of the fixture's footprint. */

  /* 1 — Generic White Bread: a bread crate on the left rise */
  function drawBreadStand(x, y) {
    px(x, y - 1, 11, 1, PAL.shadowSoft);
    px(x, y, 11, 4, PAL.wood);
    px(x, y, 11, 1, '#a87c50');
    px(x, y + 3, 11, 1, PAL.counterEdge);
    px(x + 1, y, 9, 1, '#5f4529');
    /* loaves */
    px(x + 1, y - 3, 4, 3, PAL.breadCrust);
    px(x + 1, y - 3, 4, 1, PAL.breadCrumb);
    px(x + 1, y - 1, 4, 1, PAL.breadCrustDark);
    px(x + 6, y - 3, 4, 3, PAL.breadCrust);
    px(x + 6, y - 3, 4, 1, PAL.breadCrumb);
    px(x + 6, y - 1, 4, 1, PAL.breadCrustDark);
    /* plastic wrapper tag */
    px(x + 4, y - 2, 2, 1, PAL.breadBag);
    px(x + 9, y - 2, 1, 1, PAL.breadBag);
  }

  /* 2 — Emergency Snack Aisle: clip-strip of chip bags (compact, 9 tall) */
  function drawSnackRack(x, y) {
    px(x, y - 1, 11, 1, PAL.shadowSoft);
    px(x + 5, y - 9, 1, 9, PAL.shelfMetal);     /* pole */
    px(x + 2, y - 2, 7, 2, PAL.shelfMetal);     /* base */
    var bags = [PAL.snackBagA, PAL.snackBagB, PAL.snackBagC, PAL.snackBagD];
    for (var i = 0; i < 3; i++) {
      var by = y - 9 + i * 3;
      px(x + 2, by, 6, 3, bags[i]);
      px(x + 2, by, 6, 1, 'rgba(255,255,255,0.35)');
      px(x + 2, by + 2, 6, 1, 'rgba(43,58,66,0.18)');
    }
  }

  /* 3 — ZUS Coffee Station: counter machine with cup + steam */
  function drawCoffeeStation(x, y) {
    px(x, y - 1, 13, 1, PAL.shadowSoft);
    px(x, y, 13, 5, PAL.wood);
    px(x, y, 13, 1, '#a87c50');
    px(x, y + 4, 13, 1, PAL.counterEdge);
    /* machine body */
    px(x + 2, y - 7, 7, 7, PAL.coffeeBody);
    px(x + 2, y - 7, 7, 2, PAL.coffeeRed);
    px(x + 3, y - 4, 5, 2, PAL.coffeeDark);
    px(x + 3, y - 3, 5, 1, '#7c8894');
    px(x + 2, y - 7, 1, 7, '#c8d3da');
    px(x + 8, y - 7, 1, 7, '#c8d3da');
    /* spout */
    px(x + 5, y - 2, 1, 2, PAL.coffeeDark);
    /* cup */
    px(x + 10, y - 3, 3, 3, PAL.coffeeCup);
    px(x + 10, y - 3, 1, 3, '#dfeaf0');
    px(x + 11, y - 3, 1, 2, '#8b5a2b');
    /* steam */
    px(x + 3, y - 9, 1, 1, PAL.coffeeSteam);
    px(x + 5, y - 10, 1, 1, PAL.coffeeSteam);
    px(x + 7, y - 9, 1, 1, PAL.coffeeSteam);
  }

  /* 4 — Emergency Pizza Freezer: chest freezer with glass lid */
  function drawPizzaFreezer(x, y) {
    px(x, y - 1, 15, 1, PAL.shadowSoft);
    px(x, y, 15, 6, PAL.freezerBody);
    px(x, y, 15, 2, PAL.freezerGlass);
    px(x, y, 15, 1, '#8fd0e8');
    px(x, y + 5, 15, 1, '#9fb3c0');
    px(x + 1, y + 2, 13, 1, '#aec3cf');
    /* visible pizzas under the glass */
    px(x + 2, y, 4, 2, PAL.pizzaCrust);
    px(x + 2, y, 3, 1, PAL.pizzaCheese);
    px(x + 3, y, 1, 1, PAL.pizzaPepperoni);
    px(x + 8, y, 4, 2, PAL.pizzaCrust);
    px(x + 8, y, 3, 1, PAL.pizzaCheese);
    px(x + 9, y + 1, 1, 1, PAL.pizzaPepperoni);
    /* handle */
    px(x + 6, y + 3, 3, 1, PAL.freezerHandle);
    px(x + 13, y + 3, 1, 1, PAL.freezerHandle);
  }

  /* 5 — "No, You Hang Up First" Protocol: wall phone with glow */
  function drawPhoneBooth(x, y) {
    px(x, y - 1, 6, 1, PAL.shadowSoft);
    px(x, y, 3, 6, PAL.phoneBody);          /* pedestal */
    px(x, y, 3, 1, '#46535f');
    px(x, y + 5, 3, 1, '#222c36');
    /* handset */
    px(x + 3, y - 6, 7, 4, PAL.phoneBody);
    px(x + 3, y - 6, 7, 1, '#46535f');
    px(x + 4, y - 5, 5, 2, PAL.phoneScreen);
    px(x + 4, y - 5, 5, 1, PAL.phoneGlow);
    px(x + 2, y - 5, 1, 2, PAL.phoneBody);  /* earpiece */
    px(x, y - 4, 1, 1, PAL.phoneGlow);
    px(x + 10, y - 4, 1, 1, PAL.phoneGlow);
    /* signal waves */
    px(x + 11, y - 7, 1, 1, PAL.phoneGlow);
    px(x + 12, y - 8, 1, 1, PAL.phoneGlow);
  }

  /* 6 — Infinite Patience Reserves: giant hourglass on a plinth */
  function drawPatienceHourglass(x, y) {
    px(x, y - 1, 9, 1, PAL.shadowSoft);
    px(x, y, 9, 3, PAL.wood);
    px(x, y, 9, 1, '#a87c50');
    px(x, y + 2, 9, 1, PAL.counterEdge);
    /* frame (8 tall so it fits the compact aisle rows) */
    px(x + 1, y - 8, 7, 1, PAL.hourglassFrame);
    px(x + 1, y - 3, 7, 1, PAL.hourglassFrame);
    px(x + 1, y - 8, 1, 6, PAL.hourglassFrame);
    px(x + 7, y - 8, 1, 6, PAL.hourglassFrame);
    /* glass bulb */
    px(x + 2, y - 7, 5, 2, PAL.hourglassGlass);
    px(x + 2, y - 5, 5, 2, PAL.hourglassGlass);
    px(x + 2, y - 7, 1, 4, '#cfe6ee');
    px(x + 6, y - 7, 1, 4, '#cfe6ee');
    /* sand */
    px(x + 3, y - 7, 3, 1, PAL.hourglassSand);
    px(x + 4, y - 6, 1, 1, PAL.hourglassSand);
    px(x + 3, y - 4, 3, 1, PAL.hourglassSand);
    /* glint */
    px(x + 3, y - 6, 1, 1, '#ffffff');
  }

  /* 7 — The Blanket Hogging Barrier: a made bed with a divider */
  function drawBlanketBarrier(x, y) {
    px(x, y - 1, 20, 1, PAL.shadowSoft);
    /* frame */
    px(x, y, 20, 2, PAL.bedFrame);
    px(x, y + 2, 2, 4, PAL.bedFrame);
    px(x + 18, y + 2, 2, 4, PAL.bedFrame);
    px(x + 2, y + 4, 16, 2, PAL.bedFrame);
    /* mattress + sheet */
    px(x + 2, y + 2, 16, 3, PAL.bedSheet);
    px(x + 2, y + 2, 16, 1, '#ffffff');
    /* blanket */
    px(x + 8, y + 2, 10, 3, PAL.bedBlanket);
    px(x + 8, y + 2, 10, 1, PAL.bedBlanketAlt);
    px(x + 8, y + 2, 1, 3, '#1d4ed8');
    /* pillow */
    px(x + 3, y + 2, 4, 2, PAL.bedPillow);
    px(x + 3, y + 2, 4, 1, '#ffffff');
    /* the actual barrier down the middle */
    px(x + 9, y - 4, 1, 7, PAL.bedFrame);
    px(x + 9, y - 4, 1, 1, '#a87c50');
    px(x + 8, y - 3, 3, 1, '#a87c50');
  }

  /* 8 — The Boyfriend Express Lane: checkered lane + trophy */
  function drawExpressLane(x, y) {
    px(x, y - 1, 26, 1, PAL.shadowSoft);
    /* checkered floor strip */
    for (var i = 0; i < 13; i++) {
      var c = (i % 2 === 0) ? PAL.laneFlagCheck : PAL.laneFlagDark;
      px(x + i * 2, y, 2, 3, c);
    }
    px(x, y, 26, 1, 'rgba(255,255,255,0.5)');
    /* lane posts */
    px(x + 1, y - 5, 1, 5, PAL.shelfMetal);
    px(x + 24, y - 5, 1, 5, PAL.shelfMetal);
    px(x, y - 6, 3, 1, PAL.laneGlow);
    px(x + 23, y - 6, 3, 1, PAL.laneGlow);
    /* trophy on a plinth */
    px(x + 11, y - 3, 4, 3, PAL.wood);
    px(x + 11, y - 3, 4, 1, '#a87c50');
    px(x + 12, y - 8, 2, 2, PAL.trophyGold);      /* cup body */
    px(x + 12, y - 8, 2, 1, '#f5d76e');
    px(x + 11, y - 8, 1, 1, PAL.trophyGoldDark);  /* handles */
    px(x + 14, y - 8, 1, 1, PAL.trophyGoldDark);
    px(x + 12, y - 6, 2, 1, PAL.trophyGoldDark);  /* stem */
    px(x + 11, y - 5, 4, 1, PAL.trophyGold);      /* base */
  }

  /* Registry: level -> { draw, kind } where kind drives placement */
  var FIXTURES = {
    1: { draw: drawBreadStand,      label: 'BREAD CRATE' },
    2: { draw: drawSnackRack,       label: 'SNACK RACK' },
    3: { draw: drawCoffeeStation,   label: 'ZUS STATION' },
    4: { draw: drawPizzaFreezer,    label: 'PIZZA FREEZER' },
    5: { draw: drawPhoneBooth,      label: 'HOTLINE' },
    6: { draw: drawPatienceHourglass, label: 'PATIENCE RESERVE' },
    7: { draw: drawBlanketBarrier,  label: 'BLANKET BARRIER' },
    8: { draw: drawExpressLane,     label: 'EXPRESS LANE' }
  };

  /* The aisle fills everything above the reserved counter band. Fixtures are
     grouped into depth bands; each band's height comes from its tallest piece,
     and the whole set is scaled down proportionally when the floor is short so
     nothing can ever collide. */
  var COUNTER_H = 9;

  /* natural art size per fixture */
  var META = {
    1: { col: 'left',   w: 11, h: 4  },
    2: { col: 'center', w: 11, h: 9  },
    3: { col: 'right',  w: 13, h: 10 },
    5: { col: 'left',   w: 7,  h: 7  },
    4: { col: 'center', w: 15, h: 7  },
    6: { col: 'right',  w: 9,  h: 8  },
    7: { col: 'left',   w: 20, h: 7  },
    8: { col: 'right',  w: 26, h: 9  }
  };

  var WIDE_BANDS = [[1, 2, 3], [5, 4, 6], [7], [8]];
  var NARROW_BANDS = [[1, 3], [2], [5, 6], [4], [7], [8]];

  function colFraction(col) {
    if (col === 'left') return 0;
    if (col === 'right') return 1;
    return 0.5;
  }

  /* do these fixtures fit side by side without touching? */
  function rowFits(items, width) {
    var placed = [];
    for (var i = 0; i < items.length; i++) {
      var m = META[items[i]];
      var minX = 1;
      var maxX = Math.max(minX, width - m.w - 1);
      placed.push({ x: Math.round(minX + colFraction(m.col) * (maxX - minX)), w: m.w });
    }
    for (var a = 0; a < placed.length; a++) {
      for (var b = a + 1; b < placed.length; b++) {
        if (!(placed[a].x + placed[a].w <= placed[b].x ||
              placed[b].x + placed[b].w <= placed[a].x)) return false;
      }
    }
    return true;
  }

  function bandsFor(width) {
    if (rowFits([1, 2, 3], width) && rowFits([5, 4, 6], width)) return WIDE_BANDS;
    return NARROW_BANDS;
  }

  function bandHeight(band) {
    var tallest = 1;
    for (var i = 0; i < band.length; i++) {
      var h = META[band[i]] ? META[band[i]].h : 1;
      if (h > tallest) tallest = h;
    }
    return tallest;
  }

  function layoutFixtures() {
    var floorTop = HORIZON + 2;
    var floorBottom = Math.max(floorTop + 8, vh - COUNTER_H - 1);
    var floorH = floorBottom - floorTop;
    var bands = bandsFor(vw);

    var natural = 0, i, j;
    for (i = 0; i < bands.length; i++) natural += bandHeight(bands[i]);

    var totalGap = 1 * (bands.length - 1);
    var k = Math.min(1, (floorH - totalGap) / Math.max(1, natural));

    var out = {};
    var cursor = floorTop;
    for (i = 0; i < bands.length; i++) {
      var band = bands[i];
      var h = bandHeight(band) * k;
      var baseline = Math.round(cursor + h);
      for (j = 0; j < band.length; j++) {
        var level = band[j];
        var m = META[level];
        var minX = 1;
        var maxX = Math.max(minX, vw - m.w - 1);
        out[level] = {
          x: Math.round(minX + colFraction(m.col) * (maxX - minX)),
          y: baseline,
          w: m.w,
          scale: k,
          row: bands.length > 1 ? i / (bands.length - 1) : 0
        };
      }
      cursor += h + 1;
    }
    return out;
  }

  /* live layout for the current viewport, recomputed on resize */
  var LAYOUT = {};

  function slotPos(level) {
    var s = LAYOUT[level] || { x: 1, y: vh - COUNTER_H - 2, scale: 1, row: 0.5, w: 10 };
    return s;
  }

  /* Pop-in animation: newly bought fixtures scale/spring into place */
  var fixturePop = {};

  function fixtureScale(level, now) {
    var t = fixturePop[level];
    if (t == null) return 1;
    var age = (now - t) / 420;
    if (age >= 1) { delete fixturePop[level]; return 1; }
    if (age < 0) return 0;
    /* ease-out back */
    var p = age;
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  }

  function drawFixtures(now) {
    drawFixturesDepth(now, true);
    drawFixturesDepth(now, false);
  }

  /* Sparkle burst the moment an upgrade lands */
  function fixtureBurst(level) {
    var pos = slotPos(level);
    for (var i = 0; i < 8; i++) {
      var a = (Math.PI * 2 * i) / 8;
      (function (ang) {
        global.setTimeout(function () {
          sparkles.push({
            x: pos.x, y: pos.y - 4,
            vx: Math.cos(ang) * 0.5, vy: Math.sin(ang) * 0.5 - 0.3,
            life: 1
          });
        }, i * 18);
      })(a);
    }
  }

  var sparkles = [];
  var lastDt = 16;

  function drawSparkles(dt) {
    for (var i = sparkles.length - 1; i >= 0; i--) {
      var s = sparkles[i];
      s.x += s.vx; s.y += s.vy; s.vy += 0.06; s.life -= dt / 600;
      if (s.life <= 0) { sparkles.splice(i, 1); continue; }
      ctx.fillStyle = s.life > 0.5 ? PAL.trophyGold : PAL.laneGlow;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    }
  }

  /* ---------------- customers ---------------- */

  var SKINS = [PAL.skin, PAL.skinAlt, PAL.skinAlt2];
  var SHIRTS = ['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#b45309', '#0e7490'];

  function spawnCustomer() {
    var fromLeft = Math.random() > 0.38;
    var c = {
      id: ++customerSeq,
      x: fromLeft ? -4 : vw + 4,
      y: HORIZON + 7 + Math.random() * Math.max(1, (vh - COUNTER_H - HORIZON - 14)),
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

    px(x - 1, y + 7, 3, 1, PAL.shadowSoft);

    px(x, y + 5, 2, 3, '#4a5560');
    px(x + 1, y + 5, 1, 3, '#3a434c');

    px(x - 1, y + 2, 4, 3, c.shirt);
    px(x - 1, y + 2, 1, 3, 'rgba(43, 58, 66, 0.20)');

    px(x, y, 2, 2, c.skin);

    if (c.dir < 0) {
      px(x, y + 3, 1, 1, '#3a4a52');
    } else {
      px(x + 1, y + 3, 1, 1, '#3a4a52');
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

    var shelfW = Math.max(7, Math.round(vw * 0.19));
    drawShelf(2, HORIZON - 7, shelfW, 6);
    drawShelf(vw - shelfW - 2, HORIZON - 7, shelfW, 6);

    /* fixtures sit in the aisle: draw the far ones before customers,
       the near ones after, so depth reads correctly */
    drawFixturesDepth(now, true);

    for (var i = 0; i < customers.length; i++) {
      if (customers[i].y < vh - COUNTER_H) drawCustomer(customers[i], now);
    }

    drawCounter();
    drawFixturesDepth(now, false);

    for (var j = 0; j < customers.length; j++) {
      if (customers[j].y >= vh - COUNTER_H) drawCustomer(customers[j], now);
    }

    drawSparkles(lastDt);
  }

  /* draw only fixtures whose band is on the requested depth layer.
     Upper bands render behind customers, lower bands in front. */
  function drawFixturesDepth(now, farLayer) {
    var owned = S.get().upgradesOwned;

    for (var i = 0; i < owned.length; i++) {
      var level = owned[i];
      var fx = FIXTURES[level];
      if (!fx || !META[level]) continue;

      var pos = slotPos(level);
      var isFar = pos.row <= 0.5;
      if (isFar !== farLayer) continue;

      var sc = fixtureScale(level, now) * (pos.scale || 1);
      if (sc <= 0.01) continue;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.scale(sc, sc);
      ctx.translate(-pos.x, -pos.y);
      fx.draw(pos.x, pos.y);
      ctx.restore();
    }
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(64, now - (lastFrame || now));
    lastFrame = now;
    lastDt = dt;

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

  function floatPlus(amount, gx, gy, mode) {
    var layer = el.fxLayer;
    if (!layer) return;

    var span = document.createElement('span');
    span.className = 'float-plus';
    var isCustomer = mode === true || mode === 'customer';
    var isLabel = mode === 'label';

    if (isLabel) {
      span.textContent = String(amount);
      span.classList.add('float-label');
    } else {
      span.textContent = '+' + S.formatMoney(amount);
    }

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
    }, isLabel ? 1500 : 900);
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
    leave: leave,
    onUpgrade: function (level) {
      hudCache.cash = null;
      hudCache.income = null;
      hudCache.level = null;
      updateHud();

      /* spring the new fixture into the shop + sparkle burst */
      if (level != null && FIXTURES[level]) {
        fixturePop[level] = performance.now();
        fixtureBurst(level);
        var pos = slotPos(level);
        floatPlus(FIXTURES[level].label, pos.x, pos.y - 10, 'label');
      }
    }
  };
})(window);
