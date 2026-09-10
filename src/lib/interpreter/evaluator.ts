/**
 * The stepping evaluator.
 *
 * `Interpreter.run()` is a generator: it walks the AST and `yield`s a StepInfo
 * at every point a learner would care about. The driver in `run.ts` pumps that
 * generator and snapshots the machine state after each yield, which is what
 * makes the timeline scrubbable.
 */

import { Scope, type BindingKind } from './scope'
import { createBuiltinScope, getMember, setMember, strictEquals, toList, toNumber, type BuiltinCtx, type LogEntry } from './builtins'
import {
  BreakSignal,
  ContinueSignal,
  InterpClass,
  InterpFunction,
  NativeFunction,
  ReturnSignal,
  ThrowSignal,
  UnsupportedError,
  className,
  inspect,
  isCallable,
  makeError,
  toStringValue,
  truthy,
  typeOf,
  type AnyNode,
} from './values'

export type StepKind =
  | 'program'
  | 'declare'
  | 'assign'
  | 'expression'
  | 'call'
  | 'return'
  | 'branch'
  | 'loop'
  | 'output'
  | 'throw'
  | 'catch'
  | 'class'
  | 'done'

export interface Loc {
  line: number
  col: number
  endLine: number
  endCol: number
}

export interface StepInfo {
  loc: Loc
  kind: StepKind
  title: string
  desc: string
}

export interface Frame {
  id: number
  name: string
  kind: 'global' | 'function' | 'method' | 'constructor' | 'arrow'
  baseScope: Scope
  currentScope: Scope
  line: number
  args: unknown[]
  thisVal: unknown
}

/** Short-circuit sentinel for optional chaining (`a?.b.c`). */
const SHORT = Symbol('optional-short-circuit')

const MAX_DESC_SRC = 46

export class Interpreter {
  readonly builtinScope: Scope
  readonly globalScope: Scope
  readonly stack: Frame[] = []
  readonly output: LogEntry[] = []

  /** Monotonic step counter; bindings record it so the UI can flash changes. */
  stepIndex = 0

  private frameId = 1
  private logId = 1
  private line = 0

  constructor(
    private readonly source: string,
    private readonly ast: AnyNode,
  ) {
    const ctx: BuiltinCtx = {
      call: (fn, args, thisVal, line) => this.callValue(fn, args, thisVal, line, nameOfCallee(fn)),
      log: (entry) => {
        this.output.push({ ...entry, id: this.logId++ })
      },
      currentLine: () => this.line,
    }
    this.builtinScope = createBuiltinScope(ctx)
    this.globalScope = new Scope(this.builtinScope, 'global', 'Global', undefined, true)
  }

  /* ---------------------------------------------------------------- */
  /* Entry point                                                       */
  /* ---------------------------------------------------------------- */

  *run(): Generator<StepInfo, void, void> {
    const frame: Frame = {
      id: this.frameId++,
      name: 'global',
      kind: 'global',
      baseScope: this.globalScope,
      currentScope: this.globalScope,
      line: 1,
      args: [],
      thisVal: undefined,
    }
    this.stack.push(frame)

    this.hoistVars(this.ast.body, this.globalScope)
    yield* this.hoistLexical(this.ast.body, this.globalScope)

    yield* this.emit(this.ast, 'program', 'Start', 'Program starts. Global scope is set up and declarations are hoisted.', this.globalScope)

    try {
      for (const stmt of this.ast.body) {
        yield* this.execStatement(stmt, this.globalScope)
      }
    } catch (e) {
      if (e instanceof ReturnSignal) {
        // `return` at top level — treat as an early exit.
      } else {
        throw e
      }
    }

    yield* this.emit(lastNode(this.ast.body) ?? this.ast, 'done', 'Finished', 'Program finished. Nothing left on the call stack.', this.globalScope)
  }

  /* ---------------------------------------------------------------- */
  /* Step emission                                                     */
  /* ---------------------------------------------------------------- */

  private *emit(node: AnyNode, kind: StepKind, title: string, desc: string, scope: Scope): Generator<StepInfo, void, void> {
    const loc = locOf(node)
    this.line = loc.line
    const top = this.stack[this.stack.length - 1]
    if (top) {
      top.line = loc.line
      top.currentScope = scope
    }
    this.stepIndex++
    yield { loc, kind, title, desc }
  }

  private src(node: AnyNode): string {
    if (!node || node.start === undefined) return '…'
    const text = this.source.slice(node.start, node.end).replace(/\s+/g, ' ').trim()
    return text.length > MAX_DESC_SRC ? text.slice(0, MAX_DESC_SRC - 1) + '…' : text
  }

  /* ---------------------------------------------------------------- */
  /* Hoisting                                                          */
  /* ---------------------------------------------------------------- */

  /** Declare every `var` in the body (not crossing function boundaries). */
  private hoistVars(body: AnyNode[], scope: Scope): void {
    const target = scope.functionScope()
    const walk = (node: AnyNode): void => {
      if (!node || typeof node !== 'object') return
      switch (node.type) {
        case 'FunctionDeclaration':
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
        case 'ClassDeclaration':
        case 'ClassExpression':
          return // new function scope — its vars are not ours
        case 'VariableDeclaration':
          if (node.kind === 'var') {
            for (const d of node.declarations) {
              for (const name of patternNames(d.id)) {
                if (!target.bindings.has(name)) target.declare(name, 'var', undefined, false, 0)
              }
            }
          }
          return
      }
      for (const key of Object.keys(node)) {
        if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue
        const child = node[key]
        if (Array.isArray(child)) child.forEach(walk)
        else if (child && typeof child === 'object' && typeof child.type === 'string') walk(child)
      }
    }
    body.forEach(walk)
  }

  /** Declare block-level `let`/`const`/`class` (TDZ) and hoist functions. */
  private *hoistLexical(body: AnyNode[], scope: Scope): Generator<StepInfo, void, void> {
    for (const stmt of body) {
      if (stmt.type === 'VariableDeclaration' && stmt.kind !== 'var') {
        for (const d of stmt.declarations) {
          for (const name of patternNames(d.id)) {
            scope.declare(name, stmt.kind as BindingKind, undefined, true, this.stepIndex)
          }
        }
      } else if (stmt.type === 'ClassDeclaration' && stmt.id) {
        scope.declare(stmt.id.name, 'class', undefined, true, this.stepIndex)
      } else if (stmt.type === 'FunctionDeclaration' && stmt.id) {
        scope.declare(
          stmt.id.name,
          'function',
          new InterpFunction(stmt, scope, stmt.id.name, false),
          false,
          this.stepIndex,
        )
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Statements                                                        */
  /* ---------------------------------------------------------------- */

  private *execStatement(node: AnyNode, scope: Scope): Generator<StepInfo, void, void> {
    switch (node.type) {
      case 'VariableDeclaration':
        yield* this.execVariableDeclaration(node, scope)
        return

      case 'ExpressionStatement': {
        const value = yield* this.evaluate(node.expression, scope)
        if (node.expression.type !== 'AssignmentExpression' && node.expression.type !== 'CallExpression' && node.expression.type !== 'UpdateExpression') {
          yield* this.emit(node, 'expression', 'Evaluate', `Evaluate \`${this.src(node.expression)}\` → ${inspect(value, 1)}.`, scope)
        }
        return
      }

      case 'FunctionDeclaration':
        // Already hoisted; nothing to execute.
        return

      case 'ClassDeclaration': {
        const cls = yield* this.buildClass(node, scope)
        scope.initialize(node.id.name, cls, this.stepIndex)
        yield* this.emit(node, 'class', 'Define class', `Define class \`${node.id.name}\`${node.superClass ? ` extending \`${this.src(node.superClass)}\`` : ''}.`, scope)
        return
      }

      case 'BlockStatement': {
        const inner = new Scope(scope, 'block', 'block')
        yield* this.execBlockBody(node.body, inner)
        return
      }

      case 'IfStatement':
        yield* this.execIf(node, scope)
        return

      case 'ForStatement':
        yield* this.execFor(node, scope, null)
        return

      case 'ForOfStatement':
        yield* this.execForOf(node, scope, null)
        return

      case 'ForInStatement':
        yield* this.execForIn(node, scope, null)
        return

      case 'WhileStatement':
        yield* this.execWhile(node, scope, null)
        return

      case 'DoWhileStatement':
        yield* this.execDoWhile(node, scope, null)
        return

      case 'SwitchStatement':
        yield* this.execSwitch(node, scope)
        return

      case 'ReturnStatement': {
        const value = node.argument ? yield* this.evaluate(node.argument, scope) : undefined
        const fnName = this.stack[this.stack.length - 1]?.name ?? 'function'
        yield* this.emit(node, 'return', 'Return', `Return ${inspect(value, 1)} from \`${fnName}\`.`, scope)
        throw new ReturnSignal(value)
      }

      case 'BreakStatement':
        yield* this.emit(node, 'loop', 'Break', node.label ? `Break out of the \`${node.label.name}\` loop.` : 'Break out of the loop.', scope)
        throw new BreakSignal(node.label ? node.label.name : null)

      case 'ContinueStatement':
        yield* this.emit(node, 'loop', 'Continue', node.label ? `Skip to the next \`${node.label.name}\` iteration.` : 'Skip to the next iteration.', scope)
        throw new ContinueSignal(node.label ? node.label.name : null)

      case 'ThrowStatement': {
        const value = yield* this.evaluate(node.argument, scope)
        yield* this.emit(node, 'throw', 'Throw', `Throw ${inspect(value, 1)} — unwinding until a \`catch\` handles it.`, scope)
        throw new ThrowSignal(value, locOf(node).line)
      }

      case 'TryStatement':
        yield* this.execTry(node, scope)
        return

      case 'LabeledStatement':
        yield* this.execLabeled(node, scope)
        return

      case 'EmptyStatement':
        return

      default:
        // An expression used where a statement was expected.
        yield* this.evaluate(node, scope)
    }
  }

  private *execBlockBody(body: AnyNode[], scope: Scope): Generator<StepInfo, void, void> {
    yield* this.hoistLexical(body, scope)
    for (const stmt of body) {
      yield* this.execStatement(stmt, scope)
    }
  }

  private *execVariableDeclaration(node: AnyNode, scope: Scope): Generator<StepInfo, void, void> {
    for (const decl of node.declarations) {
      const value = decl.init ? yield* this.evaluate(decl.init, scope) : undefined

      if (decl.id.type === 'Identifier') {
        const name = decl.id.name
        if (node.kind === 'var') scope.functionScope().set(name, value, this.stepIndex, locOf(node).line)
        else scope.initialize(name, value, this.stepIndex)

        const what = decl.init ? ` = ${inspect(value, 1)}` : ''
        yield* this.emit(
          decl,
          'declare',
          'Declare',
          `Declare \`${name}\` with \`${node.kind}\`${what ? ` and store${what}` : ' (no value yet, so `undefined`)'}.`,
          scope,
        )
      } else {
        yield* this.bindPattern(decl.id, value, scope, node.kind as BindingKind)
        yield* this.emit(decl, 'declare', 'Destructure', `Unpack ${inspect(value, 1)} into \`${this.src(decl.id)}\`.`, scope)
      }
    }
  }

  private *execIf(node: AnyNode, scope: Scope): Generator<StepInfo, void, void> {
    const test = yield* this.evaluate(node.test, scope)
    const ok = truthy(test)
    yield* this.emit(
      node.test,
      'branch',
      ok ? 'Condition true' : 'Condition false',
      `\`${this.src(node.test)}\` is ${inspect(test, 1)} → ${ok ? 'take the `if` branch' : node.alternate ? 'take the `else` branch' : 'skip this block'}.`,
      scope,
    )
    if (ok) yield* this.execStatement(node.consequent, scope)
    else if (node.alternate) yield* this.execStatement(node.alternate, scope)
  }

  private *execFor(node: AnyNode, scope: Scope, label: string | null): Generator<StepInfo, void, void> {
    const initScope = new Scope(scope, 'loop', 'for')
    const isLexical = node.init?.type === 'VariableDeclaration' && node.init.kind !== 'var'
    const loopNames: string[] = isLexical
      ? node.init.declarations.flatMap((d: AnyNode) => patternNames(d.id))
      : []

    if (node.init) {
      if (node.init.type === 'VariableDeclaration') {
        yield* this.hoistLexical([node.init], initScope)
        yield* this.execVariableDeclaration(node.init, initScope)
      } else {
        yield* this.evaluate(node.init, initScope)
      }
    }

    // `let` loop variables get a fresh binding per iteration, so closures made
    // inside the body capture that iteration's value rather than the last one.
    let iterScope = initScope
    const copyBindings = (): void => {
      if (loopNames.length === 0) return
      const next = new Scope(scope, 'loop', 'for')
      for (const name of loopNames) {
        next.declare(name, node.init.kind as BindingKind, iterScope.get(name), false, this.stepIndex)
      }
      iterScope = next
    }

    copyBindings()
    let iteration = 0

    for (;;) {
      if (node.test) {
        const test = yield* this.evaluate(node.test, iterScope)
        const ok = truthy(test)
        yield* this.emit(
          node.test,
          'loop',
          ok ? 'Loop check ✓' : 'Loop check ✗',
          `\`${this.src(node.test)}\` is ${inspect(test, 1)} → ${ok ? `run iteration ${iteration + 1}` : 'leave the loop'}.`,
          iterScope,
        )
        if (!ok) break
      }

      const bodyScope = new Scope(iterScope, 'block', `iteration ${iteration + 1}`)
      const stop = yield* this.runLoopBody(node.body, bodyScope, label)
      if (stop) break

      copyBindings()
      if (node.update) {
        yield* this.evaluate(node.update, iterScope)
        yield* this.emit(node.update, 'loop', 'Update', `Run the update \`${this.src(node.update)}\`.`, iterScope)
      }
      iteration++
    }
  }

  private *execWhile(node: AnyNode, scope: Scope, label: string | null): Generator<StepInfo, void, void> {
    let iteration = 0
    for (;;) {
      const test = yield* this.evaluate(node.test, scope)
      const ok = truthy(test)
      yield* this.emit(
        node.test,
        'loop',
        ok ? 'Loop check ✓' : 'Loop check ✗',
        `\`${this.src(node.test)}\` is ${inspect(test, 1)} → ${ok ? `run iteration ${iteration + 1}` : 'leave the loop'}.`,
        scope,
      )
      if (!ok) break
      const bodyScope = new Scope(scope, 'block', `iteration ${iteration + 1}`)
      const stop = yield* this.runLoopBody(node.body, bodyScope, label)
      if (stop) break
      iteration++
    }
  }

  private *execDoWhile(node: AnyNode, scope: Scope, label: string | null): Generator<StepInfo, void, void> {
    let iteration = 0
    for (;;) {
      const bodyScope = new Scope(scope, 'block', `iteration ${iteration + 1}`)
      const stop = yield* this.runLoopBody(node.body, bodyScope, label)
      if (stop) break
      const test = yield* this.evaluate(node.test, scope)
      const ok = truthy(test)
      yield* this.emit(
        node.test,
        'loop',
        ok ? 'Loop check ✓' : 'Loop check ✗',
        `\`${this.src(node.test)}\` is ${inspect(test, 1)} → ${ok ? 'go around again' : 'leave the loop'}.`,
        scope,
      )
      if (!ok) break
      iteration++
    }
  }

  private *execForOf(node: AnyNode, scope: Scope, label: string | null): Generator<StepInfo, void, void> {
    const iterable = yield* this.evaluate(node.right, scope)
    const items = toIterable(iterable, locOf(node).line)
    yield* this.emit(node.right, 'loop', 'Iterate', `Iterate over ${inspect(iterable, 1)} — ${items.length} item${items.length === 1 ? '' : 's'}.`, scope)

    for (let i = 0; i < items.length; i++) {
      const iterScope = new Scope(scope, 'loop', `iteration ${i + 1}`)
      yield* this.declareLoopBinding(node.left, items[i], iterScope)
      yield* this.emit(node.left, 'loop', `Item ${i + 1}/${items.length}`, `Bind \`${this.src(loopTargetNode(node.left))}\` to ${inspect(items[i], 1)}.`, iterScope)
      const stop = yield* this.runLoopBody(node.body, new Scope(iterScope, 'block', 'body'), label)
      if (stop) break
    }
  }

  private *execForIn(node: AnyNode, scope: Scope, label: string | null): Generator<StepInfo, void, void> {
    const target = yield* this.evaluate(node.right, scope)
    const keys = Array.isArray(target)
      ? target.map((_, i) => String(i))
      : target && typeof target === 'object'
        ? Object.keys(target)
        : []
    yield* this.emit(node.right, 'loop', 'Iterate keys', `Walk the keys of ${inspect(target, 1)} → [${keys.map((k) => `'${k}'`).join(', ')}].`, scope)

    for (let i = 0; i < keys.length; i++) {
      const iterScope = new Scope(scope, 'loop', `key ${i + 1}`)
      yield* this.declareLoopBinding(node.left, keys[i], iterScope)
      yield* this.emit(node.left, 'loop', `Key ${i + 1}/${keys.length}`, `Bind \`${this.src(loopTargetNode(node.left))}\` to '${keys[i]}'.`, iterScope)
      const stop = yield* this.runLoopBody(node.body, new Scope(iterScope, 'block', 'body'), label)
      if (stop) break
    }
  }

  private *declareLoopBinding(left: AnyNode, value: unknown, scope: Scope): Generator<StepInfo, void, void> {
    if (left.type === 'VariableDeclaration') {
      const decl = left.declarations[0]
      if (decl.id.type === 'Identifier') {
        scope.declare(decl.id.name, left.kind as BindingKind, value, false, this.stepIndex)
      } else {
        yield* this.bindPattern(decl.id, value, scope, left.kind as BindingKind)
      }
    } else {
      yield* this.assignToTarget(left, value, scope)
    }
  }

  /** Runs a loop body; returns true when the loop should stop. */
  private *runLoopBody(body: AnyNode, scope: Scope, label: string | null): Generator<StepInfo, boolean, void> {
    try {
      if (body.type === 'BlockStatement') yield* this.execBlockBody(body.body, scope)
      else yield* this.execStatement(body, scope)
    } catch (e) {
      if (e instanceof BreakSignal && (e.label === null || e.label === label)) return true
      if (e instanceof ContinueSignal && (e.label === null || e.label === label)) return false
      throw e
    }
    return false
  }

  private *execSwitch(node: AnyNode, scope: Scope): Generator<StepInfo, void, void> {
    const disc = yield* this.evaluate(node.discriminant, scope)
    const switchScope = new Scope(scope, 'block', 'switch')
    yield* this.emit(node.discriminant, 'branch', 'Switch on', `Switch on ${inspect(disc, 1)} — look for a matching \`case\`.`, switchScope)

    let matched = -1
    let defaultIndex = -1
    for (let i = 0; i < node.cases.length; i++) {
      const c = node.cases[i]
      if (!c.test) {
        defaultIndex = i
        continue
      }
      const testVal = yield* this.evaluate(c.test, switchScope)
      const hit = strictEquals(disc, testVal)
      yield* this.emit(c.test, 'branch', hit ? 'Case matches' : 'Case skipped', `\`case ${this.src(c.test)}\` ${hit ? 'matches' : `does not match ${inspect(disc, 1)}`}.`, switchScope)
      if (hit) {
        matched = i
        break
      }
    }
    if (matched === -1) {
      if (defaultIndex === -1) return
      matched = defaultIndex
      yield* this.emit(node.cases[defaultIndex], 'branch', 'Default', 'No case matched — run `default`.', switchScope)
    }

    try {
      for (let i = matched; i < node.cases.length; i++) {
        yield* this.hoistLexical(node.cases[i].consequent, switchScope)
        for (const stmt of node.cases[i].consequent) {
          yield* this.execStatement(stmt, switchScope)
        }
      }
    } catch (e) {
      if (e instanceof BreakSignal && e.label === null) return
      throw e
    }
  }

  private *execTry(node: AnyNode, scope: Scope): Generator<StepInfo, void, void> {
    let pending: unknown
    let hasPending = false

    try {
      yield* this.execBlockBody(node.block.body, new Scope(scope, 'block', 'try'))
    } catch (e) {
      if (e instanceof ThrowSignal && node.handler) {
        const catchScope = new Scope(scope, 'catch', 'catch')
        if (node.handler.param) {
          yield* this.bindPattern(node.handler.param, e.value, catchScope, 'let')
        }
        yield* this.emit(node.handler, 'catch', 'Caught', `Caught ${inspect(e.value, 1)}${node.handler.param ? ` as \`${this.src(node.handler.param)}\`` : ''}.`, catchScope)
        try {
          yield* this.execBlockBody(node.handler.body.body, catchScope)
        } catch (inner) {
          pending = inner
          hasPending = true
        }
      } else {
        pending = e
        hasPending = true
      }
    }

    if (node.finalizer) {
      yield* this.emit(node.finalizer, 'catch', 'Finally', 'Run the `finally` block — it happens either way.', scope)
      yield* this.execBlockBody(node.finalizer.body, new Scope(scope, 'block', 'finally'))
    }
    if (hasPending) throw pending
  }

  private *execLabeled(node: AnyNode, scope: Scope): Generator<StepInfo, void, void> {
    const label = node.label.name
    const body = node.body
    try {
      switch (body.type) {
        case 'ForStatement':
          yield* this.execFor(body, scope, label)
          break
        case 'ForOfStatement':
          yield* this.execForOf(body, scope, label)
          break
        case 'ForInStatement':
          yield* this.execForIn(body, scope, label)
          break
        case 'WhileStatement':
          yield* this.execWhile(body, scope, label)
          break
        case 'DoWhileStatement':
          yield* this.execDoWhile(body, scope, label)
          break
        default:
          yield* this.execStatement(body, scope)
      }
    } catch (e) {
      if (e instanceof BreakSignal && e.label === label) return
      throw e
    }
  }

  /* ---------------------------------------------------------------- */
  /* Patterns                                                          */
  /* ---------------------------------------------------------------- */

  private *bindPattern(pattern: AnyNode, value: unknown, scope: Scope, kind: BindingKind): Generator<StepInfo, void, void> {
    switch (pattern.type) {
      case 'Identifier':
        if (kind === 'var') scope.functionScope().declare(pattern.name, 'var', value, false, this.stepIndex)
        else scope.declare(pattern.name, kind, value, false, this.stepIndex)
        return

      case 'AssignmentPattern': {
        const resolved = value === undefined ? yield* this.evaluate(pattern.right, scope) : value
        yield* this.bindPattern(pattern.left, resolved, scope, kind)
        return
      }

      case 'ObjectPattern': {
        const taken = new Set<string>()
        for (const prop of pattern.properties) {
          if (prop.type === 'RestElement') {
            const rest: Record<string, unknown> = {}
            if (value && typeof value === 'object') {
              for (const [k, v] of Object.entries(value)) if (!taken.has(k)) rest[k] = v
            }
            yield* this.bindPattern(prop.argument, rest, scope, kind)
            continue
          }
          const key = prop.computed ? toStringValue(yield* this.evaluate(prop.key, scope)) : keyName(prop.key)
          taken.add(key)
          const sub = getMember(value, key, locOf(pattern).line, this.builtinCtx())
          yield* this.bindPattern(prop.value, sub, scope, kind)
        }
        return
      }

      case 'ArrayPattern': {
        const items = Array.isArray(value) ? value : toIterable(value, locOf(pattern).line)
        for (let i = 0; i < pattern.elements.length; i++) {
          const el = pattern.elements[i]
          if (!el) continue
          if (el.type === 'RestElement') {
            yield* this.bindPattern(el.argument, items.slice(i), scope, kind)
            break
          }
          yield* this.bindPattern(el, items[i], scope, kind)
        }
        return
      }

      default:
        throw new UnsupportedError(`Unsupported binding pattern: ${pattern.type}`, locOf(pattern).line)
    }
  }

  /** Assign (no declaration) — used by `=` and by for-of over existing vars. */
  private *assignToTarget(target: AnyNode, value: unknown, scope: Scope): Generator<StepInfo, void, void> {
    switch (target.type) {
      case 'Identifier':
        scope.set(target.name, value, this.stepIndex, locOf(target).line)
        return

      case 'MemberExpression': {
        const obj = yield* this.evaluate(target.object, scope)
        const key = target.computed ? yield* this.evaluate(target.property, scope) : keyName(target.property)
        setMember(obj, key, value, locOf(target).line)
        return
      }

      case 'VariableDeclaration':
        yield* this.declareLoopBinding(target, value, scope)
        return

      case 'AssignmentPattern': {
        const resolved = value === undefined ? yield* this.evaluate(target.right, scope) : value
        yield* this.assignToTarget(target.left, resolved, scope)
        return
      }

      case 'ObjectPattern': {
        const taken = new Set<string>()
        for (const prop of target.properties) {
          if (prop.type === 'RestElement') {
            const rest: Record<string, unknown> = {}
            if (value && typeof value === 'object') {
              for (const [k, v] of Object.entries(value)) if (!taken.has(k)) rest[k] = v
            }
            yield* this.assignToTarget(prop.argument, rest, scope)
            continue
          }
          const key = prop.computed ? toStringValue(yield* this.evaluate(prop.key, scope)) : keyName(prop.key)
          taken.add(key)
          yield* this.assignToTarget(prop.value, getMember(value, key, locOf(target).line, this.builtinCtx()), scope)
        }
        return
      }

      case 'ArrayPattern': {
        const items = Array.isArray(value) ? value : toIterable(value, locOf(target).line)
        for (let i = 0; i < target.elements.length; i++) {
          const el = target.elements[i]
          if (!el) continue
          if (el.type === 'RestElement') {
            yield* this.assignToTarget(el.argument, items.slice(i), scope)
            break
          }
          yield* this.assignToTarget(el, items[i], scope)
        }
        return
      }

      default:
        throw new UnsupportedError(`Cannot assign to ${target.type}`, locOf(target).line)
    }
  }

  /* ---------------------------------------------------------------- */
  /* Expressions                                                       */
  /* ---------------------------------------------------------------- */

  private *evaluate(node: AnyNode, scope: Scope): Generator<StepInfo, unknown, void> {
    switch (node.type) {
      case 'Literal':
        return node.regex ? new RegExp(node.regex.pattern, node.regex.flags) : node.value

      case 'Identifier':
        if (node.name === 'undefined') return undefined
        return scope.get(node.name, locOf(node).line)

      case 'ThisExpression':
        return scope.resolveThis()

      case 'TemplateLiteral': {
        let out = ''
        for (let i = 0; i < node.quasis.length; i++) {
          out += node.quasis[i].value.cooked
          if (i < node.expressions.length) {
            out += toStringValue(yield* this.evaluate(node.expressions[i], scope))
          }
        }
        return out
      }

      case 'ArrayExpression': {
        const out: unknown[] = []
        for (const el of node.elements) {
          if (!el) {
            out.length++
            continue
          }
          if (el.type === 'SpreadElement') {
            out.push(...toIterable(yield* this.evaluate(el.argument, scope), locOf(el).line))
          } else {
            out.push(yield* this.evaluate(el, scope))
          }
        }
        return out
      }

      case 'ObjectExpression': {
        const out: Record<string, unknown> = {}
        for (const prop of node.properties) {
          if (prop.type === 'SpreadElement') {
            const src = yield* this.evaluate(prop.argument, scope)
            if (Array.isArray(src)) src.forEach((v, i) => (out[i] = v))
            else if (src && typeof src === 'object') Object.assign(out, src)
            continue
          }
          const key = prop.computed ? toStringValue(yield* this.evaluate(prop.key, scope)) : keyName(prop.key)
          if (prop.kind === 'get' || prop.kind === 'set') {
            throw new UnsupportedError('Getters and setters are not supported yet.', locOf(prop).line)
          }
          out[key] = yield* this.evaluate(prop.value, scope)
          if (out[key] instanceof InterpFunction && !(out[key] as InterpFunction).name) {
            ;(out[key] as InterpFunction).name = key
          }
        }
        return out
      }

      case 'FunctionExpression':
        return new InterpFunction(node, scope, node.id?.name ?? '', false)

      case 'ArrowFunctionExpression':
        return new InterpFunction(node, scope, '', true, scope.resolveThis())

      case 'ClassExpression':
        return yield* this.buildClass(node, scope)

      case 'MemberExpression': {
        const obj = yield* this.evaluate(node.object, scope)
        if (obj === SHORT) return SHORT
        if (node.optional && (obj === null || obj === undefined)) return SHORT
        if (node.object.type === 'Super') {
          const key = node.computed ? yield* this.evaluate(node.property, scope) : keyName(node.property)
          return getMember(obj, key, locOf(node).line, this.builtinCtx())
        }
        const key = node.computed ? yield* this.evaluate(node.property, scope) : keyName(node.property)
        return getMember(obj, key, locOf(node).line, this.builtinCtx())
      }

      case 'ChainExpression': {
        const v = yield* this.evaluate(node.expression, scope)
        return v === SHORT ? undefined : v
      }

      case 'CallExpression':
        return yield* this.evalCall(node, scope)

      case 'NewExpression': {
        const callee = yield* this.evaluate(node.callee, scope)
        const args = yield* this.evalArgs(node.arguments, scope)
        if (callee instanceof NativeFunction) {
          // `new Error('x')` and friends.
          return callee.fn(args, undefined)
        }
        if (!(callee instanceof InterpClass) && !(callee instanceof InterpFunction)) {
          throw new ThrowSignal(makeError('TypeError', `${this.src(node.callee)} is not a constructor`), locOf(node).line)
        }
        yield* this.emit(node, 'call', 'New instance', `Create a new \`${nameOfCallee(callee)}\` with (${args.map((a) => inspect(a, 1)).join(', ')}).`, scope)
        return yield* this.construct(callee, args, node, scope)
      }

      case 'UnaryExpression':
        return yield* this.evalUnary(node, scope)

      case 'UpdateExpression':
        return yield* this.evalUpdate(node, scope)

      case 'BinaryExpression': {
        const left = yield* this.evaluate(node.left, scope)
        const right = yield* this.evaluate(node.right, scope)
        return this.binary(node.operator, left, right, locOf(node).line)
      }

      case 'LogicalExpression': {
        const left = yield* this.evaluate(node.left, scope)
        if (node.operator === '&&' && !truthy(left)) return left
        if (node.operator === '||' && truthy(left)) return left
        if (node.operator === '??' && left !== null && left !== undefined) return left
        return yield* this.evaluate(node.right, scope)
      }

      case 'ConditionalExpression': {
        const test = yield* this.evaluate(node.test, scope)
        const ok = truthy(test)
        yield* this.emit(node.test, 'branch', ok ? 'Ternary ✓' : 'Ternary ✗', `\`${this.src(node.test)}\` is ${inspect(test, 1)} → use the ${ok ? 'first' : 'second'} branch.`, scope)
        return yield* this.evaluate(ok ? node.consequent : node.alternate, scope)
      }

      case 'AssignmentExpression':
        return yield* this.evalAssignment(node, scope)

      case 'SequenceExpression': {
        let last: unknown
        for (const expr of node.expressions) last = yield* this.evaluate(expr, scope)
        return last
      }

      case 'SpreadElement':
        return yield* this.evaluate(node.argument, scope)

      case 'Super':
        return scope.get('%superproto%', locOf(node).line)

      case 'TaggedTemplateExpression':
        throw new UnsupportedError('Tagged template literals are not supported yet.', locOf(node).line)

      case 'AwaitExpression':
      case 'YieldExpression':
        throw new UnsupportedError(
          `\`${node.type === 'AwaitExpression' ? 'await' : 'yield'}\` is not supported — CodeFlow visualizes synchronous code.`,
          locOf(node).line,
        )

      default:
        throw new UnsupportedError(`Unsupported syntax: ${node.type}`, locOf(node).line)
    }
  }

  private *evalArgs(nodes: AnyNode[], scope: Scope): Generator<StepInfo, unknown[], void> {
    const args: unknown[] = []
    for (const arg of nodes) {
      if (arg.type === 'SpreadElement') {
        args.push(...toIterable(yield* this.evaluate(arg.argument, scope), locOf(arg).line))
      } else {
        args.push(yield* this.evaluate(arg, scope))
      }
    }
    return args
  }

  private *evalCall(node: AnyNode, scope: Scope): Generator<StepInfo, unknown, void> {
    // `super(...)` — run the parent constructor against the current `this`.
    if (node.callee.type === 'Super') {
      const args = yield* this.evalArgs(node.arguments, scope)
      const init = scope.get('%superinit%', locOf(node).line) as SuperInit
      yield* this.emit(node, 'call', 'super()', `Call the parent constructor \`${init.cls.name}\` with (${args.map((a) => inspect(a, 1)).join(', ')}).`, scope)
      yield* this.initInstance(init.cls, init.obj, args, node, scope)
      yield* this.initFields(init.self, init.obj)
      return undefined
    }

    let thisVal: unknown
    let callee: unknown

    if (node.callee.type === 'MemberExpression') {
      const obj = yield* this.evaluate(node.callee.object, scope)
      if (obj === SHORT) return SHORT
      if (node.callee.optional && (obj === null || obj === undefined)) return SHORT
      const key = node.callee.computed ? yield* this.evaluate(node.callee.property, scope) : keyName(node.callee.property)
      callee = getMember(obj, key, locOf(node).line, this.builtinCtx())
      thisVal = node.callee.object.type === 'Super' ? scope.resolveThis() : obj
      if (!isCallable(callee)) {
        if (node.optional && (callee === null || callee === undefined)) return SHORT
        throw new ThrowSignal(makeError('TypeError', `${this.src(node.callee)} is not a function`), locOf(node).line)
      }
    } else {
      callee = yield* this.evaluate(node.callee, scope)
      if (callee === SHORT) return SHORT
      if (!isCallable(callee)) {
        if (node.optional && (callee === null || callee === undefined)) return SHORT
        throw new ThrowSignal(makeError('TypeError', `${this.src(node.callee)} is not a function`), locOf(node).line)
      }
    }

    const args = yield* this.evalArgs(node.arguments, scope)
    const name = nameOfCallee(callee) || this.src(node.callee)

    if (callee instanceof InterpFunction) {
      yield* this.emit(
        node,
        'call',
        'Call',
        `Call \`${name}(${args.map((a) => inspect(a, 1)).join(', ')})\` — push a new frame onto the call stack.`,
        scope,
      )
    } else if (isConsoleLog(node)) {
      // The log step is emitted after the write so the panel already shows it.
      // Evaluating the arguments may have moved `line` into another function;
      // attribute the output to the console.log call site itself.
      this.line = locOf(node).line
      const result = yield* this.callValue(callee, args, thisVal, locOf(node).line, name)
      yield* this.emit(node, 'output', 'Log', `Print ${args.map((a) => inspect(a, 1)).join(', ')} to the console.`, scope)
      return result
    }

    return yield* this.callValue(callee, args, thisVal, locOf(node).line, name, node, scope)
  }

  /** Invoke any callable, pushing a stack frame for user-defined functions. */
  *callValue(
    callee: unknown,
    args: unknown[],
    thisVal: unknown,
    line: number,
    name: string,
    node?: AnyNode,
    callerScope?: Scope,
  ): Generator<StepInfo, unknown, void> {
    if (callee instanceof NativeFunction) {
      if (callee.isGenerator) {
        return yield* (callee.fn(args, thisVal) as Generator<StepInfo, unknown, void>)
      }
      return callee.fn(args, thisVal)
    }

    if (callee instanceof InterpClass) {
      throw new ThrowSignal(
        makeError('TypeError', `Class constructor ${callee.name} cannot be invoked without 'new'`),
        line,
      )
    }

    if (!(callee instanceof InterpFunction)) {
      throw new ThrowSignal(makeError('TypeError', `${name} is not a function`), line)
    }

    const fn = callee
    const effectiveThis = fn.isArrow ? fn.boundThis : thisVal
    const fnScope = new Scope(fn.closure, 'function', fn.name || '(anonymous)', effectiveThis, !fn.isArrow)

    if (fn.homeObject) {
      fnScope.declare('%superproto%', 'builtin', Object.getPrototypeOf(fn.homeObject), false, 0)
    }

    const frame: Frame = {
      id: this.frameId++,
      name: fn.name || (fn.isArrow ? '(arrow)' : '(anonymous)'),
      kind: fn.isArrow ? 'arrow' : fn.homeObject ? 'method' : 'function',
      baseScope: fnScope,
      currentScope: fnScope,
      line,
      args,
      thisVal: effectiveThis,
    }

    if (this.stack.length >= MAX_STACK) {
      throw new ThrowSignal(makeError('RangeError', 'Maximum call stack size exceeded'), line)
    }
    this.stack.push(frame)

    try {
      yield* this.bindParams(fn.node.params, args, fnScope)

      const paramText = fn.node.params
        .map((p: AnyNode, i: number) => `${this.src(p)} = ${inspect(args[i], 1)}`)
        .join(', ')
      yield* this.emit(
        fn.node.body,
        'call',
        'Enter',
        `Enter \`${frame.name}\`${paramText ? ` with ${paramText}` : ' (no parameters)'}.`,
        fnScope,
      )

      if (fn.node.body.type !== 'BlockStatement') {
        // Concise arrow body: `x => x * 2`
        const value = yield* this.evaluate(fn.node.body, fnScope)
        yield* this.emit(fn.node.body, 'return', 'Return', `Return ${inspect(value, 1)} from \`${frame.name}\`.`, fnScope)
        return value
      }

      this.hoistVars(fn.node.body.body, fnScope)
      yield* this.execBlockBody(fn.node.body.body, fnScope)
      return undefined
    } catch (e) {
      if (e instanceof ReturnSignal) return e.value
      throw e
    } finally {
      this.stack.pop()
      const caller = this.stack[this.stack.length - 1]
      if (caller && callerScope) caller.currentScope = callerScope
    }
  }

  private *bindParams(params: AnyNode[], args: unknown[], scope: Scope): Generator<StepInfo, void, void> {
    for (let i = 0; i < params.length; i++) {
      const p = params[i]
      if (p.type === 'RestElement') {
        yield* this.bindPattern(p.argument, args.slice(i), scope, 'param')
        break
      }
      yield* this.bindPattern(p, args[i], scope, 'param')
    }
    scope.declare('arguments', 'builtin', [...args], false, this.stepIndex)
  }

  /* ---------------------------------------------------------------- */
  /* Classes                                                           */
  /* ---------------------------------------------------------------- */

  private *buildClass(node: AnyNode, scope: Scope): Generator<StepInfo, InterpClass, void> {
    let superClass: InterpClass | null = null
    if (node.superClass) {
      const sc = yield* this.evaluate(node.superClass, scope)
      if (!(sc instanceof InterpClass)) {
        throw new ThrowSignal(makeError('TypeError', 'Class extends value is not a constructor'), locOf(node).line)
      }
      superClass = sc
    }

    const proto: Record<string, unknown> = superClass ? Object.create(superClass.proto) : {}
    const staticProps: Record<string, unknown> = {}
    const fields: { name: string; value: AnyNode | null }[] = []
    let ctor: InterpFunction | null = null

    const cls = new InterpClass(node.id?.name ?? '', null, proto, superClass, staticProps, fields, scope, node)
    // Non-enumerable, like the real thing, so it never shows up as a data key.
    Object.defineProperty(proto, 'constructor', { value: cls, writable: true, configurable: true, enumerable: false })

    for (const el of node.body.body) {
      if (el.type === 'PropertyDefinition') {
        const name = el.computed ? toStringValue(yield* this.evaluate(el.key, scope)) : keyName(el.key)
        if (el.static) staticProps[name] = el.value ? yield* this.evaluate(el.value, scope) : undefined
        else fields.push({ name, value: el.value })
        continue
      }
      if (el.type !== 'MethodDefinition') continue

      const name = el.computed ? toStringValue(yield* this.evaluate(el.key, scope)) : keyName(el.key)
      const fn = new InterpFunction(el.value, scope, name, false, undefined, el.static ? staticProps : proto)

      if (el.kind === 'constructor') ctor = fn
      else if (el.static) staticProps[name] = fn
      else proto[name] = fn
    }

    cls.ctor = ctor
    return cls
  }

  private *construct(callee: InterpClass | InterpFunction, args: unknown[], node: AnyNode, scope: Scope): Generator<StepInfo, unknown, void> {
    if (callee instanceof InterpFunction) {
      // Constructor-function style: `function Point(x, y) { this.x = x }`
      const obj: Record<string, unknown> = {}
      const result = yield* this.callValue(callee, args, obj, locOf(node).line, callee.name, node, scope)
      return result && typeof result === 'object' ? result : obj
    }
    const obj = Object.create(callee.proto) as Record<string, unknown>
    yield* this.initInstance(callee, obj, args, node, scope)
    return obj
  }

  private *initInstance(cls: InterpClass, obj: Record<string, unknown>, args: unknown[], node: AnyNode, scope: Scope): Generator<StepInfo, void, void> {
    const explicitSuper = cls.ctor ? containsSuperCall(cls.ctor.node) : false

    if (cls.superClass && !explicitSuper) {
      yield* this.initInstance(cls.superClass, obj, args, node, scope)
    }
    if (!explicitSuper) {
      yield* this.initFields(cls, obj)
    }
    if (!cls.ctor) return

    const ctorScope = new Scope(cls.closure, 'function', `${cls.name}.constructor`, obj, true)
    ctorScope.declare('%superproto%', 'builtin', cls.superClass?.proto ?? null, false, 0)
    if (cls.superClass) {
      const init: SuperInit = { cls: cls.superClass, obj, self: cls }
      ctorScope.declare('%superinit%', 'builtin', init, false, 0)
    }

    const frame: Frame = {
      id: this.frameId++,
      name: `new ${cls.name}`,
      kind: 'constructor',
      baseScope: ctorScope,
      currentScope: ctorScope,
      line: locOf(node).line,
      args,
      thisVal: obj,
    }
    if (this.stack.length >= MAX_STACK) {
      throw new ThrowSignal(makeError('RangeError', 'Maximum call stack size exceeded'), locOf(node).line)
    }
    this.stack.push(frame)

    try {
      yield* this.bindParams(cls.ctor.node.params, args, ctorScope)
      yield* this.emit(cls.ctor.node.body, 'call', 'Constructor', `Run \`${cls.name}\`'s constructor — \`this\` is the new object.`, ctorScope)
      yield* this.execBlockBody(cls.ctor.node.body.body, ctorScope)
    } catch (e) {
      if (!(e instanceof ReturnSignal)) throw e
    } finally {
      this.stack.pop()
      const caller = this.stack[this.stack.length - 1]
      if (caller) caller.currentScope = scope
    }
  }

  private *initFields(cls: InterpClass, obj: Record<string, unknown>): Generator<StepInfo, void, void> {
    if (cls.fields.length === 0) return
    const fieldScope = new Scope(cls.closure, 'class', `${cls.name} fields`, obj, true)
    for (const f of cls.fields) {
      obj[f.name] = f.value ? yield* this.evaluate(f.value, fieldScope) : undefined
    }
  }

  /* ---------------------------------------------------------------- */
  /* Operators                                                         */
  /* ---------------------------------------------------------------- */

  private *evalUnary(node: AnyNode, scope: Scope): Generator<StepInfo, unknown, void> {
    if (node.operator === 'typeof' && node.argument.type === 'Identifier' && !scope.has(node.argument.name)) {
      return 'undefined'
    }
    if (node.operator === 'delete') {
      if (node.argument.type === 'MemberExpression') {
        const obj = yield* this.evaluate(node.argument.object, scope)
        const key = node.argument.computed
          ? toStringValue(yield* this.evaluate(node.argument.property, scope))
          : keyName(node.argument.property)
        if (Array.isArray(obj)) {
          delete obj[Number(key)]
          return true
        }
        if (obj && typeof obj === 'object') {
          delete (obj as Record<string, unknown>)[key]
          return true
        }
      }
      return true
    }

    const v = yield* this.evaluate(node.argument, scope)
    switch (node.operator) {
      case '-':
        return -toNumber(v)
      case '+':
        return toNumber(v)
      case '!':
        return !truthy(v)
      case '~':
        return ~toNumber(v)
      case 'typeof':
        return typeOf(v)
      case 'void':
        return undefined
      default:
        throw new UnsupportedError(`Unsupported unary operator: ${node.operator}`, locOf(node).line)
    }
  }

  private *evalUpdate(node: AnyNode, scope: Scope): Generator<StepInfo, unknown, void> {
    const line = locOf(node).line
    const delta = node.operator === '++' ? 1 : -1

    if (node.argument.type === 'Identifier') {
      const name = node.argument.name
      const old = toNumber(scope.get(name, line))
      const next = old + delta
      scope.set(name, next, this.stepIndex, line)
      yield* this.emit(node, 'assign', node.operator === '++' ? 'Increment' : 'Decrement', `\`${name}\` goes from ${old} to ${next}.`, scope)
      return node.prefix ? next : old
    }

    const obj = yield* this.evaluate(node.argument.object, scope)
    const key = node.argument.computed ? yield* this.evaluate(node.argument.property, scope) : keyName(node.argument.property)
    const old = toNumber(getMember(obj, key, line, this.builtinCtx()))
    const next = old + delta
    setMember(obj, key, next, line)
    yield* this.emit(node, 'assign', node.operator === '++' ? 'Increment' : 'Decrement', `\`${this.src(node.argument)}\` goes from ${old} to ${next}.`, scope)
    return node.prefix ? next : old
  }

  private *evalAssignment(node: AnyNode, scope: Scope): Generator<StepInfo, unknown, void> {
    const line = locOf(node).line
    const op = node.operator

    if (op === '=') {
      const value = yield* this.evaluate(node.right, scope)
      yield* this.assignToTarget(node.left, value, scope)
      yield* this.emit(node, 'assign', 'Assign', `Set \`${this.src(node.left)}\` to ${inspect(value, 1)}.`, scope)
      return value
    }

    // Logical assignment short-circuits before touching the target.
    if (op === '&&=' || op === '||=' || op === '??=') {
      const current = yield* this.evaluate(node.left, scope)
      const shouldAssign =
        op === '&&=' ? truthy(current) : op === '||=' ? !truthy(current) : current === null || current === undefined
      if (!shouldAssign) return current
      const value = yield* this.evaluate(node.right, scope)
      yield* this.assignToTarget(node.left, value, scope)
      yield* this.emit(node, 'assign', 'Assign', `Set \`${this.src(node.left)}\` to ${inspect(value, 1)}.`, scope)
      return value
    }

    const current = yield* this.evaluate(node.left, scope)
    const rhs = yield* this.evaluate(node.right, scope)
    const value = this.binary(op.slice(0, -1), current, rhs, line)
    yield* this.assignToTarget(node.left, value, scope)
    yield* this.emit(node, 'assign', 'Update', `\`${this.src(node.left)}\` ${op} ${inspect(rhs, 1)} → ${inspect(value, 1)}.`, scope)
    return value
  }

  private binary(op: string, l: unknown, r: unknown, line: number): unknown {
    switch (op) {
      case '+': {
        if (typeof l === 'string' || typeof r === 'string') return toStringValue(l) + toStringValue(r)
        if (Array.isArray(l) || Array.isArray(r) || (l && typeof l === 'object') || (r && typeof r === 'object')) {
          return toStringValue(l) + toStringValue(r)
        }
        return toNumber(l) + toNumber(r)
      }
      case '-':
        return toNumber(l) - toNumber(r)
      case '*':
        return toNumber(l) * toNumber(r)
      case '/':
        return toNumber(l) / toNumber(r)
      case '%':
        return toNumber(l) % toNumber(r)
      case '**':
        return toNumber(l) ** toNumber(r)
      case '==':
        return looseEquals(l, r)
      case '!=':
        return !looseEquals(l, r)
      case '===':
        return strictEquals(l, r)
      case '!==':
        return !strictEquals(l, r)
      case '<':
      case '>':
      case '<=':
      case '>=': {
        const bothStrings = typeof l === 'string' && typeof r === 'string'
        const a = bothStrings ? (l as string) : toNumber(l)
        const b = bothStrings ? (r as string) : toNumber(r)
        if (op === '<') return a < b
        if (op === '>') return a > b
        if (op === '<=') return a <= b
        return a >= b
      }
      case '&':
        return toNumber(l) & toNumber(r)
      case '|':
        return toNumber(l) | toNumber(r)
      case '^':
        return toNumber(l) ^ toNumber(r)
      case '<<':
        return toNumber(l) << toNumber(r)
      case '>>':
        return toNumber(l) >> toNumber(r)
      case '>>>':
        return toNumber(l) >>> toNumber(r)
      case 'instanceof':
        return isInstanceOf(l, r)
      case 'in': {
        const key = toStringValue(l)
        if (Array.isArray(r)) return Number(key) < r.length && Number(key) >= 0
        if (r && typeof r === 'object') return key in (r as object)
        return false
      }
      default:
        throw new UnsupportedError(`Unsupported operator: ${op}`, line)
    }
  }

  private builtinCtx(): BuiltinCtx {
    return {
      call: (fn, args, thisVal, line) => this.callValue(fn, args, thisVal, line, nameOfCallee(fn)),
      log: (entry) => {
        this.output.push({ ...entry, id: this.logId++ })
      },
      currentLine: () => this.line,
    }
  }
}

interface SuperInit {
  cls: InterpClass
  obj: Record<string, unknown>
  self: InterpClass
}

const MAX_STACK = 60

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function locOf(node: AnyNode): Loc {
  const start = node?.loc?.start
  const end = node?.loc?.end
  return {
    line: start?.line ?? 1,
    col: start?.column ?? 0,
    endLine: end?.line ?? start?.line ?? 1,
    endCol: end?.column ?? (start?.column ?? 0) + 1,
  }
}

function lastNode(list: AnyNode[]): AnyNode | undefined {
  return list[list.length - 1]
}

function keyName(node: AnyNode): string {
  if (node.type === 'Identifier') return node.name
  if (node.type === 'Literal') return toStringValue(node.value)
  if (node.type === 'PrivateIdentifier') return `#${node.name}`
  return String(node.name ?? node.value ?? '')
}

function patternNames(pattern: AnyNode, out: string[] = []): string[] {
  if (!pattern) return out
  switch (pattern.type) {
    case 'Identifier':
      out.push(pattern.name)
      break
    case 'ObjectPattern':
      for (const p of pattern.properties) {
        patternNames(p.type === 'RestElement' ? p.argument : p.value, out)
      }
      break
    case 'ArrayPattern':
      for (const el of pattern.elements) if (el) patternNames(el.type === 'RestElement' ? el.argument : el, out)
      break
    case 'AssignmentPattern':
      patternNames(pattern.left, out)
      break
    case 'RestElement':
      patternNames(pattern.argument, out)
      break
  }
  return out
}

function loopTargetNode(left: AnyNode): AnyNode {
  return left.type === 'VariableDeclaration' ? left.declarations[0].id : left
}

function toIterable(value: unknown, line: number): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' || value instanceof Map || value instanceof Set) return toList(value)
  if (value && typeof value === 'object' && typeof (value as { length?: number }).length === 'number') {
    return Array.from({ length: (value as { length: number }).length }, (_, i) => (value as Record<number, unknown>)[i])
  }
  throw new ThrowSignal(makeError('TypeError', `${inspect(value, 1)} is not iterable`), line)
}

function nameOfCallee(fn: unknown): string {
  if (fn instanceof InterpFunction) return fn.name || '(anonymous)'
  if (fn instanceof NativeFunction) return fn.name
  if (fn instanceof InterpClass) return fn.name
  return 'value'
}

function isConsoleLog(node: AnyNode): boolean {
  return (
    node.callee?.type === 'MemberExpression' &&
    node.callee.object?.type === 'Identifier' &&
    node.callee.object.name === 'console'
  )
}

function isInstanceOf(value: unknown, ctor: unknown): boolean {
  if (!(ctor instanceof InterpClass)) {
    if (ctor instanceof NativeFunction && value && typeof value === 'object') {
      return (value as Record<string, unknown>).name === ctor.name || (value as Record<string, unknown>).__isError === true
    }
    return false
  }
  if (!value || typeof value !== 'object') return false
  let proto = Object.getPrototypeOf(value)
  while (proto) {
    if (proto === ctor.proto) return true
    proto = Object.getPrototypeOf(proto)
  }
  return false
}

function looseEquals(l: unknown, r: unknown): boolean {
  if (l === null || l === undefined) return r === null || r === undefined
  if (r === null || r === undefined) return false
  if (typeof l === typeof r) return l === r
  if (typeof l === 'boolean') return looseEquals(toNumber(l), r)
  if (typeof r === 'boolean') return looseEquals(l, toNumber(r))
  if (typeof l === 'number' && typeof r === 'string') return l === toNumber(r)
  if (typeof l === 'string' && typeof r === 'number') return toNumber(l) === r
  if (typeof l === 'object' || typeof r === 'object') return toStringValue(l) === toStringValue(r)
  return false
}

/** Does this constructor body call `super(...)` directly? */
function containsSuperCall(fnNode: AnyNode): boolean {
  let found = false
  const walk = (node: AnyNode): void => {
    if (found || !node || typeof node !== 'object') return
    if (node.type === 'CallExpression' && node.callee?.type === 'Super') {
      found = true
      return
    }
    if (node !== fnNode && (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration')) {
      return
    }
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue
      const child = node[key]
      if (Array.isArray(child)) child.forEach(walk)
      else if (child && typeof child === 'object' && typeof child.type === 'string') walk(child)
    }
  }
  walk(fnNode.body)
  return found
}

export { className }
