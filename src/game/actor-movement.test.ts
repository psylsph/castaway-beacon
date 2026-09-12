import { describe, expect, it } from 'vitest'
import {
  actorArrives,
  beginMove,
  continueMovement,
  MOVEMENT_SPEED,
} from './actor-movement'
import { createInitialState } from './simulation'

describe('actor movement', () => {
  it('starts idle at the campfire', () => {
    const state = createInitialState()

    expect(state.actor).toMatchObject({ x: 248, y: 380, mode: 'idle' })
  })

  it('begins moving toward a target', () => {
    const moved = beginMove(createInitialState(), 100, 200)

    expect(moved.actor.mode).toBe('moving')
    expect(moved.actor.targetId).toBeUndefined()
  })

  it('travels toward the target at a fixed speed', () => {
    const started = beginMove(createInitialState(), 328, 380)
    const stepped = continueMovement(started, 1)

    expect(stepped.actor.x).toBeCloseTo(248 + MOVEMENT_SPEED, 1)
    expect(stepped.actor.y).toBeCloseTo(380, 1)
  })

  it('never overshoots the target', () => {
    const started = beginMove(createInitialState(), 250, 380)
    const stepped = continueMovement(started, 60)

    expect(stepped.actor.x).toBe(250)
    expect(stepped.actor.mode).toBe('working')
  })

  it('reports arrival', () => {
    const started = beginMove(createInitialState(), 250, 380)
    const stepped = continueMovement(started, 60)

    expect(actorArrives(stepped)).toBe(true)
  })
})
