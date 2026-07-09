import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dbToGame, dbToGameLog } from '@/lib/db-helpers'
import { computeLegacyScore } from '@/lib/game-engine'
import { computePresidentialArchetype } from '@/lib/archetype-engine'
import { hasEntitlement } from '@/lib/entitlements'
import { SiteNav } from '@/components/SiteNav'
import { CompareApprovalChart } from '@/components/CompareApprovalChart'
import { cn } from '@/lib/utils'
import type { GameLog } from '@/types/game'

interface PageProps {
  searchParams: Promise<{ ids?: string }>
}

const LINE_COLORS = ['var(--color-brass)', 'var(--color-good)', 'var(--color-bad)', 'var(--color-cat-scandal)']

export default async function ComparePresidenciesPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  if (!(await hasEntitlement(session.user.id, 'feature.chronicles'))) {
    redirect('/presidencies')
  }

  const { ids: idsParam } = await searchParams
  const requestedIds = (idsParam ?? '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 4)

  // Scoped strictly to the requesting user's OWN games — a crafted id
  // belonging to another account is silently excluded by this WHERE
  // clause, same "never trust client ids" posture as everywhere else.
  const rows = requestedIds.length > 0
    ? await prisma.game.findMany({
        where: { id: { in: requestedIds }, userId: session.user.id },
        include: { logs: { orderBy: { month: 'asc' } } },
      })
    : []

  const entries = rows.map(row => {
    const game = dbToGame(row)
    const logs: GameLog[] = row.logs.map(dbToGameLog)
    const legacy = computeLegacyScore(game)
    const archetype = computePresidentialArchetype(game, logs)
    return { game, legacy, archetype }
  })
  // Preserve the order the user selected them in, not the DB's return order.
  entries.sort((a, b) => requestedIds.indexOf(a.game.id) - requestedIds.indexOf(b.game.id))

  const maxMonths = Math.max(0, ...entries.map(e => e.game.approvalHistory.length))
  const chartData = Array.from({ length: maxMonths }, (_, month) => {
    const point: Record<string, number | undefined> = { month }
    entries.forEach(e => { point[e.game.presidentName] = e.game.approvalHistory[month] })
    return point
  })

  const statRows: { label: string; value: (e: (typeof entries)[number]) => string }[] = [
    { label: 'Legacy Score', value: e => String(e.legacy.total) },
    { label: 'Archetype', value: e => e.archetype.title },
    { label: 'Laws Passed', value: e => String(e.game.passedLaws.length) },
    { label: 'Approval Peak', value: e => `${Math.round(Math.max(...e.game.approvalHistory))}%` },
    { label: 'Party', value: e => e.game.party },
    { label: 'Presidency', value: e => e.game.campaignEra === 'modern' ? 'The Modern Presidency' : e.game.campaignEra.replace(/_/g, ' ') },
  ]

  return (
    <>
      <SiteNav userName={session.user.name} userImage={session.user.image} />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/presidencies"
          className="font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-paper-faint)] hover:text-[var(--color-brass)]"
        >
          ← Back to National Archives
        </Link>

        <div className="mt-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-brass)]">
            Chronicles
          </div>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-paper)]">
            Compare Presidencies
          </h1>
        </div>

        {entries.length < 2 ? (
          <div className="mt-8 rounded-sm border border-dashed border-[var(--color-border-strong)] px-6 py-12 text-center">
            <p className="text-sm text-[var(--color-paper-dim)]">
              Select at least two of your completed presidencies from the National Archives to compare them here.
            </p>
            <Link
              href="/presidencies"
              className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-brass)] hover:underline"
            >
              Back to National Archives
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 backdrop-blur-sm">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-paper-faint)]">
                Approval Over Time
              </span>
              <div className="mt-2">
                <CompareApprovalChart
                  chartData={chartData}
                  seriesNames={entries.map(e => e.game.presidentName)}
                  colors={LINE_COLORS}
                />
              </div>
            </div>

            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-[var(--color-border-strong)] px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-paper-faint)]">
                      &nbsp;
                    </th>
                    {entries.map(e => (
                      <th
                        key={e.game.id}
                        className="border-b border-[var(--color-border-strong)] px-3 py-2 text-left font-medium text-[var(--color-paper)]"
                      >
                        President {e.game.presidentName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statRows.map((stat, ri) => (
                    <tr key={stat.label} className={cn(ri % 2 === 1 && 'bg-[var(--color-surface)]')}>
                      <td className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-paper-faint)]">
                        {stat.label}
                      </td>
                      {entries.map(e => (
                        <td key={e.game.id} className="px-3 py-2 text-[var(--color-paper-dim)]">
                          {stat.value(e)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </>
  )
}
