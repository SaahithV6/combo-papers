import { NextResponse } from 'next/server'

/**
 * Auth is handled client-side via Butterbase sessions.
 * Middleware stays permissive for demo mode; protect routes once Butterbase
 * JWT cookie bridging is wired for production.
 */
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
