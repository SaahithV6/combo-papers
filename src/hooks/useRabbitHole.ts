'use client'

import { useState, useCallback, useEffect } from 'react'
import { RabbitHoleItem } from '@/lib/types'

const SESSION_KEY = 'rabbitHoleStack'

export function useRabbitHole() {
  const [stack, setStack] = useState<RabbitHoleItem[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = sessionStorage.getItem(SESSION_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (typeof window === 'undefined') return -1
    try {
      const stored = sessionStorage.getItem(SESSION_KEY)
      const arr = stored ? JSON.parse(stored) : []
      return arr.length > 0 ? arr.length - 1 : -1
    } catch {
      return -1
    }
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(stack))
    } catch {
      // ignore
    }
  }, [stack])

  const push = useCallback((item: RabbitHoleItem) => {
    setStack(prev => {
      const newStack = [...prev.slice(0, currentIndex + 1), item]
      setCurrentIndex(newStack.length - 1)
      return newStack
    })
  }, [currentIndex])

  const goBack = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, -1))
  }, [])

  const goForward = useCallback(() => {
    setCurrentIndex(prev => {
      return Math.min(prev + 1, stack.length - 1)
    })
  }, [stack.length])

  const jumpTo = useCallback((index: number) => {
    if (index >= -1 && index < stack.length) {
      setCurrentIndex(index)
    }
  }, [stack.length])

  const current = currentIndex >= 0 ? stack[currentIndex] : null

  return { stack, current, currentIndex, push, goBack, goForward, jumpTo }
}
