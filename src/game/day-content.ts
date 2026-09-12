import type { ResourceNode } from './types'
import { getDriftwoodSpawnPoint } from './driftwood'
import { clampToSand, isWalkable } from './world'

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

function buildDriftwoodQueue(day: number, count: number): ResourceNode[] {
  return Array.from({ length: count }, (_, index) => {
    const raw = getDriftwoodSpawnPoint(index)
    const point = clampToSand(raw.x, raw.y)
    if (!isWalkable(point.x, point.y)) {
      throw new Error(`Driftwood spawn ${index} is not walkable`)
    }
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
