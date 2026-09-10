'use client'

import { useEffect } from 'react'
import { withBase } from '@/lib/basePath'

/** Registers the offline service worker (production builds only). */
export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV !== 'production') {
      // A stale worker from a previous prod run would serve cached dev assets.
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()))
      return
    }

    const register = () => {
      navigator.serviceWorker.register(withBase('/sw.js'), { scope: withBase('/') }).catch((err) => {
        console.warn('Service worker registration failed:', err)
      })
    }

    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])

  return null
}
