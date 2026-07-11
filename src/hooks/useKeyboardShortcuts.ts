'use client'

import { useEffect, useCallback } from 'react'

interface ShortcutHandlers {
  onNextSection?: () => void
  onPrevSection?: () => void
  onToggleEquation?: () => void
  onToggleNotebook?: () => void
  onToggleCitationGraph?: () => void
  onSwitchReadingMode?: () => void
  onFullscreenFigure?: () => void
  onDontUnderstand?: () => void
  onRabbitHoleBack?: () => void
  onRabbitHoleForward?: () => void
  onShowHelp?: () => void
  onOpenSearch?: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

    switch (e.key) {
      case 'j':
      case 'J':
        handlers.onNextSection?.()
        break
      case 'k':
      case 'K':
        handlers.onPrevSection?.()
        break
      case 'e':
      case 'E':
        handlers.onToggleEquation?.()
        break
      case 'n':
      case 'N':
        handlers.onToggleNotebook?.()
        break
      case 'c':
      case 'C':
        handlers.onToggleCitationGraph?.()
        break
      case 'r':
      case 'R':
        handlers.onSwitchReadingMode?.()
        break
      case 'f':
      case 'F':
        handlers.onFullscreenFigure?.()
        break
      case 'd':
      case 'D':
        handlers.onDontUnderstand?.()
        break
      case '[':
        handlers.onRabbitHoleBack?.()
        break
      case ']':
        handlers.onRabbitHoleForward?.()
        break
      case '?':
        handlers.onShowHelp?.()
        break
      case '/':
        e.preventDefault()
        handlers.onOpenSearch?.()
        break
    }
  }, [handlers])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
