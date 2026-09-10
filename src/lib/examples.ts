export interface Example {
  id: string
  title: string
  blurb: string
  /** What to watch for while stepping — shown under the picker. */
  watch: string
  level: 'basics' | 'functions' | 'data' | 'objects' | 'algorithms'
  code: string
}

export const EXAMPLES: Example[] = [
  {
    id: 'variables',
    title: 'Variables & Values',
    blurb: 'Declarations, reassignment and the difference between let and const.',
    watch: 'Watch the Scope panel: each declaration adds a row, each assignment flashes it.',
    level: 'basics',
    code: `// Every line below becomes one step you can scrub through.
let score = 0;
const bonus = 10;

score = score + bonus;
score += 5;

const player = "Ada";
const message = \`\${player} scored \${score} points\`;

console.log(message);
console.log("Is it a high score?", score > 12);
`,
  },
  {
    id: 'conditionals',
    title: 'Conditions & Branching',
    blurb: 'if / else if / else and how a condition decides which path runs.',
    watch: 'Each condition step shows the value it evaluated to and which branch wins.',
    level: 'basics',
    code: `function grade(score) {
  if (score >= 90) {
    return "A";
  } else if (score >= 80) {
    return "B";
  } else if (score >= 70) {
    return "C";
  }
  return "F";
}

const scores = [95, 83, 71, 40];

for (const s of scores) {
  console.log(s, "->", grade(s));
}
`,
  },
  {
    id: 'loops',
    title: 'Loops, Step by Step',
    blurb: 'A for loop unrolled: check, body, update, repeat.',
    watch: 'The loop counter lives in its own scope — see it copied fresh each iteration.',
    level: 'basics',
    code: `const items = ["a", "b", "c"];
let joined = "";

for (let i = 0; i < items.length; i++) {
  joined += items[i];
  if (i < items.length - 1) {
    joined += "-";
  }
}

console.log(joined);

// A while loop does the same work with the parts spread out.
let countdown = 3;
while (countdown > 0) {
  console.log("T-minus", countdown);
  countdown--;
}
console.log("Liftoff!");
`,
  },
  {
    id: 'fizzbuzz',
    title: 'FizzBuzz',
    blurb: 'The classic interview warm-up — modulo, conditions and a loop.',
    watch: 'Notice the order of the checks: the combined case has to come first.',
    level: 'basics',
    code: `for (let n = 1; n <= 15; n++) {
  if (n % 15 === 0) {
    console.log("FizzBuzz");
  } else if (n % 3 === 0) {
    console.log("Fizz");
  } else if (n % 5 === 0) {
    console.log("Buzz");
  } else {
    console.log(n);
  }
}
`,
  },
  {
    id: 'callstack',
    title: 'The Call Stack',
    blurb: 'Functions calling functions — watch frames pile up and unwind.',
    watch: 'The Call Stack panel grows as calls nest and shrinks as each one returns.',
    level: 'functions',
    code: `function inner(x) {
  return x * 2;
}

function middle(x) {
  const doubled = inner(x);
  return doubled + 1;
}

function outer(x) {
  const result = middle(x);
  return "answer: " + result;
}

console.log(outer(20));
`,
  },
  {
    id: 'recursion',
    title: 'Recursion: Factorial',
    blurb: 'A function that calls itself, and the base case that stops it.',
    watch: 'Frames stack up to the base case, then values flow back down one return at a time.',
    level: 'functions',
    code: `function factorial(n) {
  // Base case — this is what stops the recursion.
  if (n <= 1) {
    return 1;
  }
  // Recursive case — the call stack grows here.
  return n * factorial(n - 1);
}

console.log(factorial(5));
`,
  },
  {
    id: 'fibonacci',
    title: 'Recursion: Fibonacci',
    blurb: 'Two recursive calls per frame — see why naive fib is slow.',
    watch: 'Count how many times fib(2) gets recomputed. That repetition is the cost.',
    level: 'functions',
    code: `let calls = 0;

function fib(n) {
  calls++;
  if (n < 2) {
    return n;
  }
  return fib(n - 1) + fib(n - 2);
}

console.log("fib(6) =", fib(6));
console.log("calls  =", calls);
`,
  },
  {
    id: 'closures',
    title: 'Closures',
    blurb: 'A function remembering the scope it was born in.',
    watch: 'After makeCounter returns, its scope stays alive because the arrow function holds it.',
    level: 'functions',
    code: `function makeCounter(start) {
  let count = start;

  // This inner function closes over \`count\`.
  return function increment() {
    count = count + 1;
    return count;
  };
}

const counterA = makeCounter(0);
const counterB = makeCounter(100);

console.log(counterA());
console.log(counterA());
console.log(counterB());
console.log(counterA());
`,
  },
  {
    id: 'hoisting',
    title: 'Hoisting & the TDZ',
    blurb: 'Why var is undefined early and let throws instead.',
    watch: 'At the very first step, hoisted names already exist. `let` bindings sit in the dead zone.',
    level: 'functions',
    code: `function demo() {
  // \`sayHi\` is fully hoisted, so calling it up here works.
  console.log(sayHi());

  // \`v\` is hoisted too, but only its name — the value is undefined.
  console.log("var before assignment:", v);
  var v = "assigned";
  console.log("var after assignment: ", v);

  function sayHi() {
    return "hello from a hoisted function";
  }
}

demo();

// A \`let\` binding exists but cannot be touched before its declaration.
try {
  console.log(notYet);
  let notYet = 1;
} catch (err) {
  console.log("TDZ:", err.message);
}
`,
  },
  {
    id: 'arrays',
    title: 'Array Pipeline',
    blurb: 'map, filter and reduce — each callback is its own stack frame.',
    watch: 'Every element runs the callback separately. Watch the accumulator build up in reduce.',
    level: 'data',
    code: `const orders = [
  { item: "keyboard", price: 80, inStock: true },
  { item: "monitor", price: 220, inStock: false },
  { item: "mouse", price: 30, inStock: true },
  { item: "desk", price: 350, inStock: true },
];

const total = orders
  .filter((order) => order.inStock)
  .map((order) => order.price)
  .reduce((sum, price) => sum + price, 0);

console.log("Available items total:", total);
`,
  },
  {
    id: 'references',
    title: 'References vs Copies',
    blurb: 'Why changing one variable changed the other one too.',
    watch: 'The Memory panel shows one object with two names pointing at it.',
    level: 'data',
    code: `// Primitives are copied by value.
let a = 1;
let b = a;
b = 99;
console.log("a =", a, " b =", b);

// Objects are copied by reference — both names point to one object.
const original = { count: 1 };
const alias = original;
alias.count = 99;
console.log("original.count =", original.count);

// A spread makes a real (shallow) copy.
const copy = { ...original };
copy.count = 5;
console.log("original still:", original.count, " copy:", copy.count);

// Shallow means nested objects are still shared.
const outer = { inner: { deep: 1 } };
const shallow = { ...outer };
shallow.inner.deep = 42;
console.log("outer.inner.deep =", outer.inner.deep);
`,
  },
  {
    id: 'destructuring',
    title: 'Destructuring & Spread',
    blurb: 'Pulling values out of arrays and objects in one move.',
    watch: 'One destructuring step can create several bindings at once.',
    level: 'data',
    code: `const user = {
  name: "Grace",
  role: "engineer",
  contact: { email: "grace@example.com" },
};

const { name, role, contact: { email } } = user;
console.log(name, role, email);

const [first, second, ...rest] = [10, 20, 30, 40, 50];
console.log(first, second, rest);

// Swapping without a temp variable.
let x = "left";
let y = "right";
[x, y] = [y, x];
console.log(x, y);

function describe({ name, role = "unknown" }) {
  return \`\${name} (\${role})\`;
}
console.log(describe({ name: "Alan" }));
`,
  },
  {
    id: 'classes',
    title: 'Classes & Inheritance',
    blurb: 'Constructors, methods, `this`, and how super() chains up.',
    watch: 'Each `new` builds an object in Memory; methods live on the class, not the instance.',
    level: 'objects',
    code: `class Shape {
  constructor(name) {
    this.name = name;
  }

  area() {
    return 0;
  }

  describe() {
    return \`\${this.name} has area \${this.area()}\`;
  }
}

class Rectangle extends Shape {
  constructor(width, height) {
    super("rectangle");
    this.width = width;
    this.height = height;
  }

  area() {
    return this.width * this.height;
  }
}

class Square extends Rectangle {
  constructor(side) {
    super(side, side);
    this.name = "square";
  }
}

const shapes = [new Rectangle(3, 4), new Square(5)];

for (const shape of shapes) {
  console.log(shape.describe());
}
`,
  },
  {
    id: 'this',
    title: 'What is `this`?',
    blurb: 'Method calls, arrow functions and the rule that decides `this`.',
    watch: 'Check the `this` badge on each stack frame — arrows never get their own.',
    level: 'objects',
    code: `const counter = {
  count: 0,

  // A regular method: \`this\` is whatever is left of the dot.
  bumpMethod() {
    this.count++;
    return this.count;
  },

  // An arrow inside a method keeps the method's \`this\`.
  bumpTwice() {
    const once = () => {
      this.count++;
    };
    once();
    once();
    return this.count;
  },
};

console.log(counter.bumpMethod());
console.log(counter.bumpTwice());
console.log(counter.count);
`,
  },
  {
    id: 'errors',
    title: 'try / catch / finally',
    blurb: 'How a thrown error unwinds the stack until something catches it.',
    watch: 'The throw abandons the rest of the function — but `finally` still runs.',
    level: 'objects',
    code: `function parseAge(input) {
  const n = Number(input);
  if (Number.isNaN(n)) {
    throw new TypeError(input + " is not a number");
  }
  if (n < 0) {
    throw new RangeError("age cannot be negative");
  }
  return n;
}

const inputs = ["42", "abc", "-1"];

for (const input of inputs) {
  try {
    console.log("ok:", parseAge(input));
  } catch (err) {
    console.log("caught:", err.name, "-", err.message);
  } finally {
    console.log("done with", input);
  }
}
`,
  },
  {
    id: 'bubblesort',
    title: 'Bubble Sort',
    blurb: 'Nested loops swapping neighbours until the array is ordered.',
    watch: 'Follow the array in Memory — it mutates in place, one swap at a time.',
    level: 'algorithms',
    code: `function bubbleSort(arr) {
  const list = [...arr];

  for (let pass = 0; pass < list.length - 1; pass++) {
    let swapped = false;

    for (let i = 0; i < list.length - 1 - pass; i++) {
      if (list[i] > list[i + 1]) {
        const temp = list[i];
        list[i] = list[i + 1];
        list[i + 1] = temp;
        swapped = true;
      }
    }

    // Already sorted — no need to keep going.
    if (!swapped) {
      break;
    }
  }

  return list;
}

console.log(bubbleSort([5, 2, 9, 1, 6]));
`,
  },
  {
    id: 'binarysearch',
    title: 'Binary Search',
    blurb: 'Halving the search space until the target shows up.',
    watch: 'low, high and mid move toward each other — that is the log(n) behaviour.',
    level: 'algorithms',
    code: `function binarySearch(sorted, target) {
  let low = 0;
  let high = sorted.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const guess = sorted[mid];

    if (guess === target) {
      return mid;
    }
    if (guess < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return -1;
}

const data = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];

console.log("index of 23:", binarySearch(data, 23));
console.log("index of 4: ", binarySearch(data, 4));
`,
  },
  {
    id: 'memo',
    title: 'Memoization',
    blurb: 'A closure caching results so the expensive work happens once.',
    watch: 'Compare the call count here with the plain Fibonacci example.',
    level: 'algorithms',
    code: `function memoize(fn) {
  const cache = {};

  return function memoized(n) {
    if (n in cache) {
      return cache[n];
    }
    const result = fn(n);
    cache[n] = result;
    return result;
  };
}

let calls = 0;

const fib = memoize(function slowFib(n) {
  calls++;
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
});

console.log("fib(10) =", fib(10));
console.log("calls   =", calls);
`,
  },
]

export const DEFAULT_EXAMPLE = EXAMPLES[5] // Recursion: Factorial

export const LEVEL_LABELS: Record<Example['level'], string> = {
  basics: 'Basics',
  functions: 'Functions',
  data: 'Data',
  objects: 'Objects',
  algorithms: 'Algorithms',
}

export const LEVEL_ORDER: Example['level'][] = ['basics', 'functions', 'data', 'objects', 'algorithms']
