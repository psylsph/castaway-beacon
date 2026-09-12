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
const foodLabel = document.querySelector<HTMLElement>('#food')
const buildButton = document.querySelector<HTMLButtonElement>('#build')
const hutButton = document.querySelector<HTMLButtonElement>('#hut')

function updateHud(state: GameState): void {
  if (dayLabel) dayLabel.textContent = `DAY ${state.day}`
  if (populationLabel) {
    populationLabel.textContent =
      state.phase === 'night' ? `🌙 ${state.population}/20` : `👤 ${state.population}/20`
  }
  if (woodLabel) woodLabel.textContent = `🪵 ${state.resources.wood}`
  if (foodLabel) foodLabel.textContent = `🐟 ${state.resources.food}`
  if (buildButton) buildButton.disabled = state.resources.wood < 5
  if (hutButton) hutButton.disabled = state.resources.wood < 10
}

const scene = new IslandScene(updateHud)

const game = new Phaser.Game({
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

// Debug handle for automated verification (no effect on gameplay)
declare global {
  interface Window {
    __castawayGame?: Phaser.Game
  }
}
window.__castawayGame = game

document.querySelector<HTMLButtonElement>('#collect')?.addEventListener('click', () => {
  scene.collectNearest()
})

document.querySelector<HTMLButtonElement>('#build')?.addEventListener('click', () => {
  scene.buildRaft()
})

document.querySelector<HTMLButtonElement>('#hut')?.addEventListener('click', () => {
  scene.buildHut()
})

document.querySelector<HTMLButtonElement>('#fish')?.addEventListener('click', () => {
  scene.goFishing()
})

document.querySelector<HTMLButtonElement>('#dig')?.addEventListener('click', () => {
  scene.goDigging()
})
