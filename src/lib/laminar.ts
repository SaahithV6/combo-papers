import { Laminar } from '@lmnr-ai/lmnr'

let initialized = false

export function initLaminar(): void {
  const apiKey = process.env.LMNR_PROJECT_API_KEY
  if (!apiKey || initialized) return
  try {
    Laminar.initialize({ projectApiKey: apiKey })
    initialized = true
  } catch (e) {
    console.warn('Laminar initialization failed:', e)
  }
}

export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  if (!process.env.LMNR_PROJECT_API_KEY) return fn()
  try {
    initLaminar()
    const { observe } = await import('@lmnr-ai/lmnr')
    return observe({ name, ...(attributes && { attributes }) }, fn)
  } catch {
    return fn()
  }
}
