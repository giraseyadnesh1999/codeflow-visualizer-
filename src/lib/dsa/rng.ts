/**
 * Deterministic randomness. The same seed always yields the same sequence, so
 * a given date produces the same problems and example inputs for everyone,
 * and re-opening the page never reshuffles today's challenge.
 */

/** FNV-1a — a fast, well-spread 32-bit string hash. */
export function hashString(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export const LOWER = 'abcdefghijklmnopqrstuvwxyz'

export class Rng {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0 || 0x9e3779b9
  }

  /** mulberry32: uniform float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  bool(p = 0.5): boolean {
    return this.next() < p
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)]
  }

  /** A shuffled copy (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }

  ints(count: number, min: number, max: number): number[] {
    return Array.from({ length: count }, () => this.int(min, max))
  }

  /** Strictly increasing distinct integers. */
  sortedUnique(count: number, min: number, max: number): number[] {
    const pool = new Set<number>()
    while (pool.size < count && pool.size < max - min + 1) pool.add(this.int(min, max))
    return [...pool].sort((a, b) => a - b)
  }

  str(length: number, alphabet = LOWER): string {
    let out = ''
    for (let i = 0; i < length; i++) out += alphabet[Math.floor(this.next() * alphabet.length)]
    return out
  }
}
