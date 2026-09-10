import type { Problem } from '../types'

/*
 * Array problems. Reference solutions are plain source strings (never
 * `fn.toString()`, which a minifier would mangle) and stay within what the
 * CodeFlow interpreter supports, so every one can be visualized step by step.
 */

export const ARRAY_PROBLEMS: Problem[] = [
  {
    id: 'two-sum',
    topic: 'array',
    title: 'Two Sum',
    difficulty: 'Easy',
    pattern: 'Hash Map',
    fn: 'twoSum',
    params: ['nums', 'target'],
    statement: `Given an array of integers \`nums\` and an integer \`target\`, return the indices \`[i, j]\` (with \`i < j\`) of two numbers that add up to \`target\`.

If several pairs work, return the pair whose second index \`j\` is smallest; if that still ties, the smallest \`i\`. Every input has at least one valid pair.`,
    constraints: ['2 ≤ nums.length ≤ 100', '-100 ≤ nums[i] ≤ 100'],
    hints: [
      'The brute force checks every pair — O(n²). Can you find the partner of `nums[j]` without a second loop?',
      'For each number, the partner you need is `target - nums[j]`. Where could you look that up instantly?',
      'Walk left to right, remembering the first index where each value appeared. Check for the partner before storing the current value.',
    ],
    solution: `function twoSum(nums, target) {
  // value -> index where it first appeared
  const seen = new Map();

  for (let j = 0; j < nums.length; j++) {
    const need = target - nums[j];
    if (seen.has(need)) {
      return [seen.get(need), j];
    }
    if (!seen.has(nums[j])) {
      seen.set(nums[j], j);
    }
  }
  return [];
}`,
    explanation:
      'Instead of pairing every element with every other, remember each value you have already passed in a hash map. For each new element the required partner is `target - nums[j]`; a map lookup answers "have I seen it?" in O(1). Storing only the first occurrence and scanning left to right naturally returns the pair with the smallest second index.',
    complexity: { time: 'O(n)', space: 'O(n)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(4, 6) : rng.int(20, 60)
      const nums = rng.ints(n, size === 'small' ? 1 : -50, size === 'small' ? 15 : 60)
      const i = rng.int(0, n - 2)
      const j = rng.int(i + 1, n - 1)
      return [nums, nums[i] + nums[j]]
    },
    edgeCases: [[[3, 3], 6], [[-1, -2, -3, -4], -7]],
  },
  {
    id: 'best-time-stock',
    topic: 'array',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'Easy',
    pattern: 'One Pass / Greedy',
    fn: 'maxProfit',
    params: ['prices'],
    statement: `\`prices[i]\` is the price of a stock on day \`i\`. Choose one day to buy and a **later** day to sell.

Return the maximum profit you can make. If no profit is possible, return \`0\`.`,
    constraints: ['1 ≤ prices.length ≤ 10⁴', '0 ≤ prices[i] ≤ 10⁴'],
    hints: [
      'For a fixed selling day, which buying day gives the best profit?',
      'The best buying day is simply the cheapest day seen so far.',
      'Track the minimum price so far and the best profit so far in one loop.',
    ],
    solution: `function maxProfit(prices) {
  let cheapest = Infinity;
  let best = 0;

  for (const price of prices) {
    if (price < cheapest) {
      cheapest = price;          // a better day to buy
    } else if (price - cheapest > best) {
      best = price - cheapest;   // a better day to sell
    }
  }
  return best;
}`,
    explanation:
      'Selling on day `i` is best if you bought at the lowest price before `i`. So keep a running minimum; at each day, the profit from selling today is `price - cheapest`. The answer is the largest such profit.',
    complexity: { time: 'O(n)', space: 'O(1)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(5, 7) : rng.int(20, 80)
      return [rng.ints(n, 1, size === 'small' ? 12 : 200)]
    },
    edgeCases: [[[7, 6, 4, 3, 1]], [[5]]],
  },
  {
    id: 'max-subarray',
    topic: 'array',
    title: 'Maximum Subarray Sum',
    difficulty: 'Medium',
    pattern: "Kadane's Algorithm",
    fn: 'maxSubArray',
    params: ['nums'],
    statement: `Given an integer array \`nums\`, find the contiguous subarray (containing at least one number) with the largest sum and return **that sum**.`,
    constraints: ['1 ≤ nums.length ≤ 10⁵', '-10⁴ ≤ nums[i] ≤ 10⁴'],
    hints: [
      'Think about the best subarray that *ends* at index `i`.',
      'That best subarray either extends the one ending at `i - 1`, or starts fresh at `i`.',
      'If the running sum ever drops below the current element on its own, restart from here.',
    ],
    solution: `function maxSubArray(nums) {
  let current = nums[0];   // best sum ending here
  let best = nums[0];      // best sum anywhere

  for (let i = 1; i < nums.length; i++) {
    current = Math.max(nums[i], current + nums[i]);
    best = Math.max(best, current);
  }
  return best;
}`,
    explanation:
      "Kadane's algorithm keeps the best sum of a subarray ending at the current index. Extending a negative running sum can only hurt, so at each step choose the larger of \"start over here\" and \"extend\". The global answer is the largest of those running values.",
    complexity: { time: 'O(n)', space: 'O(1)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(5, 7) : rng.int(20, 80)
      return [rng.ints(n, -9, 9)]
    },
    edgeCases: [[[-3]], [[-2, -1, -5]]],
  },
  {
    id: 'move-zeroes',
    topic: 'array',
    title: 'Move Zeroes',
    difficulty: 'Easy',
    pattern: 'Two Pointers',
    fn: 'moveZeroes',
    params: ['nums'],
    statement: `Move all \`0\`s in \`nums\` to the end while keeping the relative order of the non-zero elements.

Return the resulting array. Try to do it in place, without creating a copy.`,
    constraints: ['1 ≤ nums.length ≤ 10⁴'],
    hints: [
      'Use one pointer for "where the next non-zero should go".',
      'Scan with a second pointer; every non-zero you meet gets written at the first pointer.',
      'After the scan, fill the rest with zeros — or swap as you go.',
    ],
    solution: `function moveZeroes(nums) {
  let write = 0; // next slot for a non-zero

  for (let read = 0; read < nums.length; read++) {
    if (nums[read] !== 0) {
      const temp = nums[write];
      nums[write] = nums[read];
      nums[read] = temp;
      write++;
    }
  }
  return nums;
}`,
    explanation:
      'The `write` pointer marks the boundary of the finished, zero-free prefix. Each non-zero found by `read` is swapped into that boundary, which pushes zeros toward the end while preserving the order of non-zeros.',
    complexity: { time: 'O(n)', space: 'O(1)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(5, 7) : rng.int(20, 60)
      return [Array.from({ length: n }, () => (rng.bool(0.4) ? 0 : rng.int(1, 9)))]
    },
    edgeCases: [[[0]], [[0, 0, 1]], [[1, 2, 3]]],
  },
  {
    id: 'contains-duplicate',
    topic: 'array',
    title: 'Contains Duplicate',
    difficulty: 'Easy',
    pattern: 'Hash Set',
    fn: 'containsDuplicate',
    params: ['nums'],
    statement: `Return \`true\` if any value appears **at least twice** in \`nums\`, and \`false\` if every element is distinct.`,
    constraints: ['1 ≤ nums.length ≤ 10⁵'],
    hints: [
      'Comparing every pair works, but it is O(n²).',
      'What data structure tells you instantly whether you have seen a value before?',
      'Add values to a Set as you go; if one is already there, you found a duplicate.',
    ],
    solution: `function containsDuplicate(nums) {
  const seen = new Set();

  for (const n of nums) {
    if (seen.has(n)) {
      return true;
    }
    seen.add(n);
  }
  return false;
}`,
    explanation:
      'A Set gives O(1) membership checks. Walking once and checking before inserting finds the first repeat without comparing all pairs.',
    complexity: { time: 'O(n)', space: 'O(n)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(4, 6) : rng.int(20, 60)
      const nums = rng.shuffle(Array.from({ length: n }, (_, i) => i * 3 + rng.int(0, 2)))
      if (rng.bool()) nums[rng.int(0, n - 1)] = nums[rng.int(0, n - 1)]
      return [nums]
    },
    edgeCases: [[[1]], [[2, 2]]],
  },
  {
    id: 'product-except-self',
    topic: 'array',
    title: 'Product of Array Except Self',
    difficulty: 'Medium',
    pattern: 'Prefix & Suffix',
    fn: 'productExceptSelf',
    params: ['nums'],
    statement: `Return an array \`answer\` where \`answer[i]\` is the product of every element of \`nums\` **except** \`nums[i]\`.

Solve it without using division.`,
    constraints: ['2 ≤ nums.length ≤ 10⁵', 'The products fit in a normal JavaScript number.'],
    hints: [
      '`answer[i]` = (product of everything left of i) × (product of everything right of i).',
      'Build the left products in one pass from the start.',
      'Then sweep from the end with a running right product, multiplying it in.',
    ],
    solution: `function productExceptSelf(nums) {
  const n = nums.length;
  const answer = new Array(n).fill(1);

  // answer[i] = product of everything to the left of i
  let left = 1;
  for (let i = 0; i < n; i++) {
    answer[i] = left;
    left *= nums[i];
  }

  // multiply in the product of everything to the right of i
  let right = 1;
  for (let i = n - 1; i >= 0; i--) {
    answer[i] *= right;
    right *= nums[i];
  }
  return answer;
}`,
    explanation:
      'Each answer splits into a left part and a right part. The first pass stores prefix products; the second pass walks backwards keeping a suffix product and multiplies it in. Two linear passes, no division — so zeros are handled naturally.',
    complexity: { time: 'O(n)', space: 'O(1) extra (besides the output)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(4, 5) : rng.int(8, 16)
      return [rng.ints(n, -3, 5)]
    },
    edgeCases: [[[0, 0]], [[1, 0, 3]]],
  },
  {
    id: 'rotate-array',
    topic: 'array',
    title: 'Rotate Array',
    difficulty: 'Medium',
    pattern: 'Reversal',
    fn: 'rotate',
    params: ['nums', 'k'],
    statement: `Rotate \`nums\` to the **right** by \`k\` steps and return it. \`k\` may be larger than the array length.

Example: rotating \`[1, 2, 3, 4, 5]\` by \`2\` gives \`[4, 5, 1, 2, 3]\`.`,
    constraints: ['1 ≤ nums.length ≤ 10⁵', '0 ≤ k ≤ 10⁵'],
    hints: [
      'Rotating by `n` steps changes nothing — so only `k % n` matters.',
      'What happens if you reverse the whole array first?',
      'Reverse everything, then reverse the first `k` elements, then reverse the rest.',
    ],
    solution: `function rotate(nums, k) {
  const n = nums.length;
  k = k % n;

  function reverse(lo, hi) {
    while (lo < hi) {
      const temp = nums[lo];
      nums[lo] = nums[hi];
      nums[hi] = temp;
      lo++;
      hi--;
    }
  }

  reverse(0, n - 1);   // whole array
  reverse(0, k - 1);   // first k
  reverse(k, n - 1);   // the rest
  return nums;
}`,
    explanation:
      'Reversing the whole array puts the last `k` elements at the front, but backwards. Reversing each of the two segments again fixes their internal order. Three in-place reversals, no extra array.',
    complexity: { time: 'O(n)', space: 'O(1)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(5, 6) : rng.int(20, 50)
      return [Array.from({ length: n }, (_, i) => i + 1), rng.int(0, size === 'small' ? n + 2 : 3 * n)]
    },
    edgeCases: [[[1], 5], [[1, 2], 2]],
  },
  {
    id: 'merge-sorted',
    topic: 'array',
    title: 'Merge Two Sorted Arrays',
    difficulty: 'Easy',
    pattern: 'Two Pointers',
    fn: 'mergeSorted',
    params: ['a', 'b'],
    statement: `\`a\` and \`b\` are each sorted in non-decreasing order. Return a single sorted array containing every element of both.

Do it in one pass — don't just concatenate and sort.`,
    constraints: ['0 ≤ a.length, b.length ≤ 10⁴'],
    hints: [
      'The smallest remaining element is always at the front of `a` or the front of `b`.',
      'Keep one pointer into each array and take the smaller front element.',
      'When one array runs out, copy the rest of the other.',
    ],
    solution: `function mergeSorted(a, b) {
  const merged = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) {
      merged.push(a[i]);
      i++;
    } else {
      merged.push(b[j]);
      j++;
    }
  }
  while (i < a.length) merged.push(a[i++]);
  while (j < b.length) merged.push(b[j++]);
  return merged;
}`,
    explanation:
      'This is the merge step of merge sort. Because both inputs are sorted, comparing the two front elements always reveals the next smallest value. Each element is visited once.',
    complexity: { time: 'O(n + m)', space: 'O(n + m)' },
    generate(rng, size) {
      const make = () => rng.ints(size === 'small' ? rng.int(2, 4) : rng.int(10, 40), 0, 30).sort((x, y) => x - y)
      return [make(), make()]
    },
    edgeCases: [[[], [1, 2]], [[1, 1], [1]], [[], []]],
  },
  {
    id: 'remove-duplicates-sorted',
    topic: 'array',
    title: 'Remove Duplicates from Sorted Array',
    difficulty: 'Easy',
    pattern: 'Two Pointers',
    fn: 'removeDuplicates',
    params: ['nums'],
    statement: `\`nums\` is sorted in non-decreasing order. Remove the duplicates so each value appears once, keeping the order, and return the resulting array.

Aim for an in-place approach with a read and a write pointer.`,
    constraints: ['0 ≤ nums.length ≤ 3 × 10⁴'],
    hints: [
      'In a sorted array, duplicates sit next to each other.',
      'A new value is one that differs from the last value you kept.',
      'Use a `write` pointer for where the next unique value goes, then slice.',
    ],
    solution: `function removeDuplicates(nums) {
  if (nums.length === 0) return [];
  let write = 1;

  for (let read = 1; read < nums.length; read++) {
    if (nums[read] !== nums[write - 1]) {
      nums[write] = nums[read];
      write++;
    }
  }
  return nums.slice(0, write);
}`,
    explanation:
      'Since equal values are adjacent, a value is new exactly when it differs from the last kept one. The write pointer compacts the unique values to the front in a single pass.',
    complexity: { time: 'O(n)', space: 'O(1) extra' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(5, 7) : rng.int(20, 60)
      return [rng.ints(n, 0, Math.ceil(n / 2)).sort((x, y) => x - y)]
    },
    edgeCases: [[[]], [[4, 4, 4]]],
  },
  {
    id: 'binary-search',
    topic: 'array',
    title: 'Binary Search',
    difficulty: 'Easy',
    pattern: 'Binary Search',
    fn: 'search',
    params: ['nums', 'target'],
    statement: `\`nums\` is sorted in ascending order with distinct values. Return the index of \`target\`, or \`-1\` if it is not present.

Your solution should run in O(log n) time.`,
    constraints: ['1 ≤ nums.length ≤ 10⁴', 'All values are distinct.'],
    hints: [
      'Compare `target` with the middle element. What does that tell you?',
      'If the middle is too small, the answer can only be on the right half.',
      'Keep `low` and `high` bounds and loop while `low <= high`.',
    ],
    solution: `function search(nums, target) {
  let low = 0;
  let high = nums.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return -1;
}`,
    explanation:
      'Each comparison with the middle element discards half of the remaining range, so the search finishes after about log₂(n) steps.',
    complexity: { time: 'O(log n)', space: 'O(1)' },
    generate(rng, size) {
      const nums = rng.sortedUnique(size === 'small' ? rng.int(6, 8) : rng.int(30, 80), -20, 120)
      return [nums, rng.bool(0.65) ? rng.pick(nums) : rng.int(-25, 125)]
    },
    edgeCases: [[[5], 5], [[5], 2]],
  },
  {
    id: 'missing-number',
    topic: 'array',
    title: 'Missing Number',
    difficulty: 'Easy',
    pattern: 'Math',
    fn: 'missingNumber',
    params: ['nums'],
    statement: `\`nums\` contains \`n\` distinct numbers taken from the range \`0\` to \`n\` — so exactly one number in that range is missing. Return it.`,
    constraints: ['1 ≤ n ≤ 10⁴'],
    hints: [
      'You know exactly which numbers *should* be there.',
      'What is the sum of 0 + 1 + … + n?',
      'Subtract the actual sum from the expected sum.',
    ],
    solution: `function missingNumber(nums) {
  const n = nums.length;
  const expected = (n * (n + 1)) / 2;  // 0 + 1 + ... + n

  let actual = 0;
  for (const x of nums) {
    actual += x;
  }
  return expected - actual;
}`,
    explanation:
      'The numbers 0…n sum to n(n+1)/2. Whatever the array is short of that total is the missing number. (XOR-ing all indices and values works too.)',
    complexity: { time: 'O(n)', space: 'O(1)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(4, 7) : rng.int(20, 80)
      const missing = rng.int(0, n)
      return [rng.shuffle(Array.from({ length: n + 1 }, (_, i) => i).filter((x) => x !== missing))]
    },
    edgeCases: [[[0]], [[1]]],
  },
  {
    id: 'max-consecutive-ones',
    topic: 'array',
    title: 'Max Consecutive Ones',
    difficulty: 'Easy',
    pattern: 'Counting',
    fn: 'findMaxConsecutiveOnes',
    params: ['nums'],
    statement: `\`nums\` contains only \`0\`s and \`1\`s. Return the length of the longest run of consecutive \`1\`s.`,
    constraints: ['1 ≤ nums.length ≤ 10⁵'],
    hints: ['Count the current run as you walk.', 'A `0` resets the current run; keep the best run you have seen.'],
    solution: `function findMaxConsecutiveOnes(nums) {
  let run = 0;
  let best = 0;

  for (const bit of nums) {
    if (bit === 1) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}`,
    explanation: 'One running counter for the current streak of ones, reset on every zero, and a best-so-far value.',
    complexity: { time: 'O(n)', space: 'O(1)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(6, 8) : rng.int(30, 100)
      return [Array.from({ length: n }, () => (rng.bool(0.65) ? 1 : 0))]
    },
    edgeCases: [[[0]], [[1, 1, 1]]],
  },
  {
    id: 'subarray-sum-k',
    topic: 'array',
    title: 'Subarray Sum Equals K',
    difficulty: 'Medium',
    pattern: 'Prefix Sum + Hash Map',
    fn: 'subarraySum',
    params: ['nums', 'k'],
    statement: `Return the **number** of contiguous subarrays of \`nums\` whose elements sum to exactly \`k\`.

The array may contain negative numbers, so a sliding window will not work.`,
    constraints: ['1 ≤ nums.length ≤ 2 × 10⁴', '-1000 ≤ nums[i] ≤ 1000'],
    hints: [
      'The sum of `nums[i..j]` equals `prefix[j + 1] - prefix[i]`.',
      'So a subarray ending at `j` sums to `k` when an earlier prefix equals `prefix - k`.',
      'Count how many times each prefix sum has occurred in a map (start with `0` seen once).',
    ],
    solution: `function subarraySum(nums, k) {
  const counts = new Map();  // prefix sum -> times seen
  counts.set(0, 1);
  let prefix = 0;
  let total = 0;

  for (const x of nums) {
    prefix += x;
    if (counts.has(prefix - k)) {
      total += counts.get(prefix - k);
    }
    counts.set(prefix, (counts.get(prefix) || 0) + 1);
  }
  return total;
}`,
    explanation:
      'A subarray ending here sums to `k` exactly when some earlier prefix sum equals `prefix - k`. Keeping a count of every prefix sum seen so far lets each position add all of its matching subarrays in O(1).',
    complexity: { time: 'O(n)', space: 'O(n)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(5, 6) : rng.int(20, 60)
      const nums = rng.ints(n, -3, 5)
      const i = rng.int(0, n - 1)
      const j = rng.int(i, n - 1)
      return [nums, nums.slice(i, j + 1).reduce((s, x) => s + x, 0)]
    },
    edgeCases: [[[1, 1, 1], 2], [[0, 0, 0], 0]],
  },
  {
    id: 'max-sum-window',
    topic: 'array',
    title: 'Maximum Sum of a Window of Size K',
    difficulty: 'Easy',
    pattern: 'Sliding Window',
    fn: 'maxWindowSum',
    params: ['nums', 'k'],
    statement: `Return the maximum sum of any \`k\` consecutive elements of \`nums\`.`,
    constraints: ['1 ≤ k ≤ nums.length ≤ 10⁵'],
    hints: [
      'Recomputing each window from scratch costs O(k) per window.',
      'When the window slides one step, only two elements change.',
      'Add the element entering the window and subtract the one leaving it.',
    ],
    solution: `function maxWindowSum(nums, k) {
  let windowSum = 0;
  for (let i = 0; i < k; i++) {
    windowSum += nums[i];
  }

  let best = windowSum;
  for (let right = k; right < nums.length; right++) {
    windowSum += nums[right] - nums[right - k];  // slide by one
    best = Math.max(best, windowSum);
  }
  return best;
}`,
    explanation:
      'A fixed-size sliding window: compute the first window once, then update the sum in O(1) per step by adding the new element and removing the oldest.',
    complexity: { time: 'O(n)', space: 'O(1)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(5, 7) : rng.int(20, 80)
      return [rng.ints(n, -5, 12), rng.int(1, Math.min(n, size === 'small' ? 3 : 10))]
    },
    edgeCases: [[[4], 1], [[-1, -2, -3], 2]],
  },
  {
    id: 'majority-element',
    topic: 'array',
    title: 'Majority Element',
    difficulty: 'Easy',
    pattern: 'Boyer–Moore Voting',
    fn: 'majorityElement',
    params: ['nums'],
    statement: `Return the element that appears **more than** \`n / 2\` times in \`nums\`. The majority element always exists.

Can you do it with O(1) extra space?`,
    constraints: ['1 ≤ nums.length ≤ 5 × 10⁴'],
    hints: [
      'A frequency map works, but uses O(n) space.',
      'If you cancel each majority element against one different element, the majority still has some left over.',
      'Keep a candidate and a counter: +1 for a match, -1 otherwise, switching candidate at 0.',
    ],
    solution: `function majorityElement(nums) {
  let candidate = null;
  let count = 0;

  for (const x of nums) {
    if (count === 0) {
      candidate = x;
    }
    count += x === candidate ? 1 : -1;
  }
  return candidate;
}`,
    explanation:
      'Boyer–Moore voting pairs off different elements. Because the majority appears more than all others combined, it is the one left standing as the candidate at the end.',
    complexity: { time: 'O(n)', space: 'O(1)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(5, 7) : rng.int(21, 61)
      const major = rng.int(1, 9)
      const majorCount = Math.floor(n / 2) + 1 + rng.int(0, 1)
      const rest = Array.from({ length: Math.max(0, n - majorCount) }, () => {
        let v = rng.int(1, 9)
        if (v === major) v = major + 1
        return v
      })
      return [rng.shuffle([...Array(majorCount).fill(major), ...rest])]
    },
    edgeCases: [[[7]], [[2, 2, 1]]],
  },
  {
    id: 'sort-colors',
    topic: 'array',
    title: 'Sort Colors (Dutch Flag)',
    difficulty: 'Medium',
    pattern: 'Three Pointers',
    fn: 'sortColors',
    params: ['nums'],
    statement: `\`nums\` contains only \`0\`, \`1\` and \`2\` (red, white, blue). Sort it so all 0s come first, then 1s, then 2s, and return it.

Do it in a single pass without calling \`sort\`.`,
    constraints: ['1 ≤ nums.length ≤ 300'],
    hints: [
      'Counting then rewriting works in two passes. Can you do one?',
      'Keep three regions: 0s at the front, 2s at the back, unknowns in the middle.',
      'Pointers `low`, `mid`, `high`: a 0 swaps to `low`, a 2 swaps to `high`, a 1 just advances `mid`.',
    ],
    solution: `function sortColors(nums) {
  let low = 0;
  let mid = 0;
  let high = nums.length - 1;

  while (mid <= high) {
    if (nums[mid] === 0) {
      [nums[low], nums[mid]] = [nums[mid], nums[low]];
      low++;
      mid++;
    } else if (nums[mid] === 2) {
      [nums[mid], nums[high]] = [nums[high], nums[mid]];
      high--;          // re-check the value swapped in
    } else {
      mid++;
    }
  }
  return nums;
}`,
    explanation:
      "Dijkstra's Dutch national flag algorithm maintains three regions. Everything before `low` is 0, everything after `high` is 2, and `mid` scans the unknown middle. Each element is placed with at most one swap.",
    complexity: { time: 'O(n)', space: 'O(1)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(5, 7) : rng.int(20, 60)
      return [rng.ints(n, 0, 2)]
    },
    edgeCases: [[[2, 0]], [[1]]],
  },
  {
    id: 'container-most-water',
    topic: 'array',
    title: 'Container With Most Water',
    difficulty: 'Medium',
    pattern: 'Two Pointers',
    fn: 'maxArea',
    params: ['height'],
    statement: `\`height[i]\` is the height of a vertical line at position \`i\`. Pick two lines that, together with the x-axis, hold the most water.

The water held between lines \`i\` and \`j\` is \`(j - i) × min(height[i], height[j])\`. Return the maximum.`,
    constraints: ['2 ≤ height.length ≤ 10⁵'],
    hints: [
      'Start with the widest possible container: the first and last lines.',
      'The shorter line limits the water. Moving the taller line inward can never help.',
      'So always move the pointer at the shorter line.',
    ],
    solution: `function maxArea(height) {
  let left = 0;
  let right = height.length - 1;
  let best = 0;

  while (left < right) {
    const water = (right - left) * Math.min(height[left], height[right]);
    best = Math.max(best, water);

    if (height[left] < height[right]) {
      left++;
    } else {
      right--;
    }
  }
  return best;
}`,
    explanation:
      'Width only shrinks as the pointers move, so the only way to do better is a taller limiting line. Moving the shorter side is the only move that might find one; moving the taller side can only lose.',
    complexity: { time: 'O(n)', space: 'O(1)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(5, 7) : rng.int(20, 80)
      return [rng.ints(n, 1, 10)]
    },
    edgeCases: [[[1, 1]], [[4, 3, 2, 1, 4]]],
  },
  {
    id: 'three-sum',
    topic: 'array',
    title: '3Sum',
    difficulty: 'Medium',
    pattern: 'Sorting + Two Pointers',
    fn: 'threeSum',
    params: ['nums'],
    statement: `Return every **unique** triplet \`[a, b, c]\` of values from \`nums\` with \`a + b + c = 0\` (using three different positions).

Each triplet must be in ascending order, and the list of triplets must be sorted (lexicographically). Return \`[]\` if there are none.`,
    constraints: ['3 ≤ nums.length ≤ 3000'],
    hints: [
      'Sort the array first — it makes skipping duplicates and searching easy.',
      'Fix the first number, then find pairs summing to its negative with two pointers.',
      'Skip over equal values for the fixed number and after each match to avoid duplicate triplets.',
    ],
    solution: `function threeSum(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const result = [];

  for (let i = 0; i < sorted.length - 2; i++) {
    if (i > 0 && sorted[i] === sorted[i - 1]) continue; // same first number

    let lo = i + 1;
    let hi = sorted.length - 1;
    while (lo < hi) {
      const sum = sorted[i] + sorted[lo] + sorted[hi];
      if (sum === 0) {
        result.push([sorted[i], sorted[lo], sorted[hi]]);
        lo++;
        hi--;
        while (lo < hi && sorted[lo] === sorted[lo - 1]) lo++;
      } else if (sum < 0) {
        lo++;
      } else {
        hi--;
      }
    }
  }
  return result;
}`,
    explanation:
      'After sorting, each fixed first element turns the problem into "two sum on a sorted range", solved with two pointers in O(n). Skipping repeated values guarantees unique triplets, and the scan order already produces them sorted.',
    complexity: { time: 'O(n²)', space: 'O(n) for the sorted copy' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(5, 6) : rng.int(15, 30)
      return [rng.ints(n, -5, 5)]
    },
    edgeCases: [[[0, 0, 0, 0]], [[1, 2, 3]]],
  },
  {
    id: 'longest-consecutive',
    topic: 'array',
    title: 'Longest Consecutive Sequence',
    difficulty: 'Medium',
    pattern: 'Hash Set',
    fn: 'longestConsecutive',
    params: ['nums'],
    statement: `Return the length of the longest run of consecutive integers (like \`4, 5, 6, 7\`) that can be formed from the values in the unsorted array \`nums\`.

Aim for O(n) time — without sorting.`,
    constraints: ['0 ≤ nums.length ≤ 10⁵'],
    hints: [
      'Put every value in a Set for O(1) lookups.',
      'Only start counting from a number that begins a run — one whose predecessor is missing.',
      'From each run start, count upward while the next number exists.',
    ],
    solution: `function longestConsecutive(nums) {
  const values = new Set(nums);
  let best = 0;

  for (const x of values) {
    if (values.has(x - 1)) continue; // not the start of a run

    let length = 1;
    while (values.has(x + length)) {
      length++;
    }
    best = Math.max(best, length);
  }
  return best;
}`,
    explanation:
      'Only numbers without a predecessor start a run, and each run is walked exactly once from its start, so the total work stays linear even though there is a nested loop.',
    complexity: { time: 'O(n)', space: 'O(n)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(5, 7) : rng.int(20, 60)
      return [rng.ints(n, 0, size === 'small' ? 12 : 60)]
    },
    edgeCases: [[[]], [[5, 5, 5]]],
  },
  {
    id: 'trapping-rain-water',
    topic: 'array',
    title: 'Trapping Rain Water',
    difficulty: 'Hard',
    pattern: 'Two Pointers',
    fn: 'trap',
    params: ['height'],
    statement: `\`height\` describes an elevation map where each bar has width 1. Return how many units of rain water it traps after raining.`,
    constraints: ['1 ≤ height.length ≤ 2 × 10⁴', '0 ≤ height[i] ≤ 10⁵'],
    hints: [
      'Water above a bar = min(tallest bar to its left, tallest bar to its right) − its height.',
      'You could precompute left-max and right-max arrays. Can you avoid the extra space?',
      'Move two pointers inward; the side with the smaller max is the one whose water level you already know.',
    ],
    solution: `function trap(height) {
  let left = 0;
  let right = height.length - 1;
  let leftMax = 0;
  let rightMax = 0;
  let water = 0;

  while (left < right) {
    if (height[left] < height[right]) {
      leftMax = Math.max(leftMax, height[left]);
      water += leftMax - height[left];
      left++;
    } else {
      rightMax = Math.max(rightMax, height[right]);
      water += rightMax - height[right];
      right--;
    }
  }
  return water;
}`,
    explanation:
      'The water level at a bar is limited by the smaller of the tallest walls on each side. When the left bar is lower than the right bar, the right side is guaranteed to have a wall at least that tall, so the left water level is exactly `leftMax`. Process that side and move inward.',
    complexity: { time: 'O(n)', space: 'O(1)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(6, 8) : rng.int(20, 60)
      return [rng.ints(n, 0, 6)]
    },
    edgeCases: [[[4]], [[3, 0, 3]], [[1, 2, 3]]],
  },
  {
    id: 'second-largest',
    topic: 'array',
    title: 'Second Largest Distinct Element',
    difficulty: 'Easy',
    pattern: 'One Pass',
    fn: 'secondLargest',
    params: ['nums'],
    statement: `Return the second largest **distinct** value in \`nums\`, or \`-1\` if it does not exist.

For \`[5, 9, 9, 2]\` the answer is \`5\`.`,
    constraints: ['1 ≤ nums.length ≤ 10⁵', '0 ≤ nums[i] ≤ 10⁵'],
    hints: [
      'Sorting works in O(n log n). Can you do one pass?',
      'Track the largest and the second largest as you go.',
      'Be careful with duplicates of the largest value.',
    ],
    solution: `function secondLargest(nums) {
  let first = -1;
  let second = -1;

  for (const x of nums) {
    if (x > first) {
      second = first;
      first = x;
    } else if (x < first && x > second) {
      second = x;
    }
  }
  return second;
}`,
    explanation:
      'Two variables are enough. A new maximum demotes the old one to second place; a value strictly between the two becomes the new second. Equal-to-max values are ignored, which handles duplicates.',
    complexity: { time: 'O(n)', space: 'O(1)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(4, 6) : rng.int(20, 60)
      return [rng.ints(n, 0, size === 'small' ? 15 : 500)]
    },
    edgeCases: [[[7]], [[5, 5, 5]], [[1, 2]]],
  },
  {
    id: 'running-sum',
    topic: 'array',
    title: 'Running Sum',
    difficulty: 'Easy',
    pattern: 'Prefix Sum',
    fn: 'runningSum',
    params: ['nums'],
    statement: `Return an array where element \`i\` is the sum of \`nums[0]\` through \`nums[i]\`.

For \`[1, 2, 3, 4]\` the answer is \`[1, 3, 6, 10]\`.`,
    constraints: ['1 ≤ nums.length ≤ 1000'],
    hints: ['Each running sum is the previous running sum plus the current element.'],
    solution: `function runningSum(nums) {
  const result = [];
  let total = 0;

  for (const x of nums) {
    total += x;
    result.push(total);
  }
  return result;
}`,
    explanation:
      'Prefix sums are the building block of many array techniques (range sums, subarray counting). One accumulator produces all of them in a single pass.',
    complexity: { time: 'O(n)', space: 'O(n) for the output' },
    generate(rng, size) {
      return [rng.ints(size === 'small' ? rng.int(4, 6) : rng.int(20, 60), -5, 10)]
    },
    edgeCases: [[[0]]],
  },
  {
    id: 'merge-intervals',
    topic: 'array',
    title: 'Merge Intervals',
    difficulty: 'Medium',
    pattern: 'Sorting',
    fn: 'merge',
    params: ['intervals'],
    statement: `Each element of \`intervals\` is \`[start, end]\`. Merge all overlapping intervals and return the result sorted by start.

Intervals that touch, like \`[1, 3]\` and \`[3, 5]\`, count as overlapping.`,
    constraints: ['1 ≤ intervals.length ≤ 10⁴', 'start ≤ end'],
    hints: [
      'Overlaps are easy to spot once intervals are sorted by start.',
      'After sorting, each interval either overlaps the last merged one or starts a new one.',
      'When overlapping, extend the last merged interval’s end to the max of both ends.',
    ],
    solution: `function merge(intervals) {
  const sorted = intervals
    .map((iv) => [iv[0], iv[1]])
    .sort((a, b) => a[0] - b[0]);
  const merged = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    if (current[0] <= last[1]) {
      last[1] = Math.max(last[1], current[1]);   // overlap: extend
    } else {
      merged.push(current);                      // gap: new interval
    }
  }
  return merged;
}`,
    explanation:
      'Sorting by start means any interval that overlaps the merged result must overlap its last interval. A single sweep then either extends that interval or appends a new one.',
    complexity: { time: 'O(n log n)', space: 'O(n)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(3, 4) : rng.int(10, 30)
      return [
        Array.from({ length: n }, () => {
          const start = rng.int(0, size === 'small' ? 12 : 60)
          return [start, start + rng.int(0, 4)]
        }),
      ]
    },
    edgeCases: [[[[1, 4]]], [[[1, 3], [3, 5]]], [[[5, 6], [1, 2]]]],
  },
  {
    id: 'min-subarray-len',
    topic: 'array',
    title: 'Minimum Size Subarray Sum',
    difficulty: 'Medium',
    pattern: 'Sliding Window',
    fn: 'minSubArrayLen',
    params: ['target', 'nums'],
    statement: `\`nums\` contains positive integers. Return the minimal length of a contiguous subarray whose sum is **at least** \`target\`, or \`0\` if there is none.`,
    constraints: ['1 ≤ nums.length ≤ 10⁵', '1 ≤ nums[i] ≤ 10⁴'],
    hints: [
      'All numbers are positive, so growing a window only increases its sum.',
      'Expand the window to the right until the sum reaches the target.',
      'Then shrink from the left as long as the sum stays ≥ target, recording the length.',
    ],
    solution: `function minSubArrayLen(target, nums) {
  let left = 0;
  let sum = 0;
  let best = Infinity;

  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];
    while (sum >= target) {
      best = Math.min(best, right - left + 1);
      sum -= nums[left];
      left++;
    }
  }
  return best === Infinity ? 0 : best;
}`,
    explanation:
      'A variable-size sliding window. Because values are positive, the window sum grows monotonically as it expands and shrinks as it contracts, so each index enters and leaves the window at most once.',
    complexity: { time: 'O(n)', space: 'O(1)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(5, 7) : rng.int(20, 80)
      const nums = rng.ints(n, 1, 9)
      const total = nums.reduce((s, x) => s + x, 0)
      return [rng.int(1, rng.bool(0.85) ? Math.max(1, Math.floor(total / 2)) : total + 5), nums]
    },
    edgeCases: [[100, [1, 2, 3]], [3, [3]]],
  },
  {
    id: 'search-rotated',
    topic: 'array',
    title: 'Search in Rotated Sorted Array',
    difficulty: 'Medium',
    pattern: 'Binary Search',
    fn: 'searchRotated',
    params: ['nums', 'target'],
    statement: `A sorted array of distinct values was rotated at some unknown pivot, e.g. \`[0, 1, 2, 4, 5, 6, 7]\` became \`[4, 5, 6, 7, 0, 1, 2]\`.

Return the index of \`target\`, or \`-1\` if it is absent, in O(log n) time.`,
    constraints: ['1 ≤ nums.length ≤ 5000', 'All values are distinct.'],
    hints: [
      'At any midpoint, at least one half — left or right — is still perfectly sorted.',
      'Check which half is sorted by comparing its endpoints.',
      'If the target lies inside the sorted half’s range, search there; otherwise search the other half.',
    ],
    solution: `function searchRotated(nums, target) {
  let low = 0;
  let high = nums.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (nums[mid] === target) return mid;

    if (nums[low] <= nums[mid]) {
      // left half is sorted
      if (target >= nums[low] && target < nums[mid]) high = mid - 1;
      else low = mid + 1;
    } else {
      // right half is sorted
      if (target > nums[mid] && target <= nums[high]) low = mid + 1;
      else high = mid - 1;
    }
  }
  return -1;
}`,
    explanation:
      'Rotation breaks global order but always leaves one sorted half around any midpoint. Checking whether the target falls inside that sorted half tells you which half to keep, preserving the O(log n) halving.',
    complexity: { time: 'O(log n)', space: 'O(1)' },
    generate(rng, size) {
      const sorted = rng.sortedUnique(size === 'small' ? rng.int(6, 8) : rng.int(20, 60), 0, 150)
      const pivot = rng.int(0, sorted.length - 1)
      const nums = [...sorted.slice(pivot), ...sorted.slice(0, pivot)]
      return [nums, rng.bool(0.7) ? rng.pick(nums) : rng.int(0, 155)]
    },
    edgeCases: [[[1], 0], [[3, 1], 1]],
  },
  {
    id: 'kth-largest',
    topic: 'array',
    title: 'Kth Largest Element',
    difficulty: 'Medium',
    pattern: 'Sorting / Selection',
    fn: 'findKthLargest',
    params: ['nums', 'k'],
    statement: `Return the \`k\`th largest element of \`nums\` in sorted order — not the \`k\`th distinct element.

For \`[3, 2, 3, 1, 2, 4, 5, 5, 6]\` and \`k = 4\`, the answer is \`4\`.`,
    constraints: ['1 ≤ k ≤ nums.length ≤ 10⁵'],
    hints: [
      'Sorting descending and indexing works in O(n log n).',
      'Can you avoid sorting everything? Quickselect partitions like quicksort but recurses into one side only.',
    ],
    solution: `function findKthLargest(nums, k) {
  // Sort a copy from largest to smallest; the answer sits at index k - 1.
  const sorted = [...nums].sort((a, b) => b - a);
  return sorted[k - 1];
}`,
    explanation:
      'Sorting in descending order puts the kth largest at index `k - 1`. For large inputs, quickselect (average O(n)) or a min-heap of size k (O(n log k)) are faster alternatives worth practising next.',
    complexity: { time: 'O(n log n)', space: 'O(n)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(5, 6) : rng.int(20, 60)
      return [rng.ints(n, 0, 20), rng.int(1, n)]
    },
    edgeCases: [[[1], 1], [[2, 2, 2], 2]],
  },
  {
    id: 'leaders',
    topic: 'array',
    title: 'Leaders in an Array',
    difficulty: 'Easy',
    pattern: 'Right-to-Left Scan',
    fn: 'leaders',
    params: ['nums'],
    statement: `An element is a **leader** if it is strictly greater than every element to its right. The last element is always a leader.

Return all leaders in their original left-to-right order.`,
    constraints: ['1 ≤ nums.length ≤ 10⁵'],
    hints: [
      'Checking everything to the right of each element is O(n²).',
      'Scan from the right, remembering the maximum seen so far.',
      'Collect leaders while scanning backwards, then reverse.',
    ],
    solution: `function leaders(nums) {
  const result = [];
  let maxRight = -Infinity;

  for (let i = nums.length - 1; i >= 0; i--) {
    if (nums[i] > maxRight) {
      result.push(nums[i]);
      maxRight = nums[i];
    }
  }
  return result.reverse();
}`,
    explanation:
      'An element is a leader exactly when it beats the maximum of everything after it. Scanning from the right keeps that maximum available in O(1).',
    complexity: { time: 'O(n)', space: 'O(n) for the output' },
    generate(rng, size) {
      return [rng.ints(size === 'small' ? rng.int(5, 7) : rng.int(20, 60), 0, 20)]
    },
    edgeCases: [[[3]], [[4, 4]]],
  },
  {
    id: 'jump-game',
    topic: 'array',
    title: 'Jump Game',
    difficulty: 'Medium',
    pattern: 'Greedy',
    fn: 'canJump',
    params: ['nums'],
    statement: `You start at index \`0\`. Each \`nums[i]\` is the maximum jump length from position \`i\`.

Return \`true\` if you can reach the last index, otherwise \`false\`.`,
    constraints: ['1 ≤ nums.length ≤ 10⁴', '0 ≤ nums[i] ≤ 10⁵'],
    hints: [
      'You don’t need the exact path — only how far you can possibly reach.',
      'Walk forward tracking the furthest index reachable so far.',
      'If you ever stand beyond that furthest index, you are stuck.',
    ],
    solution: `function canJump(nums) {
  let reach = 0; // furthest index we can get to

  for (let i = 0; i < nums.length; i++) {
    if (i > reach) {
      return false;  // this index is unreachable
    }
    reach = Math.max(reach, i + nums[i]);
  }
  return true;
}`,
    explanation:
      'Every index up to `reach` is reachable. Each step can only extend `reach`; if the scan ever gets ahead of it, there is a gap that no jump can cross.',
    complexity: { time: 'O(n)', space: 'O(1)' },
    generate(rng, size) {
      const n = size === 'small' ? rng.int(5, 7) : rng.int(20, 60)
      return [Array.from({ length: n }, () => (rng.bool(0.25) ? 0 : rng.int(1, 3)))]
    },
    edgeCases: [[[0]], [[0, 1]], [[2, 0, 0]]],
  },
]
