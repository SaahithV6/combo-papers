import type { Metadata } from 'next'
import './globals.css'
import ButterbaseProvider from '@/components/ButterbaseProvider'
import AppShell from '@/components/Navigation/AppShell'

export const metadata: Metadata = {
  title: {
    default: 'Combo Papers — Research that becomes learnable',
    template: '%s · Combo Papers',
  },
  description:
    'Build intuition across papers with guided research paths, approach comparisons, interactive Living Pages, and a mentor that remembers.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ButterbaseProvider>
          <AppShell>{children}</AppShell>
        </ButterbaseProvider>
      </body>
    </html>
  )
}
