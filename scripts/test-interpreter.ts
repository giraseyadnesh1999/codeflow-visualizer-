/* Smoke tests for the interpreter. Run with: npx tsx scripts/test-interpreter.ts */
import { runProgram } from '../src/lib/interpreter/run'
import { EXAMPLES } from '../src/lib/examples'

let passed = 0
let failed = 0

function check(name: string, source: string, expected: string[]) {
  const trace = runProgram(source)
  const actual = trace.snapshots[trace.snapshots.length - 1]?.output.map((o) => o.text) ?? []
  const ok = !trace.error && JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    passed++
    console.log(`  ok   ${name}  (${trace.snapshots.length} steps)`)
  } else {
    failed++
    console.log(`  FAIL ${name}`)
    console.log(`       expected: ${JSON.stringify(expected)}`)
    console.log(`       actual:   ${JSON.stringify(actual)}`)
    if (trace.error) console.log(`       error:    ${trace.error.kind} @${trace.error.line}: ${trace.error.message}`)
  }
}

function checkError(name: string, source: string, fragment: string) {
  const trace = runProgram(source)
  const ok = trace.error && trace.error.message.includes(fragment)
  if (ok) {
    passed++
    console.log(`  ok   ${name}`)
  } else {
    failed++
    console.log(`  FAIL ${name} — expected error containing "${fragment}", got ${trace.error?.message ?? 'no error'}`)
  }
}

console.log('\nbasics')
check('literals + arithmetic', 'console.log(1 + 2 * 3)', ['7'])
check('string concat', 'console.log("a" + 1)', ['a1'])
check('let/const', 'let a = 1; const b = 2; a = a + b; console.log(a)', ['3'])
check('template literal', 'const n = "world"; console.log(`hi ${n} ${1 + 1}`)', ['hi world 2'])
check('typeof', 'console.log(typeof 1, typeof "s", typeof undefined, typeof {})', ['number string undefined object'])
check('ternary', 'console.log(5 > 3 ? "yes" : "no")', ['yes'])

console.log('\ncontrol flow')
check('if/else', 'const x = 5; if (x > 3) { console.log("big") } else { console.log("small") }', ['big'])
check('for loop', 'let s = 0; for (let i = 1; i <= 4; i++) s += i; console.log(s)', ['10'])
check('while', 'let i = 0; while (i < 3) { i++ } console.log(i)', ['3'])
check('do/while', 'let i = 10; do { i++ } while (i < 3); console.log(i)', ['11'])
check('for-of', 'for (const c of [1,2,3]) console.log(c)', ['1', '2', '3'])
check('for-in', 'for (const k in {a:1,b:2}) console.log(k)', ['a', 'b'])
check('break/continue', 'for (let i=0;i<5;i++){ if(i===1) continue; if(i===3) break; console.log(i) }', ['0', '2'])
check('labeled break', 'outer: for(let i=0;i<3;i++){ for(let j=0;j<3;j++){ if(j===1) continue outer; console.log(i,j) } }', ['0 0', '1 0', '2 0'])
check('switch', 'switch(2){ case 1: console.log("a"); break; case 2: console.log("b"); case 3: console.log("c"); break; default: console.log("d") }', ['b', 'c'])
check('switch default', 'switch(9){ case 1: console.log("a"); break; default: console.log("d") }', ['d'])

console.log('\nfunctions')
check('declaration + hoisting', 'console.log(f(2)); function f(x){ return x*2 }', ['4'])
check('recursion', 'function fact(n){ return n <= 1 ? 1 : n * fact(n-1) } console.log(fact(5))', ['120'])
check('arrow', 'const dbl = x => x * 2; console.log(dbl(21))', ['42'])
check('closure counter', 'function mk(){ let c = 0; return () => ++c } const c = mk(); c(); console.log(c())', ['2'])
check('default params', 'function f(a, b = 10){ return a + b } console.log(f(5))', ['15'])
check('rest params', 'function sum(...ns){ return ns.reduce((a,b)=>a+b, 0) } console.log(sum(1,2,3))', ['6'])
check('spread call', 'function f(a,b,c){return a+b+c} console.log(f(...[1,2,3]))', ['6'])
check('IIFE', 'console.log((function(){ return 7 })())', ['7'])
check('fibonacci', 'function fib(n){ return n < 2 ? n : fib(n-1) + fib(n-2) } console.log(fib(8))', ['21'])

console.log('\ndata structures')
check('array literal + index', 'const a = [1,2,3]; console.log(a[1], a.length)', ['2 3'])
check('array mutation', 'const a = []; a.push(1); a.push(2); console.log(a)', ['[1, 2]'])
check('map', 'console.log([1,2,3].map(x => x * 2))', ['[2, 4, 6]'])
check('filter+reduce', 'console.log([1,2,3,4].filter(n=>n%2===0).reduce((a,b)=>a+b,0))', ['6'])
check('sort with comparator', 'console.log([3,1,2].sort((a,b)=>a-b))', ['[1, 2, 3]'])
check('object literal', 'const o = {a:1, b:{c:2}}; console.log(o.b.c)', ['2'])
check('object mutation', 'const o = {}; o.x = 5; o["y"] = 6; console.log(o)', ["{ x: 5, y: 6 }"])
check('destructure array', 'const [a, b] = [1, 2]; console.log(a, b)', ['1 2'])
check('destructure object', 'const {x, y: z} = {x: 1, y: 2}; console.log(x, z)', ['1 2'])
check('swap', 'let a=1, b=2; [a,b]=[b,a]; console.log(a,b)', ['2 1'])
check('spread array/object', 'console.log([...[1,2], 3], {...{a:1}, b:2})', ['[1, 2, 3] { a: 1, b: 2 }'])
check('nested destructure + default', 'const {a: {b = 9} = {}} = {a: {}}; console.log(b)', ['9'])
check('Object.keys/entries', 'console.log(Object.keys({a:1,b:2}), Object.entries({a:1}))', ["['a', 'b'] [[0, 'a'], [1, 1]]".replace("[[0, 'a'], [1, 1]]", "[['a', 1]]")])
check('string methods', 'console.log("Hello".toUpperCase(), "a,b".split(","), " x ".trim())', ["HELLO ['a', 'b'] x"])
check('optional chaining', 'const o = {a: null}; console.log(o?.a?.b, o.missing?.deep)', ['undefined undefined'])

console.log('\nclasses')
check(
  'class + method',
  'class P { constructor(x){ this.x = x } get2(){ return this.x * 2 } } console.log(new P(4).get2())',
  ['8'],
)
check(
  'inheritance + super',
  `class A { constructor(n){ this.n = n } who(){ return "A" + this.n } }
   class B extends A { constructor(n){ super(n * 2) } who(){ return "B" + super.who() } }
   console.log(new B(3).who())`,
  ['BA6'],
)
check('class fields', 'class C { count = 5; bump(){ return ++this.count } } console.log(new C().bump())', ['6'])
check('static', 'class C { static make(){ return new C() } } console.log(typeof C.make())', ['object'])
check('instanceof', 'class A{} class B extends A{} console.log(new B() instanceof A, new B() instanceof B)', ['true true'])
check('constructor function', 'function P(x){ this.x = x } const p = new P(3); console.log(p.x)', ['3'])

console.log('\nerrors')
check('try/catch', 'try { throw new Error("boom") } catch (e) { console.log(e.message) }', ['boom'])
check('try/finally', 'try { throw new Error("x") } catch(e){ console.log("caught") } finally { console.log("fin") }', ['caught', 'fin'])
check('finally after return', 'function f(){ try { return 1 } finally { console.log("fin") } } console.log(f())', ['fin', '1'])
check('rethrow', 'try { try { throw new Error("a") } catch(e) { throw new Error("b") } } catch(e) { console.log(e.message) }', ['b'])
checkError('undefined variable', 'console.log(nope)', 'nope is not defined')
checkError('const reassign', 'const a = 1; a = 2', 'Assignment to constant')
checkError('TDZ', 'console.log(x); let x = 1', 'before initialization')
checkError('not a function', 'const a = 1; a()', 'is not a function')
checkError('null property', 'const a = null; a.b', 'Cannot read properties of null')
checkError('infinite loop', 'while(true){}', 'infinite loop')
checkError('syntax error', 'const = 5', 'Unexpected')
checkError('stack overflow', 'function f(){ return f() } f()', 'Maximum call stack')
checkError('await unsupported', 'async function f(){ await 1 }; f()', 'not supported')

console.log('\nsemantics')
check('closures in loop (let)', 'const fs=[]; for(let i=0;i<3;i++) fs.push(()=>i); console.log(fs.map(f=>f()))', ['[0, 1, 2]'])
check('var hoisting', 'function f(){ console.log(typeof v); var v = 1 } f()', ['undefined'])
check('this in method', 'const o = { n: 5, get(){ return this.n } }; console.log(o.get())', ['5'])
check('arrow this lexical', 'const o = { n: 5, get(){ return (() => this.n)() } }; console.log(o.get())', ['5'])
check('loose vs strict eq', 'console.log(1 == "1", 1 === "1", null == undefined)', ['true false true'])
check('short circuit', 'let hit = false; false && (hit = true); console.log(hit)', ['false'])
check('nullish coalescing', 'console.log(0 ?? 5, null ?? 5)', ['0 5'])
check('compound assign', 'let a = 10; a -= 3; a *= 2; console.log(a)', ['14'])

console.log('\ncollections & DSA builtins')
check('Map basics', 'const m = new Map(); m.set("a", 1); m.set("b", 2); console.log(m.get("a"), m.has("b"), m.size)', ['1 true 2'])
check('Map from entries + iterate', 'const m = new Map([["x", 1], ["y", 2]]); for (const [k, v] of m) console.log(k, v)', ['x 1', 'y 2'])
check('Map keys/values spread', 'const m = new Map([[1, "a"]]); console.log([...m.keys()], Array.from(m.values()))', ["[1] ['a']"])
check('Map delete + inspect', 'const m = new Map([["a", 1], ["b", 2]]); m.delete("a"); console.log(m)', ["Map(1) { 'b' => 2 }"])
check('Map forEach callback', 'const m = new Map([["a", 1]]); m.forEach((v, k) => console.log(k + v))', ['a1'])
check('Set dedupe', 'const s = new Set([1, 2, 2, 3]); console.log(s.size, s.has(2), [...s])', ['3 true [1, 2, 3]'])
check('Set from string + add', 'const s = new Set("aab"); s.add("c"); console.log(s)', ["Set(3) { 'a', 'b', 'c' }"])
check('new Array(n).fill', 'const a = new Array(3).fill(0); a[1] = 5; console.log(a)', ['[0, 5, 0]'])
check('Array(n) call', 'console.log(Array(2).length, Array(1, 2))', ['2 [1, 2]'])
check('Array.from Set', 'console.log(Array.from(new Set([3, 3, 1])))', ['[3, 1]'])
check('String.fromCharCode', 'console.log(String.fromCharCode(97 + 2), "a".charCodeAt(0))', ['c 97'])
check('regex test', 'console.log(/[a-z]/i.test("Q"), /\\d/.test("x"))', ['true false'])
check('regex replace', 'console.log("A man, a plan".toLowerCase().replace(/[^a-z]/g, ""))', ['amanaplan'])

console.log('\ntrace metadata')
{
  // Output must be attributed to the console.log call site, not the callee it evaluated.
  const trace = runProgram('function f() {\n  return 1\n}\nconsole.log(f())')
  const entry = trace.snapshots[trace.snapshots.length - 1].output[0]
  if (entry?.line === 4) {
    passed++
    console.log('  ok   console output line is the call site')
  } else {
    failed++
    console.log(`  FAIL console output line — expected 4, got ${entry?.line}`)
  }
}

console.log('\nbundled examples')
for (const ex of EXAMPLES) {
  const trace = runProgram(ex.code)
  const last = trace.snapshots[trace.snapshots.length - 1]
  if (trace.error) {
    failed++
    console.log(`  FAIL ${ex.id} — ${trace.error.kind}: ${trace.error.message}`)
  } else {
    passed++
    const out = last.output.map((o) => o.text).join(' | ')
    console.log(`  ok   ${ex.id.padEnd(14)} ${String(trace.snapshots.length).padStart(4)} steps  → ${out.slice(0, 70)}`)
  }
}

console.log(`\n${passed} passed, ${failed} failed\n`)
process.exit(failed > 0 ? 1 : 0)
