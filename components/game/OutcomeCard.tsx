import { cn, formatDelta, isDeltaGood, getStatLabel } from '@/lib/utils'
import { getStatMagnitude } from '@/lib/outcome-magnitude'
import { NpcReactionList } from '@/components/game/NpcReactionList'
import type { StatDelta, NpcReactionResult, GameStats } from '@/types/game'

interface OutcomeCardProps {
  narrative: string
  effects: StatDelta
  npcReactions: NpcReactionResult[]
  onContinue: () => void
  nextMonth: number
  isGameOver: boolean
}

export function OutcomeCard({
  narrative,
  effects,
  npcReactions,
  onContinue,
  nextMonth,
  isGameOver,
}: OutcomeCardProps) {
  const entries = Object.entries(effects).filter(([, v]) => v !== 0) as [keyof GameStats, number][]

  return (
    <div className="rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] backdrop-blur-sm">
      <div className="brief-rule" />
      <div className="p-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-brass)]">
          Outcome
        </span>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-paper-dim)]">
          {narrative}
        </p>

        {entries.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {entries.map(([key, value]) => {
              const good = isDeltaGood(key, value)
              // Routine swings stay as quiet pills; a genuinely big mover
              // (see lib/outcome-magnitude.ts) earns a bigger, bolder one
              // instead — the same visual weight a real headline number
              // would get, rather than every stat reading as equally
              // important regardless of size.
              const magnitude = getStatMagnitude(key, value)
              return (
                <span
                  key={key}
                  className={cn(
                    'rounded-full font-mono font-medium',
                    magnitude === 'major'
                      ? 'px-3.5 py-1.5 text-[15px]'
                      : magnitude === 'notable'
                        ? 'px-3 py-1 text-[12px]'
                        : 'px-2.5 py-0.5 text-[11px]',
                    good
                      ? 'bg-[var(--color-good-dim)] text-[var(--color-good)]'
                      : 'bg-[var(--color-bad-dim)] text-[var(--color-bad)]',
                    magnitude === 'major' && (good ? 'ring-1 ring-[var(--color-good)]/50' : 'ring-1 ring-[var(--color-bad)]/50')
                  )}
                >
                  {getStatLabel(key)} {formatDelta(key, value)}
                </span>
              )
            })}
          </div>
        )}

        <NpcReactionList reactions={npcReactions} />

        <button
          onClick={onContinue}
          className="mt-6 w-full rounded-sm border border-[var(--color-brass-dim)] bg-[var(--color-brass)] py-3 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-90"
        >
          {isGameOver ? 'View Final Report' : `Continue to Month ${nextMonth} →`}
        </button>
      </div>
    </div>
  )
}
