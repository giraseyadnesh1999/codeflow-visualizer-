'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, ChevronDown, X } from 'lucide-react'
import { EXAMPLES, LEVEL_LABELS, LEVEL_ORDER, type Example } from '@/lib/examples'

const LEVEL_COLORS: Record<Example['level'], string> = {
  basics: 'from-cyan-400 to-sky-500',
  functions: 'from-violet-400 to-fuchsia-500',
  data: 'from-lime-400 to-emerald-500',
  objects: 'from-amber-400 to-orange-500',
  algorithms: 'from-rose-400 to-pink-500',
}

export function ExamplePicker({ current, onPick }: { current: Example | null; onPick: (ex: Example) => void }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn h-9 max-w-full px-3 text-[12.5px]">
        <BookOpen size={14} className="shrink-0 text-fuchsia-300" />
        <span className="truncate">{current ? current.title : 'Custom code'}</span>
        <ChevronDown size={14} className="shrink-0 opacity-50" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Example programs"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 40, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="glass scroll-thin max-h-[85dvh] w-full max-w-4xl overflow-y-auto rounded-b-none border-white/10 bg-ink-800/90 sm:rounded-3xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-ink-800/90 px-5 py-4 backdrop-blur-xl">
                <div>
                  <h2 className="text-base font-semibold text-white">Example programs</h2>
                  <p className="text-[12px] text-white/40">Pick one to load it into the editor. You can edit anything afterwards.</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="btn h-8 w-8" aria-label="Close">
                  <X size={15} />
                </button>
              </div>

              <div className="flex flex-col gap-6 p-5">
                {LEVEL_ORDER.map((level, li) => (
                  <section key={level}>
                    <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                      <span className={`h-2 w-2 rounded-full bg-gradient-to-br ${LEVEL_COLORS[level]}`} />
                      {LEVEL_LABELS[level]}
                    </h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {EXAMPLES.filter((ex) => ex.level === level).map((ex, i) => {
                        const active = current?.id === ex.id
                        return (
                          <motion.button
                            key={ex.id}
                            type="button"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: li * 0.04 + i * 0.03 }}
                            whileHover={{ y: -2 }}
                            onClick={() => {
                              onPick(ex)
                              setOpen(false)
                            }}
                            className={`group relative overflow-hidden rounded-2xl border p-3.5 text-left transition-colors ${
                              active
                                ? 'border-fuchsia-400/50 bg-fuchsia-500/10'
                                : 'border-white/[0.07] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                            }`}
                          >
                            <span
                              className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r opacity-60 transition-opacity group-hover:opacity-100 ${LEVEL_COLORS[level]}`}
                            />
                            <span className="block text-[13.5px] font-semibold text-white/90">{ex.title}</span>
                            <span className="mt-1 block text-[12px] leading-snug text-white/45">{ex.blurb}</span>
                          </motion.button>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
