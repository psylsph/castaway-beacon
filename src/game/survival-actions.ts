import type { GameState, WorkActivity } from './types'
import { FISH_YIELD, DIGS_PER_EXPANSION, LAND_STEP } from './survival'
import { isWalkable, SAND_CENTER, SAND_RADIUS_X, SAND_RADIUS_Y } from './world'

/** Where fishing happens: the east shore shallows. */
export const FISH_SPOT = { x: 346, y: 356 } as const

/** Where digging happens: the west shore. */
export const DIG_SPOT = { x: 140, y: 360 } as const

/** Seconds of work per fishing trip. */
export const FISH_WORK_SECONDS = 2.5

/** Seconds of work per dig trip. */
export const DIG_WORK_SECONDS = 3

export function beginWork(state: GameState, activity: WorkActivity): GameState {
  const spot = activity === 'fishing' ? FISH_SPOT : DIG_SPOT
  return {
    ...state,
    actor: { ...state.actor, targetX: spot.x, targetY: spot.y, mode: 'moving' },
    workActivity: activity,
  }
}

/** Called when the actor arrives; completes work instantly for now (anim later). */
export function completeWork(state: GameState): GameState {
  const activity = state.workActivity
  if (!activity || activity === 'none') return state

  if (activity === 'fishing') {
    const next = {
      ...state,
      resources: { ...state.resources, food: state.resources.food + FISH_YIELD },
      workActivity: 'none' as WorkActivity,
    }
    return withObjective(next, 'first-catch')
  }

  // digging: progress toward island expansion
  const digProgress = state.digProgress + 1
  if (digProgress >= DIGS_PER_EXPANSION) {
    return withObjective(
      {
        ...state,
        digProgress: 0,
        landLevel: state.landLevel + 1,
        workActivity: 'none' as WorkActivity,
      },
      'expand-land',
    )
  }

  return { ...state, digProgress, workActivity: 'none' as WorkActivity }
}

/** True while the dig ring still contains the dig spot (always, until land art grows). */
export function digSpotStillOnShore(_state: GameState): boolean {
  void _state
  return isWalkable(DIG_SPOT.x, DIG_SPOT.y)
}

export function sandRadii(landLevel: number): { rx: number; ry: number } {
  return {
    rx: SAND_RADIUS_X + landLevel * LAND_STEP,
    ry: SAND_RADIUS_Y + landLevel * LAND_STEP * 0.45,
  }
}

function withObjective(state: GameState, id: string): GameState {
  if (state.completedObjectives.includes(id)) return state
  return {
    ...state,
    completedObjectives: [...state.completedObjectives, id],
  }
}

export { SAND_CENTER }
