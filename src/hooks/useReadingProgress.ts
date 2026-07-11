'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export function useReadingProgress(): number {
  const [progress, setProgress] = useState(0)
  const rafRef = useRef<number>()

  const updateProgress = useCallback(() => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    if (docHeight <= 0) {
      setProgress(100)
      return
    }
    const pct = Math.min(100, Math.max(0, Math.round((scrollTop / docHeight) * 100)))
    setProgress(pct)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updateProgress)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    updateProgress()

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [updateProgress])

  return progress
}
