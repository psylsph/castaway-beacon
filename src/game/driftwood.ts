export interface DriftwoodPoint {
  readonly x: number
  readonly y: number
}

/** Shoreline points around the sandbar — the tide line where logs wash up.
 *  Ring order, near the sand edge but inside the walkable ellipse. */
const DRIFTWOOD_ROUTE: readonly DriftwoodPoint[] = [
  { x: 346, y: 356 },
  { x: 315, y: 390 },
  { x: 240, y: 405 },
  { x: 165, y: 390 },
  { x: 134, y: 356 },
  { x: 165, y: 322 },
  { x: 240, y: 307 },
  { x: 315, y: 322 },
]

export const DRIFTWOOD_ROUTE_LENGTH = DRIFTWOOD_ROUTE.length

export function getDriftwoodSpawnPoint(index: number): DriftwoodPoint {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error('Driftwood route index must be a non-negative integer')
  }

  return DRIFTWOOD_ROUTE[index % DRIFTWOOD_ROUTE_LENGTH]
}
