import Image from 'next/image'
import Link from 'next/link'
import { cn, AVATAR_COLORS } from '@/lib/utils'
import { relationshipTone } from '@/components/game/CabinetCard'
import type { AdvisorSeverity } from '@/lib/advisor-engine'
import type { Npc } from '@/types/game'

const SEVERITY_ACCENT: Record<AdvisorSeverity, string> = {
  critical: 'var(--color-bad)',
  warning: 'var(--color-warn)',
  opportunity: 'var(--color-good)',
}

const PIP_COUNT = 8

interface AdvisorSpotlightProps {
  gameId: string
  npc?: Npc
  npcName: string
  quote: string
  severity: AdvisorSeverity
  relationship?: number
}

/**
 * A fuller replacement for the old quote-only advisor preview — portrait,
 * role, quote, and a relationship-tier readout (same tone logic CabinetCard
 * uses, via the exported relationshipTone, so "Strong ally" here always
 * means the same thing it means in the Cabinet Room). Still links to the
 * Cabinet Room rather than duplicating any of its actions — this is a
 * preview of one relationship, not a second place to manage it.
 */
export function AdvisorSpotlight({ gameId, npc, npcName, quote, severity, relationship }: AdvisorSpotlightProps) {
  const accent = SEVERITY_ACCENT[severity] ?? 'var(--color-brass)'
  const tone = npc && relationship !== undefined
    ? relationshipTone(relationship, npc.relationship.min, npc.relationship.max)
    : null
  const filledPips = tone && npc && relationship !== undefined
    ? Math.round(PIP_COUNT * (relationship - npc.relationship.min) / (npc.relationship.max - npc.relationship.min))
    : 0

  return (
    <Link
      href={`/game/${gameId}/cabinet`}
      className="block overflow-hidden rounded-sm border-x border-b bg-[var(--color-surface)] backdrop-blur-sm transition-colors hover:border-[var(--color-brass-dim)]"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div style={{ height: 3, background: accent }} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          {npc?.image ? (
            <Image
              src={npc.image}
              alt={npc.shortName}
              width={56}
              height={56}
              className="h-14 w-14 flex-shrink-0 rounded-sm object-cover"
            />
          ) : (
            <div className={cn('flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-sm font-mono text-sm font-medium', AVATAR_COLORS[npc?.avatarColor ?? 'gray'])}>
              {npcName.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-[var(--color-paper)]">{npcName}</div>
            {npc?.role && <p className="text-xs text-[var(--color-paper-faint)]">{npc.role}</p>}
          </div>
        </div>

        <p className="mt-3 text-sm italic leading-snug text-[var(--color-paper-dim)]">
          &ldquo;{quote}&rdquo;
        </p>

        {tone && (
          <>
            <div className="mt-3 flex items-center justify-between">
              <span className={cn('font-mono text-[11px] font-medium uppercase tracking-[0.04em]', tone.color)}>
                {tone.label}
              </span>
            </div>
            <div className="mt-1.5 flex gap-1">
              {Array.from({ length: PIP_COUNT }).map((_, i) => (
                <span
                  key={i}
                  className={cn('h-1.5 flex-1 rounded-full', i < filledPips ? tone.color.replace('text-', 'bg-') : 'bg-[var(--color-border)]')}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Link>
  )
}
