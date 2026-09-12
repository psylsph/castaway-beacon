import type { GameState } from './types'
import { populationCapacity } from './survival'

export interface StoryBeat {
  readonly id: string
  /** Shown when this beat fires; one line of narrative. */
  readonly title: string
  readonly body: string
}

export interface ArrivalDef {
  readonly id: string
  readonly name: string
  /** Day the castaway washes ashore (after the storm/wreck beat). */
  readonly day: number
  /** Requires at least this much population capacity (i.e. huts built). */
  readonly minCapacity: number
}

/** Survivor arrivals — each needs a hut bed before they can join. */
export const ARRIVALS: readonly ArrivalDef[] = [
  { id: 'mira', name: 'Mira', day: 3, minCapacity: 3 },
  { id: 'joss', name: 'Joss', day: 5, minCapacity: 5 },
  { id: 'petra', name: 'Petra', day: 7, minCapacity: 7 },
]

/** Storm hits at the end of day 2; the wreck washes up on day 3 morning. */
export const STORM_DAY = 2

interface BeatDef {
  when: (state: GameState) => boolean
  beat: StoryBeat
}

const BEATS: readonly BeatDef[] = [
  {
    when: (s) => s.day >= 1 && s.structures.some((st) => st.kind === 'hut'),
    beat: {
      id: 'first-hut',
      title: 'A roof of your own',
      body: 'The hut stands against the wind. Tonight you will sleep dry — and the smoke will signal to anyone watching the horizon.',
    },
  },
  {
    when: (s) => s.day >= STORM_DAY && s.phase === 'night',
    beat: {
      id: 'storm',
      title: 'The storm',
      body: 'The sky splits open. Wind tears at the palms and the sea turns white. In the chaos, a shape slides past the breakers — a ship, breaking apart on the reef.',
    },
  },
  {
    when: (s) => s.day >= STORM_DAY + 1,
    beat: {
      id: 'wreck',
      title: 'Wreckage on the tide',
      body: 'Dawn reveals the shore littered with cargo: timber, rope, and a chest of tools. Whoever sailed that ship… someone may have survived.',
    },
  },
  {
    when: (s) =>
      s.day >= STORM_DAY + 1 &&
      s.completedObjectives.includes('expand-land'),
    beat: {
      id: 'land-grow',
      title: 'New ground',
      body: 'You have drained and filled the shallows — the sandbar is wider now. There is room here for more than one lonely fire.',
    },
  },
]

/**
 * Returns the beat to show for the current state, if any, marking it seen.
 * One beat per call; the caller stores seen ids in state.storiesSeen.
 */
export function nextStoryBeat(state: GameState): StoryBeat | null {
  for (const def of BEATS) {
    if (!state.storiesSeen.includes(def.beat.id) && def.when(state)) {
      return def.beat
    }
  }
  return null
}

/**
 * Process pending arrivals for the current day. A survivor joins only if
 * capacity allows; otherwise they wait at the wreck until a hut is free.
 */
export function processArrivals(state: GameState): {
  state: GameState
  joined: string | null
} {
  const hutCount = state.structures.filter((s) => s.kind === 'hut').length
  const capacity = populationCapacity(hutCount)

  for (const [index, arrival] of ARRIVALS.entries()) {
    if (state.arrivalsDone.includes(index)) continue
    if (state.day < arrival.day) continue

    if (capacity >= arrival.minCapacity) {
      return {
        state: {
          ...state,
          population: state.population + 1,
          arrivalsDone: [...state.arrivalsDone, index],
        },
        joined: arrival.name,
      }
    }

    // Not enough beds: they linger at the wreck — check again tomorrow.
    return { state, joined: null }
  }

  return { state, joined: null }
}
