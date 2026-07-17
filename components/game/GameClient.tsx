'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ShieldAlert, Gavel, Megaphone } from 'lucide-react'
import { TermProgress } from '@/components/game/TermProgress'
import { CrisisCard } from '@/components/game/CrisisCard'
import { OutcomeCard } from '@/components/game/OutcomeCard'
import { LegacyScreen } from '@/components/game/LegacyScreen'
import { HeadlineTicker } from '@/components/game/HeadlineTicker'
import { ProcessingCard } from '@/components/game/ProcessingCard'
import { NpcReactionList } from '@/components/game/NpcReactionList'
import { CabinetSlotPicker } from '@/components/CabinetSlotPicker'
import { ApprovalChart } from '@/components/game/ApprovalChart'
import { ConflictBanner } from '@/components/game/ConflictBanner'
import { RoomAtmosphere } from '@/components/game/RoomAtmosphere'
import { RoomBackground, roomAccentStyle } from '@/components/game/RoomBackground'
import { RoomAmbience } from '@/components/game/RoomAmbience'
import { AchievementUnlockToast } from '@/components/game/AchievementUnlockToast'
import { ApprovalGauge } from '@/components/game/ApprovalGauge'
import { ActionCard, type ActionCardTag } from '@/components/game/ActionCard'
import { PresidentialInbox } from '@/components/game/PresidentialInbox'
import { DailyBrief } from '@/components/game/DailyBrief'
import { AnnualReport } from '@/components/game/AnnualReport'
import { OnboardingWelcome } from '@/components/game/OnboardingWelcome'
import { GuestExpiryWarning } from '@/components/game/GuestExpiryWarning'
import { useAudio, pickVariant, DECISION_MADE_VARIANTS } from '@/components/AudioProvider'
import { getRoomAmbience } from '@/lib/room-audio'
import { getEventAccentColor, getRoomTreatment, getRoomImage, isTenseMood } from '@/lib/event-backgrounds'
import { computeLegacyScore, checkGameOver, isBreakingEvent, computePassProbability } from '@/lib/game-engine'
import { resolveRoster } from '@/lib/cabinet'
import { isMilitaryOptionUnlocked, getMilitaryOptionChoice } from '@/lib/military-option'
import { getLegislativeOpportunity } from '@/lib/law-engine'
import { getAdvisorRecommendations } from '@/lib/advisor-engine'
import { computeStatTrend, getTopMovers } from '@/lib/stat-trends'
import { getOutcomeSeverity } from '@/lib/outcome-magnitude'
import { cn, monthToDate, AVATAR_COLORS } from '@/lib/utils'
import type { InactivityWarning } from '@/lib/guest-cleanup'
import type { PresidentialArchetype } from '@/lib/archetype-engine'
import type { YearInReview } from '@/lib/year-in-review'
import type { Game, GameLog, CrisisEvent, TurnResult, ProcessTurnResponse, Headline, NpcReactionResult, SelectableSlotId } from '@/types/game'

interface GameClientProps {
  initialGame: Game
  initialEvent: CrisisEvent | null
  recentLogs: GameLog[]
  inactivityWarning: InactivityWarning | null
  githubEnabled: boolean
  googleEnabled: boolean
  finishedGameArchetype?: PresidentialArchetype
  yearInReview?: YearInReview
  ownedContent: string[]
}

type ViewState =
  | { phase: 'briefing' }
  | { phase: 'processing'; result: TurnResult; nextEvent: CrisisEvent | null }
  | { phase: 'outcome'; result: TurnResult; nextEvent: CrisisEvent | null }
  | { phase: 'gameover'; result: TurnResult }
  | { phase: 'loaded-gameover'; reason: import('@/types/game').GameOverReason }
  | { phase: 'personnel-outcome'; outcome: string; npcReactions: import('@/types/game').NpcReactionResult[] }
  | { phase: 'replace-cabinet'; slotId: string; resigned: boolean; outcome: string }

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-[var(--color-bad)]',
  warning: 'bg-[var(--color-warn)]',
  opportunity: 'bg-[var(--color-good)]',
}

export function GameClient({ initialGame, initialEvent, recentLogs: initialRecentLogs, inactivityWarning, githubEnabled, googleEnabled, finishedGameArchetype, yearInReview, ownedContent }: GameClientProps) {
  const router = useRouter()
  const [game, setGame] = useState(initialGame)
  const [event, setEvent] = useState(initialEvent)
  // A crisis-choice turn updates game state without a full page navigation
  // (unlike Congress/Press Room, which route away and back), so the
  // server-fetched recentLogs prop would otherwise go stale the moment a
  // turn completes — the gauge's "this month" delta and top movers would
  // silently keep reflecting last month's turn. Kept as state and
  // prepended to on every successful turn.
  const [recentLogs, setRecentLogs] = useState(initialRecentLogs)

  // If the player navigates here for a game that's already finished
  // (e.g. clicking a COMPLETE/GAMEOVER card from the dashboard), the view
  // must start on the gameover screen rather than defaulting to 'briefing'
  // — which previously showed an empty "no briefing available" state
  // instead of the player's actual final legacy score and verdict.
  const initialGameOverReason = initialGame.status !== 'ACTIVE'
    ? (checkGameOver(initialGame) ?? 'TERM_COMPLETE') // defensive fallback; should always resolve in practice
    : null
  const [view, setView] = useState<ViewState>(
    initialGameOverReason ? { phase: 'loaded-gameover', reason: initialGameOverReason } : { phase: 'briefing' }
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [replacementResult, setReplacementResult] = useState<{ headline: Headline; rippleReactions: NpcReactionResult[] } | null>(null)
  const { playSfx, playMusic } = useAudio()

  // Recomputed live from current game state every render — pure function,
  // no API round-trip needed, same pattern as the legacy score import.
  const advisorRecommendations = getAdvisorRecommendations(game)

  // Fires once per transition into the gameover view rather than on every
  // render while already there — view.phase only flips to one of these two
  // values at the moment the player's term actually ends.
  useEffect(() => {
    if (view.phase !== 'gameover' && view.phase !== 'loaded-gameover') return
    const reason = view.phase === 'gameover' ? view.result.gameOver! : view.reason
    const legacy = computeLegacyScore(game)
    const triumphant = reason === 'TERM_COMPLETE' && legacy.total >= 50
    playMusic(triumphant ? '/audio/music/legacy-triumphant.mp3' : '/audio/music/legacy-somber.mp3')
    // Projector click + archive drawer + paper unfolding — reinforces that
    // the player is reviewing history, not just reading a stats screen.
    window.setTimeout(() => playSfx('/audio/composites/legacy-report.mp3'), 400)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.phase])

  async function handleChoice(choiceIndex: number) {
    if (!event || submitting) return
    setSubmitting(true)
    setError(null)
    playSfx(pickVariant(DECISION_MADE_VARIANTS))

    // Personnel scenes are turn-free and resolved through their own route
    // — no month advance, no next-event pick, no game-over check. Reuses
    // the same CrisisCard choice UI, just a lighter response handling path.
    if (event.category === 'personnel') {
      try {
        const res = await fetch(`/api/game/${game.id}/personnel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: event.id, choiceIndex }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? 'The decision could not be processed.')
        }

        const data: { game: Game; npcReactions: import('@/types/game').NpcReactionResult[]; choice: import('@/types/game').EventChoice } = await res.json()
        setGame(data.game)

        if (data.choice.opensReplacementPicker && event.npcId) {
          setEvent(null)
          setView({ phase: 'replace-cabinet', slotId: event.npcId, resigned: event.personnelMeta?.tier === 'resignation', outcome: data.choice.outcome })
        } else {
          setEvent(null)
          setView({ phase: 'personnel-outcome', outcome: data.choice.outcome, npcReactions: data.npcReactions })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      } finally {
        setSubmitting(false)
      }
      return
    }

    try {
      const res = await fetch(`/api/game/${game.id}/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, choiceIndex }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'The decision could not be processed.')
      }

      const data: ProcessTurnResponse = await res.json()
      const { nextEvent, ...result } = data

      // A deliberate pause before the reveal — see ProcessingCard. Game
      // state (approval gauge, month, etc.) deliberately doesn't update
      // until the reveal either — committing it early would let the gauge
      // spoil the outcome while the card below still says "awaiting word."
      // Pause duration and the sound that breaks it both scale with how
      // big the outcome actually is (lib/outcome-magnitude.ts), so a
      // routine turn resolves quickly and quietly while a career-defining
      // swing gets a beat to breathe before it lands.
      const severity = getOutcomeSeverity(result.log.statDeltas)
      setView({ phase: 'processing', result, nextEvent: nextEvent ?? null })
      const pauseMs = severity.level === 'major' ? 1300 : severity.level === 'notable' ? 950 : 650
      await new Promise(resolve => window.setTimeout(resolve, pauseMs))

      setGame(result.game)
      setRecentLogs(prev => [
        { ...result.log, id: `pending-${result.log.month}`, createdAt: new Date().toISOString() },
        ...prev,
      ].slice(0, 8))

      if (severity.level === 'major' && severity.negative) {
        playSfx('/audio/stings/crisis-pulse.mp3')
        window.setTimeout(() => playSfx('/audio/ui/month-advance.mp3'), 220)
      } else {
        playSfx('/audio/ui/month-advance.mp3')
      }

      if (result.gameOver) {
        setView({ phase: 'gameover', result })
      } else {
        setView({ phase: 'outcome', result, nextEvent: nextEvent ?? null })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleContinue() {
    if (view.phase !== 'outcome') return
    setEvent(view.nextEvent)
    setView({ phase: 'briefing' })
  }

  // Personnel scenes are turn-free and don't return a "next event" the way
  // /turn does (see app/api/game/[id]/personnel/route.ts's comment: it
  // clears currentEventId and expects "the player's next room visit" to
  // re-pick an ordinary crisis briefing). This component never navigates
  // away and back, so without this, returning to 'briefing' after a
  // personnel scene left `event` at null indefinitely — the briefing card
  // would read "No briefing this month" even when one was actually pending.
  async function loadFreshEvent() {
    try {
      const res = await fetch(`/api/game/${game.id}`)
      if (!res.ok) return
      const data: { game: Game; currentEvent: CrisisEvent | null } = await res.json()
      setGame(data.game)
      setEvent(data.currentEvent)
    } catch {
      // Best-effort — worst case the player still sees "No briefing this
      // month" until a manual refresh, same as before this fix.
    }
  }

  async function handlePickReplacement(candidateId: string) {
    if (view.phase !== 'replace-cabinet' || submitting) return
    setSubmitting(true)
    setError(null)
    // The elaborate chair/door sequence is reserved for an active firing —
    // a resignation is the NPC's own choice, not a dismissal, so it gets
    // no special sting.
    if (!view.resigned) playSfx('/audio/composites/cabinet-dismissal.mp3')

    try {
      const res = await fetch(`/api/game/${game.id}/cabinet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: view.slotId, candidateId, resigned: view.resigned }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'This Cabinet change could not be made.')
      }

      const data: { game: Game; headline: Headline; rippleReactions: NpcReactionResult[] } = await res.json()
      setGame(data.game)
      setReplacementResult({ headline: data.headline, rippleReactions: data.rippleReactions })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFinishReplacement() {
    setReplacementResult(null)
    await loadFreshEvent()
    setView({ phase: 'briefing' })
  }

  if (view.phase === 'gameover' || view.phase === 'loaded-gameover') {
    const legacy = computeLegacyScore(game)
    const reason = view.phase === 'gameover' ? view.result.gameOver! : view.reason
    const archetype = view.phase === 'gameover' ? view.result.archetype : finishedGameArchetype
    const gameoverImage = getRoomImage('/oval-office-bg.webp', isTenseMood(game), game.campaignEra)
    const gameoverTreatment = getRoomTreatment(gameoverImage)
    return (
      <main className="mx-auto max-w-3xl px-6 py-12" style={roomAccentStyle('var(--color-brass)')}>
        <RoomBackground
          image={gameoverImage}
          color="var(--color-brass)"
          backgroundPosition={gameoverTreatment.backgroundPosition}
          foreground={{ style: gameoverTreatment.foregroundStyle, color: gameoverTreatment.foregroundColor }}
        />
        <RoomAmbience src={getRoomAmbience('/oval-office-bg.webp', game.campaignEra)} />
        <LegacyScreen
          legacy={legacy}
          reason={reason}
          presidentName={game.presidentName}
          archetype={archetype}
          passedLaws={game.passedLaws}
          cabinetSelections={game.cabinetSelections}
          npcTraits={game.npcTraits}
          campaignEra={game.campaignEra}
          onNewGame={() => router.push('/new-game')}
        />
        {view.phase === 'gameover' && (
          <div className="mt-4">
            <AchievementUnlockToast
              achievements={view.result.newAchievements ?? []}
              specialCovers={view.result.specialCovers ?? []}
              month={game.currentMonth}
            />
          </div>
        )}
        {game.approvalHistory.length >= 2 && (
          <div className="mt-4">
            <ApprovalChart approvalHistory={game.approvalHistory} />
          </div>
        )}
      </main>
    )
  }

  if (view.phase === 'personnel-outcome') {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10" style={roomAccentStyle('var(--color-brass)')}>
        <RoomAtmosphere color="var(--color-brass)" />
        <div className="rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6 backdrop-blur-sm">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-brass)]">Outcome</div>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-paper)]">{view.outcome}</p>
          <NpcReactionList reactions={view.npcReactions} />
          <button
            type="button"
            onClick={async () => {
              await loadFreshEvent()
              setView({ phase: 'briefing' })
            }}
            className="mt-6 w-full rounded-sm border border-[var(--color-brass-dim)] bg-[var(--color-brass)] py-3 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-90"
          >
            Continue
          </button>
        </div>
      </main>
    )
  }

  if (view.phase === 'replace-cabinet') {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10" style={roomAccentStyle('var(--color-brass)')}>
        <RoomAtmosphere color="var(--color-brass)" />
        {!replacementResult ? (
          <div className="rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6 backdrop-blur-sm">
            <p className="text-[15px] leading-relaxed text-[var(--color-paper)]">{view.outcome}</p>
            {error && (
              <p className="mt-3 rounded-sm bg-[var(--color-bad-dim)] px-3.5 py-2.5 text-sm text-[var(--color-bad)]">{error}</p>
            )}
            <div className="mt-5">
              <CabinetSlotPicker
                slotId={view.slotId as SelectableSlotId}
                excludeCandidateId={game.cabinetSelections[view.slotId as SelectableSlotId]}
                onSelect={handlePickReplacement}
                ownedContent={ownedContent}
                era={game.campaignEra}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6 backdrop-blur-sm">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-brass)]">Press Coverage</div>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-paper)]">{replacementResult.headline.text}</p>
            <NpcReactionList reactions={replacementResult.rippleReactions} />
            <button
              type="button"
              onClick={handleFinishReplacement}
              className="mt-6 w-full rounded-sm border border-[var(--color-brass-dim)] bg-[var(--color-brass)] py-3 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-90"
            >
              Continue
            </button>
          </div>
        )}
      </main>
    )
  }

  const accentColor = event ? getEventAccentColor(event.category) : 'var(--color-brass)'

  // ── Trend data for the gauge + Daily Brief (derived from GameLog, no
  // schema change — see lib/stat-trends.ts) ──────────────────────────
  const approvalTrend = computeStatTrend(game.stats.approval, recentLogs, 'approval')
  const topMovers = getTopMovers(recentLogs, 3).filter(m => m.key !== 'approval')

  // ── Action-card status, each derived from data already computed
  // elsewhere on this page — no new engine logic ─────────────────────
  const crisisTag: ActionCardTag | undefined = event ? 'Required' : undefined
  const crisisPriority = event
    ? (isBreakingEvent(event) || event.category === 'scandal' || event.category === 'security' ? 'High Priority' : 'Standard priority')
    : undefined

  const opportunity = getLegislativeOpportunity(game, new Set(ownedContent))
  const lawTag: ActionCardTag | undefined = opportunity ? 'Recommended' : undefined
  const lawDetail = opportunity?.suggested
    ? `${Math.round(computePassProbability(opportunity.suggested, game))}% chance of passage`
    : undefined
  const lawLabel = opportunity?.suggested ? opportunity.suggested.shortTitle : 'Review available bills'

  const showElectionCountdown = game.currentMonth >= 40
  const monthLabel = monthToDate(game.currentMonth)

  const topAdvisorRec = advisorRecommendations[0]
  const topAdvisorNpc = topAdvisorRec ? resolveRoster(game).find(n => n.id === topAdvisorRec.npcId) : undefined

  return (
    <main className="mx-auto max-w-3xl px-6 py-10" style={roomAccentStyle(accentColor)}>
      <RoomAtmosphere color="var(--color-brass)" />
      {/* Baseline Oval Office tone for this screen — CrisisCard mounts its
          own RoomAmbience for whatever category backdrop is showing below,
          and (being declared later in the tree) wins over this one the
          moment a crisis is pending. Without this, a month with no pending
          event left the Oval Office's main screen with no ambience at all. */}
      <RoomAmbience src={getRoomAmbience('/oval-office-bg.webp', game.campaignEra)} />

      {view.phase === 'briefing' && !yearInReview && (
        <DailyBrief
          gameId={game.id}
          month={game.currentMonth}
          monthLabel={monthLabel}
          approvalDelta={approvalTrend.deltaFromLastMonth}
          topMovers={topMovers}
          pendingCrisisTitle={event?.title ?? null}
        />
      )}

      {view.phase === 'briefing' && yearInReview && (
        <AnnualReport gameId={game.id} review={yearInReview} />
      )}

      {/* 1. Greeting — no data of its own, just orients the player */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-brass)]">
          Good Morning, Mr. President
        </div>
        <p className="mt-1 text-sm text-[var(--color-paper-faint)]">{monthLabel}</p>
      </div>

      {view.phase === 'briefing' && (
        <div className="mt-4">
          <OnboardingWelcome />
        </div>
      )}

      {view.phase === 'briefing' && inactivityWarning && (
        <div className="mt-4">
          <GuestExpiryWarning warning={inactivityWarning} githubEnabled={githubEnabled} googleEnabled={googleEnabled} />
        </div>
      )}

      <div className="mt-4">
        <TermProgress currentMonth={game.currentMonth} />
      </div>

      {game.activeConflicts.length > 0 && (
        <div className="mt-4">
          <ConflictBanner conflicts={game.activeConflicts} currentMonth={game.currentMonth} />
        </div>
      )}

      {/* 2. Approval gauge — the Oval Office's focal element */}
      <div className="mt-8">
        <ApprovalGauge
          approval={game.stats.approval}
          deltaFromLastMonth={approvalTrend.deltaFromLastMonth}
          topMovers={topMovers}
        />
        <div className="mt-3 space-y-1 text-center">
          <Link
            href={`/game/${game.id}/overview`}
            className="block font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-paper-faint)] hover:text-[var(--color-brass)]"
          >
            View Government Overview →
          </Link>
          <Link
            href={`/archive/${game.id}`}
            className="block font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-paper-faint)] hover:text-[var(--color-brass)]"
          >
            View National Archives →
          </Link>
        </div>
      </div>

      {view.phase === 'outcome' && view.result.headlines.length > 0 && (
        <div className="mt-6">
          <HeadlineTicker headlines={view.result.headlines} />
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-sm bg-[var(--color-bad-dim)] px-3.5 py-2.5 text-sm text-[var(--color-bad)]">
          {error}
        </p>
      )}

      {/* 3. Choose Your Presidential Action — visually distinct from the
          bottom nav's free room navigation: these are the things that
          consume this month's turn. The live crisis briefing renders
          directly beneath its own card (not after the other two cards and
          the advisor/inbox sections) so responding to it doesn't feel
          disconnected from choosing to. */}
      {view.phase === 'briefing' && (
        <div className="mt-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-paper-faint)]">
            Choose Your Presidential Action
          </div>
          <div className="mt-3">
            <ActionCard
              icon={ShieldAlert}
              title={event?.category === 'personnel' ? 'A Personnel Matter' : 'Respond to Crisis'}
              label={event ? event.title : 'No briefing this month'}
              detail={crisisPriority}
              tag={crisisTag}
              href={`/game/${game.id}`}
            />
          </div>

          {event && (
            <div className="mt-3">
              <CrisisCard
                key={event.id}
                event={event}
                month={game.currentMonth}
                gameId={game.id}
                flags={game.flags}
                onChoose={handleChoice}
                disabled={submitting}
                tense={isTenseMood(game, event)}
                roster={resolveRoster(game)}
                militaryOptionChoice={
                  isMilitaryOptionUnlocked(game, resolveRoster(game))
                    ? getMilitaryOptionChoice(event, game)
                    : null
                }
                campaignEra={game.campaignEra}
              />
            </div>
          )}

          <div className="mt-5 space-y-2.5">
            <ActionCard
              icon={Gavel}
              title="Propose Legislation"
              label={lawLabel}
              detail={lawDetail}
              tag={lawTag}
              href={`/game/${game.id}/congress`}
            />
            <ActionCard
              icon={Megaphone}
              title="Address the Nation"
              label="Deliver a speech to shape public opinion"
              tag="Optional"
              href={`/game/${game.id}/history`}
            />
          </div>
        </div>
      )}

      {/* 4. Advisor recommendation preview — rendered conversationally */}
      {view.phase === 'briefing' && topAdvisorRec && (
        <div className="mt-6">
          <Link
            href={`/game/${game.id}/cabinet`}
            className={cn(
              'block rounded-sm border border-l-2 bg-[var(--color-surface)] px-4 py-3.5 backdrop-blur-sm transition-colors hover:border-[var(--color-brass-dim)]',
              'border-[var(--color-border)]'
            )}
            style={{ borderLeftColor: `var(--color-${topAdvisorRec.severity === 'critical' ? 'bad' : topAdvisorRec.severity === 'warning' ? 'warn' : 'good'})` }}
          >
            <div className="flex items-start gap-3">
              {topAdvisorNpc?.image ? (
                <Image
                  src={topAdvisorNpc.image}
                  alt={topAdvisorNpc.shortName}
                  width={32}
                  height={32}
                  className="h-8 w-8 flex-shrink-0 rounded-sm object-cover"
                />
              ) : (
                <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-medium', AVATAR_COLORS[topAdvisorNpc?.avatarColor ?? 'gray'])}>
                  {topAdvisorRec.npcName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-[var(--color-brass)]">{topAdvisorRec.npcName}</span>
                <p className="mt-1 text-sm italic leading-snug text-[var(--color-paper-dim)]">
                  “{topAdvisorRec.detail}”
                </p>
                <span className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.05em] text-[var(--color-paper-faint)]">
                  <span className={cn('h-1.5 w-1.5 rounded-full', SEVERITY_DOT[topAdvisorRec.severity])} />
                  {topAdvisorRec.severity}
                </span>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* 5. Inbox Summary */}
      {view.phase === 'briefing' && (
        <div className="mt-6">
          <PresidentialInbox
            gameId={game.id}
            hasPendingCrisis={Boolean(event)}
            advisorMemoCount={advisorRecommendations.length}
            hasCongressionalUpdate={Boolean(opportunity)}
            showElectionCountdown={showElectionCountdown}
          />
        </div>
      )}

      <div className="mt-6">
        {view.phase === 'processing' && <ProcessingCard />}
        {view.phase === 'outcome' && (
          <OutcomeCard
            narrative={view.result.log.narrative ?? ''}
            effects={view.result.log.statDeltas}
            npcReactions={view.result.npcReactions}
            onContinue={handleContinue}
            nextMonth={view.result.game.currentMonth}
            isGameOver={false}
          />
        )}
      </div>
    </main>
  )
}
