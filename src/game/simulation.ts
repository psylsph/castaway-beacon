import type { GameState, ResourceNode, Structure } from './types'
import { buildDriftwoodDayScenario } from './day-content'

const SCHEMA_VERSION = 1 as const

const ACTOR_START = { x: 248, y: 380 } as const

const INITIAL_STRUCTURES: readonly Structure[] = [
  { id: 'campfire-main', kind: 'campfire', x: 248, y: 370, level: 1 },
]

function driftwoodNodesForDay(day: number): ResourceNode[] {
  return buildDriftwoodDayScenario(day)
}

export function createInitialState(): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    day: 1,
    phase: 'day',
    population: 1,
    platforms: 1,
    resources: { wood: 0, food: 0, water: 0 },
    actor: { ...ACTOR_START, mode: 'idle' },
    nodes: driftwoodNodesForDay(1),
    structures: INITIAL_STRUCTURES,
    completedObjectives: [],
  }
}

export function collectDriftwood(state: GameState, amount: number): GameState {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error('Driftwood amount must be a non-negative integer')
  }

  return {
    ...state,
    resources: { ...state.resources, wood: state.resources.wood + amount },
  }
}

export function buildPlatform(state: GameState): GameState {
  const PLATFORM_WOOD_COST = 5

  if (state.resources.wood < PLATFORM_WOOD_COST) {
    throw new Error(`${PLATFORM_WOOD_COST} wood required`)
  }

  return {
    ...state,
    platforms: state.platforms + 1,
    resources: { ...state.resources, wood: state.resources.wood - PLATFORM_WOOD_COST },
  }
}

export type { GameState } from './types'
