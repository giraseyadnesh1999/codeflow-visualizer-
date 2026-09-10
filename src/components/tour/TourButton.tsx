'use client'

import { motion } from 'framer-motion'
import { HelpCircle } from 'lucide-react'

/** The "?" button that replays a page's walkthrough. */
export function TourButton({ onClick, pulse = false }: { onClick: () => void; pulse?: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      data-tour="tour-button"
      whileTap={{ scale: 0.92 }}
      className={`btn h-9 gap-1.5 px-2.5 text-[12.5px] ${pulse ? 'animate-pulse-ring' : ''}`}
      aria-label="Take the guided tour"
      title="Take the guided tour"
    >
      <HelpCircle size={15} className="text-fuchsia-300" />
      <span className="hidden md:inline">Tour</span>
    </motion.button>
  )
}
