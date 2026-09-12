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
import { SAND_CENTER, clampToSand } from './world'
import type { ResourceNode } from './types'

const WORLD_WIDTH = 480
const WORLD_HEIGHT = 640
const MAX_ACTIVE_NODES = 3
/** Uniform sprite scale — integer so pixelArt rendering stays crisp. */
const SPRITE_SCALE = 2

/** Shore ring slots for raft platforms (validated ≥92px apart for 88px-wide rafts). */
const BUILD_SLOTS: readonly { x: number; y: number }[] = [
  { x: 240, y: 408 },
  { x: 338, y: 382 },
  { x: 142, y: 382 },
  { x: 240, y: 304 },
]

type StateListener = (state: GameState) => void

type PendingAction =
  | { kind: 'collect'; nodeId: string }
  | { kind: 'build'; slotId: string; x: number; y: number }

export class IslandScene extends Phaser.Scene {
  private state: GameState = createInitialState()
  private readonly onStateChange: StateListener
  private readonly nodeVisuals = new Map<string, Phaser.GameObjects.Image>()
  private statusLabel?: Phaser.GameObjects.Text
  private actor?: Phaser.GameObjects.Sprite
  private actorShadow?: Phaser.GameObjects.Ellipse
  private nightOverlay?: Phaser.GameObjects.Rectangle
  private fireSprite?: Phaser.GameObjects.Sprite
  private announceTimer?: Phaser.Time.TimerEvent
  private pendingAction?: PendingAction
  private emittedDay = 0

  constructor(onStateChange: StateListener) {
    super({ key: 'island' })
    this.onStateChange = onStateChange
  }

  preload(): void {
    this.load.image('island-bg', 'island-bg.png')
    this.load.atlas('game-atlas', 'atlas.png', 'atlas.json')
  }

  create(): void {
    this.add.image(SAND_CENTER.x, SAND_CENTER.y, 'island-bg').setDepth(-10)

    // campfire (animated) at the sand centre
    this.fireSprite = this.add
      .sprite(SAND_CENTER.x, SAND_CENTER.y - 20, 'game-atlas', 'campfire_0')
      .setDepth(SAND_CENTER.y)
      .setScale(SPRITE_SCALE)
    this.anims.create({
      key: 'fire-flicker',
      frames: this.anims.generateFrameNames('game-atlas', {
        prefix: 'campfire_',
        end: 1,
      }),
      frameRate: 5,
      repeat: -1,
    })
    this.fireSprite.play('fire-flicker')

    // decorative palms on the sand edge (depth = y for correct occlusion)
    this.add.image(150, 330, 'game-atlas', 'palm_a').setDepth(330).setScale(SPRITE_SCALE)
    this.add.image(336, 380, 'game-atlas', 'palm_b').setDepth(380).setScale(SPRITE_SCALE)
    this.add
      .image(268, 306, 'game-atlas', 'palm_a')
      .setDepth(306)
      .setScale(SPRITE_SCALE * 0.85)

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

    // actor with soft shadow
    this.actorShadow = this.add
      .ellipse(0, 0, 30, 11, 0x063449, 0.35)
      .setDepth(38)
    this.actor = this.add
      .sprite(this.state.actor.x, this.state.actor.y, 'game-atlas', 'castaway_idle_down')
      .setScale(SPRITE_SCALE)
      .setDepth(40)

    this.anims.create({
      key: 'walk-down',
      frames: this.anims.generateFrameNames('game-atlas', {
        prefix: 'castaway_walk_down_',
        end: 1,
      }),
      frameRate: 6,
      repeat: -1,
    })
    this.anims.create({
      key: 'walk-side',
      frames: this.anims.generateFrameNames('game-atlas', {
        prefix: 'castaway_walk_side_',
        end: 1,
      }),
      frameRate: 6,
      repeat: -1,
    })
    this.anims.create({
      key: 'walk-up',
      frames: this.anims.generateFrameNames('game-atlas', {
        prefix: 'castaway_walk_up_',
        end: 1,
      }),
      frameRate: 6,
      repeat: -1,
    })

    this.reconcileNodes()
    this.emitState()
  }

  update(_time: number, delta: number): void {
    const deltaSeconds = delta / 1000
    const previousDay = this.state.day
    const previousPhase = this.state.phase

    this.state = tickDay(this.state, deltaSeconds)
    this.state = continueMovement(this.state, deltaSeconds)

    if (this.state.day !== previousDay) {
      this.announce(`Day ${this.state.day} — the tide brought more driftwood`)
    }
    if (this.state.phase !== previousPhase && this.state.phase === 'night') {
      this.announce('Night falls…')
    }

    if (this.actor && this.actorShadow) {
      this.actor.x = this.state.actor.x
      this.actor.y = this.state.actor.y
      this.actor.setDepth(this.state.actor.y + 1)
      this.actorShadow.x = this.state.actor.x
      this.actorShadow.y = this.state.actor.y + 12

      const target = this.state.actor
      const walking = this.state.actor.mode === 'moving'
      if (target.targetX !== undefined && target.targetY !== undefined) {
        const dx = target.targetX - this.state.actor.x
        const dy = target.targetY - this.state.actor.y
        if (walking && Math.abs(dx) + Math.abs(dy) > 2) {
          const anim =
            Math.abs(dy) >= Math.abs(dx)
              ? dy < 0
                ? 'walk-up'
                : 'walk-down'
              : 'walk-side'
          if (this.actor.anims.currentAnim?.key !== anim) this.actor.play(anim)
          this.actor.flipX = Math.abs(dy) < Math.abs(dx) && dx > 0
        } else {
          this.actor.stop()
          this.actor.setFrame(
            Math.abs(dy) >= Math.abs(dx) && dy < 0
              ? 'castaway_idle_up'
              : 'castaway_idle_down',
          )
        }
      }
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
    if (index >= BUILD_SLOTS.length) {
      this.announce('No room left on the sandbar')
      return
    }

    const slot = BUILD_SLOTS[index]
    const spot = clampToSand(slot.x, slot.y)
    const slotId = `raft-platform:${this.state.day}:${index + 1}`

    this.state = beginMove(this.state, spot.x, spot.y)
    this.pendingAction = { kind: 'build', slotId, x: spot.x, y: spot.y }
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
            scale: SPRITE_SCALE * 1.35,
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
    const log = this.add
      .image(node.x, node.y, 'game-atlas', 'driftwood')
      .setDepth(node.y)
      .setScale(SPRITE_SCALE)
    log.setInteractive(
      new Phaser.Geom.Rectangle(-14, -8, 28, 20),
      Phaser.Geom.Rectangle.Contains,
    )
    log.on('pointerdown', () => this.collectFromNode(node))
    this.nodeVisuals.set(node.id, log)

    this.tweens.add({
      targets: log,
      y: log.y + 3,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private refreshPlatforms(): void {
    const built = this.state.structures.filter((s) => s.kind === 'raft-platform')

    for (const structure of built) {
      this.add
        .image(structure.x, structure.y, 'game-atlas', 'raft_platform')
        .setScale(SPRITE_SCALE)
        .setDepth(structure.y)
    }
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
