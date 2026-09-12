import { getBlueprint } from './buildings'

/** Food gained per fishing trip. */
export const FISH_YIELD = 2

/** Dig trips needed to expand the island by one land level. */
export const DIGS_PER_EXPANSION = 4

/** Sand ellipse growth (px) per land level — must stay in sync with art regeneration. */
export const LAND_STEP = 12

/** Population capacity model. */
export const POP_CAPACITY = {
  BASE: 1,
  PER_HUT: 2,
} as const

/** Nights survived without food trigger a warning; starving blocks work the next day. */
export const FOOD_WARNING = 1

export function hutWoodCost(): number {
  return getBlueprint('hut').costs.reduce((total, cost) => total + cost.wood, 0)
}

export function populationCapacity(hutCount: number): number {
  return POP_CAPACITY.BASE + hutCount * POP_CAPACITY.PER_HUT
}
