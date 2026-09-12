import { describe, expect, it } from 'vitest'
import {
  canBuild,
  getBlueprint,
  getDayBuildCount,
  placeStructure,
  type BlueprintKind,
} from './buildings'
import { createInitialState } from './simulation'
import { collectDriftwood } from './simulation'

describe('building blueprints', () => {
  it('costs 5 wood for the first raft platform', () => {
    expect(getBlueprint('raft-platform').costs[0]).toEqual({ wood: 5 })
  })

  it('caps day 1 construction at one platform', () => {
    const supplied = collectDriftwood(createInitialState(), 10)
    const first = placeStructure(supplied, 'raft-platform', 'platform-a', 150, 460)

    expect(first.structures).toHaveLength(2)
    expect(getDayBuildCount(first, 'raft-platform')).toBe(1)
    expect(() => placeStructure(first, 'raft-platform', 'platform-b', 210, 460)).toThrow(
      /build limit/,
    )
  })

  it('allows a second platform on day 2', () => {
    const supplied = collectDriftwood(createInitialState(), 20)
    const day2 = { ...supplied, day: 2 }
    const first = placeStructure(day2, 'raft-platform', 'platform-a', 150, 460)
    const second = placeStructure(first, 'raft-platform', 'platform-b', 210, 460)

    expect(getDayBuildCount(second, 'raft-platform')).toBe(2)
  })

  it('rejects duplicate slot ids', () => {
    const supplied = collectDriftwood(createInitialState(), 10)
    const first = placeStructure(supplied, 'raft-platform', 'platform-a', 150, 460)

    expect(() => placeStructure(first, 'raft-platform', 'platform-a', 210, 460)).toThrow(
      /already occupied/,
    )
  })

  it('leaves state unchanged when a build is refused', () => {
    const initial = createInitialState()

    expect(canBuild(initial, 'raft-platform').ok).toBe(false)
    expect(() => placeStructure(initial, 'raft-platform', 'platform-a', 150, 460)).toThrow(
      '5 wood required',
    )
    expect(initial.structures).toHaveLength(1)
  })

  it('rejects unknown blueprint kinds', () => {
    expect(() => getBlueprint('lighthouse' as BlueprintKind)).toThrow('Unknown blueprint')
  })
})
