'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PresidencyCard } from '@/components/PresidencyCard'
import { PurchaseButton } from '@/components/PurchaseButton'
import { useAudio, pickVariant, CANCEL_VARIANTS } from '@/components/AudioProvider'
import { Lock } from 'lucide-react'
import type { Game, GameOverReason, LegacyScore } from '@/types/game'
import type { PresidentialArchetype } from '@/lib/archetype-engine'

interface PresidencyEntry {
  game: Game
  legacy: LegacyScore
  reason: GameOverReason
  archetype: PresidentialArchetype
}

interface PresidencyListClientProps {
  entries: PresidencyEntry[]
  topPercents: number[]
  chroniclesLocked: boolean
  chroniclesProduct?: { productId: string; priceCents: number; displayName: string }
}

const MAX_COMPARE = 4

/** Client wrapper around the presidency list — adds the Chronicles "Compare Presidencies" entry point (a compare-mode toggle with checkboxes) on top of the otherwise-static PresidencyCard list. */
export function PresidencyListClient({ entries, topPercents, chroniclesLocked, chroniclesProduct }: PresidencyListClientProps) {
  const router = useRouter()
  const { playSfx } = useAudio()
  const [compareMode, setCompareMode] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  function toggleCompare(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < MAX_COMPARE ? [...prev, id] : prev
    )
  }

  function handleStartCompare() {
    setCompareMode(true)
    setSelected([])
  }

  function handleCancelCompare() {
    playSfx(pickVariant(CANCEL_VARIANTS))
    setCompareMode(false)
    setSelected([])
  }

  function handleGoCompare() {
    router.push(`/archive/compare?ids=${selected.join(',')}`)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        {chroniclesLocked ? (
          <div className="flex w-full items-center justify-between gap-3 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 opacity-70">
            <div className="flex items-center gap-1.5">
              <Lock className="h-3 w-3 flex-shrink-0 text-[var(--color-paper-faint)]" />
              <span className="text-xs text-[var(--color-paper-faint)]">Compare presidencies side by side — requires Chronicles</span>
            </div>
            {chroniclesProduct && (
              <PurchaseButton
                productId={chroniclesProduct.productId}
                label={`Unlock — $${(chroniclesProduct.priceCents / 100).toFixed(2)}`}
              />
            )}
          </div>
        ) : compareMode ? (
          <div className="flex w-full items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-paper-faint)]">
              {selected.length === 0
                ? `Select 2–${MAX_COMPARE} presidencies to compare`
                : `${selected.length} selected`}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelCompare}
                className="rounded-sm border border-[var(--color-border-strong)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-paper)] hover:border-[var(--color-brass-dim)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGoCompare}
                disabled={selected.length < 2}
                className="rounded-sm border border-[var(--color-brass-dim)] bg-[var(--color-brass)] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--color-ink)] transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Compare {selected.length > 0 ? `(${selected.length})` : ''}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStartCompare}
            className="ml-auto rounded-sm border border-[var(--color-border-strong)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-paper)] hover:border-[var(--color-brass-dim)]"
          >
            Compare Presidencies
          </button>
        )}
      </div>

      <div className="space-y-3">
        {entries.map((p, i) => (
          <PresidencyCard
            key={p.game.id}
            rank={i + 1}
            game={p.game}
            legacy={p.legacy}
            reason={p.reason}
            archetype={p.archetype}
            topPercent={topPercents[i]}
            compareMode={compareMode}
            compareSelected={selected.includes(p.game.id)}
            onToggleCompare={() => toggleCompare(p.game.id)}
          />
        ))}
      </div>
    </div>
  )
}
