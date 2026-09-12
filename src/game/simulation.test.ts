import { describe, expect, it } from 'vitest'
import { buildPlatform, collectDriftwood, createInitialState } from './simulation'

describe('castaway progression', () => {
  it('turns collected driftwood into a new raft platform', () => {
    const initial = createInitialState()
    const supplied = collectDriftwood(initial, 5)
    const expanded = buildPlatform(supplied)

    expect(expanded.resources.wood).toBe(0)
    expect(expanded.platforms).toBe(2)
    expect(initial).toEqual({ day: 1, population: 1, platforms: 1, resources: { wood: 0 } })
  })

  it('refuses construction when there is not enough wood', () => {
    expect(() => buildPlatform(createInitialState())).toThrow('5 wood required')
  })
})
