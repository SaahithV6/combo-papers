import type { Metadata } from 'next'
import './globals.css'
import ButterbaseProvider from '@/components/ButterbaseProvider'

export const metadata: Metadata = {
  title: 'Combo Papers — Lifelong Learning Agent',
  description:
    'An agent-native research mentor that plans curricula, remembers your gaps, and turns papers into interactive learning experiences.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ButterbaseProvider>{children}</ButterbaseProvider>
      </body>
    </html>
  )
}
