import { redirect, notFound } from 'next/navigation'
import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { dbToGame, getGameRow } from '@/lib/db-helpers'
import { ALL_EVENTS, computePassProbability } from '@/lib/game-engine'
import { getEligibleLaws } from '@/lib/content-sources'
import { canUseNpcAbility } from '@/lib/law-engine'
import { getOwnedContent } from '@/lib/entitlements'
import { CongressClient } from '@/components/game/CongressClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CongressPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const row = await getGameRow(id)
  if (!row) notFound()
  if (row.userId !== session.user.id) redirect('/dashboard')

  const game = dbToGame(row)
  const ownedContent = await getOwnedContent(session.user.id)

  // getEligibleLaws('all', game.campaignEra), not the global cross-era
  // ALL_LAWS — this is a browse/propose surface (a NEW-selection gate),
  // strictly scoped to this game's own era, unlike the read-back lookups
  // below. Locked Story Pack laws are shown (dimmed, with an Unlock CTA)
  // rather than hidden, same "the point of comparison IS the point of
  // sale" precedent as CabinetSlotPicker.
  const lawsWithOdds = getEligibleLaws('all', game.campaignEra).map(law => ({
    law,
    probability: computePassProbability(law, game),
    alreadyPassed: game.passedLaws.includes(law.id),
    blocked: law.blocks_laws.some(id => game.passedLaws.includes(id)),
    locked: law.requires_flags.some(f => !game.flags[f]),
    contentLocked: law.contentId !== undefined && !ownedContent.has(law.contentId),
  }))

  const senateAbility = canUseNpcAbility(game, 'senate_leader')
  const speakerAbility = canUseNpcAbility(game, 'speaker')

  const pendingBriefingTitle = game.status === 'ACTIVE' && row.currentEventId
    ? ALL_EVENTS.find(e => e.id === row.currentEventId)?.title ?? null
    : null

  return (
    // useSearchParams() inside CongressClient requires a Suspense boundary
    // per Next.js App Router rules — without it, the build fails static
    // generation checks even though this route is already fully dynamic.
    <Suspense fallback={null}>
      <CongressClient
        game={game}
        lawsWithOdds={lawsWithOdds}
        canUseSenateAbility={senateAbility.eligible}
        canUseSpeakerAbility={speakerAbility.eligible}
        pendingBriefingTitle={pendingBriefingTitle}
      />
    </Suspense>
  )
}
