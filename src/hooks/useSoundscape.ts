/**
 * Procedural ambient bed + short action chimes via Web Audio API.
 * No asset files required. Off by default until user enables.
 */

export type SoundAction =
  | 'enable'
  | 'disable'
  | 'equation'
  | 'notebook'
  | 'checkpoint'
  | 'conflict'
  | 'rabbit'
  | 'depth'
  | 'dont_understand'
  | 'share'

type AmbientMode = 'off' | 'sparse' | 'methods'

let ctx: AudioContext | null = null
let ambientNodes: { osc: OscillatorNode; gain: GainNode }[] = []
let ambientMode: AmbientMode = 'off'
let enabled = false

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

function tone(
  freq: number,
  durationSec: number,
  type: OscillatorType = 'sine',
  gain = 0.04,
  when = 0
) {
  const c = getCtx()
  if (!c || !enabled) return
  const t0 = c.currentTime + when
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + durationSec + 0.05)
}

export function isSoundEnabled() {
  return enabled
}

export async function setSoundEnabled(on: boolean) {
  enabled = on
  const c = getCtx()
  if (on && c?.state === 'suspended') await c.resume()
  if (!on) stopAmbient()
  else if (ambientMode !== 'off') startAmbient(ambientMode)
  try {
    localStorage.setItem('combo:sound', on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function restoreSoundPreference() {
  try {
    if (localStorage.getItem('combo:sound') === '1') {
      enabled = true
    }
  } catch {
    /* ignore */
  }
}

export function setAmbientMode(mode: AmbientMode) {
  ambientMode = mode
  if (!enabled) return
  stopAmbient()
  if (mode !== 'off') startAmbient(mode)
}

function stopAmbient() {
  for (const n of ambientNodes) {
    try {
      n.osc.stop()
      n.osc.disconnect()
      n.gain.disconnect()
    } catch {
      /* ignore */
    }
  }
  ambientNodes = []
}

function startAmbient(mode: AmbientMode) {
  const c = getCtx()
  if (!c || !enabled) return
  stopAmbient()
  const freqs = mode === 'methods' ? [55, 82.5, 110] : [49, 73.5]
  const baseGain = mode === 'methods' ? 0.012 : 0.007
  for (const f of freqs) {
    const osc = c.createOscillator()
    const g = c.createGain()
    const lfo = c.createOscillator()
    const lfoGain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = f
    lfo.frequency.value = 0.05 + Math.random() * 0.04
    lfoGain.gain.value = baseGain * 0.4
    g.gain.value = baseGain
    lfo.connect(lfoGain)
    lfoGain.connect(g.gain)
    osc.connect(g)
    g.connect(c.destination)
    osc.start()
    lfo.start()
    ambientNodes.push({ osc, gain: g })
  }
}

/** Short auditory cues for Living Page actions. */
export function playAction(action: SoundAction) {
  if (!enabled && action !== 'enable') return
  const c = getCtx()
  if (!c) return
  void c.resume()

  switch (action) {
    case 'enable':
      tone(523.25, 0.12, 'triangle', 0.05)
      tone(659.25, 0.15, 'triangle', 0.04, 0.08)
      break
    case 'disable':
      tone(392, 0.15, 'sine', 0.03)
      break
    case 'equation':
      tone(440, 0.18, 'sine', 0.035)
      tone(554.37, 0.2, 'sine', 0.025, 0.1)
      break
    case 'notebook':
      tone(349.23, 0.1, 'square', 0.02)
      tone(523.25, 0.14, 'square', 0.025, 0.08)
      break
    case 'checkpoint':
      tone(293.66, 0.2, 'triangle', 0.04)
      break
    case 'conflict':
      tone(233.08, 0.12, 'sawtooth', 0.025)
      tone(277.18, 0.12, 'sawtooth', 0.02, 0.1)
      break
    case 'rabbit':
      tone(659.25, 0.08, 'sine', 0.03)
      tone(783.99, 0.1, 'sine', 0.025, 0.07)
      break
    case 'depth':
      tone(196, 0.25, 'sine', 0.04)
      tone(246.94, 0.3, 'sine', 0.03, 0.12)
      break
    case 'dont_understand':
      tone(311.13, 0.15, 'triangle', 0.035)
      break
    case 'share':
      tone(523.25, 0.1, 'triangle', 0.04)
      tone(659.25, 0.1, 'triangle', 0.035, 0.08)
      tone(783.99, 0.14, 'triangle', 0.03, 0.16)
      break
    default:
      break
  }
}
