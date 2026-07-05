import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dbToGame, dbToGameLog, getGameRow } from '@/lib/db-helpers'
import { pickEvent, EVENTS } from '@/lib/game-engine'
import { computePresidentialArchetype } from '@/lib/archetype-engine'
import { getInactivityWarning } from '@/lib/guest-cleanup'
import { getEnabledOAuthProviders } from '@/lib/oauth-providers'
import { GameClient } from '@/components/game/GameClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function GamePage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const row = await getGameRow(id)
  if (!row) notFound()
  if (row.userId !== session.user.id) redirect('/dashboard')

  const game = dbToGame(row)

  // Reuse the event already persisted for this turn instead of picking a
  // fresh one on every load — otherwise reloading the page (or navigating
  // back from Cabinet/Congress/History) would swap the briefing out from
  // under the player before they'd even chosen, same fix as the /api route.
  let currentEvent = null
  if (game.status === 'ACTIVE') {
    if (row.currentEventId) {
      currentEvent = EVENTS.find(e => e.id === row.currentEventId) ?? null
    } else {
      currentEvent = pickEvent(game)
      if (currentEvent) {
        await prisma.game.update({
          where: { id },
          data:  { currentEventId: currentEvent.id },
        })
      }
    }
  }

  // Bounded, indexed query — used to derive per-stat trends/sparklines on
  // read (see lib/stat-trends.ts) rather than persisting a second history
  // array per stat.
  const recentLogRows = await prisma.gameLog.findMany({
    where: { gameId: id },
    orderBy: { month: 'desc' },
    take: 8,
  })
  const recentLogs = recentLogRows.map(dbToGameLog)

  // A game that ends via a law proposal or an Address the Nation speech
  // redirects here rather than showing its archetype inline the way a
  // crisis-choice ending does (see GameClient's fresh 'gameover' phase) —
  // computed here instead so every revisit of a finished game shows it,
  // regardless of which action actually ended the term. Same recompute
  // pattern as app/presidencies/page.tsx: archetype is a pure function of
  // the final game state + its full log history, both already persisted.
  let finishedGameArchetype = undefined
  if (game.status !== 'ACTIVE') {
    const allLogRows = await prisma.gameLog.findMany({ where: { gameId: id }, orderBy: { month: 'asc' } })
    finishedGameArchetype = computePresidentialArchetype(game, allLogRows.map(dbToGameLog))
  }

  // Guest sessions are the only ones subject to expiration — session.user.name
  // is 'Guest' for exactly the accounts lib/guest-cleanup.ts targets, so this
  // reuses a signal already present on the session rather than a new query.
  const isGuest = session.user.name === 'Guest'
  const inactivityWarning = isGuest ? getInactivityWarning(row.updatedAt) : null
  const { githubEnabled, googleEnabled } = getEnabledOAuthProviders()

  return (
    <GameClient
      initialGame={game}
      initialEvent={currentEvent}
      recentLogs={recentLogs}
      inactivityWarning={inactivityWarning}
      githubEnabled={githubEnabled}
      googleEnabled={googleEnabled}
      finishedGameArchetype={finishedGameArchetype}
    />
  )
}
