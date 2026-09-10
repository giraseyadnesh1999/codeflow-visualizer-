'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import type { Snapshot } from '@/lib/interpreter/snapshot'
import { KIND_META } from '@/lib/stepKinds'

/** The plain-English narration of the current step. */
export function ExplainBar({ snapshot, isError }: { snapshot: Snapshot | undefined; isError: boolean }) {
  const meta = snapshot ? KIND_META[snapshot.kind] : KIND_META.program
  const badge = isError ? 'bg-red-500/20 text-red-200 ring-red-300/35' : meta.badge

  return (
    <div className="glass relative overflow-hidden px-4 py-3">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 opacity-25 blur-2xl transition-colors duration-500"
        style={{ background: `radial-gradient(circle at 0% 50%, ${isError ? '#f87171' : meta.color}, transparent 70%)` }}
      />
      {/* Keyed remount with no exit animation: `AnimatePresence mode="wait"` can
          get stuck on a stale step when the user scrubs faster than it animates. */}
      <motion.div
        key={snapshot ? `${snapshot.index}:${snapshot.desc}` : 'none'}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className="relative flex min-h-[44px] items-start gap-3"
      >
        <span className={`chip mt-0.5 shrink-0 font-sans font-semibold uppercase tracking-wider ring-1 ${badge}`}>
          {isError ? 'Error' : meta.label}
        </span>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-white/95">
            {snapshot?.title ?? 'Ready'}
            {snapshot && <span className="ml-2 font-mono text-[11px] font-normal text-white/30">line {snapshot.loc.line}</span>}
          </p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-white/60">
            {snapshot ? (
              <RichText text={snapshot.desc} />
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Sparkles size={13} className="text-fuchsia-300" /> Press play or step forward to start.
              </span>
            )}
          </p>
        </div>
      </motion.div>
    </div>
  )
}

/** Renders `backtick` spans as inline code. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 1 ? (
          <code key={i} className="rounded bg-fuchsia-400/10 px-1 py-px font-mono text-[12px] text-fuchsia-200">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}
