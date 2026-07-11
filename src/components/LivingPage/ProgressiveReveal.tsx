'use client'

import { useProgressiveReveal } from '@/hooks/useProgressiveReveal'

interface ProgressiveRevealProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

export default function ProgressiveReveal({ children, delay = 0, className = '' }: ProgressiveRevealProps) {
  const { ref, isVisible } = useProgressiveReveal(0.05)

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(15px)',
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}
