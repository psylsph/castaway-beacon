import type { GameState } from './types'

export const MOVEMENT_SPEED = 60 // px per second

export interface MovementTarget {
  readonly x: number
  readonly y: number
}

export function beginMove(state: GameState, x: number, y: number): GameState {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) {
    throw new Error('Invalid movement target')
  }
  return {
    ...state,
    actor: { ...state.actor, x: state.actor.x, y: state.actor.y, targetX: x, targetY: y, mode: 'moving' },
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
  return {
    ...state,
    actor: { ...actor, x: nx, y: ny },
  }
}

export function actorArrives(state: GameState): boolean {
  return state.actor.mode === 'working'
}
