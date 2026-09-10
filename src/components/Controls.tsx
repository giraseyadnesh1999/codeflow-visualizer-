'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronFirst, ChevronLast, Pause, Play, RotateCcw, StepBack, StepForward } from 'lucide-react'
import type { Snapshot } from '@/lib/interpreter/snapshot'
import { KIND_META } from '@/lib/stepKinds'

export const SPEEDS = [
  { label: '0.5×', stepsPerSecond: 1 },
  { label: '1×', stepsPerSecond: 2.5 },
  { label: '2×', stepsPerSecond: 5 },
  { label: '4×', stepsPerSecond: 10 },
  { label: '8×', stepsPerSecond: 24 },
]

export function Controls({
  snapshots,
  index,
  playing,
  speed,
  onIndex,
  onTogglePlay,
  onSpeed,
}: {
  snapshots: Snapshot[]
  index: number
  playing: boolean
  speed: number
  onIndex: (i: number) => void
  onTogglePlay: () => void
  onSpeed: (i: number) => void
}) {
  const last = Math.max(0, snapshots.length - 1)
  const atEnd = index >= last
  const atStart = index <= 0
  const empty = snapshots.length === 0

  return (
    <div className="glass flex flex-col gap-3 p-3">
      <Timeline snapshots={snapshots} index={index} onIndex={onIndex} />

      <div data-tour="controls" className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <IconButton label="First step (Home)" onClick={() => onIndex(0)} disabled={empty || atStart}>
            <ChevronFirst size={16} />
          </IconButton>
          <IconButton label="Step back (←)" onClick={() => onIndex(index - 1)} disabled={empty || atStart}>
            <StepBack size={16} />
          </IconButton>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onTogglePlay}
            disabled={empty}
            aria-label={playing ? 'Pause (Space)' : atEnd ? 'Replay (Space)' : 'Play (Space)'}
            title={playing ? 'Pause (Space)' : atEnd ? 'Replay (Space)' : 'Play (Space)'}
            className={`btn btn-primary h-11 w-11 rounded-2xl ${playing ? '' : 'animate-pulse-ring'}`}
          >
            {playing ? <Pause size={18} fill="currentColor" /> : atEnd ? <RotateCcw size={18} /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </motion.button>

          <IconButton label="Step forward (→)" onClick={() => onIndex(index + 1)} disabled={empty || atEnd}>
            <StepForward size={16} />
          </IconButton>
          <IconButton label="Last step (End)" onClick={() => onIndex(last)} disabled={empty || atEnd}>
            <ChevronLast size={16} />
          </IconButton>
        </div>

        <div className="flex items-center gap-3">
          <div className="font-mono text-[11px] tabular-nums text-white/40">
            <span className="text-white/85">{empty ? 0 : index + 1}</span>
            <span className="mx-1 text-white/20">/</span>
            {snapshots.length}
          </div>

          <div className="flex rounded-xl border border-white/10 bg-black/20 p-0.5" role="radiogroup" aria-label="Playback speed">
            {SPEEDS.map((s, i) => (
              <button
                key={s.label}
                type="button"
                role="radio"
                aria-checked={speed === i}
                onClick={() => onSpeed(i)}
                className={`relative rounded-[9px] px-2 py-1 font-mono text-[10.5px] transition-colors ${
                  speed === i ? 'text-white' : 'text-white/35 hover:text-white/70'
                }`}
              >
                {speed === i && (
                  <motion.span
                    layoutId="speed-pill"
                    className="absolute inset-0 rounded-[9px] bg-gradient-to-br from-violet-500/70 to-fuchsia-500/60"
                    transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  />
                )}
                <span className="relative">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="btn h-9 w-9">
      {children}
    </button>
  )
}

const BUCKETS = 160

/**
 * The execution landscape: one bar per slice of the timeline, coloured by the
 * kind of step and sized by call-stack depth — recursion shows up as mountains.
 */
function Timeline({ snapshots, index, onIndex }: { snapshots: Snapshot[]; index: number; onIndex: (i: number) => void }) {
  const bars = useMemo(() => {
    if (snapshots.length === 0) return []
    const count = Math.min(BUCKETS, snapshots.length)
    const maxDepth = Math.max(1, ...snapshots.map((s) => s.depth))
    return Array.from({ length: count }, (_, b) => {
      const from = Math.floor((b * snapshots.length) / count)
      const to = Math.max(from + 1, Math.floor(((b + 1) * snapshots.length) / count))
      let depth = 0
      const tally = new Map<string, number>()
      for (let i = from; i < to; i++) {
        const s = snapshots[i]
        depth = Math.max(depth, s.depth)
        tally.set(s.kind, (tally.get(s.kind) ?? 0) + 1)
      }
      // Rare-but-important kinds win the bucket over routine ones.
      const priority = ['throw', 'catch', 'output', 'call', 'return']
      const kind =
        priority.find((k) => tally.has(k)) ?? [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0]
      return { from, to, depth: depth / maxDepth, color: KIND_META[kind as keyof typeof KIND_META].color }
    })
  }, [snapshots])

  const progress = snapshots.length > 1 ? index / (snapshots.length - 1) : 0

  return (
    <div data-tour="timeline" className="relative">
      <div className="flex h-10 items-end gap-px overflow-hidden rounded-lg bg-black/25 px-1 pb-1 pt-1.5">
        {bars.map((bar, i) => {
          const active = index >= bar.from && index < bar.to
          const past = index >= bar.to
          return (
            <div
              key={i}
              className="flex-1 rounded-[2px] transition-[opacity,transform] duration-200"
              style={{
                height: `${18 + bar.depth * 82}%`,
                background: bar.color,
                opacity: active ? 1 : past ? 0.7 : 0.2,
                transform: active ? 'scaleY(1.08)' : undefined,
                boxShadow: active ? `0 0 12px ${bar.color}` : undefined,
              }}
            />
          )
        })}
      </div>
      <motion.div
        className="pointer-events-none absolute -top-0.5 bottom-[-2px] w-[2px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,.9)]"
        animate={{ left: `calc(${progress * 100}% - 1px)` }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      />
      <input
        type="range"
        aria-label="Timeline"
        min={0}
        max={Math.max(0, snapshots.length - 1)}
        value={index}
        onChange={(e) => onIndex(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        disabled={snapshots.length === 0}
      />
    </div>
  )
}
