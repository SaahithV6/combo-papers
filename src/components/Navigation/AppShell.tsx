'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { useButterbaseAuth } from '@/components/ButterbaseProvider'

function routeLabel(pathname: string) {
  if (pathname.startsWith('/paper/')) return 'Living page'
  if (pathname.startsWith('/thread/')) return 'Research path'
  if (pathname.startsWith('/saved')) return 'Library'
  if (pathname.startsWith('/sign-')) return 'Account'
  return 'Workspace'
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useButterbaseAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const isAuth = pathname.startsWith('/sign-') || pathname.startsWith('/auth/')

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      {!isAuth && (
        <header
          className="fixed inset-x-0 top-0 z-[90] border-b backdrop-blur-xl"
          style={{
            height: 'var(--app-header)',
            borderColor: 'var(--border-subtle)',
            background: 'rgba(8, 11, 16, 0.88)',
          }}
        >
          <div className="mx-auto flex h-full max-w-[1500px] items-center gap-3 px-4 md:px-6">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 font-display text-sm font-semibold tracking-tight"
              aria-label="Combo Papers home"
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-md border font-mono text-[11px]"
                style={{
                  color: 'var(--teal)',
                  borderColor: 'rgba(79, 209, 181, 0.3)',
                  background: 'var(--teal-soft)',
                }}
              >
                CP
              </span>
              <span className="hidden sm:inline">Combo Papers</span>
            </Link>

            <div
              className="hidden h-4 w-px sm:block"
              style={{ background: 'var(--border)' }}
              aria-hidden="true"
            />
            <span className="ui-label hidden sm:inline">{routeLabel(pathname)}</span>

            <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Primary">
              <Link href="/" className="ui-button ui-button-ghost">
                New path
              </Link>
              <Link href="/saved" className="ui-button ui-button-ghost">
                Library
              </Link>
              {user ? (
                <button
                  type="button"
                  className="ui-button"
                  title={String(user.email || user.id)}
                  onClick={() => void signOut()}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: 'var(--teal)' }}
                    aria-hidden="true"
                  />
                  Sign out
                </button>
              ) : (
                <Link href="/sign-in" className="ui-button">
                  Sign in
                </Link>
              )}
            </nav>

            <button
              type="button"
              className="ui-button ml-auto md:hidden"
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? 'Close' : 'Menu'}
            </button>
          </div>

          {menuOpen && (
            <nav
              className="absolute inset-x-3 top-[calc(var(--app-header)+8px)] space-y-1 rounded-xl border p-2 shadow-2xl md:hidden"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              aria-label="Mobile"
            >
              {[
                { href: '/', label: 'New research path' },
                { href: '/saved', label: 'Library' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-lg px-3 py-3 font-display text-sm"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-3 text-left font-display text-sm"
                onClick={() => {
                  setMenuOpen(false)
                  if (user) void signOut()
                  else router.push('/sign-in')
                }}
              >
                {user ? 'Sign out' : 'Sign in'}
              </button>
            </nav>
          )}
        </header>
      )}

      <main id="main-content" className={isAuth ? '' : 'pt-[var(--app-header)]'}>
        {children}
      </main>
    </div>
  )
}
