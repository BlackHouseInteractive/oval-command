import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dbToGame, dbToGameLog } from '@/lib/db-helpers'
import { computeLegacyScore } from '@/lib/game-engine'
import { computePresidentialArchetype } from '@/lib/archetype-engine'
import { SiteNav } from '@/components/SiteNav'
import { LeaderboardRow } from '@/components/LeaderboardRow'
import { Seal } from '@/components/Seal'
import type { GameLog } from '@/types/game'

const LEADERBOARD_SIZE = 50

// Deliberately public — no auth() redirect. There's no global middleware
// enforcing sign-in in this app (every other page opts into its own auth
// check), so this is the one page that intentionally doesn't.
export default async function LeaderboardPage() {
  const session = await auth()

  // Cheap, indexed step: rank by the stored Game.legacyScore column rather
  // than recomputing for every user's every finished game — that doesn't
  // scale the way per-account recomputation does on /presidencies. Only
  // the bounded top N below get the richer live recompute (full breakdown
  // + archetype), matching that page for consistency.
  const bestPerUser = await prisma.game.groupBy({
    by: ['userId'],
    where: { status: { in: ['COMPLETE', 'GAMEOVER'] }, legacyScore: { not: null } },
    _max: { legacyScore: true },
    orderBy: { _max: { legacyScore: 'desc' } },
    take: LEADERBOARD_SIZE,
  })

  // Deliberately a narrow, hand-picked shape — never the full Game object
  // (which carries userId) — since this is other users' data reaching an
  // anonymous visitor's browser. Keeping LeaderboardRow's prop type this
  // narrow means it physically can't render (or, if it ever became a
  // Client Component, leak across the RSC boundary) anything beyond what's
  // listed here, regardless of what a future edit elsewhere does.
  interface LeaderboardEntry {
    id:            string
    presidentName: string
    party:         ReturnType<typeof dbToGame>['party']
    difficulty:    ReturnType<typeof dbToGame>['difficulty']
    legacyTotal:   number
    archetype:     ReturnType<typeof computePresidentialArchetype>
  }

  let entries: LeaderboardEntry[] = []

  if (bestPerUser.length > 0) {
    const rows = await prisma.game.findMany({
      where: { OR: bestPerUser.map(b => ({ userId: b.userId, legacyScore: b._max.legacyScore })) },
      include: { logs: { orderBy: { month: 'asc' } } },
    })

    // A user could in theory have two games tied at their own max score —
    // keep just one per user.
    const seenUsers = new Set<string>()
    const uniqueRows = rows.filter(row => {
      if (seenUsers.has(row.userId)) return false
      seenUsers.add(row.userId)
      return true
    })

    entries = uniqueRows
      .map((row): LeaderboardEntry => {
        const game = dbToGame(row)
        const logs: GameLog[] = row.logs.map(dbToGameLog)
        const legacy = computeLegacyScore(game)
        const archetype = computePresidentialArchetype(game, logs)
        return {
          id:            game.id,
          presidentName: game.presidentName,
          party:         game.party,
          difficulty:    game.difficulty,
          legacyTotal:   legacy.total,
          archetype,
        }
      })
      .sort((a, b) => b.legacyTotal - a.legacyTotal)
  }

  return (
    <>
      {session?.user?.id ? (
        <SiteNav userName={session.user.name} userImage={session.user.image} />
      ) : (
        <header className="border-b border-[var(--color-border)]">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3.5">
            <Link href="/login" className="flex items-center gap-2 text-[var(--color-brass)]">
              <Seal size={18} />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Oval Command</span>
            </Link>
            <Link
              href="/login"
              className="rounded-sm border border-[var(--color-brass-dim)] bg-[var(--color-brass)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-ink)]"
            >
              Play Now
            </Link>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-brass)]">
            Hall of Presidents
          </div>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-paper)]">
            Leaderboard
          </h1>
          <p className="mt-2 text-sm text-[var(--color-paper-dim)]">
            The highest legacy score from every presidency ever played.
          </p>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-sm border border-dashed border-[var(--color-border-strong)] px-6 py-12 text-center">
            <p className="text-sm text-[var(--color-paper-dim)]">
              No completed terms yet. Be the first.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((e, i) => (
              <LeaderboardRow
                key={e.id}
                rank={i + 1}
                presidentName={e.presidentName}
                party={e.party}
                difficulty={e.difficulty}
                legacyTotal={e.legacyTotal}
                archetype={e.archetype}
              />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
