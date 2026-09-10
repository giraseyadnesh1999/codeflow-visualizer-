'use client'

import { motion } from 'framer-motion'
import type { ValueView } from '@/lib/interpreter/snapshot'

const REF_STYLES: Record<string, string> = {
  array: 'bg-sky-500/15 text-sky-300 ring-sky-400/30',
  object: 'bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-400/30',
  instance: 'bg-rose-500/15 text-rose-300 ring-rose-400/30',
  function: 'bg-violet-500/15 text-violet-300 ring-violet-400/30',
  class: 'bg-amber-500/15 text-amber-300 ring-amber-400/30',
  error: 'bg-red-500/20 text-red-300 ring-red-400/40',
  map: 'bg-teal-500/15 text-teal-300 ring-teal-400/30',
  set: 'bg-orange-500/15 text-orange-300 ring-orange-400/30',
}

const PRIM_STYLES: Record<string, string> = {
  number: 'text-cyan-300',
  string: 'text-lime-300',
  boolean: 'text-amber-300',
  null: 'text-white/40',
  undefined: 'text-white/40',
}

export function ValueChip({ value, title }: { value: ValueView; title?: string }) {
  if (value.t === 'tdz') {
    return (
      <span
        className="chip border border-dashed border-white/25 text-white/40"
        title="Temporal dead zone — declared but not yet initialized"
      >
        uninitialized
      </span>
    )
  }

  if (value.t === 'prim') {
    const text = value.type === 'string' ? `"${value.text}"` : value.text
    return (
      <span
        className={`font-mono text-[12px] ${PRIM_STYLES[value.type] ?? 'text-white/70'}`}
        title={title ?? text}
      >
        {truncate(text)}
      </span>
    )
  }

  return (
    <span
      className={`chip ring-1 ${REF_STYLES[value.kind] ?? REF_STYLES.object}`}
      title={`${value.label} — ${value.preview}`}
    >
      <span className="opacity-50">#{value.id}</span>
      {value.label}
    </span>
  )
}

/** A value that pulses when it changes on the current step. */
export function AnimatedValue({ value, changed }: { value: ValueView; changed: boolean }) {
  const key = value.t === 'prim' ? `${value.type}:${value.text}` : value.t === 'ref' ? `ref:${value.id}` : 'tdz'
  return (
    <motion.span
      key={key}
      initial={changed ? { scale: 1.18, filter: 'brightness(1.9)' } : false}
      animate={{ scale: 1, filter: 'brightness(1)' }}
      transition={{ type: 'spring', stiffness: 480, damping: 22 }}
      className="inline-block origin-left"
    >
      <ValueChip value={value} />
    </motion.span>
  )
}

function truncate(text: string, max = 34): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}
