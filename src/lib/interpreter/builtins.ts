/**
 * Builtin globals and prototype methods.
 *
 * Anything that can call back into user code (`map`, `sort`, ...) is declared
 * as a *generator* native so it can `yield*` into the evaluator and keep the
 * step-by-step trace continuous.
 */

import { Scope } from './scope'
import {
  InterpClass,
  InterpFunction,
  NativeFunction,
  ThrowSignal,
  className,
  inspect,
  isCallable,
  isErrorObject,
  makeError,
  toStringValue,
  truthy,
  typeOf,
} from './values'

export interface LogEntry {
  id: number
  kind: 'log' | 'warn' | 'error' | 'info' | 'table'
  text: string
  line: number
}

/** Hooks the evaluator hands to builtins so they can re-enter user code. */
export interface BuiltinCtx {
  call(fn: unknown, args: unknown[], thisVal: unknown, line: number): Generator<unknown, unknown, unknown>
  log(entry: Omit<LogEntry, 'id'>): void
  currentLine(): number
}

const fail = (msg: string, line: number): never => {
  throw new ThrowSignal(makeError('TypeError', msg), line)
}

const nf = (name: string, fn: (args: unknown[], thisVal: unknown) => unknown) =>
  new NativeFunction(name, fn)

const gnf = (name: string, fn: (args: unknown[], thisVal: unknown) => unknown) =>
  new NativeFunction(name, fn, true)

/* ------------------------------------------------------------------ */
/* Global scope                                                        */
/* ------------------------------------------------------------------ */

export function createBuiltinScope(ctx: BuiltinCtx): Scope {
  const scope = new Scope(null, 'builtin', 'builtins', undefined, false)
  const def = (name: string, value: unknown) => scope.declare(name, 'builtin', value, false, 0)

  def('console', {
    log: nf('log', (args) => {
      ctx.log({ kind: 'log', text: args.map((a) => inspect(a)).join(' '), line: ctx.currentLine() })
      return undefined
    }),
    info: nf('info', (args) => {
      ctx.log({ kind: 'info', text: args.map((a) => inspect(a)).join(' '), line: ctx.currentLine() })
      return undefined
    }),
    warn: nf('warn', (args) => {
      ctx.log({ kind: 'warn', text: args.map((a) => inspect(a)).join(' '), line: ctx.currentLine() })
      return undefined
    }),
    error: nf('error', (args) => {
      ctx.log({ kind: 'error', text: args.map((a) => inspect(a)).join(' '), line: ctx.currentLine() })
      return undefined
    }),
  })

  def('Math', {
    PI: Math.PI,
    E: Math.E,
    abs: nf('abs', (a) => Math.abs(num(a[0]))),
    floor: nf('floor', (a) => Math.floor(num(a[0]))),
    ceil: nf('ceil', (a) => Math.ceil(num(a[0]))),
    round: nf('round', (a) => Math.round(num(a[0]))),
    trunc: nf('trunc', (a) => Math.trunc(num(a[0]))),
    sqrt: nf('sqrt', (a) => Math.sqrt(num(a[0]))),
    cbrt: nf('cbrt', (a) => Math.cbrt(num(a[0]))),
    pow: nf('pow', (a) => Math.pow(num(a[0]), num(a[1]))),
    min: nf('min', (a) => Math.min(...a.map(num))),
    max: nf('max', (a) => Math.max(...a.map(num))),
    random: nf('random', () => Math.random()),
    sign: nf('sign', (a) => Math.sign(num(a[0]))),
    log: nf('log', (a) => Math.log(num(a[0]))),
    log2: nf('log2', (a) => Math.log2(num(a[0]))),
    log10: nf('log10', (a) => Math.log10(num(a[0]))),
    hypot: nf('hypot', (a) => Math.hypot(...a.map(num))),
    sin: nf('sin', (a) => Math.sin(num(a[0]))),
    cos: nf('cos', (a) => Math.cos(num(a[0]))),
    tan: nf('tan', (a) => Math.tan(num(a[0]))),
    atan2: nf('atan2', (a) => Math.atan2(num(a[0]), num(a[1]))),
  })

  def('JSON', {
    stringify: nf('stringify', (a) => {
      const indent = typeof a[2] === 'number' ? a[2] : typeof a[2] === 'string' ? a[2] : undefined
      try {
        const out = JSON.stringify(stripFns(a[0]), null, indent as number)
        return out === undefined ? undefined : out
      } catch {
        return fail('Converting circular structure to JSON', ctx.currentLine())
      }
    }),
    parse: nf('parse', (a) => {
      try {
        return JSON.parse(String(a[0]))
      } catch (e) {
        throw new ThrowSignal(
          makeError('SyntaxError', (e as Error).message || 'Unexpected token in JSON'),
          ctx.currentLine(),
        )
      }
    }),
  })

  def('Object', {
    keys: nf('keys', (a) => ownKeys(a[0])),
    values: nf('values', (a) => ownKeys(a[0]).map((k) => (a[0] as Record<string, unknown>)[k])),
    entries: nf('entries', (a) => ownKeys(a[0]).map((k) => [k, (a[0] as Record<string, unknown>)[k]])),
    assign: nf('assign', (a) => {
      const target = a[0] as Record<string, unknown>
      for (const src of a.slice(1)) {
        if (src && typeof src === 'object') Object.assign(target, src)
      }
      return target
    }),
    freeze: nf('freeze', (a) => (a[0] && typeof a[0] === 'object' ? Object.freeze(a[0]) : a[0])),
    fromEntries: nf('fromEntries', (a) => {
      const out: Record<string, unknown> = {}
      for (const pair of (a[0] as unknown[]) ?? []) {
        const p = pair as unknown[]
        out[toStringValue(p[0])] = p[1]
      }
      return out
    }),
    getPrototypeOf: nf('getPrototypeOf', (a) =>
      a[0] && typeof a[0] === 'object' ? Object.getPrototypeOf(a[0]) : null,
    ),
  })

  // `Array(n)` / `new Array(n)` make a sparse array of length n, like the real thing.
  const arrayCtor = nf('Array', (a) => (a.length === 1 && typeof a[0] === 'number' ? new Array(a[0]) : [...a]))
  def('Array', assignProps(arrayCtor, {
    isArray: nf('isArray', (a) => Array.isArray(a[0])),
    of: nf('of', (a) => [...a]),
    from: gnf('from', function* (a): Generator<unknown, unknown, unknown> {
      const src = a[0]
      let items: unknown[] = []
      if (typeof src === 'string' || Array.isArray(src) || src instanceof Map || src instanceof Set) {
        items = toList(src)
      } else if (src && typeof src === 'object' && typeof (src as { length?: number }).length === 'number') {
        items = Array.from({ length: (src as { length: number }).length }, (_, i) => (src as Record<number, unknown>)[i])
      }
      if (isCallable(a[1])) {
        const out: unknown[] = []
        for (let i = 0; i < items.length; i++) {
          out.push(yield* ctx.call(a[1], [items[i], i], undefined, ctx.currentLine()))
        }
        return out
      }
      return items
    }),
  }))

  def('Map', nf('Map', (a) => {
    const map = new Map<unknown, unknown>()
    for (const pair of toList(a[0])) {
      const entry = pair as unknown[]
      map.set(entry?.[0], entry?.[1])
    }
    return map
  }))
  def('Set', nf('Set', (a) => new Set(toList(a[0]))))

  def('Number', assignProps(nf('Number', (a) => (a.length ? num(a[0]) : 0)), {
    isInteger: nf('isInteger', (a) => Number.isInteger(a[0])),
    isFinite: nf('isFinite', (a) => Number.isFinite(a[0])),
    isNaN: nf('isNaN', (a) => Number.isNaN(a[0])),
    parseFloat: nf('parseFloat', (a) => parseFloat(toStringValue(a[0]))),
    parseInt: nf('parseInt', (a) => parseInt(toStringValue(a[0]), (a[1] as number) ?? 10)),
    MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
    MIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
    EPSILON: Number.EPSILON,
    POSITIVE_INFINITY: Infinity,
    NEGATIVE_INFINITY: -Infinity,
  }))

  def('String', assignProps(nf('String', (a) => (a.length ? toStringValue(a[0]) : '')), {
    fromCharCode: nf('fromCharCode', (a) => String.fromCharCode(...a.map(num))),
  }))
  def('Boolean', nf('Boolean', (a) => truthy(a[0])))
  def('parseInt', nf('parseInt', (a) => parseInt(toStringValue(a[0]), (a[1] as number) ?? 10)))
  def('parseFloat', nf('parseFloat', (a) => parseFloat(toStringValue(a[0]))))
  def('isNaN', nf('isNaN', (a) => Number.isNaN(num(a[0]))))
  def('isFinite', nf('isFinite', (a) => Number.isFinite(num(a[0]))))
  def('NaN', NaN)
  def('Infinity', Infinity)
  def('undefined', undefined)
  def('globalThis', {})

  for (const name of ['Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError']) {
    def(name, nf(name, (a) => makeError(name, a.length ? toStringValue(a[0]) : '')))
  }

  return scope
}

function assignProps(fn: NativeFunction, props: Record<string, unknown>): NativeFunction {
  Object.assign(fn, { props })
  // Expose statics through a side table consulted by getMember.
  staticTables.set(fn, props)
  return fn
}

const staticTables = new WeakMap<NativeFunction, Record<string, unknown>>()

function num(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  if (v === null) return 0
  if (v === undefined) return NaN
  if (typeof v === 'string') return v.trim() === '' ? 0 : Number(v)
  return NaN
}

/** Anything iterable the way `for...of` and spread see it. */
export function toList(v: unknown): unknown[] {
  if (v === null || v === undefined) return []
  if (Array.isArray(v)) return [...v]
  if (typeof v === 'string') return v.split('')
  if (v instanceof Map) return Array.from(v.entries(), ([k, val]) => [k, val])
  if (v instanceof Set) return Array.from(v)
  return []
}

function ownKeys(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((_, i) => String(i))
  if (typeof v === 'string') return v.split('').map((_, i) => String(i))
  if (v && typeof v === 'object') return Object.keys(v)
  return []
}

function stripFns(v: unknown): unknown {
  if (isCallable(v)) return undefined
  if (Array.isArray(v)) return v.map(stripFns)
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v)) {
      if (k === '__isError') continue
      const s = stripFns(val)
      if (s !== undefined) out[k] = s
    }
    return out
  }
  return v
}

/* ------------------------------------------------------------------ */
/* Member access                                                       */
/* ------------------------------------------------------------------ */

export function getMember(obj: unknown, rawKey: unknown, line: number, ctx: BuiltinCtx): unknown {
  const key = typeof rawKey === 'number' ? rawKey : toStringValue(rawKey)

  if (obj === null || obj === undefined) {
    return fail(`Cannot read properties of ${obj === null ? 'null' : 'undefined'} (reading '${key}')`, line)
  }

  if (typeof obj === 'string') return stringMember(obj, key, line)
  if (typeof obj === 'number') return numberMember(obj, key)
  if (typeof obj === 'boolean') return key === 'toString' ? nf('toString', () => String(obj)) : undefined
  if (Array.isArray(obj)) return arrayMember(obj, key, line, ctx)
  if (obj instanceof Map) return mapMember(obj, key, line, ctx)
  if (obj instanceof Set) return setMethods(obj, key, line, ctx)
  if (obj instanceof RegExp) return regexMember(obj, key)

  if (obj instanceof InterpFunction) {
    if (key === 'name') return obj.name
    if (key === 'length') return obj.node.params.length
    return functionMember(obj, key, line, ctx)
  }
  if (obj instanceof NativeFunction) {
    const statics = staticTables.get(obj)
    if (statics && key in statics) return statics[key as string]
    if (key === 'name') return obj.name
    return functionMember(obj, key, line, ctx)
  }
  if (obj instanceof InterpClass) {
    if (key === 'name') return obj.name
    let c: InterpClass | null = obj
    while (c) {
      if (key in c.staticProps) return c.staticProps[key as string]
      c = c.superClass
    }
    return undefined
  }

  // Plain object / class instance — real prototype chain does the walking.
  const rec = obj as Record<string, unknown>
  if (key === 'toString' && !(key in rec)) return nf('toString', () => toStringValue(obj))
  if (isErrorObject(rec) && key === 'stack') return `${rec.name}: ${rec.message}`
  return rec[key as string]
}

export function setMember(obj: unknown, rawKey: unknown, value: unknown, line: number): void {
  const key = typeof rawKey === 'number' ? rawKey : toStringValue(rawKey)
  if (obj === null || obj === undefined) {
    fail(`Cannot set properties of ${obj === null ? 'null' : 'undefined'} (setting '${key}')`, line)
  }
  if (Array.isArray(obj)) {
    if (key === 'length') {
      obj.length = num(value)
      return
    }
    const idx = Number(key)
    if (Number.isInteger(idx) && idx >= 0) {
      obj[idx] = value
      return
    }
  }
  if (typeof obj === 'object') {
    if (Object.isFrozen(obj)) return
    ;(obj as Record<string, unknown>)[key as string] = value
    return
  }
  if (obj instanceof InterpClass) {
    obj.staticProps[key as string] = value
  }
  // Primitives silently ignore writes in non-strict mode.
}

function functionMember(fn: unknown, key: string | number, line: number, ctx: BuiltinCtx): unknown {
  switch (key) {
    case 'call':
      return gnf('call', function* (a): Generator<unknown, unknown, unknown> {
        return yield* ctx.call(fn, a.slice(1), a[0], line)
      })
    case 'apply':
      return gnf('apply', function* (a): Generator<unknown, unknown, unknown> {
        return yield* ctx.call(fn, (a[1] as unknown[]) ?? [], a[0], line)
      })
    case 'bind':
      return nf('bind', (a) => {
        const boundThis = a[0]
        const preset = a.slice(1)
        return gnf('bound', function* (b): Generator<unknown, unknown, unknown> {
          return yield* ctx.call(fn, [...preset, ...b], boundThis, line)
        })
      })
    default:
      return undefined
  }
}

/*
 * Map / Set. `keys()`, `values()` and `entries()` return arrays rather than
 * iterators — every way learners consume them (for...of, spread, Array.from)
 * behaves the same, and arrays are far easier to show in the Memory panel.
 */
function mapMember(map: Map<unknown, unknown>, key: string | number, line: number, ctx: BuiltinCtx): unknown {
  switch (key) {
    case 'size':
      return map.size
    case 'get':
      return nf('get', (a) => map.get(a[0]))
    case 'set':
      return nf('set', (a) => map.set(a[0], a[1]))
    case 'has':
      return nf('has', (a) => map.has(a[0]))
    case 'delete':
      return nf('delete', (a) => map.delete(a[0]))
    case 'clear':
      return nf('clear', () => map.clear())
    case 'keys':
      return nf('keys', () => Array.from(map.keys()))
    case 'values':
      return nf('values', () => Array.from(map.values()))
    case 'entries':
      return nf('entries', () => toList(map))
    case 'forEach':
      return gnf('forEach', function* (a): Generator<unknown, unknown, unknown> {
        for (const [k, v] of Array.from(map.entries())) yield* ctx.call(a[0], [v, k, map], a[1], line)
        return undefined
      })
    default:
      return undefined
  }
}

function setMethods(set: Set<unknown>, key: string | number, line: number, ctx: BuiltinCtx): unknown {
  switch (key) {
    case 'size':
      return set.size
    case 'add':
      return nf('add', (a) => set.add(a[0]))
    case 'has':
      return nf('has', (a) => set.has(a[0]))
    case 'delete':
      return nf('delete', (a) => set.delete(a[0]))
    case 'clear':
      return nf('clear', () => set.clear())
    case 'keys':
    case 'values':
      return nf(String(key), () => Array.from(set))
    case 'entries':
      return nf('entries', () => Array.from(set, (v) => [v, v]))
    case 'forEach':
      return gnf('forEach', function* (a): Generator<unknown, unknown, unknown> {
        for (const v of Array.from(set)) yield* ctx.call(a[0], [v, v, set], a[1], line)
        return undefined
      })
    default:
      return undefined
  }
}

function regexMember(re: RegExp, key: string | number): unknown {
  switch (key) {
    case 'test':
      return nf('test', (a) => re.test(toStringValue(a[0])))
    case 'exec':
      return nf('exec', (a) => {
        const m = re.exec(toStringValue(a[0]))
        return m ? Array.from(m) : null
      })
    case 'source':
      return re.source
    case 'flags':
      return re.flags
    case 'global':
      return re.global
    case 'lastIndex':
      return re.lastIndex
    default:
      return undefined
  }
}

function numberMember(n: number, key: string | number): unknown {
  switch (key) {
    case 'toFixed':
      return nf('toFixed', (a) => n.toFixed((a[0] as number) ?? 0))
    case 'toString':
      return nf('toString', (a) => (a.length ? n.toString(a[0] as number) : String(n)))
    case 'toPrecision':
      return nf('toPrecision', (a) => n.toPrecision(a[0] as number))
    default:
      return undefined
  }
}

function stringMember(s: string, key: string | number, line: number): unknown {
  if (key === 'length') return s.length
  const idx = typeof key === 'number' ? key : Number(key)
  if (Number.isInteger(idx) && String(key).trim() !== '') return s[idx]

  const simple: Record<string, (a: unknown[]) => unknown> = {
    toUpperCase: () => s.toUpperCase(),
    toLowerCase: () => s.toLowerCase(),
    trim: () => s.trim(),
    trimStart: () => s.trimStart(),
    trimEnd: () => s.trimEnd(),
    slice: (a) => s.slice(a[0] as number, a[1] as number | undefined),
    substring: (a) => s.substring(a[0] as number, a[1] as number | undefined),
    split: (a) => (a[0] === undefined ? [s] : s.split(a[0] as string)),
    indexOf: (a) => s.indexOf(toStringValue(a[0]), a[1] as number | undefined),
    lastIndexOf: (a) => s.lastIndexOf(toStringValue(a[0])),
    includes: (a) => s.includes(toStringValue(a[0])),
    startsWith: (a) => s.startsWith(toStringValue(a[0]), a[1] as number | undefined),
    endsWith: (a) => s.endsWith(toStringValue(a[0]), a[1] as number | undefined),
    charAt: (a) => s.charAt((a[0] as number) ?? 0),
    charCodeAt: (a) => s.charCodeAt((a[0] as number) ?? 0),
    codePointAt: (a) => s.codePointAt((a[0] as number) ?? 0),
    at: (a) => s.at((a[0] as number) ?? 0),
    concat: (a) => s.concat(...a.map(toStringValue)),
    repeat: (a) => s.repeat((a[0] as number) ?? 0),
    padStart: (a) => s.padStart(a[0] as number, a[1] === undefined ? ' ' : toStringValue(a[1])),
    padEnd: (a) => s.padEnd(a[0] as number, a[1] === undefined ? ' ' : toStringValue(a[1])),
    replace: (a) => s.replace(a[0] as string, toStringValue(a[1])),
    replaceAll: (a) => s.replaceAll(a[0] as string, toStringValue(a[1])),
    match: (a) => {
      const m = s.match(a[0] as RegExp)
      return m ? Array.from(m) : null
    },
    test: () => fail('s.test is not a function', line),
    toString: () => s,
    localeCompare: (a) => s.localeCompare(toStringValue(a[0])),
  }
  if (key in simple) return nf(String(key), (a) => simple[key as string](a))
  return undefined
}

function arrayMember(arr: unknown[], key: string | number, line: number, ctx: BuiltinCtx): unknown {
  if (key === 'length') return arr.length
  const idx = typeof key === 'number' ? key : Number(key)
  if (Number.isInteger(idx) && String(key).trim() !== '') return arr[idx]

  switch (key) {
    /* --- mutators & simple transforms ---------------------------- */
    case 'push':
      return nf('push', (a) => arr.push(...a))
    case 'pop':
      return nf('pop', () => arr.pop())
    case 'shift':
      return nf('shift', () => arr.shift())
    case 'unshift':
      return nf('unshift', (a) => arr.unshift(...a))
    case 'splice':
      return nf('splice', (a) => arr.splice(a[0] as number, a[1] as number, ...a.slice(2)))
    case 'slice':
      return nf('slice', (a) => arr.slice(a[0] as number | undefined, a[1] as number | undefined))
    case 'concat':
      return nf('concat', (a) => arr.concat(...(a as unknown[][])))
    case 'join':
      return nf('join', (a) => arr.map((x) => (x == null ? '' : toStringValue(x))).join(a[0] === undefined ? ',' : toStringValue(a[0])))
    case 'reverse':
      return nf('reverse', () => arr.reverse())
    case 'indexOf':
      return nf('indexOf', (a) => arr.findIndex((x) => strictEquals(x, a[0])))
    case 'lastIndexOf':
      return nf('lastIndexOf', (a) => {
        for (let i = arr.length - 1; i >= 0; i--) if (strictEquals(arr[i], a[0])) return i
        return -1
      })
    case 'includes':
      return nf('includes', (a) => arr.some((x) => strictEquals(x, a[0]) || (Number.isNaN(x as number) && Number.isNaN(a[0] as number))))
    case 'at':
      return nf('at', (a) => arr.at((a[0] as number) ?? 0))
    case 'fill':
      return nf('fill', (a) => arr.fill(a[0], a[1] as number | undefined, a[2] as number | undefined))
    case 'flat':
      return nf('flat', (a) => arr.flat((a[0] as number) ?? 1) as unknown[])
    case 'keys':
      return nf('keys', () => arr.map((_, i) => i))
    case 'values':
      return nf('values', () => [...arr])
    case 'entries':
      return nf('entries', () => arr.map((v, i) => [i, v]))
    case 'toString':
      return nf('toString', () => toStringValue(arr))

    /* --- callback-taking methods (re-enter user code) -------------- */
    case 'forEach':
      return gnf('forEach', function* (a): Generator<unknown, unknown, unknown> {
        for (let i = 0; i < arr.length; i++) yield* ctx.call(a[0], [arr[i], i, arr], a[1], line)
        return undefined
      })
    case 'map':
      return gnf('map', function* (a): Generator<unknown, unknown, unknown> {
        const out: unknown[] = []
        for (let i = 0; i < arr.length; i++) out.push(yield* ctx.call(a[0], [arr[i], i, arr], a[1], line))
        return out
      })
    case 'filter':
      return gnf('filter', function* (a): Generator<unknown, unknown, unknown> {
        const out: unknown[] = []
        for (let i = 0; i < arr.length; i++) {
          if (truthy(yield* ctx.call(a[0], [arr[i], i, arr], a[1], line))) out.push(arr[i])
        }
        return out
      })
    case 'find':
      return gnf('find', function* (a): Generator<unknown, unknown, unknown> {
        for (let i = 0; i < arr.length; i++) {
          if (truthy(yield* ctx.call(a[0], [arr[i], i, arr], a[1], line))) return arr[i]
        }
        return undefined
      })
    case 'findIndex':
      return gnf('findIndex', function* (a): Generator<unknown, unknown, unknown> {
        for (let i = 0; i < arr.length; i++) {
          if (truthy(yield* ctx.call(a[0], [arr[i], i, arr], a[1], line))) return i
        }
        return -1
      })
    case 'findLast':
      return gnf('findLast', function* (a): Generator<unknown, unknown, unknown> {
        for (let i = arr.length - 1; i >= 0; i--) {
          if (truthy(yield* ctx.call(a[0], [arr[i], i, arr], a[1], line))) return arr[i]
        }
        return undefined
      })
    case 'some':
      return gnf('some', function* (a): Generator<unknown, unknown, unknown> {
        for (let i = 0; i < arr.length; i++) {
          if (truthy(yield* ctx.call(a[0], [arr[i], i, arr], a[1], line))) return true
        }
        return false
      })
    case 'every':
      return gnf('every', function* (a): Generator<unknown, unknown, unknown> {
        for (let i = 0; i < arr.length; i++) {
          if (!truthy(yield* ctx.call(a[0], [arr[i], i, arr], a[1], line))) return false
        }
        return true
      })
    case 'reduce':
      return gnf('reduce', function* (a): Generator<unknown, unknown, unknown> {
        let acc: unknown
        let start = 0
        if (a.length > 1) acc = a[1]
        else {
          if (arr.length === 0) return fail('Reduce of empty array with no initial value', line)
          acc = arr[0]
          start = 1
        }
        for (let i = start; i < arr.length; i++) {
          acc = yield* ctx.call(a[0], [acc, arr[i], i, arr], undefined, line)
        }
        return acc
      })
    case 'reduceRight':
      return gnf('reduceRight', function* (a): Generator<unknown, unknown, unknown> {
        let acc: unknown
        let start = arr.length - 1
        if (a.length > 1) acc = a[1]
        else {
          if (arr.length === 0) return fail('Reduce of empty array with no initial value', line)
          acc = arr[start]
          start--
        }
        for (let i = start; i >= 0; i--) acc = yield* ctx.call(a[0], [acc, arr[i], i, arr], undefined, line)
        return acc
      })
    case 'flatMap':
      return gnf('flatMap', function* (a): Generator<unknown, unknown, unknown> {
        const out: unknown[] = []
        for (let i = 0; i < arr.length; i++) {
          const v = yield* ctx.call(a[0], [arr[i], i, arr], a[1], line)
          if (Array.isArray(v)) out.push(...v)
          else out.push(v)
        }
        return out
      })
    case 'sort':
      return gnf('sort', function* (a): Generator<unknown, unknown, unknown> {
        // Insertion sort so every comparison is a visible interpreter step.
        const cmp = a[0]
        for (let i = 1; i < arr.length; i++) {
          const item = arr[i]
          let j = i - 1
          while (j >= 0) {
            const order = isCallable(cmp)
              ? num(yield* ctx.call(cmp, [arr[j], item], undefined, line))
              : toStringValue(arr[j]) > toStringValue(item)
                ? 1
                : -1
            if (order <= 0) break
            arr[j + 1] = arr[j]
            j--
          }
          arr[j + 1] = item
        }
        return arr
      })
    default:
      return undefined
  }
}

/** `===` with interpreter value semantics. */
export function strictEquals(a: unknown, b: unknown): boolean {
  return a === b
}

export { num as toNumber, ownKeys, className, typeOf }
