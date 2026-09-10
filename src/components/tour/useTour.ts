'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Tour state with first-visit auto-start. A tour runs once automatically for a
 * new visitor (after `ready` turns true); after that only on request.
 */
export function useTour(storageKey: string, ready = true) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!ready) return
    let seen = true
    try {
      seen = localStorage.getItem(storageKey) === 'done'
    } catch {
      // Storage blocked: don't nag on every visit.
    }
    if (seen) return
    // Let the page finish its entrance animations first.
    const id = window.setTimeout(() => setOpen(true), 900)
    return () => window.clearTimeout(id)
  }, [storageKey, ready])

  const close = useCallback(() => {
    setOpen(false)
    // Skipping counts as seen too — the ? button is always there to replay it.
    try {
      localStorage.setItem(storageKey, 'done')
    } catch {
      /* ignore */
    }
  }, [storageKey])

  const start = useCallback(() => setOpen(true), [])

  return { open, start, close }
}
