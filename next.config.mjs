import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js'

/** @type {(phase: string) => import('next').NextConfig} */
const nextConfig = (phase) => ({
  reactStrictMode: true,
  // `next dev` and `next build` must not share an output folder: running a build
  // while the dev server is up replaces its chunks and every request 500s with
  // "Cannot find module './NNN.js'".
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  headers: async () => [
    {
      // The service worker must be allowed to control the whole origin.
      source: '/sw.js',
      headers: [
        { key: 'Service-Worker-Allowed', value: '/' },
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
      ],
    },
  ],
})

export default nextConfig
