import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dbToGame, gameToDbUpdate, toJson, safeErrorMessage } from '@/lib/db-helpers'
import { resolveSpeech, applyComposureModifier, SPEECH_THEMES, type ComposureTier } from '@/lib/address-nation'
import { applyDelta, pickEvent, advanceMonth, computeLegacyScore, processNpcReactions } from '@/lib/game-engine'
import { resolveNpcTriggerKeys } from '@/lib/npc-triggers'
import { getOwnedContent } from '@/lib/entitlements'
import { resolveRoster } from '@/lib/cabinet'
import { driftTraits } from '@/lib/cabinet-traits'
import { applyCabinetNarrative, pickAmbientHeadline } from '@/lib/cabinet-narrative'
import { computeScandalMitigation } from '@/lib/cabinet-abilities'
import { generateSpeechHeadline, type SpeechTheme } from '@/lib/headlines'
import { unlockAchievements } from '@/lib/achievements'
import { computeSpecialEditionCovers, type CoverContent } from '@/lib/magazine-covers'
import { PRESS_QUESTIONS, scoreAnswers, type PressAnswer } from '@/lib/press-questions'
import type { Headline } from '@/lib/headlines'
import type { StatDelta, GameOverReason, NpcReactionResult } from '@/types/game'

interface Params { params: Promise<{ id: string }> }

interface AddressNationBody {
  theme: SpeechTheme
  // Optional for one release cycle — see the fallback below. Once the
  // mini-game client has been live a full cycle, make this required and
  // delete the fallback branch.
  pressAnswers?: { questionId: string; optionIndex: number }[]
}

// Derived from SPEECH_THEMES rather than a separately maintained list —
// this exact drift (a new theme added there but not here) shipped once
// already and silently 400'd on the two newest themes.
const VALID_THEMES: SpeechTheme[] = SPEECH_THEMES.map(t => t.id)

/**
 * Validates a client-submitted press-answers array against the server-owned
 * question bank — same "never trust a client-submitted id/index" posture as
 * VALID_THEMES above and choiceIndex bound-checking in /turn. Returns null
 * (invalid) or the validated array, never a raw client-supplied score.
 *
 * Known accepted limitation: sampling happens client-side, so the server
 * has no record of which 3 questions were actually served to this client —
 * a scripted client could always submit its most favorable 3 with
 * best-case answers. Not worth closing: the question bank ships in the
 * client bundle anyway (nothing secret to protect), and the ceiling is a
 * bounded +/-2 approval nudge (see applyComposureModifier). Don't "fix"
 * this into a stateful served-questions record — the stakes don't justify it.
 */
function validatePressAnswers(raw: unknown): PressAnswer[] | null {
  if (!Array.isArray(raw) || raw.length !== 3) return null
  const seen = new Set<string>()
  const answers: PressAnswer[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) return null
    const { questionId, optionIndex } = entry as { questionId?: unknown; optionIndex?: unknown }
    if (typeof questionId !== 'string' || seen.has(questionId)) return null
    if (!PRESS_QUESTIONS.some(q => q.id === questionId)) return null
    if (optionIndex !== 0 && optionIndex !== 1 && optionIndex !== 2) return null
    seen.add(questionId)
    answers.push({ questionId, optionIndex })
  }
  return answers
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: AddressNationBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { theme, pressAnswers: rawPressAnswers } = body
  if (!theme || !VALID_THEMES.includes(theme)) {
    return NextResponse.json({ error: 'Invalid theme' }, { status: 400 })
  }

  // Deploy-transition fallback: a client mid-speech on a stale cached
  // bundle won't have the mini-game and will omit pressAnswers entirely —
  // treat that as neutral/steady composure rather than a hard failure.
  // A malformed (present but invalid) array is still rejected below.
  let pressAnswers: PressAnswer[] = []
  if (rawPressAnswers !== undefined) {
    const validated = validatePressAnswers(rawPressAnswers)
    if (!validated) {
      return NextResponse.json({ error: 'Invalid press answers' }, { status: 400 })
    }
    pressAnswers = validated
  }

  const row = await prisma.game.findUnique({ where: { id } })
  if (!row) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (row.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (row.status !== 'ACTIVE') return NextResponse.json({ error: 'Game is not active' }, { status: 400 })

  const game = dbToGame(row)
  const ownedContent = await getOwnedContent(session.user.id)

  let updatedGame: ReturnType<typeof dbToGame>
  let effective: boolean
  let speechEffects: StatDelta
  let composureTier: ComposureTier
  let cascadeHeadlines: Headline[]
  let gameOver: GameOverReason | null = null
  let suggestedEvent: ReturnType<typeof pickEvent> = null
  let npcReactions: NpcReactionResult[] = []
  try {
    const speechResult = resolveSpeech(theme, game)
    effective = speechResult.effective
    // pressAnswers is [] under the deploy-transition fallback, which
    // scoreAnswers resolves to the baseline (steady, no modifier) —
    // no separate branch needed.
    const composureScore = scoreAnswers(pressAnswers)
    const modified = applyComposureModifier(speechResult.effects, composureScore)
    speechEffects = modified.effects
    composureTier = modified.tier
    const statsAfterSpeech = applyDelta(game.stats, speechEffects)
    const preNarrativeGame = { ...game, stats: statsAfterSpeech }
    const roster = resolveRoster(game)
    const scandalMitigation = computeScandalMitigation(preNarrativeGame, roster)

    // NPC reaction wiring — mirrors processEventTurn's exact pattern in
    // lib/game-engine.ts: resolve trigger keys off previous/current game
    // state, merge the resulting relationship changes into the game
    // object, THEN advance the month on that merged object. advanceMonth
    // never touches npcRelationships itself, so this rides through the
    // existing persistence path for free.
    const triggerKeys = resolveNpcTriggerKeys(game, preNarrativeGame, [], ['press_conference_held'])
    const { reactions, newRelationships } = processNpcReactions(preNarrativeGame, triggerKeys, roster)
    npcReactions = reactions
    const preAdvanceGame = { ...preNarrativeGame, npcRelationships: newRelationships }

    const advance = advanceMonth(preAdvanceGame, [], undefined, scandalMitigation)
    updatedGame = advance.game
    cascadeHeadlines = advance.cascadeHeadlines
    gameOver = advance.gameOver

    const driftedTraits = driftTraits(preAdvanceGame)
    const narrative = applyCabinetNarrative(preAdvanceGame, { ...updatedGame, npcTraits: driftedTraits }, roster)
    updatedGame = narrative.game
    suggestedEvent = narrative.suggestedEvent

    // Ambient tier — same precedent as /turn and /law.
    const ambientHeadline = suggestedEvent ? null : pickAmbientHeadline(roster)
    if (ambientHeadline) cascadeHeadlines = [...cascadeHeadlines, ambientHeadline]
  } catch (err) {
    const message = safeErrorMessage(err, 'Speech could not be processed')
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const nextEvent = suggestedEvent ?? (updatedGame.status === 'ACTIVE' ? pickEvent(updatedGame, ownedContent) : null)

  const narrative = effective
    ? composureTier === 'shaky'
      ? 'The speech lands — though a shaky Q&A took some shine off it.'
      : 'The speech lands — the message matched the moment.'
    : composureTier === 'strong'
      ? 'The speech falls flat — though the room stayed with him through a strong Q&A.'
      : 'The speech falls flat — the numbers told a different story than the message did.'

  const [updateResult] = await prisma.$transaction([
    prisma.game.updateMany({
      where: { id: id, updatedAt: row.updatedAt },
      data:  { ...gameToDbUpdate(updatedGame), currentEventId: nextEvent?.id ?? null },
    }),
    prisma.gameLog.create({
      data: {
        gameId:      id,
        month:       game.currentMonth,
        actionType:  'PRESS_CONFERENCE',
        statDeltas:  toJson(speechEffects),
        narrative,
      },
    }),
  ])

  if (updateResult.count === 0) {
    return NextResponse.json(
      { error: 'This turn was already processed by another request. Reload to see the current state.' },
      { status: 409 }
    )
  }

  const headline = generateSpeechHeadline(theme, effective)
  const newAchievements = gameOver ? await unlockAchievements(session.user.id, updatedGame, gameOver) : []
  const specialCovers: CoverContent[] = gameOver
    ? computeSpecialEditionCovers(updatedGame, gameOver, computeLegacyScore(updatedGame))
    : []

  return NextResponse.json({
    game: updatedGame,
    effective,
    composureTier,
    npcReactions,
    narrative,
    headline,
    cascadeHeadlines,
    nextEvent,
    newAchievements,
    specialCovers,
  })
}
