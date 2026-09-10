'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Dices, Sparkles } from 'lucide-react'
import type { Challenge } from '@/lib/dsa/types'
import { DifficultyBadge, TOPIC_STYLE } from './badges'

export type Slot = 'array' | 'string' | 'bonus'

export function ChallengePicker({
  daily,
  bonus,
  active,
  solved,
  onSelect,
  onNewBonus,
}: {
  daily: Challenge[]
  bonus: Challenge | null
  active: Slot
  solved: (challenge: Challenge) => boolean
  onSelect: (slot: Slot) => void
  onNewBonus: () => void
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      {daily.map((challenge, i) => {
        const slot: Slot = i === 0 ? 'array' : 'string'
        const topic = TOPIC_STYLE[challenge.problem.topic]
        const done = solved(challenge)
        return (
          <Card key={slot} active={active === slot} onClick={() => onSelect(slot)} gradient={topic.gradient} delay={i * 0.06}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/45">
                {topic.label} · Daily
              </span>
              {done ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 text-[11px] font-medium text-emerald-300">
                  <CheckCircle2 size={14} /> Solved
                </motion.span>
              ) : (
                <DifficultyBadge value={challenge.problem.difficulty} />
              )}
            </div>
            <p className="mt-2 text-[15px] font-semibold leading-snug text-white">{challenge.problem.title}</p>
            <p className="mt-1 text-[12px] text-white/40">{challenge.problem.pattern}</p>
          </Card>
        )
      })}

      <div className="relative">
        <Card
          active={active === 'bonus'}
          onClick={() => (bonus ? onSelect('bonus') : onNewBonus())}
          gradient="from-orange-400 to-pink-500"
          delay={0.12}
          dashed={!bonus}
        >
          <span className="block text-[10.5px] font-semibold uppercase leading-[22px] tracking-[0.14em] text-white/45">
            Bonus · Random
          </span>
          {bonus ? (
            <>
              <p className="mt-2 text-[15px] font-semibold leading-snug text-white">{bonus.problem.title}</p>
              <p className="mt-1 flex items-center gap-2 text-[12px] text-white/40">
                {TOPIC_STYLE[bonus.problem.topic].label} · {bonus.problem.pattern}
                {solved(bonus) && <CheckCircle2 size={13} className="text-emerald-300" />}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 flex items-center gap-2 text-[15px] font-semibold text-white">
                <Sparkles size={15} className="text-orange-300" /> Generate a problem
              </p>
              <p className="mt-1 text-[12px] text-white/40">Extra practice with fresh random inputs.</p>
            </>
          )}
        </Card>
        {bonus && (
          // A sibling of the card (not nested inside its <button>) so it stays valid, focusable HTML.
          <button
            type="button"
            onClick={onNewBonus}
            className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-orange-200/80 transition-colors hover:bg-white/10 hover:text-orange-100"
            title="Generate a different problem"
          >
            <Dices size={13} /> New
          </button>
        )}
      </div>
    </div>
  )
}

function Card({
  active,
  onClick,
  gradient,
  delay,
  dashed = false,
  children,
}: {
  active: boolean
  onClick: () => void
  gradient: string
  delay: number
  dashed?: boolean
  children: React.ReactNode
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 26 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      aria-pressed={active}
      className={`group relative h-full w-full overflow-hidden rounded-2xl border p-4 text-left transition-colors ${
        active
          ? 'border-white/25 bg-white/[0.08]'
          : `${dashed ? 'border-dashed' : ''} border-white/[0.08] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]`
      }`}
    >
      <span
        className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${gradient} transition-opacity ${active ? 'opacity-100' : 'opacity-40 group-hover:opacity-80'}`}
      />
      {active && (
        <motion.span
          layoutId="challenge-glow"
          className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${gradient} opacity-25 blur-2xl`}
        />
      )}
      <div className="relative">{children}</div>
    </motion.button>
  )
}
