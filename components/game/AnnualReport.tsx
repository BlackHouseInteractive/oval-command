'use client'

import { useEffect, useState } from 'react'
import { cn, formatDelta, isDeltaGood } from '@/lib/utils'
import type { YearInReview } from '@/lib/year-in-review'

interface AnnualReportProps {
  gameId: string
  review: YearInReview
}

/**
 * Dismissible full-page overlay shown once per year boundary — same
 * localStorage-gated-interstitial pattern as DailyBrief.tsx (key
 * `lastSeenYear:{gameId}`), but content-heavy enough that it waits for an
 * explicit dismissal rather than auto-hiding on a timer.
 */
export function AnnualReport({ gameId, review }: AnnualReportProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const key = `lastSeenYear:${gameId}`
    const lastSeen = Number(localStorage.getItem(key) ?? '0')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (lastSeen >= review.year || reducedMotion) {
      localStorage.setItem(key, String(review.year))
      return
    }

    localStorage.setItem(key, String(review.year))

    // Deferred rather than a direct synchronous setState in the effect
    // body — avoids cascading renders during the commit phase (same fix
    // as DailyBrief.tsx).
    const showTimer = setTimeout(() => setVisible(true), 0)
    return () => clearTimeout(showTimer)
  }, [gameId, review.year])

  if (!visible) return null

  const approvalDelta = review.approvalEnd - review.approvalStart
  const economyDelta = review.economyEnd - review.economyStart

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--color-ink)]/95 px-4 py-10 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-md rounded-sm border border-[var(--color-brass-dim)] bg-[var(--color-surface)] px-6 py-8">
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-brass)]">
            Annual State of the Union
          </div>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-paper)]">
            Year {review.year}
          </h2>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--color-paper-faint)]">
              Approval
            </div>
            <div className="mt-1 text-base font-semibold text-[var(--color-paper)]">
              {review.approvalStart}% → {review.approvalEnd}%
            </div>
            <div className={cn('mt-0.5 font-mono text-[11px]', approvalDelta === 0 ? 'text-[var(--color-paper-faint)]' : isDeltaGood('approval', approvalDelta) ? 'text-[var(--color-good)]' : 'text-[var(--color-bad)]')}>
              {formatDelta('approval', approvalDelta)}
            </div>
          </div>
          <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--color-paper-faint)]">
              Economy
            </div>
            <div className="mt-1 text-base font-semibold text-[var(--color-paper)]">
              {review.economyStart} → {review.economyEnd}
            </div>
            <div className={cn('mt-0.5 font-mono text-[11px]', economyDelta === 0 ? 'text-[var(--color-paper-faint)]' : isDeltaGood('economy', economyDelta) ? 'text-[var(--color-good)]' : 'text-[var(--color-bad)]')}>
              {formatDelta('economy', economyDelta)}
            </div>
          </div>
        </div>

        {review.biggestSuccess && (
          <div className="mt-5 rounded-sm border border-[var(--color-good-dim)] bg-[var(--color-surface-2)] px-4 py-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-good)]">
              Highlight of the Year
            </div>
            <p className="mt-1 text-sm text-[var(--color-paper)]">{review.biggestSuccess.title}</p>
          </div>
        )}
        {review.biggestFailure && (
          <div className="mt-3 rounded-sm border border-[var(--color-bad-dim)] bg-[var(--color-surface-2)] px-4 py-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-bad)]">
              Lowlight of the Year
            </div>
            <p className="mt-1 text-sm text-[var(--color-paper)]">{review.biggestFailure.title}</p>
          </div>
        )}

        {review.advisor && (
          <div className="mt-5 border-l-2 border-[var(--color-brass-dim)] pl-3">
            <p className="text-sm italic leading-snug text-[var(--color-paper-dim)]">“{review.advisor.quote}”</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-paper-faint)]">
              — {review.advisor.npcShortName}
            </p>
          </div>
        )}

        <div className="mt-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-paper-faint)]">
            The Year Ahead
          </div>
          <ul className="mt-2 space-y-1.5">
            {review.yearAhead.map(bullet => (
              <li key={bullet} className="text-[13px] text-[var(--color-paper-dim)]">· {bullet}</li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => setVisible(false)}
          className="mt-7 w-full rounded-sm border border-[var(--color-brass-dim)] bg-[var(--color-brass)] py-2.5 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-90"
        >
          Continue to Year {review.year + 1}
        </button>
      </div>
    </div>
  )
}
