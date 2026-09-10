/**
 * Turns live interpreter state into plain, immutable view models.
 *
 * One snapshot is produced per step, so the UI can scrub the timeline without
 * ever re-running the program. Object identities are tracked in a WeakMap so a
 * given array keeps the same heap id (and therefore the same card) for the
 * whole run.
 */

import type { LogEntry } from './builtins'
import type { Frame, Loc, StepKind } from './evaluator'
import type { BindingKind, Scope, ScopeType } from './scope'
import { InterpClass, InterpFunction, NativeFunction, className, inspect, isErrorObject } from './values'

export type ValueView =
  | { t: 'prim'; type: 'number' | 'string' | 'boolean' | 'null' | 'undefined'; text: string }
  | { t: 'ref'; id: number; kind: RefKind; label: string; preview: string }
  | { t: 'tdz' }

export type RefKind = 'object' | 'array' | 'function' | 'class' | 'instance' | 'error' | 'map' | 'set'

export interface VarView {
  name: string
  kind: BindingKind
  value: ValueView
  /** True when this binding changed on the step being displayed. */
  changed: boolean
}

export interface ScopeView {
  key: string
  label: string
  type: ScopeType
  vars: VarView[]
}

export interface FrameView {
  id: number
  name: string
  kind: Frame['kind']
  line: number
  scopes: ScopeView[]
  thisValue: ValueView | null
}

export interface HeapEntry {
  key: string
  value: ValueView
}

export interface HeapNodeView {
  id: number
  kind: RefKind
  label: string
  entries: HeapEntry[]
  truncated: number
}

export interface Snapshot {
  index: number
  loc: Loc
  kind: StepKind
  title: string
  desc: string
  frames: FrameView[]
  heap: HeapNodeView[]
  output: LogEntry[]
  depth: number
}

const MAX_HEAP_NODES = 48
const MAX_ENTRIES = 24
/** Bindings the runtime needs but a learner should not have to look at. */
const HIDDEN = new Set(['arguments'])

export class Snapshotter {
  private ids = new WeakMap<object, number>()
  private nextId = 1

  capture(
    index: number,
    step: { loc: Loc; kind: StepKind; title: string; desc: string },
    stack: Frame[],
    output: LogEntry[],
    stepIndex: number,
  ): Snapshot {
    const roots: unknown[] = []
    const frames = stack.map((frame) => this.frameView(frame, stepIndex, roots))
    return {
      index,
      loc: step.loc,
      kind: step.kind,
      title: step.title,
      desc: step.desc,
      frames,
      heap: this.collectHeap(roots),
      output: output.map((entry) => ({ ...entry })),
      depth: stack.length,
    }
  }

  private frameView(frame: Frame, stepIndex: number, roots: unknown[]): FrameView {
    const chain: Scope[] = []
    let scope: Scope | null = frame.currentScope
    while (scope && scope.type !== 'builtin') {
      chain.push(scope)
      if (scope === frame.baseScope) break
      scope = scope.parent
    }
    chain.reverse()

    const scopes: ScopeView[] = chain.map((s, i) => ({
      key: `${frame.id}:${i}:${s.label}`,
      label: s.label,
      type: s.type,
      vars: [...s.bindings.entries()]
        .filter(([name]) => !name.startsWith('%') && !HIDDEN.has(name))
        .map(([name, binding]) => {
          if (!binding.tdz) roots.push(binding.value)
          return {
            name,
            kind: binding.kind,
            value: binding.tdz ? ({ t: 'tdz' } as ValueView) : this.valueView(binding.value),
            changed: binding.touchedAt === stepIndex,
          }
        }),
    }))

    if (frame.thisVal !== undefined) roots.push(frame.thisVal)

    return {
      id: frame.id,
      name: frame.name,
      kind: frame.kind,
      line: frame.line,
      scopes: scopes.filter((s) => s.vars.length > 0 || s === scopes[scopes.length - 1]),
      thisValue: frame.thisVal === undefined ? null : this.valueView(frame.thisVal),
    }
  }

  private valueView(value: unknown): ValueView {
    if (value === null) return { t: 'prim', type: 'null', text: 'null' }
    if (value === undefined) return { t: 'prim', type: 'undefined', text: 'undefined' }
    if (typeof value === 'number') return { t: 'prim', type: 'number', text: Object.is(value, -0) ? '-0' : String(value) }
    if (typeof value === 'boolean') return { t: 'prim', type: 'boolean', text: String(value) }
    if (typeof value === 'string') return { t: 'prim', type: 'string', text: value }

    if (value instanceof NativeFunction) {
      return { t: 'prim', type: 'undefined', text: `ƒ ${value.name}()` }
    }
    if (value instanceof InterpFunction) {
      const params = value.node.params.map((p: { name?: string }) => p.name ?? '…').join(', ')
      return {
        t: 'ref',
        id: this.idOf(value),
        kind: 'function',
        label: `ƒ ${value.name || (value.isArrow ? '(arrow)' : '(anonymous)')}`,
        preview: `(${params}) ${value.isArrow ? '=>' : '{…}'}`,
      }
    }
    if (value instanceof InterpClass) {
      return { t: 'ref', id: this.idOf(value), kind: 'class', label: `class ${value.name}`, preview: `class ${value.name}` }
    }
    if (Array.isArray(value)) {
      return {
        t: 'ref',
        id: this.idOf(value),
        kind: 'array',
        label: `Array(${value.length})`,
        preview: truncate(inspect(value, 1)),
      }
    }
    if (value instanceof Map) {
      return { t: 'ref', id: this.idOf(value), kind: 'map', label: `Map(${value.size})`, preview: truncate(inspect(value, 1)) }
    }
    if (value instanceof Set) {
      return { t: 'ref', id: this.idOf(value), kind: 'set', label: `Set(${value.size})`, preview: truncate(inspect(value, 1)) }
    }
    if (value instanceof RegExp) {
      return { t: 'prim', type: 'string', text: String(value) }
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>
      if (isErrorObject(obj)) {
        return { t: 'ref', id: this.idOf(obj), kind: 'error', label: String(obj.name), preview: `${obj.name}: ${obj.message}` }
      }
      const cls = className(obj)
      return {
        t: 'ref',
        id: this.idOf(obj),
        kind: cls ? 'instance' : 'object',
        label: cls || 'Object',
        preview: truncate(inspect(obj, 1)),
      }
    }
    return { t: 'prim', type: 'undefined', text: String(value) }
  }

  private idOf(obj: object): number {
    let id = this.ids.get(obj)
    if (id === undefined) {
      id = this.nextId++
      this.ids.set(obj, id)
    }
    return id
  }

  /** Breadth-first walk of everything reachable from the visible scopes. */
  private collectHeap(roots: unknown[]): HeapNodeView[] {
    const nodes: HeapNodeView[] = []
    const seen = new Set<object>()
    const queue: unknown[] = [...roots]

    while (queue.length > 0 && nodes.length < MAX_HEAP_NODES) {
      const value = queue.shift()
      if (!value || typeof value !== 'object') {
        if (!(value instanceof InterpFunction) && !(value instanceof InterpClass)) continue
      }
      const obj = value as object
      if (value instanceof NativeFunction) continue
      if (seen.has(obj)) continue
      seen.add(obj)

      const view = this.valueView(value)
      if (view.t !== 'ref') continue

      const entries: HeapEntry[] = []
      let total = 0

      if (Array.isArray(value)) {
        total = value.length
        for (let i = 0; i < Math.min(value.length, MAX_ENTRIES); i++) {
          entries.push({ key: String(i), value: this.valueView(value[i]) })
          queue.push(value[i])
        }
      } else if (value instanceof Map) {
        total = value.size
        for (const [k, v] of Array.from(value.entries()).slice(0, MAX_ENTRIES)) {
          entries.push({ key: inspect(k, 1), value: this.valueView(v) })
          queue.push(k, v)
        }
      } else if (value instanceof Set) {
        total = value.size
        Array.from(value)
          .slice(0, MAX_ENTRIES)
          .forEach((v, i) => {
            entries.push({ key: String(i), value: this.valueView(v) })
            queue.push(v)
          })
      } else if (value instanceof InterpFunction) {
        entries.push({ key: 'closure', value: { t: 'prim', type: 'string', text: value.closure.label } })
        total = 1
      } else if (value instanceof InterpClass) {
        const methods = Object.keys(value.proto).filter((k) => k !== 'constructor')
        total = methods.length
        for (const m of methods.slice(0, MAX_ENTRIES)) {
          entries.push({ key: m, value: this.valueView(value.proto[m]) })
        }
      } else {
        const keys = Object.keys(value as Record<string, unknown>).filter((k) => k !== '__isError')
        total = keys.length
        for (const key of keys.slice(0, MAX_ENTRIES)) {
          const child = (value as Record<string, unknown>)[key]
          entries.push({ key, value: this.valueView(child) })
          queue.push(child)
        }
        // Inherited methods make instances legible without cluttering entries.
        const proto = Object.getPrototypeOf(value)
        if (proto && proto.constructor instanceof InterpClass) queue.push(proto.constructor)
      }

      nodes.push({
        id: view.id,
        kind: view.kind,
        label: view.label,
        entries,
        truncated: Math.max(0, total - entries.length),
      })
    }

    return nodes.sort((a, b) => a.id - b.id)
  }
}

function truncate(text: string, max = 64): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}
