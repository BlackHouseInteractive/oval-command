'use client'

import { useEffect } from 'react'
import { useAudio } from '@/components/AudioProvider'

/**
 * Renders nothing — just tells the shared AudioProvider which ambient loop
 * should be playing for whatever room is currently mounted. Rendered
 * alongside RoomBackground at every room call site (same `src` input
 * shape as that component's `image` prop, just resolved through
 * lib/room-audio.ts instead of lib/event-backgrounds.ts).
 */
export function RoomAmbience({ src }: { src: string | undefined }) {
  const { playAmbient } = useAudio()

  useEffect(() => {
    // Deliberately no cleanup fade-to-silence here — navigating from one
    // room to another mounts the next RoomAmbience before this one
    // unmounts in most transitions, and playAmbient() itself crossfades
    // between tracks. A stop-on-unmount here would just cause an
    // audible blip right before the new room's effect fires.
    playAmbient(src)
  }, [src, playAmbient])

  return null
}
