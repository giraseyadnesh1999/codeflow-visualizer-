'use client'

import { motion } from 'framer-motion'
import { Flame, Trophy, Target } from 'lucide-react'
import { addDays, formatDate, parseKey } from '@/lib/dsa/daily'
import type { Stats } from '@/lib/dsa/progress'

const WEEKS = 14

const LEVELS = [
  'bg-white/[0.05]',
  'bg-violet-500/55 shadow-[0_0_8px_rgba(168,85,247,.55)]',
  'bg-gradient-to-br from-fuchsia-400 to-cyan-300 shadow-[0_0_10px_rgba(232,121,249,.8)]',
]

export function StreakCard({
  stats,
  byDay,
  today,
  selected,
  onPickDay,
}: {
  stats: Stats
  byDay: Map<string, number>
  today: string
  selected: string
  onPickDay: (day: string) => void
}) {
  // Columns are weeks (Sunday on top), ending with the current week.
  const start = addDays(today, -((WEEKS - 1) * 7 + parseKey(today).getDay()))
  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => addDays(start, i))

  return (
    <div className="glass flex h-full flex-col gap-4 p-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon={Flame} label="Streak" value={stats.streak} tone="text-orange-300" glow={stats.streak > 0} />
        <Stat icon={Trophy} label="Best" value={stats.best} tone="text-amber-300" />
        <Stat icon={Target} label="Solved" value={stats.total} tone="text-cyan-300" />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-[10.5px] uppercase tracking-[0.12em] text-white/35">
          <span>Last {WEEKS} weeks</span>
          <span className="flex items-center gap-1 normal-case tracking-normal">
            <span className={`h-2.5 w-2.5 rounded-[3px] ${LEVELS[0]}`} /> 0
            <span className={`ml-1 h-2.5 w-2.5 rounded-[3px] ${LEVELS[1]}`} /> 1
            <span className={`ml-1 h-2.5 w-2.5 rounded-[3px] ${LEVELS[2]}`} /> 2
          </span>
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}>
          {cells.map((day, i) => {
            const future = day > today
            const count = Math.min(2, byDay.get(day) ?? 0)
            const isSelected = day === selected
            return (
              <motion.button
                key={day}
                type="button"
                disabled={future}
                onClick={() => onPickDay(day)}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: future ? 0.25 : 1, scale: 1 }}
                transition={{ delay: i * 0.004, type: 'spring', stiffness: 400, damping: 24 }}
                whileHover={future ? undefined : { scale: 1.35 }}
                title={future ? undefined : `${formatDate(day)} — ${byDay.get(day) ?? 0}/2 solved`}
                aria-label={future ? undefined : `${formatDate(day)}, ${byDay.get(day) ?? 0} of 2 solved`}
                className={`aspect-square w-full rounded-[3px] ${future ? 'bg-transparent' : LEVELS[count]} ${
                  isSelected ? 'ring-[1.5px] ring-white/85' : ''
                } ${day === today && !isSelected ? 'ring-1 ring-fuchsia-300/70' : ''}`}
              />
            )
          })}
        </div>
      </div>

      <p className="mt-auto text-[11.5px] leading-snug text-white/35">
        {stats.todayCount >= 2
          ? 'Both of today’s problems done. See you tomorrow!'
          : stats.todayCount === 1
            ? 'One down, one to go today.'
            : stats.streak > 0
              ? `Solve one today to keep your ${stats.streak}-day streak going.`
              : 'Solve a daily problem to start a streak. Click any square to revisit that day.'}
      </p>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
  glow = false,
}: {
  icon: typeof Flame
  label: string
  value: number
  tone: string
  glow?: boolean
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.1em] text-white/35">
        <Icon size={12} className={`${tone} ${glow ? 'animate-pulse' : ''}`} />
        {label}
      </div>
      <motion.div
        key={value}
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`mt-0.5 font-mono text-xl font-bold tabular-nums ${tone}`}
      >
        {value}
      </motion.div>
    </div>
  )
}
