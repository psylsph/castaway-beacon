import { describe, expect, it } from 'vitest'
import {
  canCollect,
  collectNode,
  createSession,
  dayComplete,
  DAY_LENGTH_SECONDS,
  TICKS_PER_SECOND,
  tickDay,
} from './day-cycle'
import { createInitialState } from './simulation'

describe('day cycle', () => {
  it('advances the clock and flips to night after the day length', () => {
    let state = createInitialState()

    expect(DAY_LENGTH_SECONDS).toBe(120)
    expect(TICKS_PER_SECOND).toBe(1)

    state = tickDay(state, DAY_LENGTH_SECONDS - 1)
    expect(state.phase).toBe('day')

    state = tickDay(state, 1)
    expect(state.phase).toBe('night')
  })

  it('rolls into the next day once night maintenance elapses', () => {
    let state = createInitialState()

    state = tickDay(state, DAY_LENGTH_SECONDS)
    expect(state.day).toBe(1)
    expect(state.phase).toBe('night')

    state = tickDay(state, 30)
    expect(state.day).toBe(2)
    expect(state.phase).toBe('day')
    expect(state.nodes.every((node) => node.id.startsWith('day2-'))).toBe(true)
  })

  it('only completes the day once the driftwood objective is met', () => {
    let state = createSession(createInitialState())

    // collect all 6 day-1 driftwood nodes
    for (const node of state.nodes) {
      const check = canCollect(state, node.id)
      expect(check.ok).toBe(true)
      state = collectNode(state, node.id)
    }

    expect(dayComplete(state, 1)).toBe(true)

    state = tickDay(state, DAY_LENGTH_SECONDS)
    state = tickDay(state, 30)
    expect(state.day).toBe(2)
    expect(state.nodes.some((node) => node.collected)).toBe(false)
  })

  it('cannot collect the same node twice', () => {
    let state = createSession(createInitialState())
    const nodeId = state.nodes[0]?.id as string

    state = collectNode(state, nodeId)

    expect(canCollect(state, nodeId).ok).toBe(false)
    expect(() => collectNode(state, nodeId)).toThrow(/already collected/)
  })
})
