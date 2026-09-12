import { describe, expect, it } from 'vitest'
import { FISH_YIELD, DIGS_PER_EXPANSION, LAND_STEP, POP_CAPACITY } from './survival'
import { getBlueprint } from './buildings'

describe('survival economy constants', () => {
  it('fishing yields food', () => {
    expect(FISH_YIELD).toBeGreaterThanOrEqual(1)
  })

  it('digging expands the island every few trips', () => {
    expect(DIGS_PER_EXPANSION).toBeGreaterThanOrEqual(3)
    expect(DIGS_PER_EXPANSION).toBeLessThanOrEqual(6)
    expect(LAND_STEP).toBeGreaterThan(0)
  })

  it('huts raise population capacity', () => {
    expect(POP_CAPACITY.BASE).toBe(1)
    expect(POP_CAPACITY.PER_HUT).toBeGreaterThanOrEqual(2)
  })

  it('hut blueprint costs wood', () => {
    const hut = getBlueprint('hut')
    expect(hut.costs[0]?.wood).toBeGreaterThanOrEqual(8)
    expect(hut.perDayLimit).toBeGreaterThanOrEqual(1)
  })
})
