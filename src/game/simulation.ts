export interface GameState {
  readonly day: number
  readonly population: number
  readonly platforms: number
  readonly resources: {
    readonly wood: number
  }
}

const PLATFORM_WOOD_COST = 5

export function createInitialState(): GameState {
  return {
    day: 1,
    population: 1,
    platforms: 1,
    resources: { wood: 0 },
  }
}

export function collectDriftwood(state: GameState, amount: number): GameState {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error('Driftwood amount must be a non-negative integer')
  }

  return {
    ...state,
    resources: { wood: state.resources.wood + amount },
  }
}

export function buildPlatform(state: GameState): GameState {
  if (state.resources.wood < PLATFORM_WOOD_COST) {
    throw new Error(`${PLATFORM_WOOD_COST} wood required`)
  }

  return {
    ...state,
    platforms: state.platforms + 1,
    resources: { wood: state.resources.wood - PLATFORM_WOOD_COST },
  }
}
