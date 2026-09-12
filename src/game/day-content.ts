import type { ResourceNode } from './types'
import { getDriftwoodSpawnPoint } from './driftwood'

export interface DayScenario {
  readonly day: number
  readonly driftwoodQueue: readonly ResourceNode[]
  readonly maxActiveNodes: number
}

const MAX_ACTIVE_NODES = 3

function buildDriftwoodQueue(day: number, count: number): ResourceNode[] {
  return Array.from({ length: count }, (_, index) => {
    const point = getDriftwoodSpawnPoint(index)
    return {
      id: `day${day}-driftwood-${index + 1}`,
      kind: 'driftwood' as const,
      x: point.x,
      y: point.y,
      quantity: 1,
      collected: false,
    }
  })
}

export function buildDriftwoodDayScenario(day: number): ResourceNode[] {
  if (!Number.isInteger(day) || day < 1) {
    throw new Error('Day must be a positive integer')
  }

  const driftwoodCount = day === 1 ? 6 : 8
  return buildDriftwoodQueue(day, driftwoodCount)
}

export function createDayScenario(day: number): DayScenario {
  return {
    day,
    driftwoodQueue: buildDriftwoodDayScenario(day),
    maxActiveNodes: MAX_ACTIVE_NODES,
  }
}
