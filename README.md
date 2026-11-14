# GroceryRun: Management & Birthday Edition

A browser-based birthday gift disguised as an idle supermarket management sim.
Static site, no build step, no backend. Open `index.html` and it runs.

## Status

| Phase | Name | Status |
|---|---|---|
| 0 | Setup & Character Customization | **Done** |
| 1 | The Incognito Facade (store sim) | **Done** |
| 2 | The 8-Level Relationship Upgrade Shop | Not started |
| 3 | Fourth-Wall Breaking Customer Reviews | Not started |
| 4 | The Climax & Arcade Transition | Not started |
| 5 | The Grand Reveal & Birthday Note | Not started |

## Running locally

No tooling required. Either:

- Double-click `index.html`, or
- Serve the folder: `python -m http.server 8000` then visit `http://localhost:8000`

A local server is recommended so `localStorage` persistence behaves exactly as it will in production.

## Project layout

```
index.html            screen markup + script/style bootstrapping
css/style.css         all styling (dark late-night kedai palette, neon accents)
js/state.js           save/load, economy math, upgrade ladder
js/character.js       procedural pixel-art character renderer (no image assets)
js/audio.js           WebAudio bus + mute toggle
js/phase0.js          registration + manager customization
js/phase1.js          HUD, tap-to-earn loop, customers, canvas store scene
js/main.js            screen router / boot
```

## Design notes

- **No image assets.** Every sprite — the manager, the 40 outfit/hair/spec combinations, the
  aisles, the customers, the register — is drawn procedurally on canvas in a 12x16 pixel grid.
  Swap an outfit colour in `js/character.js` and the whole game updates.
- **Persistence** lives under a single `localStorage` key (`groceryrun.save.v1`). Refreshing
  restores the exact store state.
- **Economy pacing** is tuned so the full 8-level ladder completes in roughly 2.5 minutes of
  active play — fast enough to hold attention before the Phase 4 arcade reveal.
- **Mobile first.** Portrait layout, 44px+ tap targets, safe-area insets for notched phones.

## Credits

Built as a birthday present. Blueprint in `GroceryRun Blueprint.pdf`.
