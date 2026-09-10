import type { StepKind } from './interpreter/evaluator'

/** One colour per kind of step, shared by the explain bar and the timeline. */
export const KIND_META: Record<StepKind, { label: string; color: string; badge: string }> = {
  program: { label: 'Start', color: '#94a3b8', badge: 'bg-slate-400/15 text-slate-200 ring-slate-300/30' },
  declare: { label: 'Declare', color: '#22d3ee', badge: 'bg-cyan-400/15 text-cyan-200 ring-cyan-300/30' },
  assign: { label: 'Assign', color: '#38bdf8', badge: 'bg-sky-400/15 text-sky-200 ring-sky-300/30' },
  expression: { label: 'Evaluate', color: '#cbd5e1', badge: 'bg-white/10 text-white/80 ring-white/20' },
  call: { label: 'Call', color: '#a855f7', badge: 'bg-violet-500/20 text-violet-200 ring-violet-300/35' },
  return: { label: 'Return', color: '#e879f9', badge: 'bg-fuchsia-500/20 text-fuchsia-200 ring-fuchsia-300/35' },
  branch: { label: 'Branch', color: '#fbbf24', badge: 'bg-amber-400/15 text-amber-200 ring-amber-300/30' },
  loop: { label: 'Loop', color: '#a3e635', badge: 'bg-lime-400/15 text-lime-200 ring-lime-300/30' },
  output: { label: 'Output', color: '#facc15', badge: 'bg-yellow-400/15 text-yellow-200 ring-yellow-300/30' },
  throw: { label: 'Throw', color: '#f87171', badge: 'bg-red-500/20 text-red-200 ring-red-300/35' },
  catch: { label: 'Catch', color: '#fb7185', badge: 'bg-rose-500/20 text-rose-200 ring-rose-300/35' },
  class: { label: 'Class', color: '#fb923c', badge: 'bg-orange-400/15 text-orange-200 ring-orange-300/30' },
  done: { label: 'Done', color: '#34d399', badge: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30' },
}
