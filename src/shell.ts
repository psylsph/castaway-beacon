export function renderAppShell(): string {
  return `
    <main class="app-shell">
      <header class="hud" aria-label="Settlement status">
        <div>
          <p id="day" class="eyebrow">DAY 1</p>
          <h1>Castaway Beacon</h1>
        </div>
        <div class="resources" aria-label="Resources">
          <span id="population">👤 1/20</span>
          <span id="wood">🪵 0</span>
        </div>
      </header>

      <section id="game" class="game-frame" aria-label="Game canvas"></section>

      <nav class="action-bar" aria-label="Game actions">
        <button id="collect" type="button">Collect</button>
        <button id="build" type="button" disabled>Build raft</button>
        <button id="survivors" type="button" disabled>Survivors</button>
      </nav>
    </main>
  `
}
