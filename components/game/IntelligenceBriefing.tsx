import { hashSeed } from '@/lib/utils'
import type { CrisisEvent, EventCategory } from '@/types/game'

// Categories where showing an "intelligence assessment" makes narrative
// sense — deliberately not every category (an economy briefing doesn't
// come from a classified source).
const ELIGIBLE_CATEGORIES: EventCategory[] = ['security', 'military', 'diplomacy']

const CATEGORY_COLOR: Partial<Record<EventCategory, string>> = {
  security: 'var(--color-cat-security)',
  military: 'var(--color-cat-military)',
  diplomacy: 'var(--color-cat-diplomacy)',
}

function assessmentCopy(confidence: number): string {
  if (confidence >= 75) return 'Multiple independent sources corroborate this assessment.'
  if (confidence >= 50) return 'Assessment is based on partial and circumstantial evidence.'
  return 'This is our best current read, but sourcing is thin — treat with caution.'
}

export function IntelligenceBriefing({ gameId, event }: { gameId: string; event: CrisisEvent }) {
  if (!ELIGIBLE_CATEGORIES.includes(event.category)) return null

  // Stable per (game, event) — the same pending briefing always shows the
  // same confidence, it doesn't re-roll on every reload.
  const confidence = 35 + (hashSeed(gameId, event.id) % 61)
  const color = CATEGORY_COLOR[event.category]

  return (
    <div
      className="mt-3 flex items-start gap-2 rounded-sm border px-3 py-2"
      style={{ borderColor: `color-mix(in srgb, ${color} 40%, transparent)`, backgroundColor: `color-mix(in srgb, ${color} 6%, transparent)` }}
    >
      <span
        className="mt-0.5 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.08em]"
        style={{ color }}
      >
        Intelligence Assessment
      </span>
      <p className="text-[12px] leading-snug text-[var(--color-paper-dim)]">
        <span className="font-mono tabular-nums" style={{ color }}>{confidence}% confidence.</span>{' '}
        {assessmentCopy(confidence)}
      </p>
    </div>
  )
}
