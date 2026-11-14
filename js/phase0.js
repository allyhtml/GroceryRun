/* GroceryRun — Phase 0: registration + manager customization */
(function (global) {
  'use strict';

  var S = global.GRState;
  var C = global.GRCharacter;
  var A = global.GRAudio;

  var el = {};

  function cache() {
    el.screenRegister = document.getElementById('screen-register');
    el.screenCustomize = document.getElementById('screen-customize');
    el.inputStore = document.getElementById('input-store');
    el.inputManager = document.getElementById('input-manager');
    el.btnToProfile = document.getElementById('btn-to-profile');
    el.btnOpenBusiness = document.getElementById('btn-open-business');
    el.rowOutfit = document.getElementById('row-outfit');
    el.rowHair = document.getElementById('row-hair');
    el.rowSpecs = document.getElementById('row-specs');
    el.preview = document.getElementById('char-preview');
  }

  function setHint(fieldName, msg) {
    var hint = document.querySelector('[data-hint="' + fieldName + '"]');
    var wrap = hint ? hint.closest('.field') : null;
    if (!hint || !wrap) return;
    if (msg) {
      hint.textContent = msg;
      wrap.classList.add('invalid');
    } else {
      hint.textContent = '';
      wrap.classList.remove('invalid');
    }
  }

  function clean(v, max) {
    return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function validateRegistration() {
    var store = clean(el.inputStore.value, 20);
    var manager = clean(el.inputManager.value, 20);
    var ok = true;

    if (!store) { setHint('store', 'Your kedai needs a name.'); ok = false; }
    else if (store.length < 2) { setHint('store', 'At least 2 characters.'); ok = false; }
    else setHint('store', '');

    if (!manager) { setHint('manager', 'Corporate requires a manager name.'); ok = false; }
    else if (manager.length < 2) { setHint('manager', 'At least 2 characters.'); ok = false; }
    else setHint('manager', '');

    if (!ok) A.play('error');
    return ok ? { store: store, manager: manager } : null;
  }

  function renderRegistration() {
    var st = S.get();
    if (st.storeName) el.inputStore.value = st.storeName;
    if (st.managerName) el.inputManager.value = st.managerName;
    setHint('store', '');
    setHint('manager', '');
  }

  /* ---------- customization ---------- */

  function buildCard(kind, item, current, onPick) {
    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'option-card' + (item.id === current ? ' selected' : '');
    card.setAttribute('aria-pressed', item.id === current ? 'true' : 'false');

    var cv = document.createElement('canvas');
    cv.width = 48;
    cv.height = 64;
    card.appendChild(cv);

    var label = document.createElement('span');
    label.className = 'option-label';
    label.textContent = item.label;
    card.appendChild(label);

    card.addEventListener('click', function () { onPick(kind, item.id); });
    return card;
  }

  function cardOpts(kind, id, st) {
    var opts = { outfit: st.outfit, hair: st.hair, specs: st.specs };
    opts[kind] = id;
    return opts;
  }

  function renderOptions() {
    var st = S.get();
    el.rowOutfit.innerHTML = '';
    el.rowHair.innerHTML = '';
    el.rowSpecs.innerHTML = '';

    var defs = [
      { kind: 'outfit', list: S.OUTFITS, row: el.rowOutfit },
      { kind: 'hair',   list: S.HAIRS,   row: el.rowHair },
      { kind: 'specs',  list: S.SPECS,   row: el.rowSpecs }
    ];

    defs.forEach(function (d) {
      d.list.forEach(function (item) {
        var card = buildCard(d.kind, item, st[d.kind], pick);
        d.row.appendChild(card);
        var cv = card.querySelector('canvas');
        C.draw(cv.getContext('2d'), cardOpts(d.kind, item.id, st));
      });
    });
  }

  function pick(kind, id) {
    var st = S.get();
    st[kind] = id;
    S.save();
    A.play('click');

    var row = kind === 'outfit' ? el.rowOutfit : kind === 'hair' ? el.rowHair : el.rowSpecs;
    Array.prototype.forEach.call(row.children, function (card, i) {
      var list = kind === 'outfit' ? S.OUTFITS : kind === 'hair' ? S.HAIRS : S.SPECS;
      var isSel = list[i] && list[i].id === id;
      card.classList.toggle('selected', isSel);
      card.setAttribute('aria-pressed', isSel ? 'true' : 'false');
    });

    drawPreview();
  }

  function drawPreview() {
    if (!el.preview) return;
    var st = S.get();
    C.draw(el.preview.getContext('2d'), { outfit: st.outfit, hair: st.hair, specs: st.specs });
  }

  /* ---------- flow ---------- */

  function toProfile() {
    A.unlock();
    var res = validateRegistration();
    if (!res) return;

    var st = S.get();
    st.storeName = res.store;
    st.managerName = res.manager;
    st.registered = true;
    S.save();

    A.play('confirm');
    renderOptions();
    drawPreview();
    global.GR.show('customize');
  }

  function openBusiness() {
    A.unlock();
    A.play('confirm');
    S.save();
    global.GR.show('store');
    if (global.GRPhase1) global.GRPhase1.enter();
  }

  function bind() {
    el.btnToProfile.addEventListener('click', toProfile);
    el.btnOpenBusiness.addEventListener('click', openBusiness);

    [el.inputStore, el.inputManager].forEach(function (inp) {
      inp.addEventListener('input', function () {
        if (inp === el.inputStore) setHint('store', '');
        else setHint('manager', '');
      });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (inp === el.inputStore) el.inputManager.focus();
          else toProfile();
        }
      });
    });
  }

  function init() {
    cache();
    bind();
    renderRegistration();
    renderOptions();
    drawPreview();
  }

  global.GRPhase0 = {
    init: init,
    render: function () {
      renderRegistration();
      renderOptions();
      drawPreview();
    }
  };
})(window);
