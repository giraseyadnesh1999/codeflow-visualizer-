'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Braces } from 'lucide-react'
import { Panel, EmptyState } from './Panel'
import { AnimatedValue } from './ValueChip'
import type { FrameView, ScopeView } from '@/lib/interpreter/snapshot'

const KIND_COLORS: Record<string, string> = {
  const: 'text-amber-300/70',
  let: 'text-cyan-300/70',
  var: 'text-violet-300/70',
  param: 'text-fuchsia-300/70',
  function: 'text-violet-300/70',
  class: 'text-rose-300/70',
  builtin: 'text-white/30',
}

const SCOPE_TINT: Record<ScopeView['type'], string> = {
  global: 'border-white/[0.08]',
  function: 'border-violet-400/25',
  block: 'border-cyan-400/20',
  loop: 'border-lime-400/25',
  catch: 'border-rose-400/25',
  class: 'border-amber-400/25',
  builtin: 'border-white/[0.06]',
}

export function ScopePanel({ frames }: { frames: FrameView[] }) {
  const top = frames[frames.length - 1]
  const global = frames[0]
  const showGlobalSeparately = top && global && top.id !== global.id
  const total = top?.scopes.reduce((n, s) => n + s.vars.length, 0) ?? 0

  return (
    <Panel
      title="Scope & Variables"
      icon={Braces}
      accent="cyan"
      count={total}
      hint="Inner scopes can read outer ones — that chain is what makes closures work."
    >
      <div className="flex flex-col gap-2 p-2.5">
        {top && <ScopeGroup frame={top} label={top.kind === 'global' ? 'Global scope' : `Inside ${top.name}()`} />}
        {showGlobalSeparately && (
          <div className="mt-1 border-t border-dashed border-white/[0.08] pt-2">
            <ScopeGroup frame={global} label="Global scope" dimmed />
          </div>
        )}
        {!top && <EmptyState>Run the program to see variables appear.</EmptyState>}
      </div>
    </Panel>
  )
}

function ScopeGroup({ frame, label, dimmed = false }: { frame: FrameView; label: string; dimmed?: boolean }) {
  const scopes = frame.scopes.filter((s) => s.vars.length > 0)

  return (
    <div className={dimmed ? 'opacity-55' : ''}>
      <p className="mb-1.5 px-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/30">{label}</p>
      {scopes.length === 0 && (
        <p className="rounded-lg border border-dashed border-white/[0.08] px-3 py-2.5 text-[11px] text-white/25">
          No variables in scope yet.
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        {scopes.map((scope) => (
          <div key={scope.key} className={`rounded-xl border bg-white/[0.02] ${SCOPE_TINT[scope.type]}`}>
            <div className="flex items-center gap-1.5 border-b border-white/[0.05] px-2.5 py-1">
              <span className="font-mono text-[10px] text-white/35">{scope.label}</span>
              {scope.label.toLowerCase() !== scope.type && (
                <span className="rounded bg-white/[0.05] px-1 text-[9px] uppercase tracking-wider text-white/25">
                  {scope.type}
                </span>
              )}
            </div>
            <ul className="flex flex-col divide-y divide-white/[0.04]">
              <AnimatePresence initial={false}>
                {scope.vars.map((v) => (
                  <motion.li
                    key={v.name}
                    layout="position"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      backgroundColor: v.changed ? 'rgba(34,211,238,0.14)' : 'rgba(34,211,238,0)',
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 34, backgroundColor: { duration: 0.45 } }}
                    className="flex items-center justify-between gap-2 px-2.5 py-[5px]"
                  >
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      <span className={`shrink-0 font-mono text-[9.5px] ${KIND_COLORS[v.kind] ?? 'text-white/30'}`}>
                        {v.kind === 'param' ? 'arg' : v.kind}
                      </span>
                      <span className="truncate font-mono text-[12px] text-white/85">{v.name}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <AnimatedValue value={v.value} changed={v.changed} />
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
