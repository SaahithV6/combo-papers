/**
 * Safely encodes a paper ID for use in URL paths.
 * Decodes first to handle already-encoded IDs, then re-encodes,
 * preventing double-encoding (e.g. arxiv%253A → arxiv%3A).
 */
export function safeEncodeId(id: string): string {
  try {
    return encodeURIComponent(decodeURIComponent(id))
  } catch {
    return encodeURIComponent(id)
  }
}
