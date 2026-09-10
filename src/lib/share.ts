/** Share links carry the program in the URL hash as UTF-8-safe base64. */

import { withBase } from './basePath'

export function encodeShare(code: string): string {
  const bytes = new TextEncoder().encode(code)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return encodeURIComponent(btoa(binary))
}

export function decodeShare(hash: string): string | null {
  const match = hash.match(/^#code=(.+)$/)
  if (!match) return null
  try {
    const binary = atob(decodeURIComponent(match[1]))
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

/** A link that opens the visualizer with `code` loaded. */
export function visualizerLink(code: string): string {
  return withBase(`/#code=${encodeShare(code)}`)
}
