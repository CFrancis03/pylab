import type { Scenario, TraceScenario } from './types'
import { SCENARIOS } from './scenarios'
import { TRACES } from './traces'

/** Every visualizer name the content schema allows is now implemented. */
export const IMPLEMENTED: Record<string, true> = {
  'pass-by-reference': true,
  'scope-legb': true,
  'name-binding': true,
  slicing: true,
  'hash-table': true,
  'generator-stepper': true,
  'short-circuit': true,
  'import-resolution': true,
  mro: true,
  'exception-flow': true,
}

/** Visualizers that are interactive explorers rather than step-throughs of fixed scenarios. */
export const EXPLORERS: Record<string, true> = { slicing: true }

export type AnyScenario = Scenario | TraceScenario

export const findScenario = (id: string): AnyScenario | undefined => SCENARIOS[id] ?? TRACES[id]
