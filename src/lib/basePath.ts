/**
 * The sub-path the app is served from: '' locally, '/<repo>' on GitHub Pages.
 * Baked in at build time from NEXT_PUBLIC_BASE_PATH (see next.config.mjs).
 *
 * Next.js prefixes <Link> hrefs and its own assets automatically; anything
 * else that builds a URL by hand — workers, the service worker, plain <a>
 * links — must go through `withBase`.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export function withBase(path: string): string {
  return `${BASE_PATH}${path}`
}
