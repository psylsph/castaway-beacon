# Castaway Beacon Phaser Vertical Slice Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace the current infinite-log demo with a coherent, finite, touch-first Phaser vertical slice in which one survivor moves around a small island, performs resource actions, builds within explicit limits, and hears/observes a polished first-day survival loop.

**Architecture:** Phaser owns the canvas, scenes, pointer input, animation and sound integration. Framework-independent TypeScript owns game state, commands, resource budgets, movement rules, construction rules and day events. The DOM remains a thin shell for the PWA host and accessible high-level controls; it must never create resources or mutate game state directly.

**Tech Stack:** TypeScript, Phaser 3.90, Vite, Vitest, optional Playwright browser smoke tests, vite-plugin-pwa, IndexedDB via `idb`, Docker and unprivileged Nginx.

---

## Review findings and decisions locked before implementation

The previous plan was directionally correct but left these holes:

- The current `collectNearest()` creates a new log when none exists. That bypasses the economy and must be removed.
- The current scene uses `Phaser.Math.Between`, a repeating timer and no daily budget. A deterministic route alone is not enough; resources need a finite scenario budget and an explicit next-day transition.
- `buildPlatform()` stores only a count. It has no build slot, position, blueprint, escalating cost, chapter cap or duplicate-placement rule.
- `drawSettlement()` removes only the platform container but recreates the palm, fire, survivor and label on every build. Repeated builds therefore leak visible objects.
- The survivor is a static `Graphics` object. Movement requires actor state, a destination, arrival detection and an action state.
- Phaser objects, timers, tweens and event handlers need scene shutdown cleanup so restarting a scene does not duplicate behavior.
- The button/scene callback boundary currently allows UI actions to bypass world interaction. Buttons may issue commands, but only the simulation may change state.
- “Add sound” is underspecified without licensed assets, a user-gesture unlock path, mute state and a testable audio adapter.
- “Improve graphics” is underspecified without an asset format, layer order, art style, asset ownership record and a no-emoji acceptance rule.
- Offline progress before the day loop is stable would create exploits and balance problems. The first slice saves locally but does not manufacture unlimited offline resources.

### Product rules for the first vertical slice

1. **Day 1 is finite:** six visible driftwood nodes, one wood each, on four designed shoreline lanes. No random coordinates and no on-demand spawning.
2. **Resource cap:** at most three nodes are active at once; collected nodes are replaced only by the next item in the day’s finite scenario queue.
3. **Construction cap:** Day 1 permits one new raft platform. The second platform requires Day 2. Platform costs are data, not constants hidden inside a button handler.
4. **No hard lock:** the player cannot lose essential shelter/fire progress in this slice. If a future day can exhaust resources, it must provide an explicit recovery action.
5. **Movement is real:** tapping a walkable point moves the survivor; tapping a resource makes the survivor walk to it and collect only on arrival.
6. **Day advance is explicit:** the player taps `End day` after the day objective is complete. No real-time timer silently advances the story.
7. **Sound is opt-in:** the first `Start`/`Enable sound` gesture unlocks audio; a mute control is always available.
8. **Visual target:** no emoji or debug primitives in the acceptance build. Use a consistent 2.5D/isometric-style atlas, shadows, animated water and readable silhouettes.
9. **Scope exclusions:** no multiplayer, alliances, combat, procedural worlds, payments, accounts or backend in this milestone.

Phaser’s scene model is a good fit because scenes own their input, display list, tweens, timers and sound access.[1] Use the documented `FIT` scale path and keep the parent dimensions explicit; `FIT` preserves aspect ratio while fitting the canvas into its parent.[2] Keep Phaser pinned to the v3.90 line already used by this repository.[3]

---

## Phase 0 — Baseline and repository hygiene

### Task 1: Commit or deliberately replace the deterministic route spike

**Objective:** Make the existing route test part of the implementation rather than leaving it as uncommitted, unused code.

**Files:**
- Modify: `src/game/driftwood.ts`
- Modify: `src/game/driftwood.test.ts`
- Modify: `src/game/island-scene.ts`

**Steps:**
1. Keep the four explicit points and add an exported route length or scenario helper.
2. Remove `Phaser.Math.Between` from driftwood creation.
3. Add a scene `nextDriftwoodIndex` counter; each queued node consumes one route index.
4. Remove the `spawnDriftwood()` call from `collectNearest()` when the set is empty. An empty queue must report no available resource.
5. Add tests for negative/non-integer route indexes and route exhaustion behavior.
6. Run `npx vitest run src/game/driftwood.test.ts -v`; expected: all route tests pass.
7. Commit: `fix: make driftwood spawning deterministic`.

**Acceptance:** Searching the scene shows no random driftwood coordinates and no code path that creates a resource in response to a collect request.

### Task 2: Define the vertical-slice state contract

**Objective:** Replace the count-only state with serializable state that can represent actor position, resource nodes, structures and daily progression.

**Files:**
- Modify: `src/game/simulation.ts`
- Create: `src/game/types.ts`
- Create: `src/game/simulation-state.test.ts`

**State contract:**

```ts
interface GameState {
  schemaVersion: 1
  day: number
  phase: 'day' | 'night'
  resources: { wood: number; food: number; water: number }
  actor: { x: number; y: number; mode: 'idle' | 'moving' | 'working'; targetId?: string }
  nodes: ResourceNode[]
  structures: Structure[]
  completedObjectives: string[]
}

interface ResourceNode {
  id: string
  kind: 'driftwood' | 'water' | 'food'
  x: number
  y: number
  quantity: number
  collected: boolean
}

interface Structure {
  id: string
  kind: 'campfire' | 'raft-platform' | 'water-collector'
  x: number
  y: number
  level: number
}
```

**Tests:** initial state is schema version 1, day 1, one idle actor, one campfire and no collected nodes; state is JSON serializable; commands return new state rather than mutating their input.

**Verification:** `npx vitest run src/game/simulation-state.test.ts -v`; expected: pass.

**Commit:** `feat: define serializable vertical slice state`.

### Task 3: Add finite day scenarios and a spawn director

**Objective:** Make resource availability a finite, inspectable day scenario rather than a repeating timer with infinite supply.

**Files:**
- Create: `src/game/day-content.ts`
- Create: `src/game/spawn-director.ts`
- Create: `src/game/spawn-director.test.ts`
- Modify: `src/game/simulation.ts`

**Rules:**

- Day 1 scenario contains exactly six driftwood entries.
- Only three may be visible simultaneously.
- When one is collected, the next queued entry enters the next designed route point.
- After the sixth entry is collected, no more driftwood appears that day.
- `endDay()` is unavailable until the day objective is satisfied, or an explicit “leave incomplete” rule is added and tested.
- The director returns commands/events; it does not create Phaser objects.

**Tests:** initial visible count is three; collecting nodes advances the queue; after six collections the queue is empty; calling collect on an exhausted queue changes nothing; a repeated call cannot duplicate a node ID.

**Verification:** `npx vitest run src/game/spawn-director.test.ts -v`.

**Commit:** `feat: add finite day resource scenarios`.

### Task 4: Add construction blueprints, slots and caps

**Objective:** Make building a constrained decision instead of an unlimited five-wood counter.

**Files:**
- Create: `src/game/buildings.ts`
- Create: `src/game/buildings.test.ts`
- Modify: `src/game/simulation.ts`
- Modify: `src/game/simulation.test.ts`

**Data rules:**

```ts
const BUILDINGS = {
  'raft-platform': {
    costs: [{ wood: 5 }, { wood: 8 }, { wood: 13 }],
    dayUnlock: 1,
    dayCaps: [1, 2, 4],
  },
  'water-collector': { costs: [{ wood: 4 }], dayUnlock: 1, dayCaps: [1] },
  campfire: { costs: [{ wood: 3 }], dayUnlock: 1, dayCaps: [1] },
} as const
```

Use a slot ID and world position for every placed structure. Reject insufficient resources, locked blueprints, occupied slots and day-cap violations. Add a single non-destructive recovery action for later use, but do not make it an infinite source in Day 1.

**Tests:** first platform costs 5; second platform is rejected on Day 1; a platform cannot occupy the same slot twice; a failed build leaves state unchanged; building consumes resources exactly once.

**Verification:** `npx vitest run src/game/buildings.test.ts src/game/simulation.test.ts -v`.

**Commit:** `feat: constrain building progression`.

---

## Phase 1 — Actor agency and Phaser scene correctness

### Task 5: Implement framework-independent actor movement

**Objective:** Give the survivor a deterministic position, target and arrival state before connecting Phaser rendering.

**Files:**
- Create: `src/game/movement.ts`
- Create: `src/game/movement.test.ts`
- Modify: `src/game/types.ts`

**API:**

```ts
setMoveTarget(state: GameState, target: Point): GameState
stepActor(state: GameState, deltaSeconds: number): GameState
isWithinInteractionRange(actor: Point, target: Point, radius: number): boolean
```

Use a fixed movement speed and clamp the final step to the target. Test zero-distance targets, large delta values, repeated steps after arrival and movement that cannot leave the walkable bounds.

**Verification:** `npx vitest run src/game/movement.test.ts -v`.

**Commit:** `feat: add deterministic survivor movement rules`.

### Task 6: Refactor IslandScene into persistent render layers

**Objective:** Stop graphics duplication and make scene restarts safe.

**Files:**
- Modify: `src/game/island-scene.ts`
- Create: `src/game/render-layers.ts` if the layer setup needs extraction

**Layer order:** water, waves, island, structures, resource nodes, actor, effects, scene labels.

Create each layer once in `create()`. On state changes, clear only the affected dynamic layer. Do not redraw static palm/island art for every build. Store timer and tween handles. On `shutdown`/`destroy`, remove input listeners, stop timers, stop tweens and destroy containers owned by the scene.

**Verification:** add a browser debug-only restart action; restart the scene twice and confirm one actor, one fire, one label and one timer remain. Keep the debug action out of the production UI.

**Commit:** `refactor: make Phaser scene lifecycle safe`.

### Task 7: Connect pointer input to movement and work

**Objective:** Make the survivor perform the visible action instead of resources vanishing from a button press.

**Files:**
- Modify: `src/game/island-scene.ts`
- Modify: `src/main.ts`
- Modify: `src/shell.ts`
- Create: `src/game/interaction.test.ts`

**Interaction rules:**

- Tap walkable ground: set actor movement target.
- Tap a resource node: set actor target to the node and remember `targetId`.
- On arrival within interaction radius: dispatch `collectNode` and play the work animation.
- A node cannot be collected twice.
- The DOM `Collect` button selects the nearest currently visible node only; it must never spawn one.
- `Build raft` opens/selects a blueprint and issues a build command only if a valid slot is selected.

**Tests:** tapping a node does not change wood before arrival; arrival collects exactly once; tapping empty ground moves without collecting; clicking Collect with no visible nodes does not change state.

**Verification:** unit tests plus a fresh browser session with the canvas and DOM HUD visible.

**Commit:** `feat: connect survivor movement to resource actions`.

### Task 8: Replace placeholder actor and object graphics

**Objective:** Establish a consistent visual language rather than incrementally adding more primitive shapes.

**Files:**
- Create: `public/assets/atlas/island.png`
- Create: `public/assets/atlas/island.json`
- Create: `public/assets/actors/survivor.png`
- Create: `public/assets/structures/structures.png`
- Create: `docs/assets/ASSET_LICENSES.md`
- Modify: `src/game/island-scene.ts`
- Create: `src/game/assets.ts`

**Art direction:** portrait 480×640 world, warm sand/wood, deep teal water, strong cast shadows, readable silhouettes and restrained isometric/2.5D perspective. Replace emoji and debug primitives with atlas frames for idle, walk, work, campfire, raft plank, crate, palm and shark fin. Add animated water bands, soft shadow ellipses and a small “DAY 1 · STRANDED” in-world heading.

Every non-generated asset must have a source, licence and attribution entry. Generated or original assets must be marked as such. No asset may be copied from the reference adverts or a competitor.

**Verification:** run the game at desktop and narrow mobile viewport; no missing-texture markers, no emoji characters, no repeated static objects after three builds, and all important objects remain readable at 320 CSS pixels wide.

**Commit:** `feat: add consistent island art pass`.

---

## Phase 2 — Audio and authored survival events

### Task 9: Add a user-gesture-safe audio service

**Objective:** Add atmosphere and feedback without breaking iOS/browser autoplay rules.

**Files:**
- Create: `src/game/audio-service.ts`
- Create: `src/game/audio-service.test.ts`
- Create: `public/audio/ocean-loop.ogg`
- Create: `public/audio/pickup.wav`
- Create: `public/audio/build.wav`
- Create: `public/audio/footsteps.wav`
- Create: `docs/assets/ASSET_LICENSES.md`
- Modify: `src/main.ts`
- Modify: `src/shell.ts`

Inject an `AudioPort` interface so unit tests use a fake adapter. `enable()` is called only from the Start/Enable Sound user gesture. Add mute/unmute persistence, one ocean loop, pickup/build/footstep effects and a volume ceiling. Avoid dozens of simultaneous audio elements; use Phaser’s sound manager through one service.

**Tests:** sound is not requested before enable; enable is idempotent; mute prevents playback; a collect event selects the pickup effect; the audio preference serializes correctly.

**Verification:** desktop browser and iOS Safari/PWA manual check: first gesture enables sound, mute works, backgrounding the app does not create duplicate loops.

**Commit:** `feat: add ambient audio and sound settings`.

### Task 10: Add day transition, weather and first rescue event

**Objective:** Give the finite resource loop a meaningful endpoint and a reason to continue.

**Files:**
- Create: `src/game/events.ts`
- Create: `src/game/events.test.ts`
- Modify: `src/game/day-content.ts`
- Modify: `src/game/simulation.ts`
- Modify: `src/game/island-scene.ts`
- Modify: `src/shell.ts`

**Content:**

- Day 1 objective: collect driftwood, build one raft platform and keep the campfire lit.
- End-day transition: sunset overlay, short sound cue and Day 2 state.
- Day 2: unlock water collector and a small storm warning.
- Day 3: distress signal unlocks a rescue event; successful rescue raises population from 1 to 2.

Weather is an authored event with a bounded effect, not an always-running random hazard. It may change water colour, add rain and temporarily close a resource lane, but cannot make the save unwinnable.

**Tests:** cannot end Day 1 before the objective; can end after objective; day 2 unlocks exactly its new content; rescue can resolve once; failed/aborted rescue leaves a recoverable state.

**Commit:** `feat: add authored days weather and rescue`.

---

## Phase 3 — Persistence, PWA and acceptance testing

### Task 11: Add versioned local saves

**Objective:** Preserve progress across reloads without serializing Phaser objects.

**Files:**
- Create: `src/save/schema.ts`
- Create: `src/save/schema.test.ts`
- Create: `src/save/database.ts`
- Create: `src/save/database.test.ts`
- Modify: `src/main.ts`
- Modify: `package.json` if `fake-indexeddb` is needed for tests

Persist only validated `GameState`, schema version, settings and `savedAt`. Save on successful state commands, `pagehide` and `visibilitychange` with a small debounce. Add a migration function for every future schema version. Reject malformed or impossible data and fall back to a clean Day 1 state with a visible recovery message.

Do not add unlimited offline resource production yet. If passive production is added later, calculate it in a bounded pure function with an explicit maximum elapsed interval and tests for clock rollback.

**Tests:** save/load round trip; migration from the initial scaffold state; malformed data rejection; rapid state changes debounce; page-hide flush path; no Phaser object appears in serialized data.

**Commit:** `feat: add versioned IndexedDB saves`.

### Task 12: Harden PWA and mobile layout behavior

**Objective:** Make the Phaser game behave like an iOS Home Screen app without stale or broken layout state.

**Files:**
- Modify: `index.html`
- Modify: `src/style.css`
- Modify: `vite.config.ts`
- Modify: `README.md`

Keep `viewport-fit=cover`, safe-area padding, `100dvh`, `touch-action: none` on the game surface and explicit portrait/landscape reflow. Ensure Phaser receives a resize after orientation change. Disable PWA registration in development if it causes stale-cache debugging; retain it in production. Show a small update/reload notice when a new service worker is waiting.

Keep all local development and Compose services bound to `0.0.0.0`. The default Compose mapping remains explicit `0.0.0.0:${PORT:-8081}:8080`.

**Verification:** test 320px-wide mobile viewport, 1280px desktop viewport, portrait-to-landscape resize, reload after a build hash changes, and PWA manifest/service-worker presence.

**Commit:** `fix: harden mobile PWA behavior`.

### Task 13: Add repeatable browser smoke tests

**Objective:** Prevent the exact regressions reported by the user from returning.

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/vertical-slice.spec.ts`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

Add `@playwright/test` only at this stage. Run against the production preview, using a mobile device preset and a desktop viewport.

**Required scenarios:**

1. Page loads with a canvas, title, manifest link and no scroll overflow.
2. Six Day 1 driftwood actions are the maximum; a seventh collect attempt does not increase wood.
3. Wood remains unchanged until the actor reaches a resource.
4. One valid build consumes its cost; the Day 1 cap rejects the next platform.
5. Day transition changes the day label and unlocks the next authored content.
6. Mute control changes its accessible state.
7. Reload restores the saved state.

**Commands:** `npx playwright install --with-deps chromium`, then `npm run test:e2e`; expected: all smoke tests pass.

**Commit:** `test: add browser vertical slice coverage`.

### Task 14: Add final Docker and CI gates

**Objective:** Prove the same artifact works from a clean Docker build on all interfaces.

**Files:**
- Modify: `Dockerfile`
- Modify: `compose.yaml`
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`

Keep the multi-stage Node build and unprivileged Nginx runtime. Add a build-time `npm run check`, production image build, and a CI smoke container. Do not run a development server in the production image.

**Verification commands:**

```bash
npm run check
docker compose build
docker compose down --remove-orphans
docker compose up -d --force-recreate
curl --fail http://0.0.0.0:8081/health
curl --fail http://0.0.0.0:8081/manifest.webmanifest
docker compose ps
```

Expected: check passes, image builds, health returns `ok`, manifest is served, and Compose reports the service healthy with `0.0.0.0:8081->8080/tcp`.

**Commit:** `ci: verify the production container and PWA`.

---

## Definition of done for this milestone

The vertical slice is complete only when all of these are true:

- No random or infinite resource spawning exists.
- The player cannot build unlimited platforms on Day 1.
- Collecting requires the survivor to move to and work at the node.
- Scene restart does not duplicate actors, labels, timers or audio loops.
- The player can hear ocean ambience and collection/build feedback after a user gesture.
- The scene uses authored or properly licensed atlas assets rather than emoji/debug primitives.
- Day 1 has a finite objective and Day 2/3 provide authored continuation.
- A reload restores state from IndexedDB.
- Unit and browser tests cover resource caps, movement-before-collection, construction caps and saves.
- `npm run check` passes.
- Docker builds and serves on `0.0.0.0` with a healthy endpoint.

## Explicitly deferred

Do not add a backend, user accounts, multiplayer, alliances, global territory, combat, procedural island generation, subscriptions, ad rewards or App Store packaging until this vertical slice passes playtesting. Those systems would obscure whether the core interaction—moving a survivor through a beautiful, finite island and making meaningful choices—is actually fun.

## Sources

[1] https://docs.phaser.io/phaser/concepts/scenes — Phaser Scenes
[2] https://docs.phaser.io/phaser/concepts/scale-manager — Phaser Scale Manager
[3] https://phaser.io/download/release/v3.90.0 — Phaser v3.90.0 Release
