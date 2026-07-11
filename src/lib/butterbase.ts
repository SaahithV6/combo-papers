import { createClient, type ButterbaseClient } from '@butterbase/sdk'

const appId = process.env.NEXT_PUBLIC_BUTTERBASE_APP_ID || ''
const apiUrl = process.env.NEXT_PUBLIC_BUTTERBASE_API_URL || 'https://api.butterbase.ai'
const anonKey = process.env.NEXT_PUBLIC_BUTTERBASE_ANON_KEY

let browserClient: ButterbaseClient | null = null

export function isButterbaseConfigured(): boolean {
  return Boolean(appId)
}

/** Browser / shared client. Safe to call without keys — returns null when unconfigured. */
export function getButterbase(): ButterbaseClient | null {
  if (!appId) return null
  if (typeof window === 'undefined') {
    return createClient({
      appId,
      apiUrl,
      anonKey,
      persistSession: false,
    })
  }
  if (!browserClient) {
    browserClient = createClient({
      appId,
      apiUrl,
      anonKey,
    })
  }
  return browserClient
}

/** Server-side client with service key for privileged writes. */
export function getButterbaseAdmin(): ButterbaseClient | null {
  const serviceKey = process.env.BUTTERBASE_SERVICE_KEY
  if (!appId || !serviceKey) return null
  return createClient({
    appId,
    apiUrl,
    anonKey: serviceKey,
    persistSession: false,
  })
}

export type { ButterbaseClient }
