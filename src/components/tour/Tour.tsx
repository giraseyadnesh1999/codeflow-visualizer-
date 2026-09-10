'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Inline } from '../practice/Prose'

export interface TourStep {
  /** CSS selector of the element to spotlight; omit for a centered card. */
  target?: string
  title: string
  /** Supports `inline code` and **bold**. */
  body: string
  /** Preferred side for the card on wide screens. */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** Runs when the step opens — e.g. switch a tab or jump the program to a good moment. */
  onEnter?: () => void
  /** Optional emoji / badge shown above the title. */
  icon?: string
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const MARGIN = 12
const GAP = 14
const PAD = 6
const SPRING = { type: 'spring', stiffness: 260, damping: 30 } as const

/**
 * A guided walkthrough: dims the page, cuts a spotlight around each target and
 * places an explanation card beside it. The page underneath is not clickable
 * while the tour is open, so nothing can change out from under a step.
 */
export function Tour({ steps, open, onClose }: { steps: TourStep[]; open: boolean; onClose: (completed: boolean) => void }) {
  const [index, setIndex] = useState(0)
  const [target, setTarget] = useState<Rect | null>(null)
  const [viewport, setViewport] = useState({ w: 1280, h: 800 })
  const [tipSize, setTipSize] = useState({ w: 340, h: 200 })
  const tipRef = useRef<HTMLDivElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const stepsRef = useRef(steps)

  useEffect(() => {
    stepsRef.current = steps
  }, [steps])

  // Rewind on close, so the next opening starts from the first step (resetting
  // on open instead would briefly re-run the previous step's onEnter).
  useEffect(() => {
    if (!open) setIndex(0)
  }, [open])

  const step = steps[Math.min(index, steps.length - 1)]
  const isLast = index >= steps.length - 1

  // Enter the step: run its hook, then bring the target on screen.
  useEffect(() => {
    if (!open) return
    const current = stepsRef.current[index]
    current?.onEnter?.()
    const id = window.setTimeout(() => {
      const el = current?.target ? document.querySelector(current.target) : null
      if (!el) return
      const r = el.getBoundingClientRect()
      const offscreen = r.top < 0 || r.bottom > window.innerHeight || r.left < 0 || r.right > window.innerWidth
      if (offscreen) el.scrollIntoView({ block: r.height > window.innerHeight * 0.7 ? 'start' : 'center', behavior: 'smooth' })
      primaryRef.current?.focus({ preventScroll: true })
    }, 80)
    return () => window.clearTimeout(id)
  }, [open, index])

  // Track the target, the card and the viewport every frame, so the spotlight
  // follows scrolling, resizing and layout animations without extra wiring.
  useEffect(() => {
    if (!open) return
    let frame = 0
    let lastKey = ''
    const tick = () => {
      const selector = stepsRef.current[index]?.target
      const el = selector ? document.querySelector(selector) : null
      const r = el?.getBoundingClientRect()
      const visible = r && r.width > 0 && r.height > 0
      const tip = tipRef.current?.getBoundingClientRect()
      const key = [
        visible ? [r.left, r.top, r.width, r.height].map(Math.round).join(',') : 'none',
        tip ? `${Math.round(tip.width)}x${Math.round(tip.height)}` : '',
        window.innerWidth,
        window.innerHeight,
      ].join('|')
      if (key !== lastKey) {
        lastKey = key
        setTarget(visible ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null)
        if (tip) setTipSize({ w: tip.width, h: tip.height })
        setViewport({ w: window.innerWidth, h: window.innerHeight })
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [open, index])

  const next = useCallback(() => {
    if (isLast) onClose(true)
    else setIndex((i) => i + 1)
  }, [isLast, onClose])
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])

  useEffect(() => {
    if (!open) return
    const actions: Record<string, () => void> = { Escape: () => onClose(false), ArrowRight: next, ArrowLeft: back }
    const onKey = (e: KeyboardEvent) => {
      const action = actions[e.key]
      if (action) {
        e.preventDefault()
        e.stopPropagation()
        action()
        return
      }
      // Tab moves focus, and Enter / Space press the card's own buttons.
      const inCard = tipRef.current?.contains(e.target as Node) ?? false
      if (e.key === 'Tab' || (inCard && (e.key === 'Enter' || e.key === ' '))) return
      // Swallow everything else so page shortcuts (Space = play, Home/End…) stay inert.
      e.preventDefault()
      e.stopPropagation()
    }
    // Capture phase, so this runs before — and can stop — the page's own shortcuts.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, next, back, onClose])

  const spot = spotlight(target, viewport)
  const pos = placeCard(target ? spot : null, tipSize, viewport, step?.placement)

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open && step && (
          <motion.div
            key="tour"
            className="fixed inset-0 z-[80]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Blocks interaction with the page while the tour is open. */}
            <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} aria-hidden />

            {/* The spotlight: a transparent box whose giant shadow dims everything else. */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute rounded-2xl"
              initial={false}
              animate={{ left: spot.x, top: spot.y, width: spot.w, height: spot.h }}
              transition={SPRING}
              style={{ boxShadow: '0 0 0 9999px rgba(6, 4, 14, 0.74)' }}
            >
              {target && (
                <motion.span
                  className="absolute inset-0 rounded-2xl ring-2 ring-fuchsia-300/80"
                  animate={{ boxShadow: ['0 0 0px rgba(232,121,249,0.0)', '0 0 28px rgba(232,121,249,0.55)', '0 0 0px rgba(232,121,249,0.0)'] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </motion.div>

            {/* The explanation card. */}
            <motion.div
              ref={tipRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="tour-title"
              aria-describedby="tour-body"
              className="absolute left-0 top-0 w-[calc(100vw-24px)] max-w-[360px] rounded-2xl border border-white/15 bg-ink-800/95 p-4 shadow-[0_24px_60px_-12px_rgba(0,0,0,.9),0_0_0_1px_rgba(168,85,247,.25)] backdrop-blur-xl sm:w-[360px]"
              initial={false}
              animate={{ x: pos.x, y: pos.y }}
              transition={SPRING}
            >
              {/* Progress bar along the card's top edge. */}
              <span className="absolute inset-x-0 top-0 h-[3px] overflow-hidden rounded-t-2xl bg-white/10">
                <motion.span
                  className="block h-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-300"
                  initial={false}
                  animate={{ width: `${((index + 1) / steps.length) * 100}%` }}
                  transition={SPRING}
                />
              </span>

              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-fuchsia-200/70">
                  Step {index + 1} of {steps.length}
                </span>
                <button
                  type="button"
                  onClick={() => onClose(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close the tour"
                  title="Close (Esc)"
                >
                  <X size={15} />
                </button>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  {step.icon && <div className="mb-1 text-2xl leading-none">{step.icon}</div>}
                  <h2 id="tour-title" className="text-[15.5px] font-bold tracking-tight text-white">
                    {step.title}
                  </h2>
                  <p id="tour-body" className="mt-1.5 text-[13px] leading-relaxed text-white/65">
                    <Inline text={step.body} />
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-[11px] text-white/30">
                  <kbd className="font-mono">←</kbd> <kbd className="font-mono">→</kbd> to navigate
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  {index === 0 ? (
                    <button type="button" onClick={() => onClose(false)} className="btn h-9 px-3 text-[12.5px]">
                      Skip
                    </button>
                  ) : (
                    <button type="button" onClick={back} className="btn h-9 w-9" aria-label="Previous step">
                      <ArrowLeft size={15} />
                    </button>
                  )}
                  <button ref={primaryRef} type="button" onClick={next} className="btn btn-primary h-9 px-3.5 text-[12.5px]">
                    {isLast ? (
                      <>
                        <Check size={15} /> Finish
                      </>
                    ) : index === 0 ? (
                      <>
                        Show me around <ArrowRight size={15} />
                      </>
                    ) : (
                      <>
                        Next <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}

/* ---- geometry ------------------------------------------------------ */

/** The padded, viewport-clamped hole. With no target it collapses to the centre. */
function spotlight(target: Rect | null, vp: { w: number; h: number }): Rect {
  if (!target) return { x: vp.w / 2, y: vp.h / 2, w: 0, h: 0 }
  const x = Math.max(4, target.x - PAD)
  const y = Math.max(4, target.y - PAD)
  const right = Math.min(vp.w - 4, target.x + target.w + PAD)
  const bottom = Math.min(vp.h - 4, target.y + target.h + PAD)
  return { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) }
}

function placeCard(
  spot: Rect | null,
  tip: { w: number; h: number },
  vp: { w: number; h: number },
  preferred?: TourStep['placement'],
): { x: number; y: number } {
  const clamp = (x: number, y: number) => ({
    x: Math.round(Math.min(Math.max(MARGIN, x), Math.max(MARGIN, vp.w - tip.w - MARGIN))),
    y: Math.round(Math.min(Math.max(MARGIN, y), Math.max(MARGIN, vp.h - tip.h - MARGIN))),
  })

  if (!spot) return clamp((vp.w - tip.w) / 2, (vp.h - tip.h) / 2)

  // Phones: dock the card to whichever half of the screen the target is not in.
  if (vp.w < 640) {
    const targetBelowMiddle = spot.y + spot.h / 2 > vp.h / 2
    return clamp(MARGIN, targetBelowMiddle ? MARGIN : vp.h - tip.h - MARGIN)
  }

  const cx = spot.x + spot.w / 2 - tip.w / 2
  const cy = spot.y + spot.h / 2 - tip.h / 2
  const options = {
    bottom: { x: cx, y: spot.y + spot.h + GAP, fits: spot.y + spot.h + GAP + tip.h <= vp.h - MARGIN },
    top: { x: cx, y: spot.y - GAP - tip.h, fits: spot.y - GAP - tip.h >= MARGIN },
    right: { x: spot.x + spot.w + GAP, y: cy, fits: spot.x + spot.w + GAP + tip.w <= vp.w - MARGIN },
    left: { x: spot.x - GAP - tip.w, y: cy, fits: spot.x - GAP - tip.w >= MARGIN },
  }
  const order = [preferred, 'bottom', 'top', 'right', 'left'].filter(Boolean) as (keyof typeof options)[]
  const choice = order.find((side) => options[side].fits)
  if (choice) return clamp(options[choice].x, options[choice].y)

  // The target fills the screen: sit in the corner furthest from its centre.
  const right = spot.x + spot.w / 2 < vp.w / 2
  return clamp(right ? vp.w - tip.w - MARGIN : MARGIN, vp.h - tip.h - MARGIN)
}
