/** Parses a program and pumps the evaluator into a scrubbable trace. */

import { parse } from 'acorn'
import { Interpreter, locOf, type StepInfo } from './evaluator'
import { Snapshotter, type Snapshot } from './snapshot'
import { StepLimitError, ThrowSignal, UnsupportedError, inspect } from './values'

export interface TraceError {
  kind: 'syntax' | 'runtime' | 'unsupported' | 'limit'
  message: string
  line: number
  column: number
}

export interface Trace {
  snapshots: Snapshot[]
  error: TraceError | null
  /** Wall-clock cost of building the trace, in ms. */
  elapsed: number
}

export const DEFAULT_STEP_LIMIT = 6000

export function runProgram(source: string, stepLimit = DEFAULT_STEP_LIMIT): Trace {
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const snapshots: Snapshot[] = []
  const snapshotter = new Snapshotter()

  let ast: ReturnType<typeof parse>
  try {
    ast = parse(source, { ecmaVersion: 2022, locations: true, sourceType: 'script', allowReturnOutsideFunction: true })
  } catch (e) {
    const err = e as Error & { loc?: { line: number; column: number } }
    return {
      snapshots: [],
      error: {
        kind: 'syntax',
        message: err.message.replace(/\s*\(\d+:\d+\)$/, ''),
        line: err.loc?.line ?? 1,
        column: err.loc?.column ?? 0,
      },
      elapsed: 0,
    }
  }

  const interpreter = new Interpreter(source, ast)
  const generator = interpreter.run()
  let error: TraceError | null = null

  try {
    for (;;) {
      const next = generator.next()
      if (next.done) break

      const step = next.value as StepInfo
      snapshots.push(
        snapshotter.capture(snapshots.length, step, interpreter.stack, interpreter.output, interpreter.stepIndex),
      )

      if (snapshots.length >= stepLimit) throw new StepLimitError(stepLimit)
    }
  } catch (e) {
    error = toTraceError(e)
    // Keep the failure visible on the timeline instead of dropping the run.
    const last = snapshots[snapshots.length - 1]
    snapshots.push(
      snapshotter.capture(
        snapshots.length,
        {
          loc: last ? { ...last.loc, line: error.line || last.loc.line } : { line: error.line, col: 0, endLine: error.line, endCol: 1 },
          kind: 'done',
          title: error.kind === 'limit' ? 'Stopped' : 'Uncaught error',
          desc: error.message,
        },
        interpreter.stack,
        interpreter.output,
        interpreter.stepIndex,
      ),
    )
  }

  const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started
  return { snapshots, error, elapsed }
}

function toTraceError(e: unknown): TraceError {
  if (e instanceof StepLimitError) {
    return { kind: 'limit', message: e.message, line: 0, column: 0 }
  }
  if (e instanceof UnsupportedError) {
    return { kind: 'unsupported', message: e.message, line: e.line, column: 0 }
  }
  if (e instanceof ThrowSignal) {
    return { kind: 'runtime', message: `Uncaught ${inspect(e.value, 1)}`, line: e.line, column: 0 }
  }
  const err = e as Error
  return { kind: 'runtime', message: err?.message ?? String(e), line: 0, column: 0 }
}

export { locOf }
export type { Snapshot }
