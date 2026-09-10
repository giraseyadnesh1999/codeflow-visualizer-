'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Eye, EyeOff, Lightbulb, PlayCircle, Timer, HardDrive } from 'lucide-react'
import { CodeEditor } from '../CodeEditor'
import { formatValue } from '@/lib/dsa/format'
import type { Challenge } from '@/lib/dsa/types'
import { Inline, Prose } from './Prose'
import { DifficultyBadge, TopicBadge } from './badges'

export function formatArgs(params: string[], args: unknown[]): string {
  return params.map((p, i) => `${p} = ${formatValue(args[i])}`).join(', ')
}

export function ProblemPanel({
  challenge,
  solved,
  hintsShown,
  onRevealHint,
  solutionShown,
  onToggleSolution,
  visualizeHref,
}: {
  challenge: Challenge
  solved: boolean
  hintsShown: number
  onRevealHint: () => void
  solutionShown: boolean
  onToggleSolution: () => void
  /** Link that opens the reference solution in the visualizer on these args. */
  visualizeHref: (args: unknown[]) => string
}) {
  const { problem, examples } = challenge

  return (
    <motion.article
      key={`${challenge.key}:${problem.id}`}
      data-tour="problem"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="glass scroll-thin flex flex-col gap-5 overflow-y-auto p-5 lg:max-h-[calc(100dvh-7rem)]"
    >
      <header>
        <div className="flex flex-wrap items-center gap-1.5">
          <TopicBadge value={problem.topic} />
          <DifficultyBadge value={problem.difficulty} />
          <span className="chip bg-white/[0.06] font-sans text-white/55 ring-1 ring-white/10">{problem.pattern}</span>
          {solved && (
            <span className="chip bg-emerald-400/15 font-sans font-semibold text-emerald-300 ring-1 ring-emerald-300/30">
              <CheckCircle2 size={12} /> Solved
            </span>
          )}
        </div>
        <h2 className="mt-3 text-xl font-bold tracking-tight text-white">{problem.title}</h2>
        <p className="mt-1 font-mono text-[11.5px] text-white/35">
          function {problem.fn}({problem.params.join(', ')})
        </p>
      </header>

      <Prose text={problem.statement} />

      <section className="flex flex-col gap-2.5">
        <h3 className="panel-title">Today’s examples</h3>
        {examples.map((ex, i) => (
          <div key={i} className="rounded-xl border border-white/[0.07] bg-black/25 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Example {i + 1}</span>
              <a
                href={visualizeHref(ex.args)}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-violet-300/80 transition-colors hover:bg-violet-400/10 hover:text-violet-200"
                title="Watch the reference solution run on this input, step by step"
              >
                <PlayCircle size={12} /> Visualize
              </a>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[12.5px]">
              <dt className="text-white/35">Input</dt>
              <dd className="break-all text-white/85">{formatArgs(problem.params, ex.args)}</dd>
              <dt className="text-white/35">Output</dt>
              <dd className="break-all text-emerald-300">{formatValue(ex.expected)}</dd>
            </dl>
          </div>
        ))}
      </section>

      <section>
        <h3 className="panel-title mb-2">Constraints</h3>
        <ul className="flex flex-col gap-1 text-[12.5px] text-white/55">
          {problem.constraints.map((c) => (
            <li key={c} className="flex gap-2">
              <span className="text-white/25">•</span>
              <span className="font-mono">{c}</span>
            </li>
          ))}
        </ul>
      </section>

      <section data-tour="hints">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="panel-title">
            <Lightbulb size={13} className="text-amber-300" /> Hints
          </h3>
          <span className="font-mono text-[10.5px] text-white/30">
            {hintsShown}/{problem.hints.length}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {problem.hints.slice(0, hintsShown).map((hint, i) => (
              <motion.div
                key={hint}
                initial={{ opacity: 0, height: 0, y: -6 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                className="overflow-hidden rounded-xl border border-amber-300/20 bg-amber-400/[0.06] px-3 py-2 text-[12.5px] leading-relaxed text-amber-100/80"
              >
                <span className="mr-1.5 font-mono text-amber-300/70">{i + 1}.</span>
                <Inline text={hint} />
              </motion.div>
            ))}
          </AnimatePresence>
          {hintsShown < problem.hints.length && (
            <button type="button" onClick={onRevealHint} className="btn h-9 self-start px-3 text-[12px]">
              <Lightbulb size={13} className="text-amber-300" />
              {hintsShown === 0 ? 'Show a hint' : 'Show the next hint'}
            </button>
          )}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="panel-title">Solution</h3>
          <button type="button" onClick={onToggleSolution} className="btn h-8 px-2.5 text-[11.5px]">
            {solutionShown ? <EyeOff size={13} /> : <Eye size={13} />}
            {solutionShown ? 'Hide' : 'Reveal solution'}
          </button>
        </div>
        <AnimatePresence initial={false} mode="wait">
          {solutionShown ? (
            <motion.div
              key="solution"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              <div className="h-[300px] overflow-hidden rounded-xl border border-white/[0.07] bg-black/30">
                <CodeEditor value={problem.solution} loc={null} readOnly follow={false} />
              </div>
              <Prose text={problem.explanation} className="text-[13px]" />
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip bg-cyan-400/10 font-sans text-cyan-200 ring-1 ring-cyan-300/25">
                  <Timer size={12} /> Time {problem.complexity.time}
                </span>
                <span className="chip bg-violet-400/10 font-sans text-violet-200 ring-1 ring-violet-300/25">
                  <HardDrive size={12} /> Space {problem.complexity.space}
                </span>
                <a
                  href={visualizeHref(examples[0].args)}
                  target="_blank"
                  rel="noopener"
                  className="btn btn-primary ml-auto h-8 px-3 text-[12px]"
                >
                  <PlayCircle size={14} /> Visualize step by step
                </a>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="locked"
              type="button"
              onClick={onToggleSolution}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full overflow-hidden rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center"
            >
              <pre className="pointer-events-none select-none font-mono text-[11px] leading-5 text-white/40 blur-[5px]">
                {problem.solution.split('\n').slice(0, 6).join('\n')}
              </pre>
              <span className="absolute inset-0 flex items-center justify-center text-[12.5px] font-medium text-white/60">
                Try it yourself first — click to reveal
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </section>
    </motion.article>
  )
}
