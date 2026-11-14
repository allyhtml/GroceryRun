/* GroceryRun — Phase 5: the grand reveal, confetti and the birthday note. */
(function (global) {
  'use strict';

  var S = global.GRState;
  var A = global.GRAudio;

  var el = {};
  var confettiRaf = null;
  var typingTimer = null;

  /* The birthday letter, split so the typewriter paces it naturally. */
  var NOTE = [
    'Happiest birthday to you!',
    'I know life haven\u2019t been great and you\u2019ve been through some rough moments, ' +
      'but hey you did survived till now, and i am so so proud of you my strong man.',
    'Thank you for being so patient to me, and for loving me with all of your heart.',
    'You\u2019re the best best best boyfriend ever and i really appreciate everything ' +
      'you did for me & for our relationship.',
    'Thank you for being the home that i can always run to, may you\u2019re always happy ' +
      'and healthy (so you can manjakan me forever!!!) you will always be in my prayers.',
    'I love you with my every heartbeat.'
  ];

  function cache() {
    el.finale = document.getElementById('screen-finale');
    el.title = document.getElementById('finale-title');
    el.body = document.getElementById('finale-body');
    el.readNote = document.getElementById('btn-read-note');
    el.note = document.getElementById('screen-note');
    el.letterBody = document.getElementById('letter-body');
    el.replay = document.getElementById('btn-replay');
    el.confetti = document.getElementById('confetti-canvas');
  }

  /* ---------------- confetti ---------------- */

  var confetti = [];
  var cctx = null;
  var cw = 0, ch = 0;

  function resizeConfetti() {
    if (!el.confetti) return;
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    cw = el.confetti.clientWidth || global.innerWidth;
    ch = el.confetti.clientHeight || global.innerHeight;
    el.confetti.width = Math.round(cw * dpr);
    el.confetti.height = Math.round(ch * dpr);
    cctx = el.confetti.getContext('2d');
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  var CONFETTI_COLORS = ['#0f766e', '#2de2c5', '#f97362', '#f59e0b', '#2563eb', '#a855f7', '#ffffff'];

  function seedConfetti(n) {
    confetti = [];
    for (var i = 0; i < n; i++) {
      confetti.push({
        x: Math.random() * cw,
        y: -20 - Math.random() * ch * 0.6,
        w: 6 + Math.random() * 8,
        h: 8 + Math.random() * 10,
        vy: 1.2 + Math.random() * 2.4,
        vx: (Math.random() - 0.5) * 1.6,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.22,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
      });
    }
  }

  function confettiLoop() {
    if (!cctx) return;
    cctx.clearRect(0, 0, cw, ch);

    for (var i = 0; i < confetti.length; i++) {
      var p = confetti[i];
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin;
      p.vx += Math.sin((p.y + p.x) / 90) * 0.012;

      if (p.y > ch + 30) {
        p.y = -20;
        p.x = Math.random() * cw;
      }

      cctx.save();
      cctx.translate(p.x, p.y);
      cctx.rotate(p.rot);
      cctx.fillStyle = p.color;
      cctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      cctx.restore();
    }

    confettiRaf = global.requestAnimationFrame(confettiLoop);
  }

  function startConfetti() {
    resizeConfetti();
    seedConfetti(Math.round(Math.min(150, cw / 3)));
    if (!confettiRaf) confettiRaf = global.requestAnimationFrame(confettiLoop);
  }

  function stopConfetti() {
    if (confettiRaf) global.cancelAnimationFrame(confettiRaf);
    confettiRaf = null;
  }

  /* ---------------- reveal ---------------- */

  function reveal(score, misses) {
    cache();
    var st = S.get();
    var manager = st.managerName || 'Manager';
    var store = st.storeName || 'Kedai Runcit';

    var rank;
    if (score >= 300) rank = 'LEGENDARY';
    else if (score >= 200) rank = 'EXCELLENT';
    else if (score >= 120) rank = 'SOLID';
    else if (score >= 60) rank = 'PROMISING';
    else rank = 'BRAVE';

    if (el.title) el.title.innerHTML = 'CONGRATULATIONS,<br>MANAGER ' + escapeHtml(manager.toUpperCase()) + '!';

    if (el.body) {
      el.body.innerHTML =
        'You successfully built <strong>' + escapeHtml(store) + '</strong>, ' +
        'survived the local kedai runcit aisles, and unlocked your true reward.' +
        '<span class="finale-rank">Catch rating: ' + rank + ' \u00b7 ' + score + ' pts' +
        (misses > 0 ? ' \u00b7 ' + misses + ' alarm clock' + (misses === 1 ? '' : 's') + ' dodged poorly' : '') +
        '</span>';
    }

    global.GR.show('finale');
    startConfetti();
    A.play('fanfare');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------- typed letter ---------------- */

  function typeLetter() {
    cache();
    if (!el.letterBody) return;
    el.letterBody.innerHTML = '';
    A.play('confirm');

    var para = 0;
    var chr = 0;
    var current = null;

    if (typingTimer) global.clearInterval(typingTimer);

    typingTimer = global.setInterval(function () {
      if (para >= NOTE.length) {
        global.clearInterval(typingTimer);
        typingTimer = null;
        if (el.replay) el.replay.classList.add('ready');
        return;
      }

      if (!current) {
        current = document.createElement('p');
        current.className = 'letter-para';
        el.letterBody.appendChild(current);
        el.letterBody.scrollTop = el.letterBody.scrollHeight;
      }

      var text = NOTE[para];
      chr++;
      current.textContent = text.slice(0, chr);
      el.letterBody.scrollTop = el.letterBody.scrollHeight;

      /* a soft tick every few characters, so it does not become noise */
      if (chr % 3 === 0) A.blip(1180 + (chr % 5) * 60, 0.015, 'square', 0.012);

      if (chr >= text.length) {
        para++;
        chr = 0;
        current = null;
      }
    }, 26);
  }

  function openNote() {
    stopConfetti();
    global.GR.show('note');
    typeLetter();
  }

  function replay() {
    if (typingTimer) { global.clearInterval(typingTimer); typingTimer = null; }
    stopConfetti();
    S.reset();
    global.location.reload();
  }

  function init() {
    cache();
    if (el.readNote) el.readNote.addEventListener('click', openNote);
    if (el.replay) el.replay.addEventListener('click', replay);
    global.addEventListener('resize', function () {
      if (global.GR.current() === 'finale') resizeConfetti();
    });
  }

  global.GRPhase5 = {
    init: init,
    reveal: reveal,
    openNote: openNote,
    replay: replay,
    typed: function () { return el.letterBody ? el.letterBody.textContent : ''; },
    note: NOTE
  };
})(window);
