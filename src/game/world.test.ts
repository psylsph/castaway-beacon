import { describe, expect, it } from 'vitest'
import {
  SAND_CENTER,
  clampToSand,
  isWalkable,
  WALK_LIMIT,
} from './world'
import { DRIFTWOOD_ROUTE_LENGTH } from './driftwood'
import { beginMove, continueMovement } from './actor-movement'
import { createInitialState } from './simulation'

describe('walkable world', () => {
  it('keeps the campfire and actor start on sand', () => {
    expect(isWalkable(SAND_CENTER.x, SAND_CENTER.y)).toBe(true)
    expect(isWalkable(248, 380)).toBe(true)
  })

  it('rejects open water', () => {
    expect(isWalkable(60, 200)).toBe(false)
    expect(isWalkable(440, 600)).toBe(false)
    expect(isWalkable(118, 457)).toBe(false)
  })

  it('clamps sea targets back onto the sandbar boundary', () => {
    const clamped = clampToSand(60, 200)

    expect(isWalkable(clamped.x, clamped.y)).toBe(true)
    expect(clamped.y).toBeGreaterThan(200)
  })

  it('leaves walkable points unchanged', () => {
    expect(clampToSand(240, 380)).toEqual({ x: 240, y: 380 })
  })

  it('is exported so world tests can verify walkability', () => {
    expect(DRIFTWOOD_ROUTE_LENGTH).toBeGreaterThanOrEqual(6)
  })

  it('never lets the actor begin a move into the sea', () => {
    const moved = beginMove(createInitialState(), 60, 200)

    expect(isWalkable(moved.actor.targetX ?? 0, moved.actor.targetY ?? 0)).toBe(true)
  })

  it('keeps every movement step on sand', () => {
    let state = beginMove(createInitialState(), 150, 330)
    for (let i = 0; i < 60; i += 1) {
      state = continueMovement(state, 1 / 60)
      expect(isWalkable(state.actor.x, state.actor.y)).toBe(true)
    }
  })

  it('exposes the walk margin used by the clamp', () => {
    expect(WALK_LIMIT).toBeGreaterThan(0)
    expect(WALK_LIMIT).toBeLessThanOrEqual(1)
  })
})
