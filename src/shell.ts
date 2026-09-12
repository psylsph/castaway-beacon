export function renderAppShell(): string {
  return `
    <main class="app-shell">
      <header class="hud" aria-label="Settlement status">
        <div>
          <p class="eyebrow">DAY 1</p>
          <h1>Castaway Beacon</h1>
        </div>
        <div class="resources" aria-label="Resources">
          <span>👤 1/20</span>
          <span>🪵 0</span>
        </div>
      </header>

      <section id="game" class="game-frame" aria-label="Game canvas">
        <div class="placeholder-island" aria-hidden="true">
          <div class="palm">🌴</div>
          <div class="castaway">🧔</div>
          <div class="crate">📦</div>
        </div>
        <div class="coming-soon">
          <strong>STRANDED</strong>
          <span>Phaser game scene ready for implementation</span>
        </div>
      </section>

      <nav class="action-bar" aria-label="Game actions">
        <button type="button" disabled>Collect</button>
        <button type="button" disabled>Build</button>
        <button type="button" disabled>Survivors</button>
      </nav>
    </main>
  `
}
