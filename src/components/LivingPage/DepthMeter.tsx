'use client'

import { useEffect, useRef } from 'react'

interface DepthMeterProps {
  depth: number // 0 to 1
}

export default function DepthMeter({ depth }: DepthMeterProps) {
  const circumference = 2 * Math.PI * 18
  const dashOffset = circumference * (1 - depth)

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-1">
      <svg width="48" height="48" viewBox="0 0 48 48">
        {/* Background ring */}
        <circle
          cx="24" cy="24" r="18"
          fill="none"
          stroke="#1a2235"
          strokeWidth="3"
        />
        {/* Progress ring */}
        <circle
          cx="24" cy="24" r="18"
          fill="none"
          stroke="#00d4aa"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 24 24)"
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          opacity={0.8}
        />
        {/* Center dot */}
        <circle cx="24" cy="24" r="3" fill="#00d4aa" opacity={depth > 0 ? 0.9 : 0.3} />
      </svg>
      {depth > 0 && (
        <span className="text-[10px] font-mono text-teal opacity-60">
          {Math.round(depth * 100)}%
        </span>
      )}
    </div>
  )
}
