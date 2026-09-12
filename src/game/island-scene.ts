import Phaser from 'phaser'
import {
  canCollect,
  collectNode,
  tickDay,
  DAY_LENGTH_SECONDS,
} from './day-cycle'
import { placeStructure } from './buildings'
import { actorArrives, beginMove, continueMovement } from './actor-movement'
import { createInitialState, type GameState } from './simulation'
import type { ResourceNode } from './types'

const WORLD_WIDTH = 480
const WORLD_HEIGHT = 640
const PLATFORM_ORIGIN = { x: 118, y: 457 }
const MAX_ACTIVE_NODES = 3

type StateListener = (state: GameState) => void

type PendingAction =
  | { kind: 'collect'; nodeId: string }
  | { kind: 'build'; slotId: string; x: number; y: number }

export class IslandScene extends Phaser.Scene {
  private state: GameState = createInitialState()
  private readonly onStateChange: StateListener
  private readonly nodeVisuals = new Map<string, Phaser.GameObjects.Container>()
  private platformLayer?: Phaser.GameObjects.Container
  private statusLabel?: Phaser.GameObjects.Text
  private actorSprite?: Phaser.GameObjects.Container
  private nightOverlay?: Phaser.GameObjects.Rectangle
  private announceTimer?: Phaser.Time.TimerEvent
  private pendingAction?: PendingAction
  private emittedDay = 0

  constructor(onStateChange: StateListener) {
    super({ key: 'island' })
    this.onStateChange = onStateChange
  }

  create(): void {
    this.drawOcean()
    this.drawIsland()
    this.drawStaticSettlement()

    this.nightOverlay = this.add
      .rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x0a1a3f, 1)
      .setDepth(60)
      .setAlpha(0)

    this.statusLabel = this.add
      .text(WORLD_WIDTH / 2, WORLD_HEIGHT - 68, 'Tap a log to send the castaway', {
        color: '#fff5d6',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        stroke: '#063449',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(70)

    this.actorSprite = this.drawSurvivor(this.state.actor.x, this.state.actor.y)
    this.actorSprite.setDepth(40)

    this.reconcileNodes()
    this.emitState()
  }

  update(_time: number, delta: number): void {
    const deltaSeconds = delta / 1000
    const previousDay = this.state.day

    this.state = tickDay(this.state, deltaSeconds)
    this.state = continueMovement(this.state, deltaSeconds)

    if (this.state.day !== previousDay) {
      this.announce(`Day ${this.state.day} — the tide brought more driftwood`)
    }

    if (this.actorSprite) {
      this.actorSprite.x = this.state.actor.x
      this.actorSprite.y = this.state.actor.y
    }

    if (this.nightOverlay) {
      const target = this.state.phase === 'night' ? 0.38 : 0
      this.nightOverlay.alpha += (target - this.nightOverlay.alpha) * Math.min(1, deltaSeconds * 3)
    }

    this.reconcileNodes()

    if (this.pendingAction && actorArrives(this.state)) {
      this.runPendingAction()
    }

    if (this.state.day !== this.emittedDay) {
      this.emitState()
    }
  }

  buildRaft(): void {
    if (this.pendingAction) {
      this.announce('Already busy')
      return
    }

    const index = this.state.structures.filter((s) => s.kind === 'raft-platform').length
    const column = index % 3
    const row = Math.floor(index / 3)
    const x = PLATFORM_ORIGIN.x + column * 60
    const y = PLATFORM_ORIGIN.y + row * 34
    const slotId = `raft-platform:${this.state.day}:${index + 1}`

    this.state = beginMove(this.state, x, y)
    this.pendingAction = { kind: 'build', slotId, x, y }
    this.announce('Walking to the build spot…')
  }

  collectNearest(): void {
    const active = this.activeNodes()
    const target = active.find((node) => !node.collected)

    if (!target) {
      this.announce('No driftwood in range')
      return
    }

    this.collectFromNode(target)
  }

  private collectFromNode(node: ResourceNode): void {
    if (this.pendingAction) {
      this.announce('Already busy')
      return
    }

    const check = canCollect(this.state, node.id)
    if (!check.ok) {
      this.announce(check.reason ?? 'Cannot collect')
      return
    }

    this.state = beginMove(this.state, node.x, node.y)
    this.pendingAction = { kind: 'collect', nodeId: node.id }
  }

  private runPendingAction(): void {
    const action = this.pendingAction
    this.pendingAction = undefined
    if (!action) return

    try {
      if (action.kind === 'collect') {
        this.state = collectNode(this.state, action.nodeId)
        const visual = this.nodeVisuals.get(action.nodeId)
        if (visual) {
          this.nodeVisuals.delete(action.nodeId)
          this.tweens.add({
            targets: visual,
            alpha: 0,
            scale: 1.35,
            duration: 180,
            onComplete: () => visual.destroy(),
          })
        }
        this.announce('+1 driftwood')
      } else {
        this.state = placeStructure(this.state, 'raft-platform', action.slotId, action.x, action.y)
        this.refreshPlatforms()
        this.announce(`Raft expanded: ${this.state.platforms} platforms`)
      }
    } catch (error) {
      this.announce(error instanceof Error ? error.message : 'Cannot do that yet')
    }

    this.emitState()
  }

  private activeNodes(): readonly ResourceNode[] {
    const collected = this.state.nodes.filter((node) => node.collected).length
    return this.state.nodes.slice(collected, collected + MAX_ACTIVE_NODES)
  }

  private reconcileNodes(): void {
    const active = new Set(this.activeNodes().map((node) => node.id))

    for (const [nodeId, visual] of this.nodeVisuals) {
      if (!active.has(nodeId)) {
        this.nodeVisuals.delete(nodeId)
        this.tweens.add({
          targets: visual,
          alpha: 0,
          duration: 150,
          onComplete: () => visual.destroy(),
        })
      }
    }

    for (const node of this.activeNodes()) {
      if (node.collected || this.nodeVisuals.has(node.id)) continue
      this.spawnNodeVisual(node)
    }
  }

  private spawnNodeVisual(node: ResourceNode): void {
    const log = this.add.container(node.x, node.y)
    log.add(this.add.ellipse(2, 10, 36, 10, 0x063449, 0.3))
    log.add(this.add.rectangle(0, 0, 32, 10, 0x9b5e35).setAngle(-18))
    log.add(this.add.circle(-10, 0, 5, 0xd28b4f))
    log.setSize(48, 48)
    log.setDepth(30)
    log.setInteractive(
      new Phaser.Geom.Rectangle(-24, -24, 48, 48),
      Phaser.Geom.Rectangle.Contains,
    )
    log.on('pointerdown', () => this.collectFromNode(node))
    this.nodeVisuals.set(node.id, log)

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

  private drawStaticSettlement(): void {
    this.platformLayer = this.add.container()
    this.platformLayer.setDepth(20)

    this.drawPalm(160, 300)
    this.drawCampfire(248, 370)
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

  private refreshPlatforms(): void {
    if (!this.platformLayer) return

    this.platformLayer.removeAll(true)
    const built = this.state.structures.filter((s) => s.kind === 'raft-platform')

    for (const [index, structure] of built.entries()) {
      const platform = this.add
        .rectangle(structure.x, structure.y, 54, 25, 0x86522f)
        .setStrokeStyle(3, 0x4a2b1d)
      this.platformLayer.add(platform)
      void index
    }
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

  private drawSurvivor(x: number, y: number): Phaser.GameObjects.Container {
    const survivor = this.add.container(x, y)
    const body = this.add.graphics()
    body.fillStyle(0x374b57, 1)
    body.fillRoundedRect(-18, -2, 36, 42, 8)
    body.fillStyle(0xd89c70, 1)
    body.fillCircle(0, -16, 16)
    body.fillStyle(0x3b2a27, 1)
    body.fillTriangle(-16, -14, 0, -34, 16, -14)
    body.fillStyle(0xd89c70, 1)
    body.fillCircle(-25, 8, 7)
    body.fillCircle(25, 8, 7)
    survivor.add(body)
    return survivor
  }

  private announce(message: string): void {
    if (!this.statusLabel) return
    this.announceTimer?.remove(false)
    this.statusLabel.setText(message)
    this.announceTimer = this.time.delayedCall(1_700, () => {
      this.statusLabel?.setText('Tap a log to send the castaway')
    })
  }

  private emitState(): void {
    this.emittedDay = this.state.day
    this.onStateChange(this.state)
  }
}

export { DAY_LENGTH_SECONDS }
