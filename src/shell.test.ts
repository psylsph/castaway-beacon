import { describe, expect, it } from 'vitest'
import { renderAppShell } from './shell'

describe('application shell', () => {
  it('renders the game title, status and Phaser mount point', () => {
    const html = renderAppShell()

    expect(html).toContain('Castaway Beacon')
    expect(html).toContain('DAY 1')
    expect(html).toContain('id="game"')
  })
})
