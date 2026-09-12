import Phaser from 'phaser'
import './style.css'
import { IslandScene } from './game/island-scene'
import { renderAppShell } from './shell'
import type { GameState } from './game/simulation'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Application root was not found')
}

app.innerHTML = renderAppShell()

const dayLabel = document.querySelector<HTMLElement>('#day')
const populationLabel = document.querySelector<HTMLElement>('#population')
const woodLabel = document.querySelector<HTMLElement>('#wood')
const buildButton = document.querySelector<HTMLButtonElement>('#build')

function updateHud(state: GameState): void {
  if (dayLabel) dayLabel.textContent = `DAY ${state.day}`
  if (populationLabel) {
    populationLabel.textContent =
      state.phase === 'night' ? `🌙 ${state.population}/20` : `👤 ${state.population}/20`
  }
  if (woodLabel) woodLabel.textContent = `🪵 ${state.resources.wood}`
  if (buildButton) buildButton.disabled = state.resources.wood < 5
}

const scene = new IslandScene(updateHud)

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 480,
  height: 640,
  backgroundColor: '#07546b',
  scene: [scene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 480,
    height: 640,
  },
  render: {
    antialias: false,
    pixelArt: true,
  },
})

document.querySelector<HTMLButtonElement>('#collect')?.addEventListener('click', () => {
  scene.collectNearest()
})

document.querySelector<HTMLButtonElement>('#build')?.addEventListener('click', () => {
  scene.buildRaft()
})
