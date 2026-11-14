/* GroceryRun — state, persistence, economy */
(function (global) {
  'use strict';

  var KEY = 'groceryrun.save.v1';

  var UPGRADES = [
    { level: 1, name: 'Generic White Bread',            cost: 50,      income: 5,      flavor: 'Basic inventory to keep the lights on.' },
    { level: 2, name: 'Emergency Snack Aisle',          cost: 200,     income: 20,     flavor: 'Stocked exclusively with chips for late-night movie binges.' },
    { level: 3, name: 'ZUS Coffee Station',             cost: 750,     income: 70,     flavor: 'Aisle 3: Serving up Iced Spanish Lattes (boss, with zero calories/sugar) for morning survival.' },
    { level: 4, name: 'Emergency Pizza Freezer',        cost: 2500,    income: 260,    flavor: 'For whenever we are too lazy to cook.' },
    { level: 5, name: '"No, You Hang Up First" Protocol',cost: 8000,   income: 900,    flavor: 'Automates the awkward goodbye loop so you can finally go to sleep.' },
    { level: 6, name: 'Infinite Patience Reserves',     cost: 25000,   income: 3200,   flavor: 'Critically required for surviving where-to-eat questions.' },
    { level: 7, name: 'The Blanket Hogging Barrier',    cost: 75000,   income: 12000,  flavor: 'Ensures fair distribution of covers during sleep.' },
    { level: 8, name: 'The Boyfriend Express Lane',     cost: 250000,  income: 0,      flavor: 'The final corporate takeover. Unlocks the birthday arcade lockdown.' }
  ];

  var OUTFITS = [
    { id: 'uniform',  label: 'Basic Store Manager Uniform' },
    { id: 'grab',     label: 'GRAB Rider Uniform' },
    { id: 'srg',      label: 'SRG Season 15 T-shirt' },
    { id: 'castrol',  label: 'Castrol T-shirt' },
    { id: 'blacktee', label: 'Classic Black Tee' }
  ];

  var HAIRS = [
    { id: 'normal',   label: 'Normal Cut' },
    { id: 'mullet',   label: 'Mullet' },
    { id: 'helmet',   label: 'Motorcycle Helmet' },
    { id: 'cap',      label: 'Cap Backwards' }
  ];

  var SPECS = [
    { id: 'specs',    label: 'With Specs' },
    { id: 'nospecs',  label: 'No Specs' }
  ];

  var defaults = {
    version: 1,
    registered: false,
    storeName: '',
    managerName: '',
    outfit: 'uniform',
    hair: 'normal',
    specs: 'specs',
    cash: 0,
    satisfaction: 100,
    upgradesOwned: [],
    muted: false,
    firstTapDone: false,
    arcadeDone: false,
    arcadeScore: 0,
    arcadeMisses: 0
  };

  var state = clone(defaults);

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    try {
      var raw = global.localStorage.getItem(KEY);
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return false;
      state = Object.assign(clone(defaults), parsed);
      if (!Array.isArray(state.upgradesOwned)) state.upgradesOwned = [];
      state.cash = num(state.cash);
      state.satisfaction = clamp(num(state.satisfaction), 0, 100);
      return true;
    } catch (e) {
      state = clone(defaults);
      return false;
    }
  }

  function save() {
    try { global.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* quota / private mode */ }
  }

  function reset() {
    state = clone(defaults);
    try { global.localStorage.removeItem(KEY); } catch (e) {}
  }

  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* ---------- economy ---------- */
  var TAP_BASE = 1;

  function baseTapValue() { return TAP_BASE; }

  function passivePerSecond() {
    var total = 0;
    for (var i = 0; i < state.upgradesOwned.length; i++) {
      var u = upgradeByLevel(state.upgradesOwned[i]);
      if (u) total += u.income;
    }
    return total;
  }

  function customerDrop() {
    return Math.max(1, Math.round(1 + state.upgradesOwned.length * 0.75));
  }

  function tapValue() {
    var mult = 1 + state.satisfaction / 100;
    return Math.max(1, Math.round(baseTapValue() * mult));
  }

  function addCash(amount) {
    state.cash = Math.max(0, state.cash + num(amount));
  }

  function bumpSatisfaction(delta) {
    state.satisfaction = clamp(state.satisfaction + num(delta), 0, 100);
  }

  function decaySatisfaction(delta) {
    state.satisfaction = clamp(state.satisfaction - num(delta), 0, 100);
  }

  function upgradeByLevel(lv) {
    for (var i = 0; i < UPGRADES.length; i++) if (UPGRADES[i].level === lv) return UPGRADES[i];
    return null;
  }

  function nextUpgrade() {
    for (var i = 0; i < UPGRADES.length; i++) {
      if (state.upgradesOwned.indexOf(UPGRADES[i].level) === -1) return UPGRADES[i];
    }
    return null;
  }

  /* progress toward the next upgrade, as 0..1 */
  function levelProgress() {
    var next = nextUpgrade();
    if (!next) return 1;
    var floor = 0;
    for (var i = 0; i < state.upgradesOwned.length; i++) {
      var u = upgradeByLevel(state.upgradesOwned[i]);
      if (u && u.cost > floor) floor = u.cost;
    }
    var span = next.cost - floor;
    if (span <= 0) return 1;
    return clamp((state.cash - floor) / span, 0, 1);
  }

  function levelLabel() {
    var owned = state.upgradesOwned.length;
    if (owned === 0) return 'Store Level: Local Kedai Runcit';
    if (owned >= UPGRADES.length) return 'Store Level: BOYFRIEND EXPRESS';
    return 'Store Level: ' + owned + ' / 8 Upgrades';
  }

  /* ---------- formatting ---------- */
  function formatMoney(n) {
    n = Math.floor(num(n));
    return '$' + n.toLocaleString('en-US');
  }

  function formatRate(n) {
    n = num(n);
    if (n >= 1000) return '$' + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k/s';
    return '$' + Math.round(n) + '/s';
  }

  global.GRState = {
    state: state,
    get: function () { return state; },
    load: load,
    save: save,
    reset: reset,
    defaults: defaults,
    UPGRADES: UPGRADES,
    OUTFITS: OUTFITS,
    HAIRS: HAIRS,
    SPECS: SPECS,
    baseTapValue: baseTapValue,
    tapValue: tapValue,
    passivePerSecond: passivePerSecond,
    customerDrop: customerDrop,
    addCash: addCash,
    bumpSatisfaction: bumpSatisfaction,
    decaySatisfaction: decaySatisfaction,
    upgradeByLevel: upgradeByLevel,
    nextUpgrade: nextUpgrade,
    levelProgress: levelProgress,
    levelLabel: levelLabel,
    formatMoney: formatMoney,
    formatRate: formatRate,
    clamp: clamp
  };
})(window);
