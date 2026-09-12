import Phaser from 'phaser'
import { getDriftwoodSpawnPoint } from './driftwood'
import {
  buildPlatform,
  collectDriftwood,
  createInitialState,
  type GameState,
} from './simulation'

const WORLD_WIDTH = 480
const WORLD_HEIGHT = 640

type StateListener = (state: GameState) => void

export class IslandScene extends Phaser.Scene {
  private state: GameState = createInitialState()
  private readonly onStateChange: StateListener
  private readonly driftwood = new Set<Phaser.GameObjects.Container>()
  private platformLayer?: Phaser.GameObjects.Container
  private statusLabel?: Phaser.GameObjects.Text
  private nextDriftwoodIndex = 0

  constructor(onStateChange: StateListener) {
    super({ key: 'island' })
    this.onStateChange = onStateChange
  }

  create(): void {
    this.drawOcean()
    this.drawIsland()
    this.drawSettlement()
    this.statusLabel = this.add
      .text(WORLD_WIDTH / 2, WORLD_HEIGHT - 68, 'Tap a log to collect it', {
        color: '#fff5d6',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        stroke: '#063449',
        strokeThickness: 4,
      })
      .setOrigin(0.5)

    this.spawnDriftwood()
    this.time.addEvent({
      delay: 2_400,
      loop: true,
      callback: this.spawnDriftwood,
      callbackScope: this,
    })
    this.onStateChange(this.state)
  }

  buildRaft(): void {
    try {
      this.state = buildPlatform(this.state)
      this.drawSettlement()
      this.announce(`Raft expanded: ${this.state.platforms} platforms`)
      this.onStateChange(this.state)
    } catch (error) {
      this.announce(error instanceof Error ? error.message : 'Cannot build yet')
    }
  }

  collectNearest(): void {
    const first = this.driftwood.values().next()
    if (first.done) {
      this.announce('No driftwood nearby')
      return
    }

    this.collectLog(first.value)
  }

  private collectLog(log: Phaser.GameObjects.Container): void {
    if (!this.driftwood.delete(log)) return

    log.disableInteractive()
    this.tweens.add({
      targets: log,
      alpha: 0,
      scale: 1.35,
      duration: 180,
      onComplete: () => log.destroy(),
    })
    this.state = collectDriftwood(this.state, 1)
    this.announce('+1 driftwood')
    this.onStateChange(this.state)
  }

  private spawnDriftwood(): void {
    if (this.driftwood.size >= 6) return

    const point = getDriftwoodSpawnPoint(this.nextDriftwoodIndex)
    this.nextDriftwoodIndex += 1
    const log = this.add.container(point.x, point.y)
    log.add(this.add.ellipse(2, 10, 36, 10, 0x063449, 0.3))
    log.add(this.add.rectangle(0, 0, 32, 10, 0x9b5e35).setAngle(-18))
    log.add(this.add.circle(-10, 0, 5, 0xd28b4f))
    log.setSize(48, 48)
    log.setInteractive(
      new Phaser.Geom.Rectangle(-24, -24, 48, 48),
      Phaser.Geom.Rectangle.Contains,
    )
    log.on('pointerdown', () => this.collectLog(log))
    this.driftwood.add(log)

    this.tweens.add({
      targets: log,
      y: log.y + 5,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private drawOcean(): void {
    const ocean = this.add.graphics()
    ocean.fillGradientStyle(0x1a9caf, 0x1a9caf, 0x07546b, 0x07546b, 1)
    ocean.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

    ocean.lineStyle(2, 0xbaf0e8, 0.16)
    for (let y = 105; y < WORLD_HEIGHT; y += 64) {
      ocean.beginPath()
      ocean.moveTo(-20, y)
      ocean.lineTo(WORLD_WIDTH + 20, y - 24)
      ocean.strokePath()
    }
  }

  private drawIsland(): void {
    const island = this.add.graphics()
    island.fillStyle(0x063449, 0.35)
    island.fillEllipse(WORLD_WIDTH / 2, 388, 310, 152)
    island.fillStyle(0xe1ad60, 1)
    island.fillEllipse(WORLD_WIDTH / 2, 370, 298, 148)
    island.fillStyle(0xf3d184, 1)
    island.fillEllipse(WORLD_WIDTH / 2 - 5, 356, 276, 126)
    island.fillStyle(0xb9793e, 0.22)
    island.fillCircle(180, 355, 9)
    island.fillCircle(335, 390, 7)
    island.fillCircle(270, 320, 5)
  }

  private drawSettlement(): void {
    this.platformLayer?.removeAll(true)
    this.platformLayer = this.add.container()

    for (let index = 0; index < this.state.platforms - 1; index += 1) {
      const column = index % 3
      const row = Math.floor(index / 3)
      const x = 118 + column * 60
      const y = 457 + row * 34
      const platform = this.add
        .rectangle(x, y, 54, 25, 0x86522f)
        .setStrokeStyle(3, 0x4a2b1d)
      this.platformLayer.add(platform)
    }

    this.drawPalm(160, 300)
    this.drawCampfire(248, 370)
    this.drawSurvivor(310, 355)
    this.add
      .text(248, 130, 'SAND BAR  •  LV.1', {
        color: '#fff5d6',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        stroke: '#063449',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
  }

  private drawPalm(x: number, y: number): void {
    const palm = this.add.graphics()
    palm.lineStyle(9, 0x85522e, 1)
    palm.beginPath()
    palm.moveTo(x, y + 55)
    palm.lineTo(x - 12, y - 20)
    palm.strokePath()
    palm.fillStyle(0x2d8e55, 1)
    palm.fillEllipse(x - 28, y - 24, 70, 22)
    palm.fillEllipse(x + 22, y - 23, 68, 22)
    palm.fillEllipse(x, y - 42, 24, 70)
  }

  private drawCampfire(x: number, y: number): void {
    const fire = this.add.graphics()
    fire.lineStyle(8, 0x75432b, 1)
    fire.lineBetween(x - 19, y + 18, x + 18, y - 2)
    fire.lineBetween(x - 18, y - 2, x + 19, y + 18)
    fire.fillStyle(0xffb42e, 1)
    fire.fillTriangle(x, y - 31, x - 18, y + 8, x + 18, y + 8)
    fire.fillStyle(0xfff0a1, 1)
    fire.fillTriangle(x, y - 17, x - 8, y + 6, x + 8, y + 6)
  }

  private drawSurvivor(x: number, y: number): void {
    const survivor = this.add.graphics()
    survivor.fillStyle(0x374b57, 1)
    survivor.fillRoundedRect(x - 18, y - 2, 36, 42, 8)
    survivor.fillStyle(0xd89c70, 1)
    survivor.fillCircle(x, y - 16, 16)
    survivor.fillStyle(0x3b2a27, 1)
    survivor.fillTriangle(x - 16, y - 14, x, y - 34, x + 16, y - 14)
    survivor.fillStyle(0xd89c70, 1)
    survivor.fillCircle(x - 25, y + 8, 7)
    survivor.fillCircle(x + 25, y + 8, 7)
  }

  private announce(message: string): void {
    this.statusLabel?.setText(message)
    this.time.delayedCall(1_700, () => {
      this.statusLabel?.setText('Tap a log to collect it')
    })
  }
}
