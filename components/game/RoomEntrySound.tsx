'use client'

import { useEffect } from 'react'
import { useAudio } from '@/components/AudioProvider'

/**
 * Renders nothing — fires a one-shot SFX exactly once when mounted. For
 * server-component room pages that need a "you've just walked in" cue
 * (e.g. the Cabinet Room's chair/coffee foley) without becoming a client
 * component themselves, same pattern as RoomAmbience but one-shot instead
 * of looping.
 */
export function RoomEntrySound({ src }: { src: string }) {
  const { playSfx } = useAudio()

  useEffect(() => {
    playSfx(src)
    // Deliberately mount-only — src is static per call site, and re-firing
    // on every re-render (e.g. after a server refresh) would replay the
    // cue every time the page's data changes, not just on room entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
