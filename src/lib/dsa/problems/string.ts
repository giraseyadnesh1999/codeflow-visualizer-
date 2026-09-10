import type { Rng } from '../rng'
import type { Problem } from '../types'

const WORDS = [
  'code', 'flow', 'array', 'string', 'stack', 'queue', 'graph', 'tree', 'node', 'loop',
  'byte', 'data', 'sort', 'hash', 'map', 'set', 'list', 'heap', 'key', 'value',
  'river', 'cloud', 'pixel', 'light', 'orbit', 'maple', 'tiger', 'lemon', 'spark', 'delta',
]

const words = (rng: Rng, count: number) => Array.from({ length: count }, () => rng.pick(WORDS))

function toRoman(num: number): string {
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let out = ''
  for (const [value, symbol] of table) {
    while (num >= value) {
      out += symbol
      num -= value
    }
  }
  return out
}

function palindrome(rng: Rng, half: number, alphabet: string): string {
  const left = rng.str(half, alphabet)
  const middle = rng.bool() ? rng.str(1, alphabet) : ''
  return left + middle + [...left].reverse().join('')
}

/*
 * String problems. Same rules as the array bank: solutions are source strings
 * that run both natively and inside the CodeFlow interpreter.
 */
export const STRING_PROBLEMS: Problem[] = [
  {
    id: 'reverse-string',
    topic: 'string',
    title: 'Reverse a String',
    difficulty: 'Easy',
    pattern: 'Two Pointers',
    fn: 'reverseString',
    params: ['s'],
    statement: `Return the string \`s\` reversed.

Try it with two pointers that swap characters, instead of the built-in \`reverse()\`.`,
    constraints: ['0 ≤ s.length ≤ 10⁵'],
    hints: [
      'Strings are immutable in JavaScript — split into an array of characters first.',
      'Swap the first and last characters, then move both pointers inward.',
    ],
    solution: `function reverseString(s) {
  const chars = s.split('');
  let left = 0;
  let right = chars.length - 1;

  while (left < right) {
    const temp = chars[left];
    chars[left] = chars[right];
    chars[right] = temp;
    left++;
    right--;
  }
  return chars.join('');
}`,
    explanation:
      'Two pointers start at opposite ends and swap until they meet, touching each character once. Converting to an array is needed because JavaScript strings cannot be modified in place.',
    complexity: { time: 'O(n)', space: 'O(n) for the character array' },
    generate(rng, size) {
      return [rng.str(size === 'small' ? rng.int(4, 7) : rng.int(20, 80))]
    },
    edgeCases: [[''], ['a']],
  },
  {
    id: 'valid-palindrome',
    topic: 'string',
    title: 'Valid Palindrome',
    difficulty: 'Easy',
    pattern: 'Two Pointers',
    fn: 'isPalindrome',
    params: ['s'],
    statement: `A phrase is a palindrome if, after lower-casing it and removing every non-alphanumeric character, it reads the same forwards and backwards.

Return \`true\` if \`s\` is a palindrome under that rule. For example \`"A man, a plan, a canal: Panama"\` is.`,
    constraints: ['1 ≤ s.length ≤ 2 × 10⁵'],
    hints: [
      'You could build a cleaned-up string first, then compare it with its reverse.',
      'Or use two pointers that skip characters that are not letters or digits.',
      'Compare characters in lower case.',
    ],
    solution: `function isPalindrome(s) {
  const isAlnum = (ch) => /[a-z0-9]/i.test(ch);
  let left = 0;
  let right = s.length - 1;

  while (left < right) {
    if (!isAlnum(s[left])) {
      left++;
    } else if (!isAlnum(s[right])) {
      right--;
    } else {
      if (s[left].toLowerCase() !== s[right].toLowerCase()) {
        return false;
      }
      left++;
      right--;
    }
  }
  return true;
}`,
    explanation:
      'Two pointers walk inward, skipping anything that is not a letter or digit, and compare case-insensitively. No cleaned copy of the string is needed.',
    complexity: { time: 'O(n)', space: 'O(1)' },
    generate(rng, size) {
      const half = size === 'small' ? rng.int(2, 4) : rng.int(10, 30)
      let core = palindrome(rng, half, 'abcdefg')
      if (rng.bool(0.4)) core = core.slice(0, -1) + (core.endsWith('z') ? 'y' : 'z')
      return [
        [...core]
          .map((ch) => (rng.bool(0.3) ? ch.toUpperCase() : ch) + (rng.bool(0.25) ? rng.pick([' ', ',', '!', ':']) : ''))
          .join(''),
      ]
    },
    edgeCases: [[' '], ['0P'], ['ab_a']],
  },
  {
    id: 'valid-anagram',
    topic: 'string',
    title: 'Valid Anagram',
    difficulty: 'Easy',
    pattern: 'Frequency Count',
    fn: 'isAnagram',
    params: ['s', 't'],
    statement: `Return \`true\` if \`t\` is an anagram of \`s\` — the same letters with the same counts, in any order.`,
    constraints: ['1 ≤ s.length, t.length ≤ 5 × 10⁴', 'Lowercase English letters only.'],
    hints: [
      'Different lengths can never be anagrams.',
      'Count each letter in `s`, then subtract the counts of `t`.',
      'An array of 26 counters (one per letter) is enough.',
    ],
    solution: `function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const counts = new Array(26).fill(0);
  const a = 'a'.charCodeAt(0);

  for (let i = 0; i < s.length; i++) {
    counts[s.charCodeAt(i) - a]++;
    counts[t.charCodeAt(i) - a]--;
  }
  return counts.every((c) => c === 0);
}`,
    explanation:
      'Anagrams have identical letter counts. Incrementing for `s` and decrementing for `t` in the same loop leaves every counter at zero exactly when the counts match.',
    complexity: { time: 'O(n)', space: 'O(1) — 26 counters' },
    generate(rng, size) {
      const s = rng.str(size === 'small' ? rng.int(4, 6) : rng.int(20, 60), 'abcdef')
      let t = rng.shuffle([...s]).join('')
      if (rng.bool(0.45)) t = t.slice(0, -1) + (t.endsWith('x') ? 'y' : 'x')
      return [s, t]
    },
    edgeCases: [['a', 'ab'], ['aab', 'abb']],
  },
  {
    id: 'first-unique-char',
    topic: 'string',
    title: 'First Unique Character',
    difficulty: 'Easy',
    pattern: 'Frequency Count',
    fn: 'firstUniqChar',
    params: ['s'],
    statement: `Return the index of the first character in \`s\` that appears exactly once. If there is none, return \`-1\`.`,
    constraints: ['1 ≤ s.length ≤ 10⁵', 'Lowercase English letters only.'],
    hints: ['You need to know each character’s total count before deciding.', 'Count in one pass, then find the first count of 1 in a second pass.'],
    solution: `function firstUniqChar(s) {
  const counts = {};
  for (const ch of s) {
    counts[ch] = (counts[ch] || 0) + 1;
  }
  for (let i = 0; i < s.length; i++) {
    if (counts[s[i]] === 1) {
      return i;
    }
  }
  return -1;
}`,
    explanation:
      'Uniqueness depends on the whole string, so first build a frequency table, then scan again in order and return the first character whose count is 1.',
    complexity: { time: 'O(n)', space: 'O(1) — at most 26 keys' },
    generate(rng, size) {
      return [rng.str(size === 'small' ? rng.int(5, 8) : rng.int(20, 60), size === 'small' ? 'abcde' : 'abcdefghij')]
    },
    edgeCases: [['aabb'], ['z']],
  },
  {
    id: 'longest-unique-substring',
    topic: 'string',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    pattern: 'Sliding Window',
    fn: 'lengthOfLongestSubstring',
    params: ['s'],
    statement: `Return the length of the longest substring of \`s\` that contains no repeated characters.

For \`"abcabcbb"\` the answer is \`3\` (\`"abc"\`).`,
    constraints: ['0 ≤ s.length ≤ 5 × 10⁴'],
    hints: [
      'Keep a window `[left, right]` that never contains a repeat.',
      'When `s[right]` is already inside the window, move `left` just past its previous position.',
      'A map from character to its last index lets you jump `left` directly.',
    ],
    solution: `function lengthOfLongestSubstring(s) {
  const lastSeen = new Map();  // char -> last index
  let left = 0;
  let best = 0;

  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (lastSeen.has(ch) && lastSeen.get(ch) >= left) {
      left = lastSeen.get(ch) + 1;  // skip past the repeat
    }
    lastSeen.set(ch, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}`,
    explanation:
      'A sliding window holds the current repeat-free substring. When a character repeats inside the window, the window’s left edge jumps just past the earlier copy. Each index moves forward only, so the scan is linear.',
    complexity: { time: 'O(n)', space: 'O(k) for k distinct characters' },
    generate(rng, size) {
      return [rng.str(size === 'small' ? rng.int(6, 8) : rng.int(20, 80), size === 'small' ? 'abcd' : 'abcdefgh')]
    },
    edgeCases: [[''], ['bbbbb'], ['abba']],
  },
  {
    id: 'longest-common-prefix',
    topic: 'string',
    title: 'Longest Common Prefix',
    difficulty: 'Easy',
    pattern: 'Vertical Scan',
    fn: 'longestCommonPrefix',
    params: ['strs'],
    statement: `Return the longest prefix shared by every string in \`strs\`. If there is none, return \`""\`.`,
    constraints: ['1 ≤ strs.length ≤ 200', '0 ≤ strs[i].length ≤ 200'],
    hints: [
      'The answer can be no longer than the shortest string.',
      'Compare character by character across all strings, column by column.',
      'Stop at the first column where any string differs or ends.',
    ],
    solution: `function longestCommonPrefix(strs) {
  const first = strs[0];

  for (let i = 0; i < first.length; i++) {
    for (const word of strs) {
      if (i >= word.length || word[i] !== first[i]) {
        return first.slice(0, i);
      }
    }
  }
  return first;
}`,
    explanation:
      'Scan column by column using the first string as a reference. The first mismatch (or the end of any string) marks where the common prefix stops.',
    complexity: { time: 'O(total characters)', space: 'O(1)' },
    generate(rng, size) {
      const prefix = rng.str(rng.int(0, size === 'small' ? 3 : 6), 'abc')
      const count = size === 'small' ? rng.int(2, 3) : rng.int(5, 15)
      return [Array.from({ length: count }, () => prefix + rng.str(rng.int(0, 4), 'abcd'))]
    },
    edgeCases: [[['alone']], [['', 'b']], [['dog', 'racecar', 'car']]],
  },
  {
    id: 'reverse-words',
    topic: 'string',
    title: 'Reverse Words in a String',
    difficulty: 'Medium',
    pattern: 'Split & Join',
    fn: 'reverseWords',
    params: ['s'],
    statement: `Reverse the order of the words in \`s\`. Words are separated by one or more spaces, and \`s\` may have leading or trailing spaces.

Return the words in reverse order joined by a **single** space, with no extra spaces.`,
    constraints: ['1 ≤ s.length ≤ 10⁴', 's contains at least one word.'],
    hints: [
      'Splitting on a single space leaves empty strings when spaces repeat.',
      'Filter out empty pieces (or split on a regex like /\\s+/ after trimming).',
      'Then reverse and join with one space — or build it yourself with two pointers.',
    ],
    solution: `function reverseWords(s) {
  const words = [];
  let current = '';

  for (const ch of s) {
    if (ch === ' ') {
      if (current !== '') {
        words.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current !== '') words.push(current);

  const reversed = [];
  for (let i = words.length - 1; i >= 0; i--) {
    reversed.push(words[i]);
  }
  return reversed.join(' ');
}`,
    explanation:
      'Collect the words manually — a word ends at each space, and empty pieces from repeated spaces are skipped — then emit them from last to first. `s.trim().split(/\\s+/).reverse().join(" ")` is the one-line version.',
    complexity: { time: 'O(n)', space: 'O(n)' },
    generate(rng, size) {
      const list = words(rng, size === 'small' ? rng.int(2, 4) : rng.int(6, 15))
      const gap = () => ' '.repeat(rng.int(1, 3))
      return [(rng.bool() ? gap() : '') + list.join(gap()) + (rng.bool() ? gap() : '')]
    },
    edgeCases: [['  hello  '], ['a b']],
  },
  {
    id: 'count-vowels',
    topic: 'string',
    title: 'Count the Vowels',
    difficulty: 'Easy',
    pattern: 'Linear Scan',
    fn: 'countVowels',
    params: ['s'],
    statement: `Return how many vowels (\`a e i o u\`, upper or lower case) appear in \`s\`.`,
    constraints: ['0 ≤ s.length ≤ 10⁵'],
    hints: ['Loop over each character.', 'A string like "aeiouAEIOU" plus `.includes(ch)` is an easy membership test.'],
    solution: `function countVowels(s) {
  const vowels = 'aeiouAEIOU';
  let count = 0;

  for (const ch of s) {
    if (vowels.includes(ch)) {
      count++;
    }
  }
  return count;
}`,
    explanation: 'A single pass with a constant-size membership check per character.',
    complexity: { time: 'O(n)', space: 'O(1)' },
    generate(rng, size) {
      return [words(rng, size === 'small' ? rng.int(2, 3) : rng.int(8, 20)).map((w) => (rng.bool(0.3) ? w.toUpperCase() : w)).join(' ')]
    },
    edgeCases: [[''], ['rhythm']],
  },
  {
    id: 'char-frequency',
    topic: 'string',
    title: 'Character Frequency',
    difficulty: 'Easy',
    pattern: 'Hash Map',
    fn: 'charFrequency',
    params: ['s'],
    statement: `Return an object mapping each character of \`s\` to the number of times it appears.

For \`"banana"\` return \`{ b: 1, a: 3, n: 2 }\`. Key order does not matter.`,
    constraints: ['0 ≤ s.length ≤ 10⁵', 'Lowercase English letters only.'],
    hints: ['Start with an empty object.', 'For each character, add 1 to its count (treat a missing count as 0).'],
    solution: `function charFrequency(s) {
  const freq = {};
  for (const ch of s) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  return freq;
}`,
    explanation:
      'The frequency map is the most reused string technique — anagrams, first unique character and many window problems are all built on it.',
    complexity: { time: 'O(n)', space: 'O(k) for k distinct characters' },
    generate(rng, size) {
      return [rng.str(size === 'small' ? rng.int(5, 7) : rng.int(20, 60), 'abcdef')]
    },
    edgeCases: [[''], ['zzz']],
  },
  {
    id: 'string-compression',
    topic: 'string',
    title: 'String Compression',
    difficulty: 'Medium',
    pattern: 'Run-Length Encoding',
    fn: 'compress',
    params: ['s'],
    statement: `Compress \`s\` by replacing each run of repeated characters with the character followed by the run length. Runs of length 1 are written as just the character.

For \`"aaabccdddd"\` return \`"a3bc2d4"\`.`,
    constraints: ['0 ≤ s.length ≤ 10⁵'],
    hints: [
      'Walk through the string counting how long the current run is.',
      'A run ends when the next character differs (or the string ends).',
      'When a run ends, append the character, plus the count if it is more than 1.',
    ],
    solution: `function compress(s) {
  let result = '';
  let i = 0;

  while (i < s.length) {
    let j = i;
    while (j < s.length && s[j] === s[i]) {
      j++;
    }
    const runLength = j - i;
    result += s[i] + (runLength > 1 ? runLength : '');
    i = j;  // jump to the next run
  }
  return result;
}`,
    explanation:
      'The inner loop measures the run starting at `i`; then `i` jumps straight to the next run. Each character is looked at a constant number of times.',
    complexity: { time: 'O(n)', space: 'O(n) for the output' },
    generate(rng, size) {
      const runs = size === 'small' ? rng.int(3, 4) : rng.int(8, 20)
      let s = ''
      for (let i = 0; i < runs; i++) s += rng.str(1, 'abcd').repeat(rng.int(1, size === 'small' ? 3 : 12))
      return [s]
    },
    edgeCases: [[''], ['a'], ['aaaaaaaaaaaa']],
  },
  {
    id: 'is-subsequence',
    topic: 'string',
    title: 'Is Subsequence',
    difficulty: 'Easy',
    pattern: 'Two Pointers',
    fn: 'isSubsequence',
    params: ['s', 't'],
    statement: `Return \`true\` if \`s\` is a subsequence of \`t\` — that is, \`s\` can be formed by deleting some (or no) characters of \`t\` without reordering the rest.

\`"ace"\` is a subsequence of \`"abcde"\`; \`"aec"\` is not.`,
    constraints: ['0 ≤ s.length ≤ 100', '0 ≤ t.length ≤ 10⁴'],
    hints: ['Use one pointer in `s` and one in `t`.', 'Advance the `s` pointer only when the characters match; always advance the `t` pointer.'],
    solution: `function isSubsequence(s, t) {
  let i = 0; // position in s

  for (let j = 0; j < t.length && i < s.length; j++) {
    if (s[i] === t[j]) {
      i++;
    }
  }
  return i === s.length;
}`,
    explanation:
      'Greedily match each character of `s` at its earliest possible position in `t`. If every character of `s` gets matched, it is a subsequence.',
    complexity: { time: 'O(n + m)', space: 'O(1)' },
    generate(rng, size) {
      const t = rng.str(size === 'small' ? rng.int(6, 8) : rng.int(20, 80), 'abcdef')
      let s = [...t].filter(() => rng.bool(0.4)).join('')
      if (rng.bool(0.4)) s = rng.shuffle([...s]).join('')
      return [s, t]
    },
    edgeCases: [['', 'abc'], ['abc', '']],
  },
  {
    id: 'longest-palindromic-substring',
    topic: 'string',
    title: 'Longest Palindromic Substring',
    difficulty: 'Medium',
    pattern: 'Expand Around Center',
    fn: 'longestPalindrome',
    params: ['s'],
    statement: `Return the longest substring of \`s\` that is a palindrome. If several have the same maximum length, return the one that starts **first**.`,
    constraints: ['1 ≤ s.length ≤ 1000'],
    hints: [
      'Every palindrome mirrors around a center.',
      'A center is either a single character (odd length) or the gap between two characters (even length).',
      'Expand outward from each of the 2n − 1 centers while the ends match.',
    ],
    solution: `function longestPalindrome(s) {
  let start = 0;
  let maxLen = 1;

  function expand(lo, hi) {
    while (lo >= 0 && hi < s.length && s[lo] === s[hi]) {
      lo--;
      hi++;
    }
    const len = hi - lo - 1;
    if (len > maxLen) {
      maxLen = len;
      start = lo + 1;
    }
  }

  for (let center = 0; center < s.length; center++) {
    expand(center, center);       // odd length
    expand(center, center + 1);   // even length
  }
  return s.slice(start, start + maxLen);
}`,
    explanation:
      'Each of the 2n − 1 possible centers is expanded while the characters on both sides match. Updating only on a strictly longer palindrome keeps the leftmost answer among ties.',
    complexity: { time: 'O(n²)', space: 'O(1)' },
    generate(rng, size) {
      const alphabet = 'abc'
      const pal = palindrome(rng, size === 'small' ? rng.int(1, 2) : rng.int(3, 8), alphabet)
      const pad = size === 'small' ? 2 : 12
      return [rng.str(rng.int(0, pad), alphabet) + pal + rng.str(rng.int(0, pad), alphabet)]
    },
    edgeCases: [['a'], ['ab'], ['abb']],
  },
  {
    id: 'roman-to-integer',
    topic: 'string',
    title: 'Roman to Integer',
    difficulty: 'Easy',
    pattern: 'Lookup Table',
    fn: 'romanToInt',
    params: ['s'],
    statement: `Convert the Roman numeral \`s\` to an integer. Symbols are \`I=1, V=5, X=10, L=50, C=100, D=500, M=1000\`.

A smaller symbol before a larger one is subtracted (\`IV = 4\`, \`XC = 90\`); otherwise values add up.`,
    constraints: ['1 ≤ value ≤ 3999', 's is a valid Roman numeral.'],
    hints: [
      'Map each symbol to its value.',
      'A symbol is subtracted exactly when the next symbol is larger.',
      'Otherwise add it.',
    ],
    solution: `function romanToInt(s) {
  const value = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;

  for (let i = 0; i < s.length; i++) {
    const current = value[s[i]];
    const next = value[s[i + 1]] || 0;
    if (current < next) {
      total -= current;   // e.g. the I in IV
    } else {
      total += current;
    }
  }
  return total;
}`,
    explanation:
      'Scan left to right. Because subtractive pairs always put a smaller symbol before a larger one, peeking at the next symbol decides whether to add or subtract.',
    complexity: { time: 'O(n)', space: 'O(1)' },
    generate(rng, size) {
      return [toRoman(size === 'small' ? rng.int(1, 60) : rng.int(1, 3999))]
    },
    edgeCases: [['III'], ['MCMXCIV'], ['MMMCMXCIX']],
  },
  {
    id: 'valid-parentheses',
    topic: 'string',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    pattern: 'Stack',
    fn: 'isValid',
    params: ['s'],
    statement: `\`s\` contains only the characters \`()[]{}\`. Return \`true\` if every bracket is closed by the same type of bracket, in the correct order.`,
    constraints: ['1 ≤ s.length ≤ 10⁴'],
    hints: [
      'The most recently opened bracket must be the first one closed.',
      'That "last in, first out" rule is exactly a stack.',
      'Push openers; on a closer, pop and check it matches. The stack must be empty at the end.',
    ],
    solution: `function isValid(s) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];

  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') {
      stack.push(ch);
    } else if (stack.pop() !== pairs[ch]) {
      return false;   // wrong type, or nothing to close
    }
  }
  return stack.length === 0;
}`,
    explanation:
      'An array used as a stack remembers open brackets in order. Each closing bracket must match the top of the stack; anything left open at the end also makes the string invalid.',
    complexity: { time: 'O(n)', space: 'O(n)' },
    generate(rng, size) {
      const pairs = ['()', '[]', '{}']
      const build = (depth: number): string => {
        let out = ''
        const count = rng.int(1, 2)
        for (let i = 0; i < count; i++) {
          const p = rng.pick(pairs)
          out += p[0] + (depth > 0 && rng.bool(0.6) ? build(depth - 1) : '') + p[1]
        }
        return out
      }
      let s = build(size === 'small' ? 1 : 4)
      if (rng.bool(0.45)) {
        const i = rng.int(0, s.length - 1)
        s = s.slice(0, i) + rng.pick(['(', ')', ']', '{']) + s.slice(i + 1)
      }
      return [s]
    },
    edgeCases: [['('], [')('], ['([)]'], ['{[]}']],
  },
  {
    id: 'title-case',
    topic: 'string',
    title: 'Title Case',
    difficulty: 'Easy',
    pattern: 'Split & Join',
    fn: 'titleCase',
    params: ['s'],
    statement: `\`s\` is a sentence of words separated by single spaces. Return it with the first letter of every word in upper case and all other letters in lower case.

\`"hELLO wORLD"\` becomes \`"Hello World"\`.`,
    constraints: ['1 ≤ s.length ≤ 10⁴'],
    hints: ['Split the sentence into words.', 'Rebuild each word as `word[0].toUpperCase() + word.slice(1).toLowerCase()`.'],
    solution: `function titleCase(s) {
  const words = s.split(' ');
  const result = [];

  for (const word of words) {
    result.push(word[0].toUpperCase() + word.slice(1).toLowerCase());
  }
  return result.join(' ');
}`,
    explanation: 'Split into words, fix the casing of each one independently, and join them back with spaces.',
    complexity: { time: 'O(n)', space: 'O(n)' },
    generate(rng, size) {
      const list = words(rng, size === 'small' ? rng.int(2, 3) : rng.int(6, 15))
      return [list.map((w) => [...w].map((c) => (rng.bool(0.4) ? c.toUpperCase() : c)).join('')).join(' ')]
    },
    edgeCases: [['a'], ['ALL CAPS HERE']],
  },
  {
    id: 'min-window-substring',
    topic: 'string',
    title: 'Minimum Window Substring',
    difficulty: 'Hard',
    pattern: 'Sliding Window',
    fn: 'minWindow',
    params: ['s', 't'],
    statement: `Return the shortest substring of \`s\` that contains every character of \`t\` (including duplicates). If several windows share the minimum length, return the one that starts first. If no window exists, return \`""\`.

For \`s = "ADOBECODEBANC"\` and \`t = "ABC"\` the answer is \`"BANC"\`.`,
    constraints: ['1 ≤ s.length, t.length ≤ 10⁵'],
    hints: [
      'Count what `t` needs. Track how many of those requirements the current window satisfies.',
      'Expand `right` until the window satisfies everything.',
      'Then shrink `left` while it still satisfies everything, recording the smallest window.',
    ],
    solution: `function minWindow(s, t) {
  const need = {};
  for (const ch of t) need[ch] = (need[ch] || 0) + 1;

  let missing = t.length;  // characters still needed
  let left = 0;
  let bestStart = 0;
  let bestLen = Infinity;

  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (need[ch] > 0) missing--;
    need[ch] = (need[ch] || 0) - 1;

    while (missing === 0) {
      if (right - left + 1 < bestLen) {
        bestLen = right - left + 1;
        bestStart = left;
      }
      const out = s[left];
      need[out]++;
      if (need[out] > 0) missing++;  // window no longer valid
      left++;
    }
  }
  return bestLen === Infinity ? '' : s.slice(bestStart, bestStart + bestLen);
}`,
    explanation:
      '`need` holds how many of each character the window still lacks (negative means surplus). Expanding the right edge satisfies requirements; once all are met, the left edge shrinks as far as possible. Each index enters and leaves the window once.',
    complexity: { time: 'O(n + m)', space: 'O(k) for k distinct characters' },
    generate(rng, size) {
      const s = rng.str(size === 'small' ? rng.int(7, 9) : rng.int(30, 80), 'ABCDE')
      const t = rng.bool(0.85)
        ? rng.shuffle([...s]).slice(0, size === 'small' ? rng.int(2, 3) : rng.int(3, 6)).join('')
        : 'XY'
      return [s, t]
    },
    edgeCases: [['a', 'a'], ['a', 'aa'], ['ADOBECODEBANC', 'ABC']],
  },
  {
    id: 'character-replacement',
    topic: 'string',
    title: 'Longest Repeating Character Replacement',
    difficulty: 'Medium',
    pattern: 'Sliding Window',
    fn: 'characterReplacement',
    params: ['s', 'k'],
    statement: `You may change at most \`k\` characters of \`s\` (uppercase letters) to any other uppercase letter.

Return the length of the longest substring that can be made of one repeated letter.`,
    constraints: ['1 ≤ s.length ≤ 10⁵', '0 ≤ k ≤ s.length'],
    hints: [
      'A window is fixable if (window length − count of its most common letter) ≤ k.',
      'Grow the window to the right, updating letter counts.',
      'When the window becomes unfixable, move its left edge forward by one.',
    ],
    solution: `function characterReplacement(s, k) {
  const counts = {};
  let left = 0;
  let maxCount = 0;  // most frequent letter count in any window so far
  let best = 0;

  for (let right = 0; right < s.length; right++) {
    counts[s[right]] = (counts[s[right]] || 0) + 1;
    maxCount = Math.max(maxCount, counts[s[right]]);

    // too many letters would need replacing: slide the window
    if (right - left + 1 - maxCount > k) {
      counts[s[left]]--;
      left++;
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}`,
    explanation:
      'The letters that must change are everything except the most common letter in the window. The window grows while that number is ≤ k and slides otherwise. `maxCount` never needs to decrease: only a larger count can produce a longer valid window.',
    complexity: { time: 'O(n)', space: 'O(1) — 26 letters' },
    generate(rng, size) {
      const s = rng.str(size === 'small' ? rng.int(6, 8) : rng.int(20, 80), 'ABC')
      return [s, rng.int(0, size === 'small' ? 2 : 5)]
    },
    edgeCases: [['A', 0], ['ABAB', 2], ['AABABBA', 1]],
  },
  {
    id: 'string-rotation',
    topic: 'string',
    title: 'String Rotation',
    difficulty: 'Easy',
    pattern: 'Concatenation Trick',
    fn: 'isRotation',
    params: ['a', 'b'],
    statement: `Return \`true\` if \`b\` can be obtained by rotating \`a\` — moving some number of characters from the front of \`a\` to its back.

\`"waterbottle"\` rotates to \`"erbottlewat"\`.`,
    constraints: ['0 ≤ a.length, b.length ≤ 10⁴'],
    hints: ['Rotations must have the same length.', 'Every rotation of `a` appears somewhere inside `a + a`.'],
    solution: `function isRotation(a, b) {
  if (a.length !== b.length) return false;
  return (a + a).includes(b);
}`,
    explanation:
      'Writing `a` twice in a row contains every rotation of `a` as a substring. After checking the lengths match, a substring search answers the question.',
    complexity: { time: 'O(n) with a linear-time substring search', space: 'O(n)' },
    generate(rng, size) {
      const a = rng.str(size === 'small' ? rng.int(4, 6) : rng.int(20, 60), 'abcd')
      const cut = rng.int(0, a.length)
      let b = a.slice(cut) + a.slice(0, cut)
      if (rng.bool(0.4)) b = rng.shuffle([...b]).join('')
      return [a, b]
    },
    edgeCases: [['', ''], ['ab', 'abc'], ['aa', 'aa']],
  },
  {
    id: 'remove-adjacent-duplicates',
    topic: 'string',
    title: 'Remove Adjacent Duplicates',
    difficulty: 'Easy',
    pattern: 'Stack',
    fn: 'removeDuplicates',
    params: ['s'],
    statement: `Repeatedly remove pairs of equal adjacent characters from \`s\` until no such pair remains, and return the final string.

\`"abbaca"\` → remove \`"bb"\` → \`"aaca"\` → remove \`"aa"\` → \`"ca"\`.`,
    constraints: ['1 ≤ s.length ≤ 10⁵'],
    hints: [
      'Removing one pair can create a new pair — that suggests remembering what came before.',
      'Push characters on a stack; if the next character equals the top, pop instead.',
    ],
    solution: `function removeDuplicates(s) {
  const stack = [];

  for (const ch of s) {
    if (stack.length > 0 && stack[stack.length - 1] === ch) {
      stack.pop();   // cancel the pair
    } else {
      stack.push(ch);
    }
  }
  return stack.join('');
}`,
    explanation:
      'The stack holds the reduced string so far. A character equal to the top cancels it, which automatically handles pairs that only appear after earlier removals.',
    complexity: { time: 'O(n)', space: 'O(n)' },
    generate(rng, size) {
      return [rng.str(size === 'small' ? rng.int(6, 8) : rng.int(20, 80), 'abc')]
    },
    edgeCases: [['aa'], ['abba'], ['abc']],
  },
  {
    id: 'caesar-cipher',
    topic: 'string',
    title: 'Caesar Cipher',
    difficulty: 'Easy',
    pattern: 'Character Codes',
    fn: 'caesarCipher',
    params: ['s', 'shift'],
    statement: `Shift every lowercase letter in \`s\` forward by \`shift\` places in the alphabet, wrapping from \`z\` back to \`a\`. Leave spaces unchanged.

\`caesarCipher("xyz", 2)\` returns \`"zab"\`. \`shift\` can be larger than 26.`,
    constraints: ['0 ≤ shift ≤ 1000', 's has only lowercase letters and spaces.'],
    hints: [
      'Turn a letter into 0–25 with `ch.charCodeAt(0) - 97`.',
      'Add the shift and wrap with `% 26`.',
      'Turn it back into a letter with `String.fromCharCode(code + 97)`.',
    ],
    solution: `function caesarCipher(s, shift) {
  let result = '';

  for (const ch of s) {
    if (ch === ' ') {
      result += ch;
    } else {
      const index = (ch.charCodeAt(0) - 97 + shift) % 26;
      result += String.fromCharCode(index + 97);
    }
  }
  return result;
}`,
    explanation:
      'Letters map to 0–25, shifting is addition, and wrapping around the alphabet is modulo 26. Converting back uses the character code of `a` (97) as the offset.',
    complexity: { time: 'O(n)', space: 'O(n)' },
    generate(rng, size) {
      return [words(rng, size === 'small' ? rng.int(1, 2) : rng.int(5, 12)).join(' '), rng.int(0, size === 'small' ? 30 : 500)]
    },
    edgeCases: [['xyz', 2], ['abc', 26]],
  },
  {
    id: 'count-palindromic-substrings',
    topic: 'string',
    title: 'Count Palindromic Substrings',
    difficulty: 'Medium',
    pattern: 'Expand Around Center',
    fn: 'countSubstrings',
    params: ['s'],
    statement: `Return how many substrings of \`s\` are palindromes. Substrings at different positions count separately, even if their text is the same.

\`"aaa"\` has 6: \`a, a, a, aa, aa, aaa\`.`,
    constraints: ['1 ≤ s.length ≤ 1000'],
    hints: [
      'Every palindrome has a center — a character or a gap between two characters.',
      'From each center, every successful expansion step is one more palindrome.',
    ],
    solution: `function countSubstrings(s) {
  let count = 0;

  function expand(lo, hi) {
    while (lo >= 0 && hi < s.length && s[lo] === s[hi]) {
      count++;
      lo--;
      hi++;
    }
  }

  for (let center = 0; center < s.length; center++) {
    expand(center, center);       // odd length
    expand(center, center + 1);   // even length
  }
  return count;
}`,
    explanation:
      'Expanding around each of the 2n − 1 centers visits every palindrome exactly once, counting as it grows outward.',
    complexity: { time: 'O(n²)', space: 'O(1)' },
    generate(rng, size) {
      return [rng.str(size === 'small' ? rng.int(4, 6) : rng.int(20, 60), 'ab')]
    },
    edgeCases: [['a'], ['abc'], ['aaa']],
  },
  {
    id: 'longest-word',
    topic: 'string',
    title: 'Longest Word',
    difficulty: 'Easy',
    pattern: 'Linear Scan',
    fn: 'longestWord',
    params: ['sentence'],
    statement: `\`sentence\` contains words separated by single spaces. Return the longest word. If there is a tie, return the one that appears **first**.`,
    constraints: ['1 ≤ sentence.length ≤ 10⁴'],
    hints: ['Split into words.', 'Replace your best word only when a strictly longer one comes along.'],
    solution: `function longestWord(sentence) {
  let best = '';

  for (const word of sentence.split(' ')) {
    if (word.length > best.length) {
      best = word;
    }
  }
  return best;
}`,
    explanation: 'Using a strict `>` comparison means an equally long later word never replaces the earlier one.',
    complexity: { time: 'O(n)', space: 'O(n)' },
    generate(rng, size) {
      return [words(rng, size === 'small' ? rng.int(3, 4) : rng.int(8, 20)).join(' ')]
    },
    edgeCases: [['one'], ['ab cd ef']],
  },
  {
    id: 'isomorphic-strings',
    topic: 'string',
    title: 'Isomorphic Strings',
    difficulty: 'Easy',
    pattern: 'Two Hash Maps',
    fn: 'isIsomorphic',
    params: ['s', 't'],
    statement: `Two strings are isomorphic if the characters in \`s\` can be consistently replaced to get \`t\`: every occurrence of a character maps to the same character, and no two different characters map to the same one.

\`"egg"\` and \`"add"\` are isomorphic; \`"foo"\` and \`"bar"\` are not.`,
    constraints: ['1 ≤ s.length ≤ 5 × 10⁴', 's.length === t.length'],
    hints: [
      'One map from `s` to `t` is not enough — also check nothing in `t` is claimed twice.',
      'Keep a mapping in each direction and make sure both stay consistent.',
    ],
    solution: `function isIsomorphic(s, t) {
  const sToT = new Map();
  const tToS = new Map();

  for (let i = 0; i < s.length; i++) {
    const a = s[i];
    const b = t[i];
    if (sToT.has(a) && sToT.get(a) !== b) return false;
    if (tToS.has(b) && tToS.get(b) !== a) return false;
    sToT.set(a, b);
    tToS.set(b, a);
  }
  return true;
}`,
    explanation:
      'The mapping must be one-to-one. Tracking both directions catches a character mapping to two targets and two characters mapping to the same target.',
    complexity: { time: 'O(n)', space: 'O(k) for k distinct characters' },
    generate(rng, size) {
      const s = rng.str(size === 'small' ? rng.int(4, 6) : rng.int(20, 60), 'abcd')
      const perm = rng.shuffle([...'wxyz'])
      let t = [...s].map((c) => perm['abcd'.indexOf(c)]).join('')
      if (rng.bool(0.45)) {
        const i = rng.int(0, t.length - 1)
        t = t.slice(0, i) + rng.pick([...'wxyz']) + t.slice(i + 1)
      }
      return [s, t]
    },
    edgeCases: [['ab', 'aa'], ['badc', 'baba'], ['a', 'b']],
  },
  {
    id: 'most-frequent-char',
    topic: 'string',
    title: 'Most Frequent Character',
    difficulty: 'Easy',
    pattern: 'Frequency Count',
    fn: 'mostFrequent',
    params: ['s'],
    statement: `Return the character that appears most often in \`s\`. If several characters tie, return the one that appears **first** in \`s\`.`,
    constraints: ['1 ≤ s.length ≤ 10⁵', 'Lowercase English letters only.'],
    hints: ['Count every character first.', 'Then scan the string in order and keep the first character with the highest count.'],
    solution: `function mostFrequent(s) {
  const counts = {};
  for (const ch of s) {
    counts[ch] = (counts[ch] || 0) + 1;
  }

  let best = s[0];
  for (const ch of s) {
    if (counts[ch] > counts[best]) {
      best = ch;
    }
  }
  return best;
}`,
    explanation:
      'Build the frequency table, then scan in original order with a strict comparison, so ties resolve to the earliest character.',
    complexity: { time: 'O(n)', space: 'O(1) — at most 26 keys' },
    generate(rng, size) {
      return [rng.str(size === 'small' ? rng.int(5, 8) : rng.int(20, 80), 'abcde')]
    },
    edgeCases: [['z'], ['abab']],
  },
]
