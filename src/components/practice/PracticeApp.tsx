'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Flame, Loader2, PlayCircle, Play, RotateCcw, Send } from 'lucide-react'
import { CodeEditor } from '../CodeEditor'
import { Logo } from '../Logo'
import { ChallengePicker, type Slot } from './ChallengePicker'
import { ProblemPanel } from './ProblemPanel'
import { ResultsPanel } from './ResultsPanel'
import { StreakCard } from './StreakCard'
import { Confetti } from './Confetti'
import { Tour, type TourStep } from '../tour/Tour'
import { TourButton } from '../tour/TourButton'
import { useTour } from '../tour/useTour'
import { addDays, bonusChallenge, dailyChallenges, dateKey, formatDate, restoreBonus, starterCode } from '@/lib/dsa/daily'
import { formatValue } from '@/lib/dsa/format'
import { EMPTY_PROGRESS, computeStats, loadProgress, recordKey, saveProgress, solvesByDay, type Progress } from '@/lib/dsa/progress'
import { runTests, type RunResult } from '@/lib/dsa/runner'
import type { Challenge, Problem } from '@/lib/dsa/types'
import { visualizerLink } from '@/lib/share'

interface RunState {
  key: string
  mode: 'run' | 'submit'
  result: RunResult
}

function visualizerCode(source: string, problem: Problem, args: unknown[], label: string): string {
  const call = `${problem.fn}(${args.map((a) => formatValue(a)).join(', ')})`
  return `${source.trim()}\n\n// ${label}\nconst result = ${call};\nconsole.log(result);\n`
}

export function PracticeApp() {
  // Dates come from the viewer's clock, so nothing date-dependent renders on the server.
  const [today, setToday] = useState<string | null>(null)
  const [day, setDay] = useState<string | null>(null)
  const [slot, setSlot] = useState<Slot>('array')
  const [bonus, setBonus] = useState<Challenge | null>(null)
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS)
  const [loaded, setLoaded] = useState(false)
  const [running, setRunning] = useState<'run' | 'submit' | null>(null)
  const [run, setRun] = useState<RunState | null>(null)
  const [hints, setHints] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const [confetti, setConfetti] = useState(0)

  useEffect(() => {
    const now = dateKey()
    const saved = loadProgress()
    setToday(now)
    setDay(now)
    setProgress(saved)
    if (saved.bonus) setBonus(restoreBonus(saved.bonus.seed, saved.bonus.problemId))
    setLoaded(true)

    // Notice midnight if the tab stays open.
    const id = window.setInterval(() => setToday(dateKey()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  // When the date rolls over, someone looking at "today" moves to the new today.
  const previousToday = useRef<string | null>(null)
  useEffect(() => {
    const old = previousToday.current
    if (old && today && old !== today) setDay((d) => (d === old ? today : d))
    previousToday.current = today
  }, [today])

  // Persist progress (and drafts) shortly after changes.
  useEffect(() => {
    if (!loaded) return
    const id = window.setTimeout(() => saveProgress(progress), 400)
    return () => window.clearTimeout(id)
  }, [progress, loaded])

  const daily = useMemo(() => (day ? dailyChallenges(day) : null), [day])
  const challenge: Challenge | null = slot === 'bonus' ? bonus : (daily?.[slot === 'array' ? 0 : 1] ?? null)
  const key = challenge ? recordKey(challenge.key, challenge.problem.id) : ''
  const code = challenge ? (progress.drafts[key] ?? starterCode(challenge.problem)) : ''
  const isSolved = useCallback((c: Challenge) => !!progress.solved[recordKey(c.key, c.problem.id)], [progress.solved])

  const stats = useMemo(() => computeStats(progress, today ?? dateKey()), [progress, today])
  const byDay = useMemo(() => solvesByDay(progress), [progress])

  // A different problem starts with hints and the solution hidden again.
  useEffect(() => {
    setHints(0)
    setShowSolution(false)
  }, [key])

  const setCode = (next: string) => {
    if (!key) return
    setProgress((p) => ({ ...p, drafts: { ...p.drafts, [key]: next } }))
  }

  const resetCode = () => {
    if (!challenge) return
    setProgress((p) => {
      const drafts = { ...p.drafts }
      delete drafts[key]
      return { ...p, drafts }
    })
    setRun(null)
  }

  const newBonus = () => {
    const avoid = [...(daily?.map((c) => c.problem.id) ?? []), ...(bonus ? [bonus.problem.id] : [])]
    const seed = Date.now()
    const next = bonusChallenge(seed, avoid)
    setBonus(next)
    setProgress((p) => ({ ...p, bonus: { seed, problemId: next.problem.id } }))
    setSlot('bonus')
  }

  const execute = useCallback(
    async (mode: 'run' | 'submit') => {
      if (!challenge || running) return
      setRunning(mode)
      const result = await runTests(code, challenge.problem.fn, mode === 'run' ? challenge.examples : challenge.tests)
      setRun({ key, mode, result })
      setRunning(null)

      if (mode === 'submit' && !result.compileError && result.passed === result.total) {
        setConfetti((n) => n + 1)
        setProgress((p) =>
          p.solved[key]
            ? p
            : {
                ...p,
                solved: {
                  ...p.solved,
                  [key]: {
                    problemId: challenge.problem.id,
                    topic: challenge.problem.topic,
                    day: challenge.bonus ? dateKey() : challenge.key,
                    bonus: challenge.bonus,
                    at: Date.now(),
                  },
                },
              },
        )
      }
    },
    [challenge, code, key, running],
  )

  const onRun = useCallback(() => void execute('run'), [execute])
  const onSubmit = useCallback(() => void execute('submit'), [execute])

  const dateLabel = challenge?.bonus ? 'Bonus example' : day ? `${formatDate(day, 'short')} example` : 'Example'
  const solutionHref = (args: unknown[]) =>
    challenge ? visualizerLink(visualizerCode(challenge.problem.solution, challenge.problem, args, dateLabel)) : '#'
  const myCodeHref = challenge ? visualizerLink(visualizerCode(code, challenge.problem, challenge.examples[0].args, dateLabel)) : '#'

  const isToday = day !== null && day === today

  /* ---- guided tour ------------------------------------------------ */
  const tour = useTour('codeflow:tour:practice:v1', !!challenge)
  const tourSteps: TourStep[] = [
    {
      icon: '🔥',
      title: 'Daily DSA practice',
      body: 'Every day brings **one array problem and one string problem**, with fresh example inputs each day. Solve them to build a streak. Here is how it works.',
    },
    {
      target: '[data-tour="day-nav"]',
      title: 'Pick a day',
      body: 'Today is selected by default. Use the arrows to open earlier days — every date has its own pair of problems, so the past works as an archive.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="challenges"]',
      title: 'Today’s problems',
      body: 'Click a card to switch between the **array** and **string** problem. Want more? The **Bonus** card generates an extra random problem whenever you like.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="problem"]',
      title: 'Read the problem',
      body: 'The statement, today’s worked examples and the constraints. Examples change every day. Each one has a **Visualize** link that shows the reference solution running on that exact input.',
      placement: 'right',
    },
    {
      target: '[data-tour="hints"]',
      title: 'Stuck? Take a hint',
      body: 'Hints unlock one at a time, from a gentle nudge to the key idea. Below them you can reveal the full solution with an explanation and its time/space complexity.',
      placement: 'right',
    },
    {
      target: '[data-tour="editor"]',
      title: 'Write your solution',
      body: 'Code your answer here and keep the given function name. Your draft is **saved automatically**, so you can close the tab and come back.',
      placement: 'left',
    },
    {
      target: '[data-tour="run"]',
      title: 'Run, then submit',
      body: '**Run examples** (`Ctrl+Enter`) checks the visible examples. **Submit** (`Ctrl+Shift+Enter`) runs every test, including edge cases and hidden ones. Pass them all to mark the problem solved 🎉',
      placement: 'top',
    },
    {
      target: '[data-tour="visualize"]',
      title: 'Watch your code run',
      body: 'Opens your solution in the step-by-step visualizer on Example 1 — the best way to find out **why** a test fails.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="streak"]',
      title: 'Keep your streak alive',
      body: 'Solve at least one daily problem each day to grow your streak. The heatmap shows your history — click any square to revisit that day.',
      placement: 'left',
    },
    {
      target: '[data-tour="tour-button"]',
      icon: '🚀',
      title: 'Ready to practise!',
      body: 'Start with today’s array problem. You can replay this tour any time from this button.',
      placement: 'bottom',
    },
  ]

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1500px] flex-col gap-4 px-3 pb-8 pt-3 sm:px-5">
      <Confetti fire={confetti} />

      {/* ---- Header ---- */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="btn h-9 w-9" aria-label="Back to the visualizer" title="Back to the visualizer">
            <ArrowLeft size={16} />
          </Link>
          <Logo />
          <div className="leading-tight">
            <h1 className="bg-gradient-to-r from-orange-200 via-fuchsia-200 to-cyan-200 bg-clip-text text-lg font-bold tracking-tight text-transparent">
              Daily DSA Practice
            </h1>
            <p className="hidden text-[11.5px] text-white/40 sm:block">Two fresh array &amp; string problems every day.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TourButton onClick={tour.start} />
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 rounded-xl border border-orange-400/25 bg-orange-500/10 px-3 py-1.5"
            title="Consecutive days with a daily problem solved"
          >
            <Flame size={16} className={stats.streak > 0 ? 'text-orange-300' : 'text-white/30'} />
            <span className="font-mono text-sm font-bold text-orange-100">{stats.streak}</span>
            <span className="text-[11.5px] text-orange-100/60">day streak</span>
          </motion.div>
        </div>
      </header>

      <Tour steps={tourSteps} open={tour.open} onClose={tour.close} />

      {!day || !daily || !today ? (
        <div className="glass flex h-64 items-center justify-center text-white/40">
          <Loader2 size={18} className="mr-2 animate-spin" /> Preparing today’s challenges…
        </div>
      ) : (
        <>
          {/* ---- Day selector + challenges + streak ---- */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex flex-col gap-3">
              <div data-tour="day-nav" className="flex flex-wrap items-center gap-2 self-start">
                <button type="button" onClick={() => setDay(addDays(day, -1))} className="btn h-9 w-9" aria-label="Previous day">
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  <CalendarDays size={15} className="text-fuchsia-300" />
                  <span className="text-[13.5px] font-medium text-white/85">{formatDate(day)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDay(addDays(day, 1))}
                  disabled={isToday}
                  className="btn h-9 w-9"
                  aria-label="Next day"
                >
                  <ChevronRight size={16} />
                </button>
                {!isToday && (
                  <button type="button" onClick={() => setDay(today)} className="btn h-9 px-3 text-[12.5px]">
                    Back to today
                  </button>
                )}
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {isToday ? 'Today’s challenges' : 'Challenges from the archive'}
              </h2>

              <div data-tour="challenges">
                <ChallengePicker
                  daily={daily}
                  bonus={bonus}
                  active={slot}
                  solved={isSolved}
                  onSelect={setSlot}
                  onNewBonus={newBonus}
                />
              </div>
            </div>

            <div data-tour="streak">
              <StreakCard stats={stats} byDay={byDay} today={today} selected={day} onPickDay={setDay} />
            </div>
          </section>

          {/* ---- Workspace ---- */}
          {challenge && (
            <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <ProblemPanel
                challenge={challenge}
                solved={isSolved(challenge)}
                hintsShown={hints}
                onRevealHint={() => setHints((h) => h + 1)}
                solutionShown={showSolution}
                onToggleSolution={() => setShowSolution((s) => !s)}
                visualizeHref={solutionHref}
              />

              <div className="flex flex-col gap-4 lg:sticky lg:top-4">
                <div data-tour="editor" className="glass flex flex-col overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-3.5 py-2">
                    <span className="font-mono text-[11.5px] text-white/50">solution.js</span>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={myCodeHref}
                        target="_blank"
                        rel="noopener"
                        data-tour="visualize"
                        className="btn h-8 px-2.5 text-[11.5px]"
                        title="Open your code in the step-by-step visualizer, running on Example 1"
                      >
                        <PlayCircle size={13} className="text-violet-300" /> Visualize my code
                      </a>
                      <button type="button" onClick={resetCode} className="btn h-8 px-2.5 text-[11.5px]" title="Reset to the starter code">
                        <RotateCcw size={13} /> Reset
                      </button>
                    </div>
                  </div>
                  <div className="h-[380px] sm:h-[440px]">
                    <CodeEditor value={code} onChange={setCode} loc={null} follow={false} onRun={onRun} onSubmit={onSubmit} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-3.5 py-2.5">
                    <span className="hidden text-[11px] text-white/30 sm:block">
                      <kbd className="font-mono">Ctrl+Enter</kbd> run · <kbd className="font-mono">Ctrl+Shift+Enter</kbd> submit
                    </span>
                    <div data-tour="run" className="ml-auto flex items-center gap-2">
                      <button type="button" onClick={onRun} disabled={!!running} className="btn h-10 px-4 text-[13px]">
                        {running === 'run' ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                        Run examples
                      </button>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={onSubmit}
                        disabled={!!running}
                        className="btn btn-primary h-10 px-4 text-[13px]"
                      >
                        {running === 'submit' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        Submit ({challenge.tests.length} tests)
                      </motion.button>
                    </div>
                  </div>
                </div>

                {run && run.key === key && <ResultsPanel key={`${run.mode}-${run.result.elapsed}`} challenge={challenge} mode={run.mode} result={run.result} />}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
