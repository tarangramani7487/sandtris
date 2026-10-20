# Grainfall

A falling-sand colour puzzle for iOS, Android and web (Expo SDK 58, React Native 0.88, TypeScript).
Tetromino blocks fall, crumble into individual sand grains when they land, and any single colour
that connects the left wall to the right wall is cleared.

> Requires **Node 22.13+** (React Native 0.88 / Metro). With nvm: `nvm use 22`.

## Run

```bash
npm install
npx expo start            # scan the QR code with Expo Go, or press a / i / w
npx expo start --web      # browser
```

### Physical Android phone

1. Install **Expo Go** from the Play Store (it bundles react-native-skia, expo-audio and expo-haptics, so no custom build is needed).
2. Put the phone and computer on the same Wi-Fi, run `npx expo start`, and scan the QR code in Expo Go.
   If the network blocks it, use `npx expo start --tunnel`.
3. For a standalone APK: `npx eas-cli@latest build -p android --profile preview` (needs an Expo account).

## Test / check

```bash
npm test                  # engine tests (Jest; add --no-watchman if your watchman is broken)
npm run typecheck
npm run lint
```

## How it plays

* Works in both orientations: **landscape** gives the original layout (panel beside the board);
  **portrait** shows a full-width board with NEXT / SKIP / CLEAR / HOME underneath.
* A block hovers above the **red line** with a light beam showing where it will fall.
  **Touch / drag** to aim it, **lift your finger** (or tap) to drop. With a mouse, just move and click.
* On landing the block crumbles into sand (with a little splash). Connect **one colour from the left
  wall to the right wall** and that whole connected mass sparkles and clears. Sand above falls and can
  trigger **chains** (×2, ×3 … points) with "Nice!", "Good job!", "Great!" popups.
* You start with 2 colours. Each score milestone on the progress bar (100, 800, 3,200, 8,000 …) adds one.
* **SKIP** swaps the hovering block for the next one (once per drop). **CLEAR** wipes the tallest colour;
  you start with 1 charge and earn another every 5 lines.
* When settled sand reaches the red line: **Save this run** (free once per run, then costs a CLEAR
  charge) wipes the tallest colour, or **Give up** for the score screen.

### Modes

| Mode | Rules |
| --- | --- |
| Classic | Blocks wait until you drop them. Daily goal: make 2 lines → +500 and a 7-day streak. |
| Speeding up | Blocks auto-drop on a timer that shortens every 12 s (SPEED 1/10 → 10/10). |

### Keyboard (web)

← → / A D aim · Space / ↓ / Enter drop · Q skip · P / Esc pause.

## Architecture

```
src/game/          pure TypeScript, no React (fully unit-tested)
  constants.ts       96x144 grain grid (12x18 blocks of 8x8), timings, tuning
  ParticleGrid.ts    typed-array grid: colour (occupancy), shade, clearing flags
  SandPhysics.ts     cellular-automaton gravity (down, then random diagonal)
  CollisionSystem.ts piece vs walls/floor/sand
  ClearSystem.ts     flood fill from the left wall -> components reaching the right wall
  PieceGenerator.ts  shapes (7 tetrominoes + plus), spawn orientation, bag randomiser
  ScoreSystem.ts     points, chains, milestones, colours in play, speed levels
  GameEngine.ts      fixed-timestep (60 Hz) state machine: aim -> drop -> land/splash -> clear/overflow
  GameLoop.ts        single-instance requestAnimationFrame loop
  GameSession.ts     engine + loop + frame subscribers + HUD diffing
src/hooks/useGameEngine.ts      React binding, AppState pause, web keyboard
src/components/SandRenderer.tsx Skia: the grid is uploaded as one RGBA image per frame (nearest-neighbour)
src/screens/                    Menu, Game, Result (confetti)
```

* Clearing uses 4-connectivity; set `CLEAR_CONNECTIVITY = 8` in `constants.ts` to count diagonal contact.
* Points: one point per 4 grains cleared, multiplied by the chain number.

Font: Pixelify Sans (SIL Open Font License) via `@expo-google-fonts/pixelify-sans`.
Sounds in `assets/sounds` are synthesized by `node scripts/generate-sounds.js` (original, no third-party assets).
