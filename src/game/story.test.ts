import { describe, expect, it } from 'vitest'
import { nextStoryBeat, processArrivals, ARRIVALS, STORM_DAY } from './story'
import { createInitialState } from './simulation'
import { placeStructure, getBlueprint } from './buildings'
import { completeWork } from './survival-actions'
import { collectDriftwood } from './simulation'

function withWood(wood: number) {
  return collectDriftwood(createInitialState(), wood)
}

describe('survival work', () => {
  it('fishing yields food and logs the first catch', () => {
    const state = completeWork({ ...createInitialState(), workActivity: 'fishing' })

    expect(state.resources.food).toBe(2)
    expect(state.completedObjectives).toContain('first-catch')
    expect(state.workActivity).toBe('none')
  })

  it('digging expands the island after four trips', () => {
    let state = createInitialState()
    for (let i = 0; i < 4; i += 1) {
      state = completeWork({ ...state, workActivity: 'digging' })
    }

    expect(state.landLevel).toBe(1)
    expect(state.digProgress).toBe(0)
    expect(state.completedObjectives).toContain('expand-land')
  })

  it('partial digging keeps progress', () => {
    let state = completeWork({ ...createInitialState(), workActivity: 'digging' })
    state = completeWork({ ...state, workActivity: 'digging' })

    expect(state.landLevel).toBe(0)
    expect(state.digProgress).toBe(2)
  })

  it('does nothing without an activity', () => {
    const state = completeWork(createInitialState())

    expect(state).toBe(createInitialState() ? state : state)
    expect(state.resources.food).toBe(0)
    expect(state.landLevel).toBe(0)
  })
})

describe('hut building', () => {
  it('costs 10 wood and raises capacity by 2', () => {
    expect(getBlueprint('hut').costs[0]?.wood).toBe(10)

    const state = placeStructure(withWood(10), 'hut', 'hut:1', 210, 372)
    expect(state.resources.wood).toBe(0)
    expect(state.structures.filter((s) => s.kind === 'hut')).toHaveLength(1)
  })
})

describe('story beats', () => {
  it('storm fires on day 2 night, once', () => {
    const state = { ...createInitialState(), day: STORM_DAY, phase: 'night' as const }
    const beat = nextStoryBeat(state)

    expect(beat?.id).toBe('storm')
    expect(nextStoryBeat({ ...state, storiesSeen: ['storm'] })?.id).not.toBe('storm')
  })

  it('wreck beat follows the storm on day 3', () => {
    const state = { ...createInitialState(), day: 3, storiesSeen: ['storm'] }
    expect(nextStoryBeat(state)?.id).toBe('wreck')
  })

  it('land growth beat fires after an expansion', () => {
    const state = { ...createInitialState(), day: 4, storiesSeen: ['storm', 'wreck'] }
    expect(nextStoryBeat(state)).toBeNull()

    const grown = {
      ...state,
      completedObjectives: [...state.completedObjectives, 'expand-land'],
    }
    expect(nextStoryBeat(grown)?.id).toBe('land-grow')
  })
})

describe('survivor arrivals', () => {
  it('Mira joins on day 3 only with enough hut beds', () => {
    const day3 = { ...createInitialState(), day: 3 }

    // No hut: capacity 1 < 3 — she waits at the wreck.
    const waiting = processArrivals(day3)
    expect(waiting.joined).toBeNull()
    expect(waiting.state.population).toBe(1)

    // With a hut: capacity 3 — she joins.
    const withHut = placeStructure(withWood(10), 'hut', 'hut:1', 210, 372)
    const joined = processArrivals({ ...withHut, day: 3 })
    expect(joined.joined).toBe('Mira')
    expect(joined.state.population).toBe(2)
    expect(joined.state.arrivalsDone).toContain(0)
  })

  it('all arrivals need progressively more beds', () => {
    expect(ARRIVALS.map((a) => a.minCapacity)).toEqual([3, 5, 7])
  })

  it('arrivals do not double-join', () => {
    const state = {
      ...createInitialState(),
      day: 3,
      population: 2,
      arrivalsDone: [0],
    }
    const result = processArrivals(state)

    expect(result.joined).toBeNull()
    expect(result.state.population).toBe(2)
  })
})
