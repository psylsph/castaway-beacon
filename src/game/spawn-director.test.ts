import { describe, expect, it } from 'vitest'
import { createDayScenario, getActiveWindow, DAY_OBJECTIVE } from './spawn-director'

describe('spawn director', () => {
  it('day 1 exposes three active nodes from a six node queue', () => {
    const scenario = createDayScenario(1)

    expect(scenario.driftwoodQueue).toHaveLength(6)
    expect(scenario.maxActiveNodes).toBe(3)
    expect(getActiveWindow(scenario, 0)).toHaveLength(3)
  })

  it('advances the window as earlier nodes are collected', () => {
    const scenario = createDayScenario(1)

    expect(getActiveWindow(scenario, 3).map((node) => node.id)).toEqual([
      'day1-driftwood-4',
      'day1-driftwood-5',
      'day1-driftwood-6',
    ])
  })

  it('keeps the window inside the queue bounds', () => {
    const scenario = createDayScenario(1)

    expect(getActiveWindow(scenario, 6)).toHaveLength(0)
    expect(getActiveWindow(scenario, 99)).toHaveLength(0)
  })

  it('requires six driftwood collections to complete day 1', () => {
    expect(DAY_OBJECTIVE[1].driftwood).toBe(6)
    expect(DAY_OBJECTIVE[2].driftwood).toBe(8)
  })
})
