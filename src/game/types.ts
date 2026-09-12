export interface ResourceNode {
  readonly id: string
  readonly kind: 'driftwood' | 'water' | 'food'
  readonly x: number
  readonly y: number
  readonly quantity: number
  readonly collected: boolean
}

export interface Structure {
  readonly id: string
  readonly kind: 'campfire' | 'raft-platform' | 'water-collector' | 'raft-expansion' | 'hut'
  readonly x: number
  readonly y: number
  readonly level: number
  readonly builtOnDay?: number
}

export interface Actor {
  readonly x: number
  readonly y: number
  readonly mode: 'idle' | 'moving' | 'working'
  readonly targetId?: string
  readonly targetX?: number
  readonly targetY?: number
}

export type WorkActivity = 'none' | 'fishing' | 'digging'

export interface GameState {
  readonly schemaVersion: 1
  readonly day: number
  readonly phase: 'day' | 'night'
  readonly population: number
  readonly platforms: number
  readonly resources: {
    readonly wood: number
    readonly food: number
    readonly water: number
  }
  readonly actor: Actor
  readonly clockSeconds: number
  readonly workActivity: WorkActivity
  readonly nodes: readonly ResourceNode[]
  readonly structures: readonly Structure[]
  readonly completedObjectives: readonly string[]
  /** Dig trips completed toward the next island expansion (expands every DIGS_PER_EXPANSION). */
  readonly digProgress: number
  /** Times the island has been expanded — grows the walkable/shoreline ring. */
  readonly landLevel: number
  /** Days whose story beat has already been shown. */
  readonly storiesSeen: readonly string[]
  /** Population arrivals already processed (by index). */
  readonly arrivalsDone: readonly number[]
}
