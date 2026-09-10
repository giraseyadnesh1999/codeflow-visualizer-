/**
 * Picks the daily challenges and builds their test cases.
 *
 * Everything is derived from the date: the problem order is a fixed seeded
 * shuffle of each bank, and example inputs are seeded by date + problem. When
 * a problem comes around again weeks later, it comes with brand-new inputs.
 */

import { ARRAY_PROBLEMS } from './problems/array'
import { STRING_PROBLEMS } from './problems/string'
import { Rng, hashString } from './rng'
import { clone } from './format'
import type { Challenge, Problem, TestCase, Topic } from './types'

export const ALL_PROBLEMS: Problem[] = [...ARRAY_PROBLEMS, ...STRING_PROBLEMS]

const EXAMPLE_COUNT = 2
const HIDDEN_COUNT = 6

/* ---- dates --------------------------------------------------------- */

/** Local calendar date as `YYYY-MM-DD` (the day changes at local midnight). */
export function dateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, delta: number): string {
  const date = parseKey(key)
  date.setDate(date.getDate() + delta)
  return dateKey(date)
}

/** Whole days since 1970-01-01 for a calendar date, independent of timezone. */
export function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

export function formatDate(key: string, style: 'long' | 'short' = 'long'): string {
  return parseKey(key).toLocaleDateString(undefined, style === 'long'
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    : { day: 'numeric', month: 'short' })
}

/* ---- selection ----------------------------------------------------- */

const ORDER = new Map<Topic, Problem[]>()

/** A fixed, seeded rotation per topic so consecutive days feel varied. */
function rotation(topic: Topic): Problem[] {
  let order = ORDER.get(topic)
  if (!order) {
    const bank = topic === 'array' ? ARRAY_PROBLEMS : STRING_PROBLEMS
    order = new Rng(hashString(`codeflow-dsa-rotation-${topic}`)).shuffle(bank)
    ORDER.set(topic, order)
  }
  return order
}

export function problemForDay(key: string, topic: Topic): Problem {
  const order = rotation(topic)
  const n = dayNumber(key)
  return order[((n % order.length) + order.length) % order.length]
}

/** Today's pair: one array problem and one string problem. */
export function dailyChallenges(key: string): Challenge[] {
  return [buildChallenge(problemForDay(key, 'array'), key, false), buildChallenge(problemForDay(key, 'string'), key, false)]
}

/** An on-demand extra problem with fresh inputs, for practising beyond the daily pair. */
export function bonusChallenge(seed: number, avoid: string[] = []): Challenge {
  const pool = ALL_PROBLEMS.filter((p) => !avoid.includes(p.id))
  const problem = new Rng(seed).pick(pool.length ? pool : ALL_PROBLEMS)
  return buildChallenge(problem, `bonus-${seed}`, true)
}

/** Rebuilds a bonus challenge saved earlier (same seed + problem = same inputs). */
export function restoreBonus(seed: number, problemId: string): Challenge | null {
  const problem = ALL_PROBLEMS.find((p) => p.id === problemId)
  return problem ? buildChallenge(problem, `bonus-${seed}`, true) : null
}

export function buildChallenge(problem: Problem, key: string, bonus: boolean): Challenge {
  const rng = new Rng(hashString(`${key}|${problem.id}`))
  const solve = compileSolution(problem)
  const makeCase = (args: unknown[]): TestCase => ({ args, expected: solve(...clone(args)) })

  const examples = Array.from({ length: EXAMPLE_COUNT }, () => makeCase(problem.generate(rng, 'small')))
  const edges = (problem.edgeCases ?? []).map((args) => makeCase(clone(args)))
  const hidden = Array.from({ length: HIDDEN_COUNT }, (_, i) => makeCase(problem.generate(rng, i < 2 ? 'small' : 'large')))

  return { problem, key, bonus, examples, tests: [...examples, ...edges, ...hidden] }
}

/* ---- reference solutions ------------------------------------------ */

type Solver = (...args: unknown[]) => unknown
const COMPILED = new Map<string, Solver>()

export function compileSolution(problem: Problem): Solver {
  let solver = COMPILED.get(problem.id)
  if (!solver) {
    solver = new Function(`${problem.solution}\nreturn ${problem.fn};`)() as Solver
    COMPILED.set(problem.id, solver)
  }
  return solver
}

export function starterCode(problem: Problem): string {
  return `// ${problem.title}\n// Write your solution below. Keep the function name \`${problem.fn}\`.\n\nfunction ${problem.fn}(${problem.params.join(', ')}) {\n  \n}\n`
}
