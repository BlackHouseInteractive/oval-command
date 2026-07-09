import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { dbToGame, dbToGameLog } from '@/lib/db-helpers'
import { checkGameOver, computeLegacyScore } from '@/lib/game-engine'
import { computePresidentialArchetype } from '@/lib/archetype-engine'
import { computeSectorBreakdown } from '@/lib/law-sectors'
import { getPresidentialQuote } from '@/lib/presidential-quote'
import { Seal } from '@/components/Seal'
import { monthToDate } from '@/lib/utils'
import type { GameLog } from '@/types/game'

interface PageProps {
  params: Promise<{ slug: string }>
}

/**
 * Public Chronicles page — no auth() gate, deliberately. Reached only via
 * a shareSlug the owner explicitly generated and published (see
 * app/api/game/[id]/share/route.ts), never via the game's real id. Renders
 * a strict subset of app/archive/[id]/page.tsx's content: the in-game
 * president's record only, nothing that reveals the owner's real account
 * (no SiteNav, no links back into authenticated game/achievement routes,
 * no account-level achievement count).
 */
export default async function ChroniclesPage({ params }: PageProps) {
  const { slug } = await params

  const row = await prisma.game.findUnique({ where: { shareSlug: slug } })
  if (!row || !row.isPublic) notFound()

  const game = dbToGame(row)
  const logRows = await prisma.gameLog.findMany({ where: { gameId: row.id }, orderBy: { month: 'asc' } })
  const logs: GameLog[] = logRows.map(dbToGameLog)

  const legacy = computeLegacyScore(game)
  const archetype = computePresidentialArchetype(game, logs)
  const sectorBreakdown = computeSectorBreakdown(game.passedLaws)
  const quote = getPresidentialQuote(archetype)

  const startYear = Number(monthToDate(1).split(' ')[1])
  const endYear = Number(monthToDate(game.currentMonth).split(' ')[1])
  const yearRange = game.status === 'ACTIVE' ? `${startYear}–Present` : `${startYear}–${endYear}`

  const crisesResolved = logs.filter(l => l.actionType === 'CRISIS').length
  const approvalPeak = Math.round(Math.max(...game.approvalHistory))
  const approvalLow  = Math.round(Math.min(...game.approvalHistory))

  // checkGameOver is a pure function of final persisted stats — same
  // reconstruction precedent as app/presidencies/page.tsx.
  const endedReason = game.status === 'ACTIVE' ? null : (checkGameOver(game) ?? 'TERM_COMPLETE')

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-brass)]">
        Oval Command · Chronicles
      </div>

      <div className="mt-6 rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-8 text-center backdrop-blur-sm">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-brass)]">
          Publicly Shared Presidency
        </div>
        <Seal size={40} className="mx-auto mt-4 text-[var(--color-brass)]" />
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-paper)]">
          {archetype.title}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-paper-dim)]">
          President {game.presidentName} · {yearRange}
        </p>
        {endedReason && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-paper-faint)]">
            {endedReason === 'TERM_COMPLETE' ? 'Full Term Completed' : endedReason.replace(/_/g, ' ')}
          </p>
        )}
      </div>

      <div className="mt-8 rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-5 backdrop-blur-sm">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-paper-faint)]">
          Presidential Statistics
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatBox label="Legacy Score" value={String(legacy.total)} />
          <StatBox label="Approval Peak" value={`${approvalPeak}%`} />
          <StatBox label="Approval Low" value={`${approvalLow}%`} />
          <StatBox label="Laws Passed" value={String(game.passedLaws.length)} />
          <StatBox label="Crises Resolved" value={String(crisesResolved)} />
          <StatBox label="Active Conflicts" value={String(game.activeConflicts.length)} />
        </div>
      </div>

      <div className="mt-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-paper-faint)]">
          Legislative Record
        </div>
        <div className="mt-2 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 backdrop-blur-sm">
          <div className="space-y-1.5">
            {sectorBreakdown.map(({ sector, meta, passed, total }) => (
              <div key={sector} className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-paper-dim)]">{meta.label}</span>
                <span className="font-mono tabular-nums text-[var(--color-paper-faint)]">{passed}/{total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="mx-auto max-w-md text-[15px] italic leading-relaxed text-[var(--color-paper-dim)]">
          “{quote}”
        </p>
        <p className="mt-3 font-[family-name:var(--font-signature)] text-2xl text-[var(--color-brass)]">
          Respectfully, President {game.presidentName}
        </p>
      </div>

      <p className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-paper-faint)]">
        Shared from Oval Command
      </p>
    </main>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-3 text-center">
      <div className="font-mono text-lg font-semibold tabular-nums text-[var(--color-paper)]">{value}</div>
      <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--color-paper-faint)]">
        {label}
      </div>
    </div>
  )
}
