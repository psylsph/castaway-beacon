# Castaway Beacon

A touch-first, installable browser game about growing a lone sandbar into a thriving ocean settlement and completing humanity's last beacon.

This repository currently contains the production-ready web/PWA/Docker foundation plus the first tested domain rule: collecting driftwood and spending it to expand the raft.

## Technology choices

- **TypeScript** — shared, type-safe game rules and UI code.
- **Phaser 3** — mature 2D/isometric rendering, animation, input and audio.
- **Vite** — fast local development and optimized static builds.
- **vite-plugin-pwa** — manifest and service-worker generation for Home Screen installation and offline startup.
- **IndexedDB via `idb`** — local saves and offline-progress timestamps without requiring an account.
- **Vitest** — fast tests for deterministic game systems.
- **ESLint** — static checks.
- **Nginx (unprivileged)** — small production runtime image serving the compiled game.
- **Docker Compose** — one-command local or server deployment.

The first version is deliberately single-player and local-first. Add a small API and PostgreSQL only when cloud saves, accounts, leaderboards, or live events are actually required.

## Requirements

For local development:

- Node.js 22+
- npm 10+

For container deployment:

- Docker with Compose

## Development

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`.

## Verification

```bash
npm run check
```

This runs lint, unit tests, TypeScript compilation and the production PWA build.

## Docker

Build and start:

```bash
docker compose up --build -d
```

Open `http://localhost:8081`; the container is explicitly bound to `0.0.0.0` (override the port with `PORT=9000 docker compose up --build -d`).

Health check:

```bash
curl http://localhost:8081/health
```

Stop:

```bash
docker compose down
```

## Initial architecture

```text
src/
├── game/
│   ├── simulation.ts       # deterministic game rules
│   └── simulation.test.ts  # behavior tests
├── main.ts                 # browser entry point
├── shell.ts                # initial DOM/PWA shell
├── shell.test.ts
└── style.css
```

Planned boundaries:

- `game/`: framework-independent simulation and content definitions.
- `scenes/`: Phaser rendering and touch input.
- `save/`: IndexedDB persistence, migrations and offline-time calculation.
- `ui/`: DOM overlays for building, survivor and expedition screens.
- Optional `server/`: authentication and cloud synchronization; never required for local play.

Keep game rules independent of Phaser. Rendering reads snapshots from the simulation; it does not own resources, timers or progression. This keeps save migration, offline progress and unit testing straightforward.

## PWA behavior

The build includes:

- Standalone portrait manifest
- App icons and iOS Home Screen icon
- Generated service worker and precached build assets
- Safe-area-aware layout for notches and the Home indicator
- Touch-first viewport configuration

## Repository status

This is a local Git repository scaffold. No GitHub remote is created until visibility and repository ownership are chosen.
