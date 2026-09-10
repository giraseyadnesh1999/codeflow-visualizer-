import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js'

/*
 * Two ways to build:
 *   npm run build                         → a Node server build for `npm start`
 *   STATIC_EXPORT=true npm run build      → plain static files in out/ (GitHub Pages)
 *
 * NEXT_PUBLIC_BASE_PATH serves the app from a sub-path, e.g. "/my-repo" for a
 * GitHub Pages project site. The CI/CD workflow sets both variables.
 */
const staticExport = process.env.STATIC_EXPORT === 'true'
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

/** @type {(phase: string) => import('next').NextConfig} */
const nextConfig = (phase) => ({
  reactStrictMode: true,
  // `next dev` and `next build` must not share an output folder: running a build
  // while the dev server is up replaces its chunks and every request 500s with
  // "Cannot find module './NNN.js'".
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  // Pages live at /practice/ → practice/index.html, which static hosts serve
  // without any rewrite rules.
  trailingSlash: true,
  ...(basePath ? { basePath } : {}),
  ...(staticExport
    ? { output: 'export' }
    : {
        // Response headers need a server, so they only apply to `npm start`.
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
      }),
})

export default nextConfig
