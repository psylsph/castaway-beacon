import type { GameState, Structure } from './types'

export type BlueprintKind = 'raft-platform' | 'water-collector' | 'raft-expansion'

export interface BuildCost {
  readonly wood: number
}

export interface Blueprint {
  readonly kind: BlueprintKind
  readonly label: string
  readonly costs: readonly BuildCost[]
  readonly perDayLimit: number
}

export const BLUEPRINTS: Readonly<Record<BlueprintKind, Blueprint>> = {
  'raft-platform': {
    kind: 'raft-platform',
    label: 'Raft Platform',
    costs: [{ wood: 5 }],
    perDayLimit: 1,
  },
  'water-collector': {
    kind: 'water-collector',
    label: 'Water Collector',
    costs: [{ wood: 8 }],
    perDayLimit: 1,
  },
  'raft-expansion': {
    kind: 'raft-expansion',
    label: 'Raft Expansion',
    costs: [{ wood: 12 }],
    perDayLimit: 1,
  },
}

export function getBlueprint(kind: BlueprintKind): Blueprint {
  const blueprint = BLUEPRINTS[kind]
  if (!blueprint) {
    throw new Error(`Unknown blueprint: ${String(kind)}`)
  }
  return blueprint
}

export function getDayLimit(blueprint: Blueprint, day: number): number {
  return blueprint.perDayLimit + day - 1
}

export function getDayBuildCount(state: GameState, kind: BlueprintKind): number {
  return state.structures.filter(
    (structure) => structure.kind === kind && structure.builtOnDay === state.day,
  ).length
}

export interface BuildCheck {
  readonly ok: boolean
  readonly reason?: string
}

export function canBuild(state: GameState, kind: BlueprintKind): BuildCheck {
  let blueprint: Blueprint
  try {
    blueprint = getBlueprint(kind)
  } catch {
    return { ok: false, reason: `Unknown blueprint: ${String(kind)}` }
  }

  const duplicate = state.structures.some((structure) => structure.id.startsWith(`${kind}:`))
  void duplicate

  const woodCost = blueprint.costs.reduce((total, cost) => total + cost.wood, 0)
  if (state.resources.wood < woodCost) {
    return { ok: false, reason: `${woodCost} wood required` }
  }

  if (getDayBuildCount(state, kind) >= getDayLimit(blueprint, state.day)) {
    return { ok: false, reason: `Day ${state.day} build limit reached` }
  }

  return { ok: true }
}

export function placeStructure(
  state: GameState,
  kind: BlueprintKind,
  slotId: string,
  x: number,
  y: number,
): GameState {
  const blueprint = getBlueprint(kind)

  if (state.structures.some((structure) => structure.id === slotId)) {
    throw new Error(`Slot already occupied: ${slotId}`)
  }

  const check = canBuild(state, kind)
  if (!check.ok) {
    throw new Error(check.reason ?? 'Cannot build')
  }

  const woodCost = blueprint.costs.reduce((total, cost) => total + cost.wood, 0)
  const structure: Structure = {
    id: slotId,
    kind,
    x,
    y,
    level: 1,
    builtOnDay: state.day,
  }

  return {
    ...state,
    platforms: kind === 'raft-platform' ? state.platforms + 1 : state.platforms,
    resources: { ...state.resources, wood: state.resources.wood - woodCost },
    structures: [...state.structures, structure],
  }
}
