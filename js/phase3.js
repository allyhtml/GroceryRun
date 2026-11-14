/* GroceryRun — Phase 3: fourth-wall breaking customer reviews.
   Receipt-styled notifications slide up from the bottom of the store,
   personalised with the manager's live name, store, outfit and accessory. */
(function (global) {
  'use strict';

  var S = global.GRState;
  var A = global.GRAudio;

  var el = {};
  var timer = null;
  var lastIndex = -1;

  /* Review lines are functions so they interpolate the current save state. */
  var REVIEWS = [
    function (p) {
      return {
        from: 'Customer #102 (Flora)',
        stars: 2,
        body: 'There\u2019s no cat food or treats sold here. 2/5 stars. This is the receipt la.'
      };
    },
    function (p) {
      return {
        from: 'Customer #44 (Girlfriend)',
        stars: 5,
        body: 'Please tell Manager ' + p.manager + ' (wearing his ' + p.outfit +
              ' with ' + p.specs + ') to actually scan my groceries instead of getting distracted.'
      };
    },
    function (p) {
      return {
        from: 'Health Inspector Report',
        stars: 3,
        body: 'Manager ' + p.manager + ' spends entirely too much time as a GRAB Rider in his ' +
              p.outfit + ' instead of restocking the dairy aisle. Warning issued.'
      };
    },
    function (p) {
      return {
        from: '\u26a0 ALERT',
        stars: 0,
        body: 'Birthday detected in sector database. All ' + p.store +
              ' profits must be redirected to birthday festivities immediately.'
      };
    },
    function (p) {
      return {
        from: 'Customer #7 (Auntie)',
        stars: 4,
        body: 'Very nice kedai. But why is the manager ' + p.manager +
              ' standing at the register wearing ' + p.hair.toLowerCase() + '?'
      };
    },
    function (p) {
      return {
        from: 'Corporate Memo',
        stars: 1,
        body: 'Reminder: ' + p.store + ' is still on "Local Kedai Runcit" tier. ' +
              'How have we only made ' + p.cash + '?'
      };
    }
  ];

  function cache() {
    el.stack = document.getElementById('receipt-stack');
    el.screenStore = document.getElementById('screen-store');
  }

  function profile() {
    var st = S.get();
    var outfit = 'Basic Store Manager Uniform';
    var hair = 'Normal Cut';
    var specs = 'No Specs';
    var i;
    for (i = 0; i < S.OUTFITS.length; i++) if (S.OUTFITS[i].id === st.outfit) outfit = S.OUTFITS[i].label;
    for (i = 0; i < S.HAIRS.length; i++) if (S.HAIRS[i].id === st.hair) hair = S.HAIRS[i].label;
    for (i = 0; i < S.SPECS.length; i++) if (S.SPECS[i].id === st.specs) specs = S.SPECS[i].label;
    return {
      manager: st.managerName || 'Manager',
      store: st.storeName || 'Kedai Runcit',
      outfit: outfit,
      hair: hair,
      specs: specs,
      cash: S.formatMoney(st.cash)
    };
  }

  function stars(n) {
    if (n <= 0) return '\u26a0';
    var out = '';
    for (var i = 0; i < 5; i++) out += i < n ? '\u2605' : '\u2606';
    return out;
  }

  function buildReceipt(review, p) {
    var node = document.createElement('div');
    node.className = 'receipt';

    var head = document.createElement('div');
    head.className = 'receipt-head';
    head.textContent = p.store.toUpperCase() + ' RECEIPT';
    node.appendChild(head);

    var rule1 = document.createElement('div');
    rule1.className = 'receipt-rule';
    node.appendChild(rule1);

    var from = document.createElement('div');
    from.className = 'receipt-from';
    from.textContent = review.from;
    node.appendChild(from);

    if (review.stars > 0) {
      var st = document.createElement('div');
      st.className = 'receipt-stars';
      st.textContent = stars(review.stars);
      node.appendChild(st);
    }

    var body = document.createElement('div');
    body.className = 'receipt-body';
    body.textContent = review.body;
    node.appendChild(body);

    var rule2 = document.createElement('div');
    rule2.className = 'receipt-rule';
    node.appendChild(rule2);

    var foot = document.createElement('div');
    foot.className = 'receipt-foot';
    foot.textContent = 'THANK YOU FOR SHOPPING \u00b7 ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    node.appendChild(foot);

    return node;
  }

  function showReview() {
    if (!el.stack) return;
    if (global.GR.current && global.GR.current() !== 'store') return;

    var p = profile();
    /* pick a review, never the same one twice in a row */
    var idx = Math.floor(Math.random() * REVIEWS.length);
    if (idx === lastIndex && REVIEWS.length > 1) idx = (idx + 1) % REVIEWS.length;
    lastIndex = idx;

    var node = buildReceipt(REVIEWS[idx](p), p);
    el.stack.appendChild(node);

    A.play('receipt');

    /* keep at most three on screen */
    while (el.stack.children.length > 3) {
      el.stack.removeChild(el.stack.firstChild);
    }

    global.setTimeout(function () {
      node.classList.add('leaving');
      global.setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 420);
    }, 6200);
  }

  function start() {
    if (timer) return;
    timer = global.setInterval(function () {
      if (global.GR.current && global.GR.current() !== 'store') return;
      showReview();
    }, 9500);
    /* first one arrives quickly so the joke lands early */
    global.setTimeout(showReview, 4200);
  }

  function stop() {
    if (timer) { global.clearInterval(timer); timer = null; }
  }

  function clearAll() {
    if (el.stack) el.stack.innerHTML = '';
  }

  function init() {
    cache();
    start();
  }

  global.GRPhase3 = {
    init: init,
    start: start,
    stop: stop,
    clear: clearAll,
    showReview: showReview,
    profile: profile
  };
})(window);
