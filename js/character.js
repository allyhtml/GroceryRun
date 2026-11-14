/* GroceryRun — procedural pixel-art character renderer (no image assets) */
(function (global) {
  'use strict';

  var PALETTE = {
    skin: '#e8b58f',
    skinShade: '#c9936f',
    outline: '#3a4a52',
    pants: '#2f3740',
    pantsShade: '#222932',
    pocket: '#414b56',
    shoe: '#1c232a',
    hairDark: '#241b16',
    hairMid: '#33261e',
    hairLight: '#453329',
    helmet: '#d94f4f',
    helmetShade: '#a83a3a',
    visor: '#33414f',
    cap: '#3a5068',
    capShade: '#2b3d50',
    specFrame: '#33414f',
    specLens: '#0284c7'
  };

  var OUTFIT_COLORS = {
    uniform:  { a: '#3d6fa8', b: '#2c5282', trim: '#8fb8e0', accent: '#f0f4f8' },
    grab:     { a: '#1f9e52', b: '#167a3f', trim: '#7fe0a5', accent: '#ffffff' },
    srg:      { a: '#e05a2b', b: '#b34520', trim: '#ffb08a', accent: '#ffe3d3' },
    castrol:  { a: '#0e7a3c', b: '#0a5c2d', trim: '#7fd39a', accent: '#d6ffe4' },
    blacktee: { a: '#2a2f38', b: '#1d222a', trim: '#59616e', accent: '#c8d0da' }
  };

  /* 12x16 grid, drawn as chunky pixels scaled to target size */
  function px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function drawBody(ctx, outfitId) {
    var c = OUTFIT_COLORS[outfitId] || OUTFIT_COLORS.uniform;

    /* legs + cargo pants */
    px(ctx, 4, 12, 2, 3, PALETTE.pants);
    px(ctx, 7, 12, 2, 3, PALETTE.pants);
    px(ctx, 4, 12, 1, 3, PALETTE.pantsShade);
    px(ctx, 7, 12, 1, 3, PALETTE.pantsShade);
    /* cargo pockets */
    px(ctx, 4, 13, 1, 1, PALETTE.pocket);
    px(ctx, 8, 13, 1, 1, PALETTE.pocket);
    /* shoes */
    px(ctx, 3, 15, 3, 1, PALETTE.shoe);
    px(ctx, 7, 15, 3, 1, PALETTE.shoe);

    /* torso */
    px(ctx, 3, 7, 7, 5, c.a);
    px(ctx, 3, 7, 1, 5, c.b);
    px(ctx, 9, 7, 1, 5, c.b);
    px(ctx, 3, 11, 7, 1, c.b);

    /* outfit detailing */
    if (outfitId === 'uniform') {
      px(ctx, 6, 7, 1, 4, c.accent);       /* shirt placket */
      px(ctx, 6, 7, 1, 1, c.trim);         /* collar */
      px(ctx, 8, 8, 1, 1, c.trim);         /* badge */
    } else if (outfitId === 'grab') {
      px(ctx, 5, 8, 3, 2, c.accent);       /* chest logo block */
      px(ctx, 5, 10, 3, 1, c.b);
      px(ctx, 6, 7, 1, 1, c.trim);
    } else if (outfitId === 'srg') {
      px(ctx, 5, 8, 3, 1, c.accent);       /* stripe */
      px(ctx, 6, 9, 1, 2, c.trim);
      px(ctx, 4, 9, 1, 1, c.accent);
    } else if (outfitId === 'castrol') {
      px(ctx, 5, 8, 3, 1, c.accent);
      px(ctx, 6, 9, 1, 2, c.accent);
      px(ctx, 4, 10, 2, 1, c.trim);
    } else {
      px(ctx, 6, 8, 1, 3, c.trim);         /* plain tee seam */
    }

    /* arms */
    px(ctx, 2, 7, 1, 4, c.a);
    px(ctx, 10, 7, 1, 4, c.a);
    px(ctx, 2, 10, 1, 1, PALETTE.skin);    /* hands */
    px(ctx, 10, 10, 1, 1, PALETTE.skin);
  }

  function drawHead(ctx) {
    /* neck */
    px(ctx, 5, 6, 3, 1, PALETTE.skinShade);
    /* face */
    px(ctx, 3, 2, 7, 5, PALETTE.skin);
    px(ctx, 3, 2, 1, 5, PALETTE.skinShade);
    px(ctx, 9, 2, 1, 5, PALETTE.skinShade);
    /* ears */
    px(ctx, 2, 4, 1, 1, PALETTE.skinShade);
    px(ctx, 10, 4, 1, 1, PALETTE.skinShade);
  }

  function drawEyes(ctx, withSpecs) {
    if (withSpecs) {
      px(ctx, 4, 4, 2, 2, PALETTE.specLens);
      px(ctx, 7, 4, 2, 2, PALETTE.specLens);
      px(ctx, 4, 4, 2, 1, '#7fe6f5');
      px(ctx, 7, 4, 2, 1, '#7fe6f5');
      /* frames + bridge */
      px(ctx, 3, 4, 1, 2, PALETTE.specFrame);
      px(ctx, 6, 4, 1, 2, PALETTE.specFrame);
      px(ctx, 9, 4, 1, 2, PALETTE.specFrame);
      px(ctx, 3, 3, 1, 1, PALETTE.specFrame);
      px(ctx, 9, 3, 1, 1, PALETTE.specFrame);
      px(ctx, 5, 3, 1, 1, PALETTE.specFrame);
      px(ctx, 8, 3, 1, 1, PALETTE.specFrame);
    } else {
      px(ctx, 4, 4, 1, 1, PALETTE.outline);
      px(ctx, 8, 4, 1, 1, PALETTE.outline);
      /* brows */
      px(ctx, 4, 3, 1, 1, PALETTE.hairDark);
      px(ctx, 8, 3, 1, 1, PALETTE.hairDark);
    }
  }

  function drawMouth(ctx) {
    px(ctx, 5, 5, 3, 1, '#a8735a');
    px(ctx, 5, 5, 1, 1, '#8f5f4a');
  }

  function drawHair(ctx, hairId) {
    if (hairId === 'normal') {
      px(ctx, 3, 1, 7, 2, PALETTE.hairDark);
      px(ctx, 3, 2, 1, 1, PALETTE.hairMid);
      px(ctx, 9, 2, 1, 1, PALETTE.hairMid);
      px(ctx, 4, 1, 4, 1, PALETTE.hairMid);
      px(ctx, 5, 0, 3, 1, PALETTE.hairDark);
    } else if (hairId === 'mullet') {
      px(ctx, 3, 1, 7, 2, PALETTE.hairDark);
      px(ctx, 2, 1, 1, 5, PALETTE.hairMid);   /* long sides */
      px(ctx, 10, 1, 1, 5, PALETTE.hairMid);
      px(ctx, 1, 2, 1, 4, PALETTE.hairDark);
      px(ctx, 11, 2, 1, 4, PALETTE.hairDark);
      px(ctx, 4, 0, 5, 2, PALETTE.hairLight);
      px(ctx, 2, 6, 2, 1, PALETTE.hairMid);   /* back flick */
      px(ctx, 9, 6, 2, 1, PALETTE.hairMid);
    } else if (hairId === 'helmet') {
      px(ctx, 2, 0, 9, 3, PALETTE.helmet);
      px(ctx, 2, 0, 1, 3, PALETTE.helmetShade);
      px(ctx, 10, 0, 1, 3, PALETTE.helmetShade);
      px(ctx, 3, 0, 5, 1, '#f07a7a');         /* highlight */
      px(ctx, 2, 3, 2, 1, PALETTE.helmetShade);
      px(ctx, 9, 3, 2, 1, PALETTE.helmetShade);
      px(ctx, 3, 3, 7, 1, PALETTE.visor);     /* visor band */
      px(ctx, 4, 3, 2, 1, '#33506b');         /* visor shine */
    } else if (hairId === 'cap') {
      px(ctx, 3, 0, 7, 2, PALETTE.cap);
      px(ctx, 3, 0, 1, 2, PALETTE.capShade);
      px(ctx, 9, 0, 1, 2, PALETTE.capShade);
      px(ctx, 4, 0, 3, 1, '#3d5063');
      /* brim pointing backwards (behind head) */
      px(ctx, 2, 2, 1, 1, PALETTE.capShade);
      px(ctx, 10, 2, 1, 1, PALETTE.capShade);
      px(ctx, 1, 1, 1, 1, PALETTE.cap);
      px(ctx, 11, 1, 1, 1, PALETTE.cap);
    }
  }

  function drawCharacter(ctx, opts) {
    opts = opts || {};
    var outfit = opts.outfit || 'uniform';
    var hair = opts.hair || 'normal';
    var specs = opts.specs || 'specs';
    var gridW = 12, gridH = 16;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    var size = Math.min(ctx.canvas.width / gridW, ctx.canvas.height / gridH);
    var offX = (ctx.canvas.width - gridW * size) / 2;
    var offY = (ctx.canvas.height - gridH * size) / 2;
    ctx.setTransform(size, 0, 0, size, offX, offY);

    drawBody(ctx, outfit);
    drawHead(ctx);
    drawEyes(ctx, specs === 'specs');
    drawMouth(ctx);
    drawHair(ctx, hair);

    ctx.restore();
  }

  global.GRCharacter = {
    draw: drawCharacter,
    palette: PALETTE,
    outfitColors: OUTFIT_COLORS
  };
})(window);
