export interface DriftwoodPoint {
  readonly x: number
  readonly y: number
}

const DRIFTWOOD_ROUTE: readonly DriftwoodPoint[] = [
  { x: 58, y: 198 },
  { x: 414, y: 238 },
  { x: 76, y: 514 },
  { x: 398, y: 534 },
]

export const DRIFTWOOD_ROUTE_LENGTH = DRIFTWOOD_ROUTE.length

export function getDriftwoodSpawnPoint(index: number): DriftwoodPoint {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error('Driftwood route index must be a non-negative integer')
  }

  return DRIFTWOOD_ROUTE[index % DRIFTWOOD_ROUTE.length]
}
