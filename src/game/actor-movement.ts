import type { GameState } from './types'
import { clampToSand, isWalkable } from './world'

export const MOVEMENT_SPEED = 60 // px per second

export function beginMove(state: GameState, x: number, y: number): GameState {
  const target = clampToSand(x, y)
  return {
    ...state,
    actor: { ...state.actor, targetX: target.x, targetY: target.y, mode: 'moving' },
  }
}

export function continueMovement(state: GameState, deltaSeconds: number): GameState {
  const actor = state.actor
  if (actor.mode !== 'moving' || actor.targetX === undefined || actor.targetY === undefined) {
    return state
  }

  const dist = Math.hypot(actor.targetX - actor.x, actor.targetY - actor.y)
  if (dist <= MOVEMENT_SPEED * deltaSeconds) {
    return {
      ...state,
      actor: { ...actor, x: actor.targetX, y: actor.targetY, mode: 'working' },
    }
  }

  const step = MOVEMENT_SPEED * deltaSeconds
  const nx = actor.x + ((actor.targetX - actor.x) / dist) * step
  const ny = actor.y + ((actor.targetY - actor.y) / dist) * step

  // Stepwise safety: straight line between two sand points can still graze water.
  const next = isWalkable(nx, ny) ? { x: nx, y: ny } : clampToSand(nx, ny)

  return {
    ...state,
    actor: { ...actor, ...next },
  }
}

export function actorArrives(state: GameState): boolean {
  return state.actor.mode === 'working'
}
