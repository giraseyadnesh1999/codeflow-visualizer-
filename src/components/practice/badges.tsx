import type { Difficulty, Topic } from '@/lib/dsa/types'

export const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  Easy: 'bg-emerald-400/15 text-emerald-300 ring-emerald-300/30',
  Medium: 'bg-amber-400/15 text-amber-300 ring-amber-300/30',
  Hard: 'bg-rose-500/15 text-rose-300 ring-rose-300/30',
}

export const TOPIC_STYLE: Record<Topic, { chip: string; gradient: string; label: string }> = {
  array: { chip: 'bg-sky-400/15 text-sky-300 ring-sky-300/30', gradient: 'from-sky-400 to-violet-500', label: 'Array' },
  string: { chip: 'bg-lime-400/15 text-lime-300 ring-lime-300/30', gradient: 'from-lime-300 to-emerald-500', label: 'String' },
}

export function DifficultyBadge({ value }: { value: Difficulty }) {
  return <span className={`chip font-sans font-semibold ring-1 ${DIFFICULTY_STYLE[value]}`}>{value}</span>
}

export function TopicBadge({ value }: { value: Topic }) {
  return <span className={`chip font-sans font-semibold ring-1 ${TOPIC_STYLE[value].chip}`}>{TOPIC_STYLE[value].label}</span>
}
