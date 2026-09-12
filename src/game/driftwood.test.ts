import { describe, expect, it } from 'vitest'
import { DRIFTWOOD_ROUTE_LENGTH, getDriftwoodSpawnPoint } from './driftwood'

describe('driftwood route', () => {
  it('uses a deterministic sequence of shoreline spawn points', () => {
    expect(getDriftwoodSpawnPoint(0)).toEqual({ x: 58, y: 198 })
    expect(getDriftwoodSpawnPoint(1)).toEqual({ x: 414, y: 238 })
    expect(getDriftwoodSpawnPoint(2)).toEqual({ x: 76, y: 514 })
    expect(getDriftwoodSpawnPoint(3)).toEqual({ x: 398, y: 534 })
  })

  it('cycles the route instead of generating arbitrary positions', () => {
    expect(getDriftwoodSpawnPoint(4)).toEqual(getDriftwoodSpawnPoint(0))
    expect(getDriftwoodSpawnPoint(9)).toEqual(getDriftwoodSpawnPoint(1))
  })

  it('exposes the designed route length', () => {
    expect(DRIFTWOOD_ROUTE_LENGTH).toBe(4)
  })

  it('rejects invalid route indexes', () => {
    expect(() => getDriftwoodSpawnPoint(-1)).toThrow('non-negative integer')
    expect(() => getDriftwoodSpawnPoint(1.5)).toThrow('non-negative integer')
  })
})
