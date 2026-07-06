import { cn, formatDelta, isDeltaGood, getStatLabel } from '@/lib/utils'
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
          <div className="mt-4 flex flex-wrap gap-2">
            {entries.map(([key, value]) => {
              const good = isDeltaGood(key, value)
              return (
                <span
                  key={key}
                  className={cn(
                    'rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium',
                    good
                      ? 'bg-[var(--color-good-dim)] text-[var(--color-good)]'
                      : 'bg-[var(--color-bad-dim)] text-[var(--color-bad)]'
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
