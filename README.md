# GroceryRun: Management & Birthday Edition

A browser-based birthday gift disguised as an idle supermarket management sim.
Static site, no build step, no backend. Open `index.html` and it runs.

## Status

| Phase | Name | Status |
|---|---|---|
| 0 | Setup & Character Customization | **Done** |
| 1 | The Incognito Facade (store sim) | **Done** |
| 2 | The 8-Level Relationship Upgrade Shop | **Done** |
| 3 | Fourth-Wall Breaking Customer Reviews | **Done** |
| 4 | The Climax & Arcade Transition | **Done** |
| 5 | The Grand Reveal & Birthday Note | **Done** |

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
js/phase2.js          the 8-level upgrade shop (bottom sheet over the store)
js/phase3.js          personalised receipt notifications
js/phase4.js          error-404 glitch + the Kedai Blitz arcade
js/phase5.js          confetti reveal and the typed birthday letter
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
- **Accessible palette.** Every text/background pair meets WCAG AA (4.5:1); the theme is a bright
  daylight kedai, verified by an automated contrast suite rather than by eye.
- **The chain.** Level 8 triggers an error-404 glitch, then the *Kedai Blitz* arcade
  (30 seconds, catch the essentials, dodge alarm clocks), then a confetti reveal and
  the birthday letter typed out a character at a time.
- **No CDN dependency for the game itself.** The arcade is hand-written canvas rather
  than a game framework, so a flaky connection cannot break the finale.
- **Linear upgrade ladder.** Only the next unbought upgrade is purchasable, so the pacing curve
  cannot be broken by skipping ahead.

## Credits

Built as a birthday present. Blueprint in `GroceryRun Blueprint.pdf`.
