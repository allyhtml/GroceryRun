/* GroceryRun — screen router / boot */
(function (global) {
  'use strict';

  var S = global.GRState;
  var SCREENS = {
    register: 'screen-register',
    customize: 'screen-customize',
    store: 'screen-store'
  };

  var current = null;

  function show(name) {
    var id = SCREENS[name];
    if (!id) return;

    if (current === 'store' && name !== 'store' && global.GRPhase1) global.GRPhase1.leave();

    Object.keys(SCREENS).forEach(function (key) {
      var node = document.getElementById(SCREENS[key]);
      if (node) node.classList.toggle('active', key === name);
    });

    current = name;

    if (name === 'customize' && global.GRPhase0) global.GRPhase0.render();
    if (name === 'store' && global.GRPhase1) global.GRPhase1.enter();

    var active = document.getElementById(id);
    if (active) active.scrollTop = 0;
  }

  function boot() {
    var hasSave = S.load();
    var st = S.get();

    global.GRPhase0.init();
    global.GRPhase1.init();

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
