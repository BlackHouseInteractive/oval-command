import { PartyIcon } from '@/components/game/PartyIcon'
import type { Game } from '@/types/game'
import type { PresidentialArchetype } from '@/lib/archetype-engine'

interface LeaderboardRowProps {
  rank: number
  game: Game
  legacyTotal: number
  archetype: PresidentialArchetype
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export function LeaderboardRow({ rank, game, legacyTotal, archetype }: LeaderboardRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 backdrop-blur-sm">
      <span className="w-7 flex-shrink-0 text-center font-mono text-sm text-[var(--color-paper-faint)]">
        {MEDAL[rank] ?? `#${rank}`}
      </span>
      <PartyIcon party={game.party} size={18} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-paper)]">
          <span className="truncate">President {game.presidentName}</span>
          {game.difficulty && game.difficulty !== 'normal' && (
            <span className="flex-shrink-0 font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--color-paper-faint)]">
              · {game.difficulty}
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-xs italic text-[var(--color-paper-faint)]">
          {archetype.icon} {archetype.title}
        </div>
      </div>
      <div className="flex-shrink-0 font-mono text-xl font-semibold tabular-nums text-[var(--color-brass)]">
        {legacyTotal}
      </div>
    </div>
  )
}
