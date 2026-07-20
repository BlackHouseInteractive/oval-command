import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dbToGame, gameToDbUpdate, toJson, safeErrorMessage } from '@/lib/db-helpers'
import { getLawById, resolveLawPassage, applyLawPassage, canUseNpcAbility, resolveLawNpcReactions, resolveWhipReactions } from '@/lib/law-engine'
import { applyDelta, pickEvent, advanceMonth, computeLegacyScore } from '@/lib/game-engine'
import { getOwnedContent } from '@/lib/entitlements'
import { resolveRoster } from '@/lib/cabinet'
import { driftTraits } from '@/lib/cabinet-traits'
import { applyCabinetNarrative, pickAmbientHeadline } from '@/lib/cabinet-narrative'
import { computeScandalMitigation } from '@/lib/cabinet-abilities'
import { generateLawHeadline } from '@/lib/headlines'
import { unlockAchievements } from '@/lib/achievements'
import { computeSpecialEditionCovers, type CoverContent } from '@/lib/magazine-covers'
import { WHIP_ORDER, scoreWhipBonus, type WhipAnswer } from '@/lib/whip-content'
import type { Headline } from '@/lib/headlines'
import type { GameOverReason, NpcReactionResult } from '@/types/game'

interface Params { params: Promise<{ id: string }> }

interface ProposeLawBody {
  lawId: string
  useNpcAbility?: 'senate_leader' | 'speaker'
  // Optional for one release cycle — see the fallback below. Once the
  // whip-mini-game client has been live a full cycle, make this required
  // and delete the fallback branch.
  whipAnswers?: { npcId: string; styleIndex: number }[]
}

/**
 * Validates a client-submitted whip-answers array against the server-owned
 * leader roster — same "never trust a client-submitted id/index" posture as
 * VALID_THEMES/validatePressAnswers in address-nation/route.ts. Returns
 * null (invalid) or the validated array, never a raw client-supplied bonus.
 *
 * Known accepted limitation, same as the press-conference mini-game: the
 * whip content ships in the client bundle, so a scripted client always
 * knows each leader's best style. Not worth closing — the ceiling is a
 * bounded probability nudge (see resolveLawPassage's whipBonus clamp), not
 * a guaranteed pass.
 */
function validateWhipAnswers(raw: unknown): WhipAnswer[] | null {
  if (!Array.isArray(raw) || raw.length !== WHIP_ORDER.length) return null
  const seen = new Set<string>()
  const answers: WhipAnswer[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) return null
    const { npcId, styleIndex } = entry as { npcId?: unknown; styleIndex?: unknown }
    if (typeof npcId !== 'string' || seen.has(npcId)) return null
    if (!(WHIP_ORDER as string[]).includes(npcId)) return null
    if (styleIndex !== 0 && styleIndex !== 1 && styleIndex !== 2) return null
    seen.add(npcId)
    answers.push({ npcId: npcId as WhipAnswer['npcId'], styleIndex })
  }
  return answers
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ProposeLawBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { lawId, useNpcAbility, whipAnswers: rawWhipAnswers } = body
  if (!lawId || typeof lawId !== 'string') {
    return NextResponse.json({ error: 'lawId is required' }, { status: 400 })
  }
  if (useNpcAbility && !['senate_leader', 'speaker'].includes(useNpcAbility)) {
    return NextResponse.json({ error: 'Invalid useNpcAbility value' }, { status: 400 })
  }

  // Deploy-transition fallback: a client mid-proposal on a stale cached
  // bundle won't have the whip mini-game and will omit whipAnswers
  // entirely — treat that as no whip bonus rather than a hard failure.
  // A malformed (present but invalid) array is still rejected below.
  let whipAnswers: WhipAnswer[] = []
  if (rawWhipAnswers !== undefined) {
    const validated = validateWhipAnswers(rawWhipAnswers)
    if (!validated) {
      return NextResponse.json({ error: 'Invalid whip answers' }, { status: 400 })
    }
    whipAnswers = validated
  }

  const row = await prisma.game.findUnique({ where: { id } })
  if (!row) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (row.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (row.status !== 'ACTIVE') return NextResponse.json({ error: 'Game is not active' }, { status: 400 })

  const game = dbToGame(row)

  // Real ownedContent, not the 'all' default, and this game's own era —
  // this is the new-proposal entitlement + era gate, same "never trust
  // client ids" posture as everywhere else (a crafted request for a Story
  // Pack lawId this user doesn't own, or a law from a different era, simply
  // isn't in the pool, same as a lawId that never existed).
  const ownedContent = await getOwnedContent(session.user.id)
  const law = getLawById(lawId, ownedContent, game.campaignEra)
  if (!law) {
    return NextResponse.json({ error: 'Unknown law' }, { status: 404 })
  }

  if (game.passedLaws.includes(lawId)) {
    return NextResponse.json({ error: 'This law has already passed' }, { status: 400 })
  }
  if (law.blocks_laws.some(bid => game.passedLaws.includes(bid))) {
    return NextResponse.json({ error: 'A mutually exclusive law has already passed this term' }, { status: 400 })
  }

  if (useNpcAbility) {
    const { eligible, reason } = canUseNpcAbility(game, useNpcAbility)
    if (!eligible) {
      return NextResponse.json({ error: reason }, { status: 400 })
    }
  }

  let passageResult: ReturnType<typeof resolveLawPassage>
  let updatedGame: ReturnType<typeof applyLawPassage>
  let cascadeHeadlines: Headline[]
  let gameOver: GameOverReason | null = null
  let npcReactions: NpcReactionResult[] = []
  let suggestedEvent: ReturnType<typeof pickEvent> = null
  try {
    const roster = resolveRoster(game)

    // Whip bonus and leader reactions are both scored against the
    // ORIGINAL game (loaded fresh from the DB), never a partially-updated
    // one — all 3 answers are independent NPCs read off one stable
    // relationships snapshot, so leader order can't affect the result.
    const whipBonus = whipAnswers.length > 0 ? scoreWhipBonus(whipAnswers, game.npcRelationships) : 0
    const whipReactions =
      whipAnswers.length > 0 ? resolveWhipReactions(game, roster, whipAnswers) : null

    // Routing the whip-adjusted relationships through as the base game
    // object (rather than merging them in later) means they persist
    // regardless of whether the bill ultimately passes — applyLawPassage's
    // ...game spread carries them through either way.
    const gameForPassage = whipReactions ? { ...game, npcRelationships: whipReactions.newRelationships } : game

    passageResult = resolveLawPassage(law, gameForPassage, { useNpcAbility, whipBonus })
    updatedGame = applyLawPassage(gameForPassage, law, passageResult)
    if (whipReactions) npcReactions = [...whipReactions.reactions]

    if (passageResult.passed) {
      updatedGame = {
        ...updatedGame,
        stats: applyDelta(updatedGame.stats, law.effects.onPass),
      }
      const { reactions, newRelationships } = resolveLawNpcReactions(updatedGame, law)
      npcReactions = [...npcReactions, ...reactions]
      updatedGame = { ...updatedGame, npcRelationships: newRelationships }
    }

    const preNarrativeGame = updatedGame
    const scandalMitigation = computeScandalMitigation(preNarrativeGame, roster)
    const advance = advanceMonth(updatedGame, [], undefined, scandalMitigation)
    updatedGame = advance.game
    cascadeHeadlines = advance.cascadeHeadlines
    gameOver = advance.gameOver

    const driftedTraits = driftTraits(preNarrativeGame)
    const narrative = applyCabinetNarrative(preNarrativeGame, { ...updatedGame, npcTraits: driftedTraits }, roster)
    updatedGame = narrative.game
    suggestedEvent = narrative.suggestedEvent

    // Ambient tier — same precedent as /turn: only when nothing more
    // substantial (an initiative-engine scene) is already happening.
    const ambientHeadline = suggestedEvent ? null : pickAmbientHeadline(roster)
    if (ambientHeadline) cascadeHeadlines = [...cascadeHeadlines, ambientHeadline]
  } catch (err) {
    const message = safeErrorMessage(err, 'Law could not be processed')
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const nextEvent = suggestedEvent ?? (updatedGame.status === 'ACTIVE' ? pickEvent(updatedGame, ownedContent) : null)

  const [updateResult] = await prisma.$transaction([
    prisma.game.updateMany({
      where: { id: id, updatedAt: row.updatedAt },
      data:  { ...gameToDbUpdate(updatedGame), currentEventId: nextEvent?.id ?? null },
    }),
    prisma.gameLog.create({
      data: {
        gameId:      id,
        month:       game.currentMonth,
        actionType:  passageResult.passed ? 'LAW_PASSED' : 'LAW_FAILED',
        lawId:       law.id,
        statDeltas:  toJson(passageResult.passed ? law.effects.onPass : {}),
        narrative:   passageResult.usedAbility
          ? `${law.title} passed via ${passageResult.usedAbility}.`
          : passageResult.passed
          ? `${law.title} passed Congress ${passageResult.probability}% probability.`
          : `${law.title} failed to pass Congress (${passageResult.probability}% probability).`,
      },
    }),
  ])

  if (updateResult.count === 0) {
    return NextResponse.json(
      { error: 'This turn was already processed by another request. Reload to see the current state.' },
      { status: 409 }
    )
  }

  const headline = generateLawHeadline(law.title, law.category, law.sector, passageResult.passed, passageResult.usedAbility)
  const newAchievements = gameOver ? await unlockAchievements(session.user.id, updatedGame, gameOver) : []
  const specialCovers: CoverContent[] = gameOver
    ? computeSpecialEditionCovers(updatedGame, gameOver, computeLegacyScore(updatedGame))
    : []

  return NextResponse.json({
    game: updatedGame,
    passageResult,
    headline,
    cascadeHeadlines,
    nextEvent,
    newAchievements,
    specialCovers,
    npcReactions,
  })
}
