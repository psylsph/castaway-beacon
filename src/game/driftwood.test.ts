import { describe, expect, it } from 'vitest'
import { DRIFTWOOD_ROUTE_LENGTH, getDriftwoodSpawnPoint } from './driftwood'
import { isWalkable } from './world'

describe('driftwood route', () => {
  it('uses a deterministic sequence of shoreline spawn points', () => {
    expect(getDriftwoodSpawnPoint(0)).toEqual({ x: 346, y: 356 })
    expect(getDriftwoodSpawnPoint(1)).toEqual({ x: 315, y: 390 })
  })

  it('cycles the route instead of generating arbitrary positions', () => {
    expect(getDriftwoodSpawnPoint(DRIFTWOOD_ROUTE_LENGTH)).toEqual(
      getDriftwoodSpawnPoint(0),
    )
  })

  it('exposes the designed route length', () => {
    expect(DRIFTWOOD_ROUTE_LENGTH).toBe(8)
  })

  it('keeps every spawn point on walkable sand', () => {
    for (let index = 0; index < DRIFTWOOD_ROUTE_LENGTH; index += 1) {
      const point = getDriftwoodSpawnPoint(index)
      expect(isWalkable(point.x, point.y)).toBe(true)
    }
  })
})
