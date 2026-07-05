'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'oval-command:onboarding-seen'

const TIPS = [
  'Your Approval Gauge shows how the country feels about you, right now.',
  'Each month, choose ONE presidential action — the tag on each card tells you how urgent or optional it is.',
  'The bottom bar is free to browse. Visiting a room never costs you a turn — only the action you choose does.',
]

/**
 * Shown once, ever, per browser — not gated per-game like DailyBrief,
 * since this is a "welcome to the game" moment rather than a monthly
 * ritual. Three short lines instead of a guided multi-step tour: the
 * game has real systemic depth (13 stats, cascades, NPC relationships),
 * but a first-time player only needs enough to survive their first
 * few turns, not a full manual up front.
 */
export function OnboardingWelcome() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return
    // Deferred rather than a direct synchronous setState in the effect
    // body — avoids cascading renders during the commit phase.
    const timer = setTimeout(() => setVisible(true), 0)
    return () => clearTimeout(timer)
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="rounded-sm border border-[var(--color-brass)]/40 bg-[var(--color-surface)] px-4 py-3.5 backdrop-blur-sm">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-brass)]">
        New Administration
      </div>
      <ul className="mt-2 space-y-1.5">
        {TIPS.map(tip => (
          <li key={tip} className="flex gap-2 text-sm leading-snug text-[var(--color-paper-dim)]">
            <span className="text-[var(--color-brass)]">·</span>
            {tip}
          </li>
        ))}
      </ul>
      <button
        onClick={dismiss}
        className="mt-3 w-full rounded-sm border border-[var(--color-brass-dim)] bg-[var(--color-brass)] py-2 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-90"
      >
        Got It
      </button>
    </div>
  )
}
