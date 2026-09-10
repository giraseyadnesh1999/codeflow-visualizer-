/** Value formatting and comparison shared by the practice UI and the test runner. */

const PLAIN_KEY = /^[A-Za-z_$][A-Za-z0-9_$]*$/

/**
 * Formats a value as a JavaScript literal: `[1, 2]`, `"abc"`, `{ a: 1 }`.
 * The output is valid source, so it doubles as the argument list we paste
 * into the visualizer.
 */
export function formatValue(value: unknown, depth = 0): string {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number') return Object.is(value, -0) ? '0' : String(value)
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'function') return '[Function]'
  if (depth > 6) return '…'
  if (Array.isArray(value)) return `[${value.map((v) => formatValue(v, depth + 1)).join(', ')}]`
  if (value instanceof Map) return `new Map(${formatValue([...value.entries()], depth + 1)})`
  if (value instanceof Set) return `new Set(${formatValue([...value], depth + 1)})`
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return '{}'
    const body = entries
      .map(([k, v]) => `${PLAIN_KEY.test(k) ? k : JSON.stringify(k)}: ${formatValue(v, depth + 1)}`)
      .join(', ')
    return `{ ${body} }`
  }
  return String(value)
}

/** Structural equality. Object key order is ignored; array order is not. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a === 'number' && typeof b === 'number') return Number.isNaN(a) && Number.isNaN(b)
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false

  if (Array.isArray(a)) {
    const other = b as unknown[]
    return a.length === other.length && a.every((v, i) => deepEqual(v, other[i]))
  }

  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual((a as never)[k], (b as never)[k]))
}

export function clone<T>(value: T): T {
  return structuredClone(value)
}
