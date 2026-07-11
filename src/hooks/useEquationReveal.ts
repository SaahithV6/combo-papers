'use client'

import { useEffect, useRef, useState } from 'react'

export function useEquationReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFocused) {
          setIsInView(true)
          timerRef.current = setTimeout(() => {
            setIsFocused(true)
          }, 2500)
        } else if (!entry.isIntersecting) {
          if (timerRef.current) clearTimeout(timerRef.current)
        }
      },
      { threshold: 0.5 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => {
      observer.disconnect()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isFocused])

  const focusNow = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsFocused(true)
  }

  return { ref, isFocused, isInView, focusNow }
}
