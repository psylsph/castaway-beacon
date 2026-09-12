import type { GameState } from './types'
import { buildDriftwoodDayScenario } from './day-content'
import { DAY_OBJECTIVE } from './spawn-director'

export const DAY_LENGTH_SECONDS = 120
export const NIGHT_LENGTH_SECONDS = 30
export const TICKS_PER_SECOND = 1

export function createSession(state: GameState): GameState {
  // session-level initialisation hook (per-day node refresh happens at dawn)
  return state
}

export function tickDay(state: GameState, seconds: number): GameState {
  if (seconds <= 0) return state

  const clock = state.clockSeconds + seconds

  if (state.phase === 'day') {
    if (clock < DAY_LENGTH_SECONDS) {
      return { ...state, clockSeconds: clock }
    }
    return { ...state, clockSeconds: clock - DAY_LENGTH_SECONDS, phase: 'night' }
  }

  if (clock < NIGHT_LENGTH_SECONDS) {
    return { ...state, clockSeconds: clock }
  }

  const nextDay = state.day + 1
  return {
    ...state,
    day: nextDay,
    phase: 'day',
    clockSeconds: clock - NIGHT_LENGTH_SECONDS,
    nodes: buildDriftwoodDayScenario(nextDay),
  }
}

export function canCollect(state: GameState, nodeId: string): { ok: boolean; reason?: string } {
  const node = state.nodes.find((candidate) => candidate.id === nodeId)
  if (!node) {
    return { ok: false, reason: `Unknown node: ${nodeId}` }
  }
  if (node.collected) {
    return { ok: false, reason: `Node already collected: ${nodeId}` }
  }
  return { ok: true }
}

export function collectNode(state: GameState, nodeId: string): GameState {
  const check = canCollect(state, nodeId)
  if (!check.ok) {
    throw new Error(check.reason)
  }

  const node = state.nodes.find((candidate) => candidate.id === nodeId) as (typeof state.nodes)[number]

  return {
    ...state,
    resources: {
      ...state.resources,
      wood: state.resources.wood + node.quantity,
    },
    nodes: state.nodes.map((candidate) =>
      candidate.id === nodeId ? { ...candidate, collected: true } : candidate,
    ),
  }
}

export function dayComplete(state: GameState, day: number): boolean {
  const objective = DAY_OBJECTIVE[day]
  if (!objective) {
    throw new Error(`No objective for day ${day}`)
  }

  const dayNodes = state.nodes.filter(
    (node) => node.kind === 'driftwood' && node.id.startsWith(`day${day}-`) && node.collected,
  )

  return dayNodes.length >= objective.driftwood
}
