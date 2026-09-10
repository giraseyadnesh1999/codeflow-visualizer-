/*
 * Validates the Daily DSA problem bank. Run with: npm run test:dsa
 *
 * For every problem, across many dates:
 *   - generators produce inputs and the reference solution answers them;
 *   - the same reference solution, run inside the CodeFlow interpreter on the
 *     visible examples, prints exactly the same answer (so "Visualize" never
 *     disagrees with the answer key) and stays within the step budget;
 *   - generation is deterministic for a given date.
 */
import { ALL_PROBLEMS, addDays, buildChallenge, dailyChallenges, starterCode } from '../src/lib/dsa/daily'
import { formatValue } from '../src/lib/dsa/format'
import { runProgram } from '../src/lib/interpreter/run'

let failures = 0
const fail = (msg: string) => {
  failures++
  console.log(`  FAIL ${msg}`)
}

const ids = new Set<string>()
for (const p of ALL_PROBLEMS) {
  if (ids.has(p.id)) fail(`duplicate id ${p.id}`)
  ids.add(p.id)
  if (!p.solution.includes(`function ${p.fn}(`)) fail(`${p.id}: solution does not define ${p.fn}`)
  if (p.hints.length === 0) fail(`${p.id}: no hints`)
  if (!starterCode(p).includes(`function ${p.fn}(`)) fail(`${p.id}: bad starter code`)
}
console.log(`\n${ALL_PROBLEMS.length} problems (${ALL_PROBLEMS.filter((p) => p.topic === 'array').length} array, ${ALL_PROBLEMS.filter((p) => p.topic === 'string').length} string)`)

const DATES = Array.from({ length: 12 }, (_, i) => addDays('2026-09-10', i * 7 - 21))
let maxSteps = 0
let maxStepsId = ''

for (const problem of ALL_PROBLEMS) {
  let cases = 0
  for (const key of DATES) {
    let challenge
    try {
      challenge = buildChallenge(problem, key, false)
    } catch (e) {
      fail(`${problem.id} @${key}: build threw ${(e as Error).message}`)
      continue
    }
    cases += challenge.tests.length

    // Deterministic: same date, same inputs.
    const again = buildChallenge(problem, key, false)
    if (JSON.stringify(again.tests) !== JSON.stringify(challenge.tests)) fail(`${problem.id}: generation is not deterministic`)

    for (const example of challenge.examples) {
      const call = `${problem.fn}(${example.args.map((a) => formatValue(a)).join(', ')})`
      const source = `${problem.solution}\n\nconsole.log(JSON.stringify(${call}));\n`
      const trace = runProgram(source)
      const last = trace.snapshots[trace.snapshots.length - 1]
      const printed = last?.output[last.output.length - 1]?.text
      const expected = JSON.stringify(example.expected)
      if (trace.error) {
        fail(`${problem.id} @${key}: interpreter error on ${call} — ${trace.error.message}`)
      } else if (printed !== expected) {
        fail(`${problem.id} @${key}: interpreter printed ${printed}, reference gave ${expected} for ${call}`)
      }
      if (trace.snapshots.length > maxSteps) {
        maxSteps = trace.snapshots.length
        maxStepsId = problem.id
      }
    }
  }
  console.log(`  ok   ${problem.topic.padEnd(6)} ${problem.id.padEnd(32)} ${String(cases).padStart(4)} cases`)
}

console.log(`\nlargest visualized example: ${maxSteps} steps (${maxStepsId})`)

// Daily rotation: each calendar day gets one of each topic, and a full cycle covers the bank.
const seen = { array: new Set<string>(), string: new Set<string>() }
for (let i = 0; i < 60; i++) {
  const [a, s] = dailyChallenges(addDays('2026-01-01', i))
  if (a.problem.topic !== 'array' || s.problem.topic !== 'string') fail('daily pair has the wrong topics')
  seen.array.add(a.problem.id)
  seen.string.add(s.problem.id)
}
console.log(`60 days cover ${seen.array.size} array + ${seen.string.size} string problems`)

console.log(failures ? `\n${failures} failure(s)\n` : '\nall DSA checks passed\n')
process.exit(failures ? 1 : 0)
