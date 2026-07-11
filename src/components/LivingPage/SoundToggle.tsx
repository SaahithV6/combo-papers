'use client'

import { useEffect, useState } from 'react'
import {
  isSoundEnabled,
  playAction,
  restoreSoundPreference,
  setAmbientMode,
  setSoundEnabled,
} from '@/hooks/useSoundscape'

/**
 * Quiet control for ambient bed + action chimes.
 * Place once on Living Page / home.
 */
export default function SoundToggle({ denser = false }: { denser?: boolean }) {
  const [on, setOn] = useState(false)

  useEffect(() => {
    restoreSoundPreference()
    setOn(isSoundEnabled())
  }, [])

  useEffect(() => {
    if (on) setAmbientMode(denser ? 'methods' : 'sparse')
  }, [denser, on])

  return (
    <button
      type="button"
      onClick={() => {
        const next = !on
        void setSoundEnabled(next).then(() => {
          setOn(next)
          playAction(next ? 'enable' : 'disable')
          if (next) setAmbientMode(denser ? 'methods' : 'sparse')
        })
      }}
      className="text-xs px-2.5 py-1.5 rounded transition-all"
      style={{
        backgroundColor: on ? '#00d4aa22' : '#1a2235',
        color: on ? '#00d4aa' : '#9ca3af',
        border: `1px solid ${on ? '#00d4aa44' : '#1a2235'}`,
      }}
      title="Ambient audio + action chimes (Web Audio, no files)"
    >
      {on ? '♫ Sound on' : '♫ Sound off'}
    </button>
  )
}

export { playAction }
