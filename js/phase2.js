/* GroceryRun — Phase 2: the 8-level relationship upgrade shop */
(function (global) {
  'use strict';

  var S = global.GRState;
  var A = global.GRAudio;

  /* One icon per upgrade level, matching the blueprint's joke progression */
  var ICONS = {
    1: '🍞', 2: '🍟', 3: '☕', 4: '🍕',
    5: '📞', 6: '⏳', 7: '🛏️', 8: '🏁'
  };

  var el = {};
  var rows = {};            /* level -> { node, costEl, flagEl } */
  var lastSig = '';         /* cheap change-detection signature */
  var dirty = true;

  function cache() {
    el.screen = document.getElementById('screen-shop');
    el.list = document.getElementById('shop-list');
    el.cash = document.getElementById('shop-cash');
    el.close = document.getElementById('btn-shop-close');
    el.foot = document.getElementById('shop-foot-note');
    el.fab = document.getElementById('btn-shop');
    el.badge = document.getElementById('shop-badge');
  }

  function ownedSet() {
    var set = {};
    var list = S.get().upgradesOwned;
    for (var i = 0; i < list.length; i++) set[list[i]] = true;
    return set;
  }

  /* The next upgrade that has not been bought yet */
  function frontLevel(owned) {
    for (var i = 0; i < S.UPGRADES.length; i++) {
      if (!owned[S.UPGRADES[i].level]) return S.UPGRADES[i].level;
    }
    return null;
  }

  /* ---------------- build ---------------- */

  function buildRow(u) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'shop-item';
    btn.setAttribute('data-level', String(u.level));

    var icon = document.createElement('div');
    icon.className = 'shop-item-icon';
    icon.textContent = ICONS[u.level] || '•';
    btn.appendChild(icon);

    var body = document.createElement('div');
    body.className = 'shop-item-body';

    var lvl = document.createElement('div');
    lvl.className = 'shop-item-level';
    lvl.textContent = 'Level ' + u.level;
    body.appendChild(lvl);

    var name = document.createElement('div');
    name.className = 'shop-item-name';
    name.textContent = u.name;
    body.appendChild(name);

    var flavor = document.createElement('div');
    flavor.className = 'shop-item-flavor';
    flavor.textContent = u.flavor;
    body.appendChild(flavor);

    btn.appendChild(body);

    var right = document.createElement('div');
    right.className = 'shop-item-right';

    var cost = document.createElement('div');
    cost.className = 'shop-item-cost';
    cost.textContent = S.formatMoney(u.cost);
    right.appendChild(cost);

    var gain = document.createElement('div');
    gain.className = 'shop-item-gain';
    gain.textContent = u.income > 0 ? '+' + S.formatRate(u.income) : 'WIN GAME';
    right.appendChild(gain);

    var flag = document.createElement('div');
    flag.className = 'shop-item-flag';
    right.appendChild(flag);

    btn.appendChild(right);

    btn.addEventListener('click', function () { attemptBuy(u.level); });

    rows[u.level] = { node: btn, costEl: cost, flagEl: flag };
    return btn;
  }

  function buildList() {
    el.list.innerHTML = '';
    rows = {};
    for (var i = 0; i < S.UPGRADES.length; i++) {
      el.list.appendChild(buildRow(S.UPGRADES[i]));
    }
    lastSig = '';
  }

  /* ---------------- state -> view ---------------- */

  function signature() {
    var st = S.get();
    var owned = st.upgradesOwned.join('.');
    /* refresh when cash crosses an affordability boundary for any visible row */
    var bucket = '';
    for (var i = 0; i < S.UPGRADES.length; i++) {
      var u = S.UPGRADES[i];
      bucket += (st.cash >= u.cost ? '1' : '0');
    }
    return owned + '|' + bucket + '|' + Math.floor(st.cash / 10);
  }

  function render(force) {
    var sig = signature();
    if (!force && sig === lastSig) return;
    lastSig = sig;

    var st = S.get();
    var owned = ownedSet();
    var front = frontLevel(owned);

    el.cash.textContent = S.formatMoney(st.cash);

    for (var i = 0; i < S.UPGRADES.length; i++) {
      var u = S.UPGRADES[i];
      var r = rows[u.level];
      if (!r) continue;

      var isOwned = !!owned[u.level];
      var canAfford = st.cash >= u.cost;
      /* only the front of the queue is purchasable — keeps the ladder linear */
      var isFront = front === u.level;
      var buyable = isFront && canAfford && !isOwned;

      r.node.classList.toggle('owned', isOwned);
      r.node.classList.toggle('affordable', buyable);
      r.node.classList.toggle('locked', !isOwned && !isFront);
      r.node.disabled = isOwned || !isFront;

      r.node.setAttribute('aria-label',
        u.name + ', level ' + u.level + ', ' +
        (isOwned ? 'owned' : 'costs ' + S.formatMoney(u.cost)) +
        (u.income > 0 ? ', adds ' + S.formatRate(u.income) : ', unlocks the finale'));

      if (isOwned) r.flagEl.textContent = 'OWNED';
      else if (isFront && canAfford) r.flagEl.textContent = 'BUY';
      else if (isFront) r.flagEl.textContent = 'SAVE UP';
      else r.flagEl.textContent = 'LOCKED';
    }

    /* footer guidance + FAB affordance */
    if (front === null) {
      el.foot.textContent = 'Every upgrade owned. The finale is live.';
      el.foot.classList.remove('warn');
      setBadge(false);
    } else {
      var next = S.upgradeByLevel(front);
      if (st.cash >= next.cost) {
        el.foot.textContent = 'You can afford ' + next.name + '.';
        el.foot.classList.remove('warn');
        setBadge(false);
      } else {
        var short = next.cost - st.cash;
        el.foot.textContent = S.formatMoney(short) + ' more for ' + next.name + '.';
        el.foot.classList.add('warn');
        setBadge(true);
      }
    }
  }

  function setBadge(on) {
    if (!el.badge) return;
    el.badge.hidden = !on;
  }

  /* ---------------- actions ---------------- */

  function attemptBuy(level) {
    var st = S.get();
    var owned = ownedSet();
    var u = S.upgradeByLevel(level);

    if (!u || owned[level]) return;
    if (frontLevel(owned) !== level) { A.play('error'); return; }
    if (st.cash < u.cost) {
      A.play('error');
      el.foot.textContent = 'Not enough cash — ' + S.formatMoney(u.cost - st.cash) + ' short.';
      el.foot.classList.add('warn');
      return;
    }

    st.cash -= u.cost;
    st.upgradesOwned.push(u.level);
    S.save();

    A.play('confirm');
    render(true);

    if (global.GRPhase1) global.GRPhase1.onUpgrade(u.level);
  }

  /* ---------------- lifecycle ---------------- */

  function open() {
    render(true);
    global.GR.show('shop');
  }

  function close() {
    global.GR.show('store');
  }

  function init() {
    cache();
    buildList();
    el.close.addEventListener('click', close);
    el.fab.addEventListener('click', function () { A.unlock(); A.play('click'); open(); });

    /* keep the badge fresh while the player is earning on the store screen */
    global.setInterval(function () {
      if (global.GR.current() === 'shop') render(false);
      else if (global.GR.current() === 'store') render(false);
    }, 400);
  }

  global.GRPhase2 = {
    init: init,
    open: open,
    close: close,
    render: render,
    attemptBuy: attemptBuy,
    frontLevel: frontLevel
  };
})(window);
