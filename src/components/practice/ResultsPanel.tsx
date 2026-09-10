'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, MinusCircle, PartyPopper, XCircle } from 'lucide-react'
import { formatValue } from '@/lib/dsa/format'
import type { CaseResult, CaseStatus, RunResult } from '@/lib/dsa/runner'
import type { Challenge } from '@/lib/dsa/types'
import { formatArgs } from './ProblemPanel'

const STATUS: Record<CaseStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pass: { icon: CheckCircle2, color: 'text-emerald-300', label: 'Passed' },
  fail: { icon: XCircle, color: 'text-rose-300', label: 'Wrong answer' },
  error: { icon: AlertTriangle, color: 'text-amber-300', label: 'Runtime error' },
  timeout: { icon: Clock, color: 'text-orange-300', label: 'Time limit' },
  skipped: { icon: MinusCircle, color: 'text-white/30', label: 'Not run' },
}

export function ResultsPanel({
  challenge,
  mode,
  result,
}: {
  challenge: Challenge
  mode: 'run' | 'submit'
  result: RunResult
}) {
  const allPassed = !result.compileError && result.passed === result.total
  const edgeCount = challenge.problem.edgeCases?.length ?? 0
  const exampleCount = challenge.examples.length
  const pct = result.total ? (result.passed / result.total) * 100 : 0

  const labelFor = (i: number) =>
    i < exampleCount ? `Example ${i + 1}` : i < exampleCount + edgeCount ? `Edge case ${i - exampleCount + 1}` : `Hidden test ${i - exampleCount - edgeCount + 1}`

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="panel-title">{mode === 'run' ? 'Example run' : 'Submission'}</h3>
        <span className="font-mono text-[11px] text-white/35">{Math.round(result.elapsed)}ms</span>
      </div>

      {result.compileError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2.5 font-mono text-[12px] text-red-200">
          {result.compileError}
        </div>
      ) : (
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className={`text-lg font-bold ${allPassed ? 'text-emerald-300' : 'text-white'}`}>
              {result.passed}/{result.total} passed
            </span>
            {mode === 'run' && allPassed && <span className="text-[11.5px] text-white/40">Now submit to run every test.</span>}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div
              className={`h-full rounded-full ${allPassed ? 'bg-gradient-to-r from-emerald-400 to-cyan-300' : 'bg-gradient-to-r from-violet-500 to-fuchsia-400'}`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
      )}

      <AnimatePresence>
        {mode === 'submit' && allPassed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 rounded-xl border border-emerald-300/30 bg-gradient-to-r from-emerald-500/15 to-cyan-500/10 px-4 py-3"
          >
            <PartyPopper size={22} className="shrink-0 text-emerald-300" />
            <div>
              <p className="text-[14px] font-semibold text-emerald-100">Solved! Every test passed.</p>
              <p className="text-[12px] text-emerald-100/60">
                Compare with the reference solution, or visualize your code to see how it runs.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!result.compileError && (
        <ul className="flex flex-col gap-1.5">
          {result.cases.map((c, i) => (
            <CaseRow key={i} result={c} label={labelFor(i)} challenge={challenge} delay={i * 0.04} />
          ))}
        </ul>
      )}
    </motion.div>
  )
}

function CaseRow({ result, label, challenge, delay }: { result: CaseResult; label: string; challenge: Challenge; delay: number }) {
  const [open, setOpen] = useState(result.status !== 'pass' && result.status !== 'skipped')
  const s = STATUS[result.status]
  const Icon = s.icon
  const test = challenge.tests[result.index]

  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="overflow-hidden rounded-xl border border-white/[0.06] bg-black/20"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/[0.03]"
        aria-expanded={open}
      >
        <Icon size={15} className={`shrink-0 ${s.color}`} />
        <span className="text-[12.5px] font-medium text-white/80">{label}</span>
        <span className={`text-[11.5px] ${s.color}`}>{s.label}</span>
        {result.ms !== undefined && <span className="ml-auto font-mono text-[10.5px] text-white/25">{result.ms.toFixed(1)}ms</span>}
        <ChevronDown size={14} className={`shrink-0 text-white/30 transition-transform ${result.ms === undefined ? 'ml-auto' : ''} ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-white/[0.05] px-3 py-2.5 font-mono text-[12px]">
              <dt className="text-white/35">Input</dt>
              <dd className="break-all text-white/80">{formatArgs(challenge.problem.params, test.args)}</dd>
              <dt className="text-white/35">Expected</dt>
              <dd className="break-all text-emerald-300">{formatValue(test.expected)}</dd>
              {(result.status === 'pass' || result.status === 'fail') && (
                <>
                  <dt className="text-white/35">Output</dt>
                  <dd className={`break-all ${result.status === 'pass' ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {result.actualText ?? formatValue(result.actual)}
                  </dd>
                </>
              )}
              {result.error && (
                <>
                  <dt className="text-white/35">Error</dt>
                  <dd className="break-all text-amber-200">{result.error}</dd>
                </>
              )}
            </dl>
            {result.status === 'fail' && result.actual === undefined && !result.actualText && (
              <p className="px-3 pb-2 text-[11.5px] text-amber-200/70">
                Your function returned <code className="font-mono">undefined</code> — did you forget a{' '}
                <code className="font-mono">return</code>?
              </p>
            )}
            {result.logs.length > 0 && (
              <div className="border-t border-white/[0.05] px-3 py-2">
                <p className="mb-1 text-[10px] uppercase tracking-wider text-white/30">console output</p>
                {result.logs.map((log, i) => (
                  <p key={i} className="font-mono text-[11.5px] text-amber-100/70">
                    › {log.text}
                  </p>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}
