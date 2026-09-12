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
  readonly kind: 'campfire' | 'raft-platform' | 'water-collector'
  readonly x: number
  readonly y: number
  readonly level: number
}

export interface Actor {
  readonly x: number
  readonly y: number
  readonly mode: 'idle' | 'moving' | 'working'
  readonly targetId?: string
}

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
  readonly nodes: readonly ResourceNode[]
  readonly structures: readonly Structure[]
  readonly completedObjectives: readonly string[]
}
