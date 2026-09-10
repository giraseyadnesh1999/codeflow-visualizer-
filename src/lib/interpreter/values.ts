/**
 * Runtime value representations for the CodeFlow interpreter.
 *
 * Primitives, arrays and plain objects are represented as their real JS
 * counterparts so that native interop stays cheap. Only the things JS cannot
 * represent for us — user functions with a captured scope, classes, and
 * control-flow signals — get dedicated wrapper types.
 */

import type { Scope } from './scope'

export type AnyNode = any

/** A function declared inside the visualized program. */
export class InterpFunction {
  constructor(
    public node: AnyNode,
    public closure: Scope,
    public name: string,
    public isArrow: boolean,
    /** `this` captured lexically at creation time (arrows only). */
    public boundThis?: unknown,
    /** Set for methods so `super.x` can resolve. */
    public homeObject?: Record<string, unknown> | null,
  ) {}
}

/** A builtin implemented in host JavaScript. */
export class NativeFunction {
  constructor(
    public name: string,
    public fn: (args: unknown[], thisVal: unknown) => unknown,
    /**
     * When true, `fn` is a generator that may `yield*` into the evaluator —
     * required for builtins that call back into user code (map, filter, ...).
     */
    public isGenerator = false,
  ) {}
}

/** A class declared inside the visualized program. */
export class InterpClass {
  constructor(
    public name: string,
    public ctor: InterpFunction | null,
    public proto: Record<string, unknown>,
    public superClass: InterpClass | null,
    public staticProps: Record<string, unknown>,
    public fields: { name: string; value: AnyNode | null }[],
    public closure: Scope,
    public node: AnyNode,
  ) {}
}

export type Callable = InterpFunction | NativeFunction | InterpClass

export function isCallable(v: unknown): v is Callable {
  return v instanceof InterpFunction || v instanceof NativeFunction || v instanceof InterpClass
}

/* ------------------------------------------------------------------ */
/* Control-flow signals — thrown so they unwind generators naturally.  */
/* ------------------------------------------------------------------ */

export class ReturnSignal {
  constructor(public value: unknown) {}
}
export class BreakSignal {
  constructor(public label: string | null = null) {}
}
export class ContinueSignal {
  constructor(public label: string | null = null) {}
}

/** An error thrown *by the visualized program* (`throw`, or a runtime fault). */
export class ThrowSignal {
  constructor(
    public value: unknown,
    public line = 0,
  ) {}
}

/** The program tried to do something the interpreter does not implement. */
export class UnsupportedError extends Error {
  constructor(
    message: string,
    public line = 0,
  ) {
    super(message)
    this.name = 'UnsupportedError'
  }
}

/** Execution exceeded the configured step budget (usually an infinite loop). */
export class StepLimitError extends Error {
  constructor(public limit: number) {
    super(`Execution stopped after ${limit} steps — this usually means an infinite loop.`)
    this.name = 'StepLimitError'
  }
}

/** An interpreter-level `Error` object, shaped like the real thing. */
export function makeError(name: string, message: string): Record<string, unknown> {
  return { name, message, __isError: true }
}

export function isErrorObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && (v as Record<string, unknown>).__isError === true
}

/* ------------------------------------------------------------------ */
/* Stringification                                                     */
/* ------------------------------------------------------------------ */

/** `String(v)` semantics — what template literals and `+` produce. */
export function toStringValue(v: unknown): string {
  if (v === null) return 'null'
  if (v === undefined) return 'undefined'
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (v instanceof InterpFunction) return `function ${v.name}() { ... }`
  if (v instanceof NativeFunction) return `function ${v.name}() { [native code] }`
  if (v instanceof InterpClass) return `class ${v.name} { ... }`
  if (Array.isArray(v)) return v.map((x) => (x === null || x === undefined ? '' : toStringValue(x))).join(',')
  if (isErrorObject(v)) return `${v.name}: ${v.message}`
  if (v instanceof Map) return '[object Map]'
  if (v instanceof Set) return '[object Set]'
  if (v instanceof RegExp) return String(v)
  return '[object Object]'
}

/** Console-style formatting — what shows up in the output panel. */
export function inspect(v: unknown, depth = 0, seen = new Set<unknown>()): string {
  if (v === null) return 'null'
  if (v === undefined) return 'undefined'
  if (typeof v === 'string') return depth === 0 ? v : `'${v}'`
  if (typeof v === 'number') return Object.is(v, -0) ? '-0' : String(v)
  if (typeof v === 'boolean') return String(v)
  if (v instanceof InterpFunction) return `ƒ ${v.name || '(anonymous)'}()`
  if (v instanceof NativeFunction) return `ƒ ${v.name}()`
  if (v instanceof InterpClass) return `class ${v.name}`
  if (typeof v === 'object') {
    if (seen.has(v)) return '[Circular]'
    if (depth > 3) return Array.isArray(v) ? '[...]' : '{...}'
    seen.add(v)
    try {
      if (Array.isArray(v)) {
        return `[${v.map((x) => inspect(x, depth + 1, seen)).join(', ')}]`
      }
      if (v instanceof Map) {
        const body = Array.from(v.entries(), ([k, val]) => `${inspect(k, depth + 1, seen)} => ${inspect(val, depth + 1, seen)}`)
        return `Map(${v.size}) {${body.length ? ` ${body.join(', ')} ` : ''}}`
      }
      if (v instanceof Set) {
        const body = Array.from(v, (val) => inspect(val, depth + 1, seen))
        return `Set(${v.size}) {${body.length ? ` ${body.join(', ')} ` : ''}}`
      }
      if (v instanceof RegExp) return String(v)
      if (isErrorObject(v)) return `${v.name}: ${v.message}`
      const obj = v as Record<string, unknown>
      const keys = Object.keys(obj)
      const body = keys
        .slice(0, 12)
        .map((k) => `${isPlainKey(k) ? k : `'${k}'`}: ${inspect(obj[k], depth + 1, seen)}`)
        .join(', ')
      const more = keys.length > 12 ? `, …${keys.length - 12} more` : ''
      const tag = className(obj)
      return `${tag ? tag + ' ' : ''}{${body ? ` ${body}${more} ` : ''}}`
    } finally {
      seen.delete(v)
    }
  }
  return String(v)
}

export function isPlainKey(k: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k)
}

/** The constructor name for an instance created with `new`. */
export function className(obj: object): string {
  const proto = Object.getPrototypeOf(obj)
  const ctor = proto && (proto as Record<string, unknown>).constructor
  if (ctor instanceof InterpClass) return ctor.name
  return ''
}

/** `typeof` semantics. */
export function typeOf(v: unknown): string {
  if (v === null) return 'object'
  if (isCallable(v)) return 'function'
  return typeof v
}

/** JS truthiness. */
export function truthy(v: unknown): boolean {
  if (v === null || v === undefined) return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0 && !Number.isNaN(v)
  if (typeof v === 'string') return v.length > 0
  return true
}
