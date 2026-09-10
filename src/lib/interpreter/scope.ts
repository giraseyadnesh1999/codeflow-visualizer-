/** Lexical environments for the CodeFlow interpreter. */

import { ThrowSignal, makeError } from './values'

export type BindingKind = 'var' | 'let' | 'const' | 'param' | 'function' | 'class' | 'builtin'
export type ScopeType = 'builtin' | 'global' | 'function' | 'block' | 'loop' | 'catch' | 'class'

export interface Binding {
  kind: BindingKind
  value: unknown
  /** `let`/`const` before their declaration runs: the temporal dead zone. */
  tdz: boolean
  /** Step index at which this binding last changed — drives the UI highlight. */
  touchedAt: number
}

export class Scope {
  readonly bindings = new Map<string, Binding>()

  constructor(
    public readonly parent: Scope | null,
    public readonly type: ScopeType,
    public readonly label: string,
    /** Only function/global scopes carry a `this`; arrows and blocks do not. */
    public readonly thisVal: unknown = undefined,
    public readonly hasThis = false,
  ) {}

  /** The nearest scope that `var` declarations belong to. */
  functionScope(): Scope {
    const blockLike = this.type === 'block' || this.type === 'loop' || this.type === 'catch' || this.type === 'class'
    return blockLike && this.parent ? this.parent.functionScope() : this
  }

  declare(name: string, kind: BindingKind, value: unknown, tdz = false, at = 0): void {
    const existing = this.bindings.get(name)
    // Re-running a `var` declaration must not wipe an existing value.
    if (existing && kind === 'var' && value === undefined) return
    this.bindings.set(name, { kind, value, tdz, touchedAt: at })
  }

  find(name: string): { scope: Scope; binding: Binding } | null {
    const binding = this.bindings.get(name)
    if (binding) return { scope: this, binding }
    return this.parent ? this.parent.find(name) : null
  }

  has(name: string): boolean {
    return this.find(name) !== null
  }

  get(name: string, line = 0): unknown {
    const hit = this.find(name)
    if (!hit) {
      throw new ThrowSignal(makeError('ReferenceError', `${name} is not defined`), line)
    }
    if (hit.binding.tdz) {
      throw new ThrowSignal(
        makeError('ReferenceError', `Cannot access '${name}' before initialization`),
        line,
      )
    }
    return hit.binding.value
  }

  set(name: string, value: unknown, at: number, line = 0): void {
    const hit = this.find(name)
    if (!hit) {
      // Non-strict implicit global, which is what most learners expect to see.
      const g = this.globalScope()
      g.declare(name, 'var', value, false, at)
      return
    }
    if (hit.binding.kind === 'const' && !hit.binding.tdz) {
      throw new ThrowSignal(makeError('TypeError', 'Assignment to constant variable.'), line)
    }
    hit.binding.value = value
    hit.binding.tdz = false
    hit.binding.touchedAt = at
  }

  /** Initialize a `let`/`const` binding, clearing its TDZ flag. */
  initialize(name: string, value: unknown, at: number): void {
    const hit = this.find(name)
    if (hit) {
      hit.binding.value = value
      hit.binding.tdz = false
      hit.binding.touchedAt = at
    } else {
      this.declare(name, 'let', value, false, at)
    }
  }

  globalScope(): Scope {
    return this.parent && this.parent.type !== 'builtin' ? this.parent.globalScope() : this
  }

  /** Resolve `this` through the scope chain (arrows are transparent). */
  resolveThis(): unknown {
    if (this.hasThis) return this.thisVal
    return this.parent ? this.parent.resolveThis() : undefined
  }
}
