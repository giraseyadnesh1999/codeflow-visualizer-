'use client'

import { motion } from 'framer-motion'

/** Animated brand mark: stacked "code lines" with a play head sweeping them. */
export function Logo() {
  return (
    <motion.div
      initial={{ rotate: -12, scale: 0.8, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-[0_8px_30px_-6px_rgba(168,85,247,.8)]"
    >
      <svg viewBox="0 0 40 40" className="h-7 w-7" aria-hidden>
        <rect x="8" y="10" width="17" height="3.2" rx="1.6" fill="white" opacity="0.95" />
        <rect x="12" y="18.4" width="13" height="3.2" rx="1.6" fill="white" opacity="0.7" />
        <rect x="8" y="26.8" width="10" height="3.2" rx="1.6" fill="white" opacity="0.5" />
        <path d="M28 14.5 L34 20 L28 25.5 Z" fill="white" />
      </svg>
      <motion.span
        className="absolute inset-y-0 w-3 bg-white/40 blur-sm"
        animate={{ x: [-30, 40] }}
        transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.6, ease: 'easeInOut' }}
      />
    </motion.div>
  )
}
