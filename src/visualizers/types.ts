/** One heap object in a diagram, e.g. a list, an int or a function. */
export interface Obj {
  id: string
  label: string
  /** Small type tag shown on the object: "list", "int", "function". */
  type: string
  /** `dim`: nothing refers to it any more. `changed`: just mutated. */
  state?: 'dim' | 'changed'
}

export interface Var {
  name: string
  /** Id of the object this name points at. Omit for `declared` names. */
  to?: string
  /** `declared`: a `global x` / `nonlocal x` statement. The name belongs to another scope, so no arrow. */
  kind?: 'declared'
  note?: string
}

export interface Scope {
  name: string
  vars: Var[]
  /** The scope whose code is currently running. */
  active?: boolean
}

export interface Frame {
  /** 1-based line of the scenario code being executed; 0 for none. */
  line: number
  note: string
  scopes: Scope[]
  objects: Obj[]
  /** Everything printed so far. */
  out: string[]
}

export interface Scenario {
  id: string
  family: 'pass-by-reference' | 'scope-legb' | 'name-binding'
  title: string
  code: string
  /** Exact stdout of `code`, verified against CPython by validate-content. */
  expectedOutput: string
  frames: Frame[]
}

/** How a chip in a trace track is drawn. Each tone also has a text prefix so colour is never the only cue. */
export type Tone = 'idle' | 'active' | 'done' | 'skipped' | 'found' | 'error'

export interface Chip {
  text: string
  tone?: Tone
}

/** A labelled row of chips: a bucket, a search-path entry, an `except` clause, a generator's state. */
export interface Track {
  title: string
  chips: Chip[]
}

export interface TraceFrame {
  /** 1-based line of the scenario code being executed; 0 for none. */
  line: number
  note: string
  tracks: Track[]
  out: string[]
}

export type TraceFamily = 'generator-stepper' | 'short-circuit' | 'hash-table' | 'import-resolution' | 'exception-flow' | 'mro'

/** A step-through whose state is a few rows of chips rather than a names-and-objects diagram. */
export interface TraceScenario {
  id: string
  family: TraceFamily
  title: string
  code: string
  /** Exact stdout of `code`, verified against CPython by validate-content. */
  expectedOutput: string
  frames: TraceFrame[]
}
