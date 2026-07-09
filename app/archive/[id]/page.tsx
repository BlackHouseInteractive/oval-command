import { redirect, notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dbToGame, dbToGameLog, getGameRow } from '@/lib/db-helpers'
import { checkGameOver, computeLegacyScore } from '@/lib/game-engine'
import { computePresidentialArchetype } from '@/lib/archetype-engine'
import { computeSectorBreakdown } from '@/lib/law-sectors'
import { SECRET_FILES } from '@/lib/secret-files'
import { computeSpecialEditionCovers } from '@/lib/magazine-covers'
import { getPresidentialQuote } from '@/lib/presidential-quote'
import { ACHIEVEMENTS } from '@/lib/achievements'
import { Seal } from '@/components/Seal'
import { SiteNav } from '@/components/SiteNav'
import { SecretFileCard } from '@/components/SecretFileCard'
import { MagazineCover } from '@/components/MagazineCover'
import { ChroniclesPanel } from '@/components/ChroniclesPanel'
import { ChroniclesAnalytics } from '@/components/ChroniclesAnalytics'
import { monthToDate } from '@/lib/utils'
import { toUnlockedAchievements } from '@/lib/db-helpers'
import { getOwnedContent } from '@/lib/entitlements'
import { getProductForContentId } from '@/lib/content-catalog'
import type { GameLog } from '@/types/game'

// Fixed ceilings for the Collection Completion breakdown — the max a
// single administration can realistically accumulate: every special-edition
// cover trigger computeSpecialEditionCovers defines, every Secret File, and
// one Annual Report per year of a full 48-month term.
const MAX_MAGAZINE_COVERS = 4
const MAX_ANNUAL_REPORTS  = 4

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ArchivePage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const row = await getGameRow(id)
  if (!row) notFound()
  if (row.userId !== session.user.id) redirect('/dashboard')

  const game = dbToGame(row)
  const logRows = await prisma.gameLog.findMany({ where: { gameId: id }, orderBy: { month: 'asc' } })
  const logs: GameLog[] = logRows.map(dbToGameLog)

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { unlockedAchievements: true } })
  const unlockedAchievements = toUnlockedAchievements(user?.unlockedAchievements)

  const ownedContent = await getOwnedContent(session.user.id)
  const chroniclesLocked = !ownedContent.has('feature.chronicles')
  const chroniclesProduct = getProductForContentId('feature.chronicles')

  const legacy = computeLegacyScore(game)
  const archetype = computePresidentialArchetype(game, logs)
  const sectorBreakdown = computeSectorBreakdown(game.passedLaws)
  const secretFilesUnlocked = SECRET_FILES.filter(f => Boolean(game.flags[f.requiresFlag])).length
  const quote = getPresidentialQuote(archetype)

  // checkGameOver is a pure function of final persisted stats, so re-running
  // it here reliably reconstructs the original ending reason without
  // needing to have persisted it separately.
  const magazineCovers = game.status === 'ACTIVE'
    ? []
    : computeSpecialEditionCovers(game, checkGameOver(game) ?? 'TERM_COMPLETE', legacy)

  const annualReportsAvailable = Math.min(Math.floor(game.currentMonth / 12), MAX_ANNUAL_REPORTS)

  const collectionEntries = [
    { label: 'Magazine Covers', current: magazineCovers.length,       total: MAX_MAGAZINE_COVERS },
    { label: 'Secret Files',    current: secretFilesUnlocked,          total: SECRET_FILES.length },
    { label: 'Annual Reports',  current: annualReportsAvailable,       total: MAX_ANNUAL_REPORTS },
  ]
  const collectionTotal   = collectionEntries.reduce((sum, e) => sum + e.total, 0)
  const collectionCurrent = collectionEntries.reduce((sum, e) => sum + e.current, 0)
  const collectionPercent = collectionTotal > 0 ? Math.round((collectionCurrent / collectionTotal) * 100) : 0

  const crisesResolved = logs.filter(l => l.actionType === 'CRISIS').length
  const approvalPeak = Math.round(Math.max(...game.approvalHistory))
  const approvalLow  = Math.round(Math.min(...game.approvalHistory))

  const startYear = Number(monthToDate(1).split(' ')[1])
  const endYear = Number(monthToDate(game.currentMonth).split(' ')[1])
  const yearRange = game.status === 'ACTIVE' ? `${startYear}–Present` : `${startYear}–${endYear}`

  return (
    <>
      <SiteNav userName={session.user.name} userImage={session.user.image} />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Link
          href={game.status === 'ACTIVE' ? `/game/${game.id}` : '/presidencies'}
          className="font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-paper-faint)] hover:text-[var(--color-brass)]"
        >
          {game.status === 'ACTIVE' ? '← Back to the Oval Office' : '← Back to National Archives'}
        </Link>

        <div className="mt-6 rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-8 text-center backdrop-blur-sm">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-brass)]">
            National Archives · Executive Records
          </div>
          <Seal size={40} className="mx-auto mt-4 text-[var(--color-brass)]" />
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-paper)]">
            {archetype.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-paper-dim)]">
            President {game.presidentName} · {yearRange}
          </p>
          <p className="mx-auto mt-4 max-w-md text-[13px] italic leading-relaxed text-[var(--color-paper-faint)]">
            This archive preserves the official record of the {game.presidentName} Administration ({yearRange}).
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <ArchiveShelf title="Artifacts">
            {magazineCovers.length > 0 ? (
              <ShelfCount label="Magazine Covers" current={magazineCovers.length} />
            ) : (
              <ShelfPlaceholder label="Magazine Covers" />
            )}
            <ShelfCount label="Secret Files" current={secretFilesUnlocked} total={SECRET_FILES.length} />
          </ArchiveShelf>

          <ArchiveShelf title="Government">
            <ShelfLink href={`/game/${game.id}/history`} label="Presidential Journal" />
            <ShelfCount label="Annual Reports" current={annualReportsAvailable} total={MAX_ANNUAL_REPORTS} />
            <ShelfSectorBreakdown breakdown={sectorBreakdown} />
          </ArchiveShelf>

          <ArchiveShelf title="Administration">
            <ShelfLink href={`/game/${game.id}/cabinet`} label="Cabinet" />
            <ShelfLink href={`/game/${game.id}/diplomatic-office`} label="Foreign Affairs" />
            <ShelfLink href="/achievements" label="Achievements" />
          </ArchiveShelf>
        </div>

        <div className="mt-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-paper-faint)]">
            Magazine Covers
          </div>
          {magazineCovers.length > 0 ? (
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {magazineCovers.map(c => (
                <MagazineCover
                  key={c.id}
                  icon={c.icon}
                  headline={c.headline}
                  subhead={c.subhead}
                  issueDate={monthToDate(game.currentMonth)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--color-paper-faint)]">
              No covers yet — check back once this administration concludes.
            </p>
          )}
        </div>

        <div className="mt-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-paper-faint)]">
            Declassified Files
          </div>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SECRET_FILES.map(file => (
              <SecretFileCard key={file.id} file={file} unlocked={Boolean(game.flags[file.requiresFlag])} />
            ))}
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-paper-faint)]">
            <span>Collection Completion</span>
            <span className="text-[var(--color-brass)]">{collectionPercent}%</span>
          </div>
          <div className="mt-2 h-[3px] w-full rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full bg-[var(--color-brass)] transition-all duration-500"
              style={{ width: `${collectionPercent}%` }}
            />
          </div>
          <div className="mt-3 space-y-1.5">
            {collectionEntries.map(entry => (
              <div key={entry.label} className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-paper-dim)]">{entry.label}</span>
                <span className="font-mono tabular-nums text-[var(--color-paper-faint)]">{entry.current}/{entry.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-5 backdrop-blur-sm">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-paper-faint)]">
            Presidential Statistics
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatBox label="Approval Peak" value={`${approvalPeak}%`} />
            <StatBox label="Approval Low" value={`${approvalLow}%`} />
            <StatBox label="Laws Passed" value={String(game.passedLaws.length)} />
            <StatBox label="Crises Resolved" value={String(crisesResolved)} />
            <StatBox label="Active Conflicts" value={String(game.activeConflicts.length)} />
            <StatBox label="Achievements" value={`${unlockedAchievements.length}/${ACHIEVEMENTS.length}`} />
          </div>
        </div>

        <div className="mt-8">
          <ChroniclesPanel
            gameId={game.id}
            initialIsPublic={row.isPublic}
            initialShareSlug={row.shareSlug}
            locked={chroniclesLocked}
            product={chroniclesProduct}
          />
        </div>

        {!chroniclesLocked && (
          <div className="mt-8">
            <ChroniclesAnalytics
              approvalHistory={game.approvalHistory}
              sectorBreakdown={sectorBreakdown.map(s => ({ label: s.meta.label, passed: s.passed, total: s.total, color: s.meta.color }))}
            />
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="mx-auto max-w-md text-[15px] italic leading-relaxed text-[var(--color-paper-dim)]">
            “{quote}”
          </p>
          <p className="mt-3 font-[family-name:var(--font-signature)] text-2xl text-[var(--color-brass)]">
            Respectfully, President {game.presidentName}
          </p>
        </div>

        <p className="mt-6 text-right font-mono text-[10px] text-[var(--color-paper-faint)]">
          Legacy Score {legacy.total}
        </p>
      </main>
    </>
  )
}

function ArchiveShelf({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-paper-faint)]">
        {title}
      </div>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  )
}

function ShelfLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-paper-dim)] backdrop-blur-sm transition-colors hover:border-[var(--color-brass-dim)] hover:text-[var(--color-paper)]"
    >
      {label}
    </Link>
  )
}

function ShelfCount({ label, current, total }: { label: string; current: number; total?: number }) {
  return (
    <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-paper-dim)] backdrop-blur-sm">
      {label} <span className="font-mono text-[var(--color-brass)]">{total ? `${current}/${total}` : current}</span>
    </div>
  )
}

function ShelfPlaceholder({ label, fullWidth }: { label: string; fullWidth?: boolean }) {
  return (
    <div
      className={
        'rounded-sm border border-dashed border-[var(--color-border-strong)] px-3 py-2.5 text-sm text-[var(--color-paper-faint)]' +
        (fullWidth ? ' text-center' : '')
      }
    >
      {label} <span className="text-[11px]">(coming soon)</span>
    </div>
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

function ShelfSectorBreakdown({ breakdown }: { breakdown: ReturnType<typeof computeSectorBreakdown> }) {
  return (
    <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 backdrop-blur-sm">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--color-paper-faint)]">
        Laws Passed
      </div>
      <div className="mt-2 space-y-1.5">
        {breakdown.map(({ sector, meta, passed, total }) => (
          <div key={sector} className="flex items-center justify-between text-xs">
            <span className="text-[var(--color-paper-dim)]">{meta.label}</span>
            <span className="font-mono tabular-nums text-[var(--color-paper-faint)]">{passed}/{total}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
