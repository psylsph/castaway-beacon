# Architecture decisions

## Rendering

Use Phaser 3 with prerendered isometric sprite atlases. Prefer layered 2D animation for water, debris, weather, workers and construction effects rather than a full 3D renderer. This keeps load time and memory predictable on older iPhones.

## Simulation

Game state is immutable at system boundaries. Commands such as `collect`, `assign`, `build`, `advanceDay` and `resolveEvent` return a new state or a domain error. The simulation must not depend on DOM, Phaser, timers or network APIs.

## Persistence

Persist versioned snapshots in IndexedDB. Record the last successful save timestamp and calculate bounded offline progress when loading. Never trust client wall-clock time for competitive or purchased rewards if a server is added later.

## UI

Use Phaser for the island and direct-manipulation interactions. Use semantic DOM/CSS overlays for menus, settings, inventory, accessibility and text-heavy survivor screens.

## Networking

Do not add networking to the first playable version. If cloud synchronization is introduced, use a small TypeScript API with PostgreSQL. The client remains playable from local state when the service is unavailable.

## Deployment

Vite emits static files. A multi-stage Docker build runs all checks, builds the PWA, then copies only `dist/` into unprivileged Nginx. Runtime port is 8080.
