'use client'

import Image from 'next/image'
import { Lock } from 'lucide-react'
import { cn, getStatLabel, AVATAR_COLORS } from '@/lib/utils'
import { getCandidatesForSlot } from '@/lib/cabinet'
import { getProductForContentId } from '@/lib/content-catalog'
import { PurchaseButton } from '@/components/PurchaseButton'
import type { SelectableSlotId, StatDelta } from '@/types/game'

const SLOT_LABELS: Record<SelectableSlotId, string> = {
  vice_president:      'Vice President',
  chief_of_staff:       'Chief of Staff',
  sec_defense:          'Secretary of Defense',
  treasury_secretary:   'Secretary of the Treasury',
  attorney_general:     'Attorney General',
}

function BonusChips({ bonus }: { bonus?: StatDelta }) {
  if (!bonus) return null
  const entries = Object.entries(bonus).filter(([, v]) => v !== undefined && v !== 0) as [keyof StatDelta, number][]
  if (entries.length === 0) return null

  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className={cn(
            'rounded-sm border px-2 py-0.5 font-mono text-[10px] tabular-nums',
            (value as number) > 0
              ? 'border-[var(--color-good)]/40 text-[var(--color-good)]'
              : 'border-[var(--color-bad)]/40 text-[var(--color-bad)]'
          )}
        >
          {(value as number) > 0 ? '+' : ''}{value} {getStatLabel(key as keyof import('@/types/game').GameStats)}
        </span>
      ))}
    </div>
  )
}

interface CabinetSlotPickerProps {
  slotId:               SelectableSlotId
  selectedCandidateId?: string
  onSelect:             (candidateId: string) => void
  /** Omit one candidate from the list — used when replacing a sitting official, so they can't "replace" themselves. */
  excludeCandidateId?:  string
  /** This user's owned content ids — a Cabinet Pack candidate whose contentId isn't in here renders locked (visible, dimmed, with an "Unlock" CTA) rather than being hidden. */
  ownedContent:         string[]
}

/**
 * "Folders slide across your desk" — one appointable position at a time,
 * each candidate shown as a dossier: archetype/description, personal goal,
 * breaking point, one interview line (their own monthlyDialogue.high[0],
 * reused rather than authoring a separate quote), and their starting stat
 * bonus. Deliberately no numeric trait bars here — traits stay hidden
 * during play (see lib/cabinet-traits.ts); only the player-visible goal/
 * breakingPoint fields and this descriptive text differentiate candidates.
 *
 * Locked (unowned Cabinet Pack) candidates are shown, not hidden — the
 * point of comparison against the free candidates is the natural point of
 * sale. Fetches the full 'all' roster rather than filtering by ownership,
 * since locked candidates still need to render.
 */
export function CabinetSlotPicker({ slotId, selectedCandidateId, onSelect, excludeCandidateId, ownedContent }: CabinetSlotPickerProps) {
  const ownedSet = new Set(ownedContent)
  const candidates = getCandidatesForSlot(slotId, 'all').filter(c => c.candidateId !== excludeCandidateId)

  return (
    <div className="space-y-3">
      <div className="text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-brass)]">
          Assembling Your Administration
        </div>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-paper)]">
          {SLOT_LABELS[slotId]}
        </h2>
      </div>

      <div className="space-y-3">
        {candidates.map(candidate => {
          const selected = candidate.candidateId === selectedCandidateId
          const interviewLine = candidate.monthlyDialogue.high[0]
          const locked = candidate.contentId !== undefined && !ownedSet.has(candidate.contentId)
          const product = locked ? getProductForContentId(candidate.contentId!) : undefined

          const dossier = (
            <>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {candidate.image ? (
                    <Image
                      src={candidate.image}
                      alt={candidate.shortName}
                      width={56}
                      height={56}
                      className={cn('h-14 w-14 rounded-sm object-cover', locked && 'grayscale')}
                    />
                  ) : (
                    <div
                      className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-sm font-mono text-sm font-medium',
                        AVATAR_COLORS[candidate.avatarColor] ?? AVATAR_COLORS.gray,
                        locked && 'grayscale'
                      )}
                    >
                      {candidate.avatar}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-paper)]">
                      {candidate.name}
                      {locked && <Lock className="h-3 w-3 flex-shrink-0 text-[var(--color-paper-faint)]" />}
                    </span>
                    {selected && !locked && (
                      <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-brass)]">Selected</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[13px] italic text-[var(--color-paper-dim)]">{candidate.personality.archetype}</p>
                </div>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-paper-dim)]">{candidate.personality.description}</p>

              <p className="mt-2.5 text-[12px] text-[var(--color-paper-faint)]">
                <span className="font-mono uppercase tracking-[0.05em]">Wants:</span> {candidate.goal}
              </p>
              <p className="mt-1 text-[12px] text-[var(--color-paper-faint)]">
                <span className="font-mono uppercase tracking-[0.05em]">Won&rsquo;t:</span> {candidate.breakingPoint}
              </p>

              <p className="mt-2.5 border-l-2 border-[var(--color-border)] pl-2.5 text-[13px] italic leading-snug text-[var(--color-paper-dim)]">
                &ldquo;{interviewLine}&rdquo;
              </p>

              <BonusChips bonus={candidate.startingBonus} />
            </>
          )

          // Locked candidates render as a non-interactive dossier (the
          // point of comparison against free candidates IS the point of
          // sale) with a PurchaseButton — never nested inside the
          // selectable <button>, which the unlocked branch below is.
          if (locked) {
            return (
              <div
                key={candidate.candidateId}
                className="w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-left opacity-60"
              >
                {dossier}
                {product && (
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-paper-faint)]">
                      {product.description}
                    </span>
                    <PurchaseButton
                      productId={product.productId}
                      label={`Unlock — $${(product.priceCents / 100).toFixed(2)}`}
                    />
                  </div>
                )}
              </div>
            )
          }

          return (
            <button
              key={candidate.candidateId}
              type="button"
              onClick={() => onSelect(candidate.candidateId)}
              className={cn(
                'w-full rounded-sm border px-4 py-3.5 text-left transition-colors',
                selected
                  ? 'border-[var(--color-brass)] bg-[var(--color-surface-2)]'
                  : 'border-[var(--color-border-strong)] bg-[var(--color-surface)] hover:border-[var(--color-brass-dim)]'
              )}
            >
              {dossier}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { SLOT_LABELS }
