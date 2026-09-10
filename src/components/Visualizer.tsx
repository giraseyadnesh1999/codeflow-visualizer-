'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { Boxes, Braces, Check, Eye, Flame, Keyboard, Layers, Link2, SquareTerminal } from 'lucide-react'
import { CodeEditor } from './CodeEditor'
import { Controls, SPEEDS } from './Controls'
import { ExplainBar } from './ExplainBar'
import { CallStackPanel } from './CallStackPanel'
import { ScopePanel } from './ScopePanel'
import { HeapPanel } from './HeapPanel'
import { ConsolePanel } from './ConsolePanel'
import { ExamplePicker } from './ExamplePicker'
import { InstallButton } from './InstallButton'
import { Logo } from './Logo'
import { Tour, type TourStep } from './tour/Tour'
import { TourButton } from './tour/TourButton'
import { useTour } from './tour/useTour'
import { DEFAULT_EXAMPLE, EXAMPLES, type Example } from '@/lib/examples'
import { runProgram, type Trace } from '@/lib/interpreter/run'
import { decodeShare, encodeShare } from '@/lib/share'

const STORAGE_KEY = 'codeflow:code'
const TRACE_DEBOUNCE_MS = 350

type Tab = 'stack' | 'scope' | 'heap' | 'console'

const TABS: { id: Tab; label: string; icon: typeof Layers; color: string }[] = [
  { id: 'scope', label: 'Scope', icon: Braces, color: 'text-cyan-300' },
  { id: 'stack', label: 'Stack', icon: Layers, color: 'text-violet-300' },
  { id: 'heap', label: 'Memory', icon: Boxes, color: 'text-lime-300' },
  { id: 'console', label: 'Console', icon: SquareTerminal, color: 'text-amber-300' },
]

export function Visualizer() {
  const [code, setCode] = useState(DEFAULT_EXAMPLE.code)
  const [example, setExample] = useState<Example | null>(DEFAULT_EXAMPLE)
  const [trace, setTrace] = useState<Trace>(() => runProgram(DEFAULT_EXAMPLE.code))
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [tab, setTab] = useState<Tab>('scope')
  const [toast, setToast] = useState<string | null>(null)
  // Trace timing differs between the prerender and the client; only show it once hydrated.
  const [hydrated, setHydrated] = useState(false)
  const loaded = useRef(false)

  const snapshots = trace.snapshots
  const last = Math.max(0, snapshots.length - 1)
  const snapshot = snapshots[Math.min(index, last)]
  const finished = snapshots.length > 0 && index >= last
  const showError = !!trace.error && (finished || snapshots.length === 0)

  /* ---- load code from share link or last session --------------- */
  useEffect(() => {
    const fromHash = decodeShare(window.location.hash)
    let saved: string | null = null
    try {
      saved = localStorage.getItem(STORAGE_KEY)
    } catch {
      // Storage can be unavailable (private mode) — defaults are fine.
    }
    const initial = fromHash ?? saved
    if (initial && initial !== DEFAULT_EXAMPLE.code) {
      setCode(initial)
      setExample(EXAMPLES.find((ex) => ex.code === initial) ?? null)
    }
    loaded.current = true
    setHydrated(true)
  }, [])

  /* ---- re-trace whenever the code settles ----------------------- */
  useEffect(() => {
    if (!loaded.current) return
    setPlaying(false)
    const id = window.setTimeout(() => {
      setTrace(runProgram(code))
      setIndex(0)
      try {
        localStorage.setItem(STORAGE_KEY, code)
      } catch {
        /* ignore */
      }
    }, TRACE_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [code])

  /* ---- playback -------------------------------------------------- */
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setIndex((i) => Math.min(i + 1, last))
    }, 1000 / SPEEDS[speed].stepsPerSecond)
    return () => window.clearInterval(id)
  }, [playing, speed, last])

  useEffect(() => {
    if (playing && index >= last) setPlaying(false)
  }, [playing, index, last])

  const goTo = useCallback(
    (i: number) => {
      setPlaying(false)
      setIndex(Math.max(0, Math.min(i, last)))
    },
    [last],
  )

  const togglePlay = useCallback(() => {
    if (snapshots.length === 0) return
    if (playing) {
      setPlaying(false)
      return
    }
    if (index >= last) setIndex(0)
    setPlaying(true)
  }, [playing, index, last, snapshots.length])

  /* ---- keyboard shortcuts --------------------------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('.cm-editor, input, textarea, select, [role="dialog"]')) return
      // A focused button already handles Space/Enter itself; arrows should still step.
      if (target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowRight':
        case 'l':
          e.preventDefault()
          goTo(index + 1)
          break
        case 'ArrowLeft':
        case 'j':
          e.preventDefault()
          goTo(index - 1)
          break
        case 'Home':
          e.preventDefault()
          goTo(0)
          break
        case 'End':
          e.preventDefault()
          goTo(last)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, goTo, index, last])

  /* ---- actions --------------------------------------------------- */
  const pickExample = (ex: Example) => {
    setExample(ex)
    setCode(ex.code)
    if (window.location.hash) history.replaceState(null, '', window.location.pathname)
  }

  const onEdit = (next: string) => {
    setCode(next)
    if (example && next !== example.code) setExample(null)
  }

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#code=${encodeShare(code)}`
    history.replaceState(null, '', url)
    try {
      await navigator.clipboard.writeText(url)
      flash('Share link copied to clipboard')
    } catch {
      flash('Link is in the address bar — copy it from there')
    }
  }

  const flash = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2200)
  }

  const jumpToEntry = (entryId: number) => {
    const at = snapshots.findIndex((s) => s.output.length >= entryId)
    if (at >= 0) goTo(at)
  }

  const errorLine = showError && trace.error ? trace.error.line : 0
  const frames = snapshot?.frames ?? []
  const output = snapshot?.output ?? []

  /* ---- guided tour ------------------------------------------------ */
  const tour = useTour('codeflow:tour:visualizer:v1', hydrated)

  const tourSteps = useMemo<TourStep[]>(() => {
    // Jump to the most telling moment for each panel, whatever program is loaded.
    const moment = (score: (s: (typeof snapshots)[number]) => number) => () => {
      let best = 0
      snapshots.forEach((s, i) => {
        if (score(s) > score(snapshots[best])) best = i
      })
      goTo(best)
    }
    const show = (panel: Tab, jump?: () => void) => () => {
      setTab(panel)
      jump?.()
    }
    return [
      {
        icon: '👋',
        title: 'Welcome to CodeFlow',
        body: 'CodeFlow runs JavaScript **one step at a time** so you can see what actually happens inside — which line runs, what each variable holds, and how functions call each other. This quick tour takes about a minute.',
        onEnter: () => goTo(0),
      },
      {
        target: '[data-tour="editor"]',
        title: 'Your code',
        body: 'Write or paste JavaScript here. It is re-traced automatically as you type. The **highlighted line** is the one running right now, and the exact expression being evaluated gets its own glow.',
        placement: 'right',
        onEnter: () => goTo(Math.min(3, last)),
      },
      {
        target: '[data-tour="examples"]',
        title: 'Guided examples',
        body: 'Not sure what to try? Pick one of 18 examples — loops, recursion, closures, classes, sorting and more. Each comes with a “watch for” tip telling you what to notice.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="controls"]',
        title: 'Play, pause and step',
        body: 'Press play to watch it run, or step forward and **backward** one step at a time. Change the speed on the right. Keyboard: `Space` play/pause, `←` `→` step, `Home` / `End` jump.',
        placement: 'top',
      },
      {
        target: '[data-tour="timeline"]',
        title: 'The timeline',
        body: 'Every bar is one step, coloured by what happened (purple = call, lime = loop, amber = branch…). **Taller bars mean deeper function calls**, so recursion looks like a mountain. Drag across it to scrub.',
        placement: 'top',
      },
      {
        target: '[data-tour="explain"]',
        title: 'Plain-English narration',
        body: 'Each step is explained here — for example “`n <= 1` is false → skip this block.” Read along as you step to connect the code with what it does.',
        placement: 'top',
      },
      {
        target: '[data-tour="stack"]',
        title: 'Call Stack',
        body: 'Every function call pushes a **frame**; every return pops one. The glowing frame on top is where execution is right now. We jumped to the deepest point of this program so you can see the stack at its tallest.',
        placement: 'left',
        onEnter: show('stack', moment((s) => s.depth)),
      },
      {
        target: '[data-tour="scope"]',
        title: 'Scope & Variables',
        body: 'The variables the current code can see, grouped by scope (function, block, loop). A value **flashes** when it changes. `uninitialized` means a `let`/`const` that exists but has not been assigned yet.',
        placement: 'left',
        onEnter: show('scope'),
      },
      {
        target: '[data-tour="heap"]',
        title: 'Memory (Heap)',
        body: 'Objects, arrays and functions live here, each with an id like `#3`. Variables only hold a **reference** to them — which is why two names can share one object. Arrays show their cells, so sorting is visible.',
        placement: 'left',
        onEnter: show('heap', moment((s) => s.heap.length)),
      },
      {
        target: '[data-tour="console"]',
        title: 'Console',
        body: 'Anything printed with `console.log` appears here at the step it happened. Click an entry’s line number to jump to the moment it was printed.',
        placement: 'left',
        onEnter: show('console', () => goTo(last)),
      },
      {
        target: '[data-tour="daily"]',
        title: 'Daily DSA practice',
        body: 'Two fresh **array & string** problems every day, with tests, hints and solutions — and a streak to keep you coming back. Any solution can be opened here to watch it run.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="share"]',
        title: 'Share your code',
        body: 'Copies a link with your code built in — handy for sending a program to a friend or a student. Your latest code is also remembered on this device.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="tour-button"]',
        icon: '🎉',
        title: 'You’re all set!',
        body: 'Try pressing **play** on the example, or load your own code. You can replay this tour any time from this button.',
        placement: 'bottom',
        onEnter: () => goTo(0),
      },
    ]
  }, [snapshots, goTo, last])

  const status = useMemo(() => {
    if (trace.error?.kind === 'syntax') return { tone: 'error', text: `Syntax error on line ${trace.error.line}` }
    if (trace.error?.kind === 'unsupported') return { tone: 'warn', text: 'Uses unsupported syntax' }
    if (trace.error?.kind === 'limit') return { tone: 'warn', text: `Stopped at ${snapshots.length - 1} steps` }
    const timing = hydrated ? ` · traced in ${Math.max(1, Math.round(trace.elapsed))}ms` : ''
    return { tone: 'ok', text: `${snapshots.length} steps${timing}` }
  }, [trace, snapshots.length, hydrated])

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1680px] flex-col px-3 pb-3 pt-3 sm:px-5 lg:h-dvh lg:min-h-0">
      {/* ---- Header ---- */}
      <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo />
          <div className="leading-tight">
            <h1 className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-cyan-200 bg-clip-text text-lg font-bold tracking-tight text-transparent">
              CodeFlow
            </h1>
            <p className="hidden text-[11.5px] text-white/40 sm:block">See how your JavaScript actually runs — one step at a time.</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <TourButton onClick={tour.start} />
          <Link
            href="/practice"
            data-tour="daily"
            className="group relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-xl border border-orange-400/35 bg-gradient-to-r from-orange-500/20 via-pink-500/15 to-fuchsia-500/20 px-3 text-[12.5px] font-semibold text-orange-50 shadow-[0_6px_24px_-10px_rgba(251,146,60,.9)] transition-all hover:border-orange-300/60 hover:shadow-[0_8px_28px_-8px_rgba(251,146,60,1)] active:scale-[0.96]"
            title="Two new array & string problems every day"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <Flame size={14} className="relative text-orange-300" />
            <span className="relative">Daily DSA</span>
          </Link>
          <div data-tour="examples" className="min-w-0">
            <ExamplePicker current={example} onPick={pickExample} />
          </div>
          <button type="button" onClick={share} data-tour="share" className="btn h-9 px-3 text-[12.5px]" title="Copy a link to this code">
            <Link2 size={14} className="text-cyan-300" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <InstallButton />
        </div>
      </header>

      {/* ---- Workspace ---- */}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Left: code + narration + transport */}
        <div className="flex min-h-0 flex-col gap-3">
          <section data-tour="editor" className="glass flex h-[46vh] min-h-[280px] flex-col overflow-hidden lg:h-auto lg:flex-1">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-3.5 py-2">
              <div className="flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-lime-400/80" />
                </span>
                <span className="ml-1 font-mono text-[11.5px] text-white/50">main.js</span>
              </div>
              <span
                className={`flex items-center gap-1.5 font-mono text-[10.5px] ${
                  status.tone === 'error' ? 'text-red-300' : status.tone === 'warn' ? 'text-amber-300' : 'text-white/35'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    status.tone === 'error' ? 'bg-red-400' : status.tone === 'warn' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                {status.text}
              </span>
            </div>
            <div className="min-h-0 flex-1">
              <CodeEditor value={code} onChange={onEdit} loc={snapshot?.loc ?? null} errorLine={errorLine} />
            </div>
          </section>

          {example && (
            <div className="flex shrink-0 items-start gap-2 rounded-xl border border-fuchsia-400/15 bg-fuchsia-500/[0.06] px-3 py-2 text-[12px] leading-snug text-fuchsia-100/70">
              <Eye size={14} className="mt-px shrink-0 text-fuchsia-300" />
              <span>
                <span className="font-semibold text-fuchsia-200">Watch for: </span>
                {example.watch}
              </span>
            </div>
          )}

          <div data-tour="explain" className="shrink-0">
            {trace.error && snapshots.length === 0 ? (
              <div className="glass border-red-400/25 px-4 py-3">
                <p className="text-[13px] font-semibold text-red-200">Can’t run this yet</p>
                <p className="mt-0.5 font-mono text-[12px] text-red-200/70">
                  {trace.error.message} {trace.error.line > 0 && `(line ${trace.error.line})`}
                </p>
              </div>
            ) : (
              <ExplainBar snapshot={snapshot} isError={showError} />
            )}
          </div>

          <Controls
            snapshots={snapshots}
            index={Math.min(index, last)}
            playing={playing}
            speed={speed}
            onIndex={goTo}
            onTogglePlay={togglePlay}
            onSpeed={setSpeed}
          />
        </div>

        {/* Right: machine state */}
        <div className="flex min-h-0 flex-col gap-3">
          {/* Tab strip — small screens only */}
          <div className="glass flex shrink-0 gap-1 p-1 lg:hidden" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-medium transition-colors ${
                  tab === t.id ? 'text-white' : 'text-white/40'
                }`}
              >
                {tab === t.id && (
                  <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-xl bg-white/[0.08]" />
                )}
                <t.icon size={13} className={`relative ${t.color}`} />
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="grid h-[64vh] min-h-0 grid-cols-1 gap-3 lg:h-auto lg:flex-1 lg:grid-cols-2 lg:grid-rows-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <PanelSlot active={tab === 'stack'} tour="stack">
              <CallStackPanel frames={frames} />
            </PanelSlot>
            <PanelSlot active={tab === 'scope'} tour="scope">
              <ScopePanel frames={frames} />
            </PanelSlot>
            <PanelSlot active={tab === 'heap'} tour="heap">
              <HeapPanel heap={snapshot?.heap ?? []} />
            </PanelSlot>
            <PanelSlot active={tab === 'console'} tour="console">
              <ConsolePanel output={output} error={showError ? trace.error : null} finished={finished || snapshots.length === 0} onJumpToEntry={jumpToEntry} />
            </PanelSlot>
          </div>
        </div>
      </main>

      <footer className="mt-3 hidden shrink-0 items-center justify-between gap-4 text-[11px] text-white/30 lg:flex">
        <span className="flex items-center gap-3">
          <Keyboard size={13} />
          <Kbd>Space</Kbd> play / pause
          <Kbd>←</Kbd>
          <Kbd>→</Kbd> step
          <Kbd>Home</Kbd>
          <Kbd>End</Kbd> jump
        </span>
        <span>Runs entirely in your browser · works offline</span>
      </footer>

      <Tour steps={tourSteps} open={tour.open} onClose={tour.close} />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-emerald-400/30 bg-ink-700/95 px-4 py-2.5 text-[12.5px] text-emerald-100 shadow-2xl backdrop-blur-xl"
          >
            <Check size={14} className="text-emerald-300" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PanelSlot({ active, tour, children }: { active: boolean; tour: Tab; children: React.ReactNode }) {
  return (
    <div data-tour={tour} className={`${active ? 'flex' : 'hidden'} min-h-0 flex-col lg:flex [&>*]:flex-1`}>
      {children}
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-px font-mono text-[10px] text-white/50">
      {children}
    </kbd>
  )
}
