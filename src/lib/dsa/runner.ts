/** Main-thread side of the test runner: spawns the worker and grades results. */

import { deepEqual } from './format'
import type { TestCase } from './types'

export type CaseStatus = 'pass' | 'fail' | 'error' | 'timeout' | 'skipped'

export interface CaseResult {
  index: number
  status: CaseStatus
  actual?: unknown
  actualText?: string
  error?: string
  ms?: number
  logs: { kind: string; text: string }[]
}

export interface RunResult {
  compileError?: string
  cases: CaseResult[]
  passed: number
  total: number
  elapsed: number
}

/** Whole-run time budget. Real solutions finish in milliseconds. */
const TIME_LIMIT_MS = 3000

export function runTests(code: string, fn: string, cases: TestCase[]): Promise<RunResult> {
  return new Promise((resolve) => {
    const started = performance.now()
    const results: (CaseResult | undefined)[] = new Array(cases.length).fill(undefined)
    const worker = new Worker('/dsa-worker.js')
    let settled = false

    const finish = (compileError?: string) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      worker.terminate()

      const firstMissing = results.findIndex((r) => r === undefined)
      const full = results.map(
        (r, i): CaseResult =>
          r ?? {
            index: i,
            status: compileError ? 'skipped' : i === firstMissing ? 'timeout' : 'skipped',
            error: compileError ? undefined : i === firstMissing ? `Time limit exceeded (${TIME_LIMIT_MS / 1000}s) — is there an infinite loop?` : undefined,
            logs: [],
          },
      )
      resolve({
        compileError,
        cases: full,
        passed: full.filter((r) => r.status === 'pass').length,
        total: cases.length,
        elapsed: performance.now() - started,
      })
    }

    const timer = window.setTimeout(() => finish(), TIME_LIMIT_MS)

    worker.onmessage = (event: MessageEvent) => {
      const msg = event.data
      if (msg.type === 'compile-error') {
        finish(msg.message)
      } else if (msg.type === 'case') {
        const expected = cases[msg.index].expected
        results[msg.index] = {
          index: msg.index,
          status: !msg.ok ? 'error' : msg.actualText === undefined && deepEqual(msg.actual, expected) ? 'pass' : 'fail',
          actual: msg.actual,
          actualText: msg.actualText,
          error: msg.error,
          ms: msg.ms,
          logs: msg.logs ?? [],
        }
      } else if (msg.type === 'done') {
        finish()
      }
    }

    worker.onerror = (event) => {
      event.preventDefault()
      finish(event.message || 'The test runner crashed.')
    }

    worker.postMessage({ code, fn, cases: cases.map((c) => c.args) })
  })
}
