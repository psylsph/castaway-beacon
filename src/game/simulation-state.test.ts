import { describe, expect, it } from 'vitest'
import { createInitialState } from './simulation'

describe('vertical slice state contract', () => {
  it('starts at schema version 1 on day 1 with an idle actor', () => {
    const state = createInitialState()

    expect(state.schemaVersion).toBe(1)
    expect(state.day).toBe(1)
    expect(state.phase).toBe('day')
    expect(state.actor).toEqual({ x: 248, y: 380, mode: 'idle' })
    expect(state.completedObjectives).toEqual([])
  })

  it('contains exactly one initial structure and no collected nodes', () => {
    const state = createInitialState()

    expect(state.structures).toHaveLength(1)
    expect(state.structures[0]).toMatchObject({ kind: 'campfire', level: 1 })
    expect(state.nodes.filter((node) => node.collected)).toHaveLength(0)
  })

  it('is JSON serializable', () => {
    const state = createInitialState()

    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
  })
})
