/* GroceryRun — screen router / boot */
(function (global) {
  'use strict';

  var S = global.GRState;
  var SCREENS = {
    register: 'screen-register',
    customize: 'screen-customize',
    store: 'screen-store',
    shop: 'screen-shop'
  };

  var current = null;

  function show(name) {
    var id = SCREENS[name];
    if (!id) return;

    /* the shop sheet overlays the store, so the sim must keep running behind it */
    var leaveStore = current === 'store' && name !== 'store' && name !== 'shop';
    if (leaveStore && global.GRPhase1) global.GRPhase1.leave();

    Object.keys(SCREENS).forEach(function (key) {
      var node = document.getElementById(SCREENS[key]);
      if (node) node.classList.toggle('active', key === name);
    });

    current = name;

    if (name === 'customize' && global.GRPhase0) global.GRPhase0.render();
    if (name === 'store' && global.GRPhase1) global.GRPhase1.enter();
    if (name === 'shop' && global.GRPhase2) global.GRPhase2.render(true);

    var active = document.getElementById(id);
    if (active) active.scrollTop = 0;
  }

  function boot() {
    var hasSave = S.load();
    var st = S.get();

    global.GRPhase0.init();
    global.GRPhase1.init();
    if (global.GRPhase2) global.GRPhase2.init();

    if (hasSave && st.registered && st.storeName && st.managerName) {
      show('store');
    } else if (hasSave && (st.storeName || st.managerName)) {
      show('customize');
    } else {
      show('register');
    }
  }

  global.GR = { show: show, current: function () { return current; } };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
