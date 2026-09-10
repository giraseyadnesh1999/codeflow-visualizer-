'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Boxes } from 'lucide-react'
import { Panel, EmptyState } from './Panel'
import { ValueChip } from './ValueChip'
import type { HeapNodeView } from '@/lib/interpreter/snapshot'

const KIND_STYLE: Record<HeapNodeView['kind'], { border: string; label: string; tag: string }> = {
  array: { border: 'border-sky-400/30', label: 'text-sky-300', tag: 'bg-sky-500/15 text-sky-300' },
  object: { border: 'border-fuchsia-400/30', label: 'text-fuchsia-300', tag: 'bg-fuchsia-500/15 text-fuchsia-300' },
  instance: { border: 'border-rose-400/30', label: 'text-rose-300', tag: 'bg-rose-500/15 text-rose-300' },
  function: { border: 'border-violet-400/25', label: 'text-violet-300', tag: 'bg-violet-500/15 text-violet-300' },
  class: { border: 'border-amber-400/30', label: 'text-amber-300', tag: 'bg-amber-500/15 text-amber-300' },
  error: { border: 'border-red-400/40', label: 'text-red-300', tag: 'bg-red-500/15 text-red-300' },
  map: { border: 'border-teal-400/30', label: 'text-teal-300', tag: 'bg-teal-500/15 text-teal-300' },
  set: { border: 'border-orange-400/30', label: 'text-orange-300', tag: 'bg-orange-500/15 text-orange-300' },
}

export function HeapPanel({ heap }: { heap: HeapNodeView[] }) {
  // Data structures first — function cards are useful but secondary.
  const sorted = [...heap].sort((a, b) => weight(a) - weight(b) || a.id - b.id)

  return (
    <Panel
      title="Memory (Heap)"
      icon={Boxes}
      accent="lime"
      count={heap.length}
      hint="Objects live here. Variables only hold a reference (#id) — two names can point at the same object."
    >
      <div className="grid grid-cols-1 gap-2 p-2.5 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
        <AnimatePresence initial={false} mode="popLayout">
          {sorted.map((node) => {
            const s = KIND_STYLE[node.kind]
            return (
              <motion.div
                key={node.id}
                layout
                initial={{ opacity: 0, scale: 0.85, rotate: -2 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                className={`rounded-xl border bg-black/20 ${s.border}`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-white/[0.05] px-2.5 py-1.5">
                  <span className={`truncate font-mono text-[11.5px] font-medium ${s.label}`}>{node.label}</span>
                  <span className={`shrink-0 rounded px-1.5 font-mono text-[10px] ${s.tag}`}>#{node.id}</span>
                </div>

                {node.kind === 'array' || node.kind === 'set' ? (
                  <ArrayCells node={node} />
                ) : (
                  <dl className="flex flex-col px-2.5 py-1.5">
                    {node.entries.length === 0 && <span className="text-[11px] text-white/25">empty</span>}
                    {node.entries.map((entry) => (
                      <div key={entry.key} className="flex items-center justify-between gap-2 py-[2px]">
                        <dt className="truncate font-mono text-[11px] text-white/45">{entry.key}</dt>
                        <dd className="shrink-0">
                          <ValueChip value={entry.value} />
                        </dd>
                      </div>
                    ))}
                    {node.truncated > 0 && <span className="text-[10px] text-white/25">+{node.truncated} more</span>}
                  </dl>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
      {heap.length === 0 && <EmptyState>No objects allocated yet. Arrays, objects and functions appear here.</EmptyState>}
    </Panel>
  )
}

/** Arrays render as indexed cells so in-place mutation (sorting!) is visible. */
function ArrayCells({ node }: { node: HeapNodeView }) {
  if (node.entries.length === 0) {
    return <p className="px-2.5 py-2 font-mono text-[11px] text-white/25">[ ]</p>
  }
  return (
    <div className="flex flex-wrap gap-1 p-2">
      {node.entries.map((entry) => (
        <motion.div
          key={entry.key}
          layout
          className="flex min-w-[34px] flex-col items-center rounded-md border border-sky-400/15 bg-sky-500/[0.06] px-1.5 py-1"
        >
          <motion.span
            key={entry.value.t === 'prim' ? entry.value.text : entry.value.t === 'ref' ? entry.value.id : 'tdz'}
            initial={{ y: -6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 26 }}
          >
            <ValueChip value={entry.value} />
          </motion.span>
          <span className="mt-0.5 font-mono text-[9px] text-white/25">{entry.key}</span>
        </motion.div>
      ))}
      {node.truncated > 0 && <span className="self-center text-[10px] text-white/25">+{node.truncated}</span>}
    </div>
  )
}

function weight(node: HeapNodeView): number {
  switch (node.kind) {
    case 'array':
    case 'object':
    case 'instance':
    case 'error':
    case 'map':
    case 'set':
      return 0
    case 'class':
      return 1
    default:
      return 2
  }
}
