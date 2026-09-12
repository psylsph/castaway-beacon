import type { ResourceNode } from './types'
import { buildDriftwoodDayScenario } from './day-content'

export interface DayScenario {
  readonly day: number
  readonly driftwoodQueue: readonly ResourceNode[]
  readonly maxActiveNodes: number
}

export const DAY_OBJECTIVE: Readonly<Record<number, { driftwood: number }>> = {
  1: { driftwood: 6 },
  2: { driftwood: 8 },
}

const MAX_ACTIVE_NODES = 3

export function createDayScenario(day: number): DayScenario {
  if (!Number.isInteger(day) || day < 1) {
    throw new Error('Day must be a positive integer')
  }

  return {
    day,
    driftwoodQueue: buildDriftwoodDayScenario(day),
    maxActiveNodes: MAX_ACTIVE_NODES,
  }
}

export function getActiveWindow(
  scenario: DayScenario,
  collectedCount: number,
): readonly ResourceNode[] {
  if (!Number.isInteger(collectedCount) || collectedCount < 0) {
    throw new Error('Collected count must be a non-negative integer')
  }

  return scenario.driftwoodQueue.slice(
    collectedCount,
    collectedCount + scenario.maxActiveNodes,
  )
}
