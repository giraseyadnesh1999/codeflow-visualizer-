'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const COLORS = ['#a855f7', '#e879f9', '#22d3ee', '#a3e635', '#fbbf24', '#fb7185', '#38bdf8']
const COUNT = 70

interface Piece {
  x: number
  y: number
  rotate: number
  color: string
  size: number
  round: boolean
  delay: number
}

function makePieces(): Piece[] {
  return Array.from({ length: COUNT }, (_, i) => {
    const angle = (Math.PI * 2 * i) / COUNT + Math.random() * 0.4
    const distance = 140 + Math.random() * 260
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 120,
      rotate: Math.random() * 720 - 360,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 7,
      round: Math.random() > 0.55,
      delay: Math.random() * 0.12,
    }
  })
}

/** A one-shot burst; increment `fire` to launch another. */
export function Confetti({ fire }: { fire: number }) {
  const [pieces, setPieces] = useState<Piece[]>([])

  useEffect(() => {
    if (fire === 0) return
    setPieces(makePieces())
    const id = window.setTimeout(() => setPieces([]), 2200)
    return () => window.clearTimeout(id)
  }, [fire])

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center" aria-hidden>
      <AnimatePresence>
        {pieces.map((p, i) => (
          <motion.span
            key={`${fire}-${i}`}
            className="absolute"
            style={{
              width: p.size,
              height: p.round ? p.size : p.size * 0.45,
              background: p.color,
              borderRadius: p.round ? 999 : 2,
              boxShadow: `0 0 10px ${p.color}`,
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
            animate={{ x: p.x, y: [0, p.y, p.y + 260], opacity: [1, 1, 0], scale: 1, rotate: p.rotate }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, delay: p.delay, ease: [0.2, 0.7, 0.4, 1], times: [0, 0.45, 1] }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
