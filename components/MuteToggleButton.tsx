'use client'

import { Volume2, VolumeX } from 'lucide-react'
import { useAudio } from '@/components/AudioProvider'

/** Small speaker toggle for SiteNav — SiteNav itself stays a server component, this is the one client island inside it. */
export function MuteToggleButton() {
  const { muted, toggleMuted } = useAudio()

  return (
    <button
      type="button"
      onClick={toggleMuted}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      title={muted ? 'Unmute sound' : 'Mute sound'}
      className="flex h-6 w-6 items-center justify-center text-[var(--color-paper-faint)] transition-colors hover:text-[var(--color-brass)]"
    >
      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>
  )
}
