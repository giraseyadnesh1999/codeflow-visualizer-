'use client'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

const ACCENTS = {
  violet: { text: 'text-violet-300', dot: 'bg-violet-400', ring: 'shadow-[0_0_18px_-2px_rgba(168,85,247,.55)]' },
  cyan: { text: 'text-cyan-300', dot: 'bg-cyan-400', ring: 'shadow-[0_0_18px_-2px_rgba(34,211,238,.55)]' },
  lime: { text: 'text-lime-300', dot: 'bg-lime-400', ring: 'shadow-[0_0_18px_-2px_rgba(163,230,53,.55)]' },
  amber: { text: 'text-amber-300', dot: 'bg-amber-400', ring: 'shadow-[0_0_18px_-2px_rgba(251,191,36,.55)]' },
} as const

export type Accent = keyof typeof ACCENTS

export function Panel({
  title,
  icon: Icon,
  accent,
  count,
  hint,
  children,
  className = '',
  bodyClassName = '',
}: {
  title: string
  icon: LucideIcon
  accent: Accent
  count?: number | string
  hint?: string
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  const a = ACCENTS[accent]
  return (
    <section className={`glass flex min-h-0 flex-col overflow-hidden ${className}`}>
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-3.5 py-2.5">
        <h2 className="panel-title">
          <span className={`h-1.5 w-1.5 rounded-full ${a.dot} ${a.ring}`} />
          <Icon size={13} className={a.text} strokeWidth={2.4} />
          {title}
        </h2>
        {count !== undefined && (
          <span className={`rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] ${a.text}`}>{count}</span>
        )}
      </header>
      <div className={`scroll-thin min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>
        {children}
        {hint && <p className="px-3.5 pb-3 pt-1 text-[11px] leading-relaxed text-white/25">{hint}</p>}
      </div>
    </section>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-[80px] items-center justify-center px-4 py-6 text-center text-[11.5px] leading-relaxed text-white/25">
      {children}
    </div>
  )
}
