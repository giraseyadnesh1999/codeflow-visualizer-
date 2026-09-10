'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ChevronRight, Info, SquareTerminal, XCircle } from 'lucide-react'
import { Panel, EmptyState } from './Panel'
import type { LogEntry } from '@/lib/interpreter/builtins'
import type { TraceError } from '@/lib/interpreter/run'

const STYLE: Record<LogEntry['kind'], { icon: typeof ChevronRight; text: string; bg: string }> = {
  log: { icon: ChevronRight, text: 'text-white/85', bg: '' },
  info: { icon: Info, text: 'text-sky-200', bg: 'bg-sky-500/[0.06]' },
  table: { icon: ChevronRight, text: 'text-white/85', bg: '' },
  warn: { icon: AlertTriangle, text: 'text-amber-200', bg: 'bg-amber-500/[0.08]' },
  error: { icon: XCircle, text: 'text-red-200', bg: 'bg-red-500/[0.08]' },
}

export function ConsolePanel({
  output,
  error,
  finished,
  onJumpToEntry,
}: {
  output: LogEntry[]
  error: TraceError | null
  finished: boolean
  /** Jump the timeline to the step that printed this entry. */
  onJumpToEntry?: (entryId: number) => void
}) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [output.length, finished])

  return (
    <Panel title="Console" icon={SquareTerminal} accent="amber" count={output.length} bodyClassName="font-mono">
      <ul className="flex flex-col py-1">
        <AnimatePresence initial={false}>
          {output.map((entry) => {
            const s = STYLE[entry.kind]
            const Icon = s.icon
            return (
              <motion.li
                key={entry.id}
                initial={{ opacity: 0, x: -12, backgroundColor: 'rgba(251,191,36,0.18)' }}
                animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(251,191,36,0)' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className={`group flex items-start gap-2 border-b border-white/[0.03] px-3 py-1 ${s.bg}`}
              >
                <Icon size={12} className="mt-[4px] shrink-0 text-amber-300/60" />
                <span className={`min-w-0 flex-1 whitespace-pre-wrap break-words text-[12px] leading-5 ${s.text}`}>
                  {entry.text}
                </span>
                <button
                  type="button"
                  onClick={() => onJumpToEntry?.(entry.id)}
                  className="shrink-0 text-[10px] leading-5 text-white/20 transition-colors hover:text-amber-300"
                  title="Jump to the step that printed this"
                >
                  :{entry.line}
                </button>
              </motion.li>
            )
          })}
        </AnimatePresence>

        {finished && error && (
          <motion.li
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-2 my-1.5 flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2"
          >
            <XCircle size={13} className="mt-[3px] shrink-0 text-red-300" />
            <span className="text-[12px] leading-5 text-red-200">
              {error.message}
              {error.line > 0 && <span className="text-red-300/50"> (line {error.line})</span>}
            </span>
          </motion.li>
        )}
      </ul>
      {output.length === 0 && !(finished && error) && <EmptyState>console.log output shows up here.</EmptyState>}
      <div ref={endRef} />
    </Panel>
  )
}
