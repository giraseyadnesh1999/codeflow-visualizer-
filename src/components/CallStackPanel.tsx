'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Layers } from 'lucide-react'
import { Panel, EmptyState } from './Panel'
import { ValueChip } from './ValueChip'
import type { FrameView } from '@/lib/interpreter/snapshot'

const KIND_LABEL: Record<FrameView['kind'], string> = {
  global: 'global',
  function: 'function',
  method: 'method',
  constructor: 'constructor',
  arrow: 'arrow fn',
}

export function CallStackPanel({ frames }: { frames: FrameView[] }) {
  // Top of the stack renders first — that is where execution actually is.
  const ordered = [...frames].reverse()

  return (
    <Panel
      title="Call Stack"
      icon={Layers}
      accent="violet"
      count={frames.length}
      hint={frames.length > 1 ? undefined : 'Call a function to see a frame pushed on top.'}
    >
      <ul className="flex flex-col gap-1.5 p-2.5">
        <AnimatePresence initial={false} mode="popLayout">
          {ordered.map((frame, i) => {
            const isTop = i === 0
            return (
              <motion.li
                key={frame.id}
                layout
                initial={{ opacity: 0, y: -14, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.94, transition: { duration: 0.14 } }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className={`relative overflow-hidden rounded-xl border px-3 py-2 ${
                  isTop
                    ? 'border-violet-400/45 bg-violet-500/[0.13] shadow-[0_0_24px_-8px_rgba(168,85,247,.9)]'
                    : 'border-white/[0.07] bg-white/[0.025]'
                }`}
              >
                {isTop && (
                  <motion.span
                    layoutId="stack-top-marker"
                    className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-violet-300 to-fuchsia-400"
                  />
                )}
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`truncate font-mono text-[12.5px] ${isTop ? 'text-violet-100' : 'text-white/55'}`}
                  >
                    {frame.name}
                    <span className="opacity-40">()</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-white/30">line {frame.line}</span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-white/[0.06] px-1.5 py-px text-[9.5px] uppercase tracking-wider text-white/35">
                    {KIND_LABEL[frame.kind]}
                  </span>
                  {frame.thisValue && (
                    <span className="flex items-center gap-1 text-[10px] text-white/30">
                      this <ValueChip value={frame.thisValue} />
                    </span>
                  )}
                  {isTop && (
                    <span className="ml-auto flex items-center gap-1 text-[9.5px] font-medium uppercase tracking-wider text-violet-300/80">
                      <span className="h-1 w-1 animate-pulse rounded-full bg-violet-300" />
                      running
                    </span>
                  )}
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
        {ordered.length === 0 && <EmptyState>The stack is empty.</EmptyState>}
      </ul>
    </Panel>
  )
}
