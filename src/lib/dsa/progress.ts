/** Practice progress, stored locally in the browser. */

import { addDays, dateKey } from './daily'
import type { Topic } from './types'

const KEY = 'codeflow:dsa:progress:v1'

export interface SolveRecord {
  problemId: string
  topic: Topic
  /** `YYYY-MM-DD` the solve counts toward. */
  day: string
  bonus: boolean
  at: number
}

export interface Progress {
  /** Keyed by `${challengeKey}:${problemId}`. */
  solved: Record<string, SolveRecord>
  /** Code drafts, keyed the same way. */
  drafts: Record<string, string>
  /** The bonus problem currently open, so a reload brings it back. */
  bonus?: { seed: number; problemId: string }
}

export const EMPTY_PROGRESS: Progress = { solved: {}, drafts: {} }

const DRAFT_TTL_DAYS = 120
const BONUS_DRAFT_TTL_MS = 30 * 86_400_000

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY_PROGRESS
    const parsed = JSON.parse(raw) as Partial<Progress>
    const bonusFresh = parsed.bonus && Date.now() - parsed.bonus.seed < BONUS_DRAFT_TTL_MS
    return {
      solved: parsed.solved ?? {},
      drafts: pruneDrafts(parsed.drafts ?? {}),
      bonus: bonusFresh ? parsed.bonus : undefined,
    }
  } catch {
    return EMPTY_PROGRESS
  }
}

/** Drop stale drafts so storage does not grow forever. Solve records are kept. */
function pruneDrafts(drafts: Record<string, string>): Record<string, string> {
  const oldestDay = addDays(dateKey(), -DRAFT_TTL_DAYS)
  const kept: Record<string, string> = {}
  for (const [k, code] of Object.entries(drafts)) {
    const scope = k.slice(0, k.indexOf(':'))
    const bonusSeed = scope.startsWith('bonus-') ? Number(scope.slice(6)) : NaN
    const fresh = Number.isFinite(bonusSeed) ? Date.now() - bonusSeed < BONUS_DRAFT_TTL_MS : scope >= oldestDay
    if (fresh) kept[k] = code
  }
  return kept
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    // Storage full or blocked — progress just won't persist this session.
  }
}

export const recordKey = (challengeKey: string, problemId: string) => `${challengeKey}:${problemId}`

/** Number of daily (non-bonus) problems solved per calendar day. */
export function solvesByDay(progress: Progress): Map<string, number> {
  const days = new Map<string, number>()
  for (const r of Object.values(progress.solved)) {
    if (!r.bonus) days.set(r.day, (days.get(r.day) ?? 0) + 1)
  }
  return days
}

export interface Stats {
  streak: number
  best: number
  total: number
  todayCount: number
}

/**
 * A streak counts consecutive days with at least one daily problem solved on
 * that day. It stays alive through today even before today's solve.
 */
export function computeStats(progress: Progress, today = dateKey()): Stats {
  // Only solves made on the day itself build a streak; catching up on an old
  // day later still counts toward the total, just not the streak.
  const onTime = new Set(
    Object.values(progress.solved)
      .filter((r) => !r.bonus && dateKey(new Date(r.at)) === r.day)
      .map((r) => r.day),
  )

  let streak = 0
  let cursor = onTime.has(today) ? today : addDays(today, -1)
  while (onTime.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }

  let best = 0
  for (const day of onTime) {
    if (onTime.has(addDays(day, -1))) continue // not the start of a run
    let run = 0
    let d = day
    while (onTime.has(d)) {
      run++
      d = addDays(d, 1)
    }
    best = Math.max(best, run)
  }

  return {
    streak,
    best: Math.max(best, streak),
    total: Object.keys(progress.solved).length,
    todayCount: solvesByDay(progress).get(today) ?? 0,
  }
}
