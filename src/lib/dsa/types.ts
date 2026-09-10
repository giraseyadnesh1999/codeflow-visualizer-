import type { Rng } from './rng'

export type Topic = 'array' | 'string'
export type Difficulty = 'Easy' | 'Medium' | 'Hard'

/** `small` inputs are shown as examples and stay short enough to visualize. */
export type Size = 'small' | 'large'

export interface Problem {
  id: string
  topic: Topic
  title: string
  difficulty: Difficulty
  /** The technique the problem teaches, e.g. "Two Pointers". */
  pattern: string
  /** Name of the function the learner implements. */
  fn: string
  params: string[]
  /** Paragraphs separated by blank lines; `backticks` render as code. */
  statement: string
  constraints: string[]
  hints: string[]
  /**
   * Reference solution as source text. It is shown to the learner, sent to the
   * visualizer, and compiled to compute every expected output — so the
   * examples can never disagree with the answer key.
   */
  solution: string
  explanation: string
  complexity: { time: string; space: string }
  /** Returns the argument list for one test case. */
  generate: (rng: Rng, size: Size) => unknown[]
  /** Fixed tricky inputs appended to the hidden tests. */
  edgeCases?: unknown[][]
}

export interface TestCase {
  args: unknown[]
  expected: unknown
}

export interface Challenge {
  problem: Problem
  /** Date the challenge belongs to, or `bonus-<seed>` for extra practice. */
  key: string
  bonus: boolean
  /** Visible worked examples. */
  examples: TestCase[]
  /** Everything "Submit" runs: the examples, edge cases, then hidden tests. */
  tests: TestCase[]
}
