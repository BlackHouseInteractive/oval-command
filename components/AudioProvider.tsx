'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react'

const MUTE_STORAGE_KEY = 'oval-command:audio-muted'
const AMBIENT_VOLUME = 0.35
// ~-6dB in linear amplitude — a tasteful reduction while something worth
// focusing on is on screen, not a mute.
const DUCK_LEVEL = 0.5
const SFX_VOLUME = 0.6
const MUSIC_VOLUME = 0.5
const FADE_MS = 700
const CLICK_SFX_VARIANTS = ['/audio/ui/click-01.mp3', '/audio/ui/click-02.mp3', '/audio/ui/click-03.mp3']

/**
 * Variant pools for sounds frequent enough that a single fixed take would
 * start to read as "the button click sound" rather than a real object.
 * Callers pick a random member via pickVariant() at the moment they play
 * it — kept here rather than baked into playSfx() so call sites stay
 * explicit about which sound they're firing.
 */
export const DECISION_MADE_VARIANTS = ['/audio/stings/decision-made-01.mp3', '/audio/stings/decision-made-02.mp3', '/audio/stings/decision-made-03.mp3']
export const CABINET_EVENT_VARIANTS = ['/audio/foley/cabinet-event-01.mp3', '/audio/foley/cabinet-event-02.mp3', '/audio/foley/cabinet-event-03.mp3']
export const CANCEL_VARIANTS = ['/audio/ui/cancel-01.mp3', '/audio/ui/cancel-02.mp3', '/audio/ui/cancel-03.mp3']

export function pickVariant(paths: readonly string[]): string {
  return paths[Math.floor(Math.random() * paths.length)]
}

interface AudioContextValue {
  muted: boolean
  toggleMuted: () => void
  /** Starts (or crossfades to) a looping ambient track. Pass undefined to fade the current one out with nothing to replace it. */
  playAmbient: (src: string | undefined) => void
  /** Fires a short one-shot sound effect — doesn't interrupt the ambient loop. */
  playSfx: (src: string) => void
  /** Fires a short one-shot music cue — doesn't interrupt the ambient loop. */
  playMusic: (src: string) => void
  /** Ducks the ambient loop ~6dB while something worth attention is on screen (dialogue, a big reveal). Idempotent — safe to call repeatedly. */
  duckAmbient: () => void
  /** Restores the ambient loop to its normal level. Idempotent. */
  unduckAmbient: () => void
}

const noop: AudioContextValue = {
  muted: true,
  toggleMuted: () => {},
  playAmbient: () => {},
  playSfx: () => {},
  playMusic: () => {},
  duckAmbient: () => {},
  unduckAmbient: () => {},
}

const AudioCtx = createContext<AudioContextValue | null>(null)

/** Falls back to a silent no-op outside the provider rather than throwing — a stray usage should never crash a render. */
export function useAudio(): AudioContextValue {
  return useContext(AudioCtx) ?? noop
}

// Tracks the most recent fade() call per element so an older, still-running
// fade can detect it's been superseded and stop writing. Without this, two
// overlapping fades on the same element (e.g. a room-ambience crossfade
// landing at the same instant duckAmbient/unduckAmbient fires) each run
// their own requestAnimationFrame loop against a `from` captured once at
// call time — the two loops fight over el.volume every frame, and the
// resulting value can walk outside [0, 1] entirely, which is exactly what
// threw "The volume provided (-0.001236) is outside the range [0, 1]".
const fadeTokens = new WeakMap<HTMLAudioElement, number>()

function fade(el: HTMLAudioElement, to: number, ms: number) {
  const token = (fadeTokens.get(el) ?? 0) + 1
  fadeTokens.set(el, token)
  const from = el.volume
  const start = performance.now()
  function step(now: number) {
    if (fadeTokens.get(el) !== token) return
    const t = Math.min(1, Math.max(0, (now - start) / ms))
    el.volume = Math.min(1, Math.max(0, from + (to - from) * t))
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

/**
 * Global audio engine — one shared looping <audio> element for room
 * ambience (crossfaded on room/era change) plus disposable one-shot
 * elements for SFX/music stings. Missing audio files fail silently
 * (every .play() is caught) since asset coverage will fill in gradually
 * rather than all at once.
 *
 * Browsers block audible autoplay before the user has interacted with the
 * page at all — playAmbient() records whatever track SHOULD be playing in
 * pendingAmbientSrc even if it can't start yet, and a one-time global
 * pointerdown/keydown listener retries it the moment that's allowed.
 */
export function AudioProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const ambientRef = useRef<HTMLAudioElement | null>(null)
  const pendingAmbientSrc = useRef<string | undefined>(undefined)
  const pendingSfxQueue = useRef<string[]>([])
  const unlockedRef = useRef(false)
  const duckedRef = useRef(false)
  const mutedRef = useRef(muted)

  /** The ambient volume the loop should be sitting at right now, given mute + duck state. */
  const ambientTarget = useCallback(() => {
    if (mutedRef.current) return 0
    return duckedRef.current ? AMBIENT_VOLUME * DUCK_LEVEL : AMBIENT_VOLUME
  }, [])
  useEffect(() => {
    mutedRef.current = muted
  }, [muted])

  useEffect(() => {
    // Reads localStorage once on mount to correct the SSR-safe `muted: true`
    // default. Can't be a lazy useState initializer — that would run during
    // the client's first hydration pass and desync from the server-rendered
    // HTML (e.g. MuteToggleButton's icon), which is exactly the mismatch
    // `hydrated` exists to prevent by deferring the real value to post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMuted(window.localStorage.getItem(MUTE_STORAGE_KEY) === 'true')
    setHydrated(true)
  }, [])

  useEffect(() => {
    const el = new Audio()
    el.loop = true
    el.volume = 0
    ambientRef.current = el
    return () => { el.pause() }
  }, [])

  const startAmbient = useCallback((src: string) => {
    const el = ambientRef.current
    if (!el) return
    if (el.src.endsWith(src)) {
      fade(el, ambientTarget(), FADE_MS)
      return
    }
    fade(el, 0, FADE_MS / 2)
    window.setTimeout(() => {
      el.src = src
      el.currentTime = 0
      el.play().catch(() => { /* autoplay still locked, or file missing — ignore */ })
      fade(el, ambientTarget(), FADE_MS)
    }, FADE_MS / 2)
  }, [ambientTarget])

  const tryUnlock = useCallback(() => {
    if (unlockedRef.current) return
    unlockedRef.current = true
    if (pendingAmbientSrc.current) startAmbient(pendingAmbientSrc.current)
    // One-shot SFX fired from mount effects (RoomEntrySound, CrisisCard's
    // breaking-news/crisis-pulse) can land before the player's first
    // interaction — without this queue they'd just be silently dropped,
    // unlike playAmbient which already retries via pendingAmbientSrc.
    const queued = pendingSfxQueue.current
    pendingSfxQueue.current = []
    for (const src of queued) {
      if (mutedRef.current) break
      const el = new Audio(src)
      el.volume = SFX_VOLUME
      el.play().catch(() => {})
    }
  }, [startAmbient])

  useEffect(() => {
    if (!hydrated) return
    window.addEventListener('pointerdown', tryUnlock, { once: true })
    window.addEventListener('keydown', tryUnlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', tryUnlock)
      window.removeEventListener('keydown', tryUnlock)
    }
  }, [hydrated, tryUnlock])

  const playAmbient = useCallback((src: string | undefined) => {
    pendingAmbientSrc.current = src
    if (!src) {
      if (ambientRef.current) fade(ambientRef.current, 0, FADE_MS)
      return
    }
    if (unlockedRef.current) startAmbient(src)
  }, [startAmbient])

  const playSfx = useCallback((src: string) => {
    // Unlock is checked first and queues unconditionally when locked —
    // mutedRef can still hold its SSR-safe `true` default for one tick
    // after mount (the hydration effect that corrects it from localStorage
    // hasn't committed yet), and a mount-effect caller like RoomEntrySound
    // can run in that exact window. Checking mute only at the point of
    // actual playback (here, or in tryUnlock's flush) avoids dropping the
    // sound based on a value that hasn't caught up yet.
    if (!unlockedRef.current) {
      pendingSfxQueue.current.push(src)
      return
    }
    if (mutedRef.current) return
    const el = new Audio(src)
    el.volume = SFX_VOLUME
    el.play().catch(() => {})
  }, [])

  // Delegated rather than wired into every button individually — fires a
  // soft click on any enabled <button> press app-wide. One of a small
  // pool of near-identical takes, picked at random each time — cheap
  // insurance against the ear locking onto "the click sound" after the
  // hundredth press. Deliberately not suppressed on buttons that also
  // trigger a later outcome sting (crisis choices, law proposals): the
  // click is immediate press feedback, the sting is a delayed result
  // cue, and the two read as separate events.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const button = (e.target as HTMLElement).closest('button')
      if (button && !button.disabled) playSfx(pickVariant(CLICK_SFX_VARIANTS))
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [playSfx])

  const playMusic = useCallback((src: string) => {
    if (mutedRef.current || !unlockedRef.current) return
    const el = new Audio(src)
    el.volume = MUSIC_VOLUME
    el.play().catch(() => {})
  }, [])

  const duckAmbient = useCallback(() => {
    duckedRef.current = true
    const el = ambientRef.current
    if (el) fade(el, ambientTarget(), FADE_MS / 2)
  }, [ambientTarget])

  const unduckAmbient = useCallback(() => {
    duckedRef.current = false
    const el = ambientRef.current
    if (el) fade(el, ambientTarget(), FADE_MS / 2)
  }, [ambientTarget])

  const toggleMuted = useCallback(() => {
    setMuted(prev => {
      const next = !prev
      window.localStorage.setItem(MUTE_STORAGE_KEY, String(next))
      mutedRef.current = next
      const el = ambientRef.current
      if (el) {
        if (next) fade(el, 0, FADE_MS)
        else if (pendingAmbientSrc.current) {
          if (unlockedRef.current) startAmbient(pendingAmbientSrc.current)
          fade(el, ambientTarget(), FADE_MS)
        }
      }
      return next
    })
  }, [startAmbient, ambientTarget])

  return (
    <AudioCtx.Provider value={{ muted, toggleMuted, playAmbient, playSfx, playMusic, duckAmbient, unduckAmbient }}>
      {children}
    </AudioCtx.Provider>
  )
}
