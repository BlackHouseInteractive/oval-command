'use client'

import { useState } from 'react'

const MESSAGES = [
  'Awaiting word from the Cabinet…',
  'The staff is drafting a response…',
  'Word is reaching the West Wing…',
]

/**
 * Fills the beat between choosing and finding out — a deliberate pause
 * (see GameClient's handleChoice) rather than an instant reveal, so the
 * outcome lands as news instead of a stat update snapping into place. No
 * sound of its own: the pause itself is the effect, and the reveal cue
 * that follows it should be the first thing heard.
 */
export function ProcessingCard() {
  const [message] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)])
  return (
    <div className="flex items-center justify-center gap-3 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-8 backdrop-blur-sm">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brass)] opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-brass)]" />
      </span>
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-paper-faint)]">
        {message}
      </p>
    </div>
  )
}
