'use client'

import { useRouter } from 'next/navigation'
import type { Game } from '@/types/game'
import { getLegislativeOpportunity } from '@/lib/law-engine'

interface LegislativeAlertProps {
  game: Game
}

export function LegislativeAlert({ game }: LegislativeAlertProps) {
  const router = useRouter()

  const opportunity = getLegislativeOpportunity(game)
  if (!opportunity) return null
  const { suggested, message } = opportunity

  return (
    <div className="rounded-sm border border-[var(--color-brass)]/30 bg-[var(--color-brass)]/5 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-brass)]">
            Legislative Opportunity
          </div>
          <p className="mt-1 text-sm text-[var(--color-paper-dim)]">
            {message} {suggested ? `Consider pushing the ${suggested.shortTitle}.` : 'Now is the time to move legislation.'}
          </p>
        </div>
        <button
          onClick={() => router.push(
            `/game/${game.id}/congress${suggested ? `?highlight=${suggested.id}` : ''}`
          )}
          className="flex-shrink-0 rounded-sm border border-[var(--color-brass)]/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--color-brass)] hover:bg-[var(--color-brass)]/10 transition-colors"
        >
          Draft Legislation
        </button>
      </div>
    </div>
  )
}
