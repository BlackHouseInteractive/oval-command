'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { LawCard } from '@/components/game/LawCard'
import { HeadlineTicker } from '@/components/game/HeadlineTicker'
import { RoomBackground, roomAccentStyle } from '@/components/game/RoomBackground'
import { RoomAmbience } from '@/components/game/RoomAmbience'
import { RoomLayout } from '@/components/game/RoomLayout'
import { AchievementUnlockToast } from '@/components/game/AchievementUnlockToast'
import { NpcReactionList } from '@/components/game/NpcReactionList'
import { useCountUp } from '@/components/game/ApprovalGauge'
import { useAudio } from '@/components/AudioProvider'
import { getRoomTreatment, getRoomImage, isTenseMood } from '@/lib/event-backgrounds'
import { getRoomAmbience } from '@/lib/room-audio'
import { LAW_SECTOR_META, LAW_SECTORS } from '@/lib/law-sectors'
import { WHIP_ORDER, WHIP_TARGETS, WHIP_STYLE_LABEL, scoreWhipBonus } from '@/lib/whip-content'
import type { WhipAnswer } from '@/lib/whip-content'
import { cn } from '@/lib/utils'
import type { Game, Law, Headline, Achievement, LawSector, NpcReactionResult, Npc } from '@/types/game'
import type { CoverContent } from '@/lib/magazine-covers'
import type { LegislativeOpportunity } from '@/lib/law-engine'

interface LawWithOdds {
  law: Law
  probability: number
  alreadyPassed: boolean
  blocked: boolean
  locked: boolean
  /** True when law.contentId is set and the requesting user doesn't own it — a Story Pack law not yet purchased, distinct from `locked`'s flag-gating. */
  contentLocked: boolean
}

interface CongressClientProps {
  game: Game
  lawsWithOdds: LawWithOdds[]
  canUseSenateAbility: boolean
  canUseSpeakerAbility: boolean
  pendingBriefingTitle: string | null
  opportunity: LegislativeOpportunity | null
  /** The 3 whip-mini-game leaders (speaker/senate_leader/opposition_leader), era-resolved. */
  whipTargets: Npc[]
}

// Same "minor" pause value GameClient.handleChoice/PressConferencePanel use
// for their own suspense beats.
const WHIP_FOLLOWUP_PAUSE_MS = 650

type WhipState =
  | { stage: 'asking'; lawId: string; leaderIndex: number; answers: WhipAnswer[] }
  | { stage: 'followup'; lawId: string; leaderIndex: number; answers: WhipAnswer[]; followUpText: string }

const SECTOR_FILTERS = [
  { value: 'all' as const, label: 'All Bills' },
  ...LAW_SECTORS.map(s => ({ value: s, label: LAW_SECTOR_META[s].label })),
]

interface ProposeResult {
  passed: boolean
  probability: number
  usedAbility: string | null
  headline: Headline
  cascadeHeadlines: Headline[]
  lawTitle: string
  newAchievements: Achievement[]
  npcReactions: NpcReactionResult[]
  specialCovers: CoverContent[]
  month: number
}

export function CongressClient({ game, lawsWithOdds, canUseSenateAbility, canUseSpeakerAbility, pendingBriefingTitle, opportunity, whipTargets }: CongressClientProps) {
  const searchParams = useSearchParams()
  const highlightedLawId = searchParams.get('highlight')

  // If an advisor sent us here for a specific law, auto-select the
  // sector filter that contains it so it's visible without the player
  // having to guess which tab to click.
  const highlightedLaw = highlightedLawId ? lawsWithOdds.find(l => l.law.id === highlightedLawId) : undefined
  const [filter, setFilter] = useState<'all' | LawSector>(
    highlightedLaw ? highlightedLaw.law.sector : 'all'
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ProposeResult | null>(null)
  const [pendingProposal, setPendingProposal] = useState<{ lawId: string; useNpcAbility?: 'senate_leader' | 'speaker' } | null>(null)
  const [whip, setWhip] = useState<WhipState | null>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const { playSfx } = useAudio()
  const roomAmbience = getRoomAmbience('/congress-bg.webp', game.campaignEra)

  // Hooks must run unconditionally on every render (several branches below
  // return early), so the live whip-odds meter is computed here even on
  // renders where it isn't shown.
  const whipBaseProbability = whip ? lawsWithOdds.find(l => l.law.id === whip.lawId)?.probability ?? 0 : 0
  const liveWhipBonus = whip ? scoreWhipBonus(whip.answers, game.npcRelationships) : 0
  const liveWhipProbability = whip
    ? Math.max(1, Math.min(95, Math.round(whipBaseProbability + liveWhipBonus)))
    : 0
  const displayWhipProbability = Math.round(useCountUp(liveWhipProbability))

  const filtered = filter === 'all' ? lawsWithOdds : lawsWithOdds.filter(l => l.law.sector === filter)
  // No specific pending CrisisEvent object on hand here (just its title) —
  // active conflicts and low approval are still enough to swap the mood.
  const roomImage = getRoomImage('/congress-bg.webp', isTenseMood(game), game.campaignEra)
  const treatment = getRoomTreatment(roomImage)

  // Sector momentum — small "N/M passed" badge per tab, purely presentational.
  const sectorCounts: Record<string, { passed: number; total: number }> = {}
  for (const s of LAW_SECTORS) {
    const inSector = lawsWithOdds.filter(l => l.law.sector === s)
    sectorCounts[s] = { passed: inSector.filter(l => l.alreadyPassed).length, total: inSector.length }
  }

  // Scroll the highlighted law into view once the page settles
  useEffect(() => {
    if (highlightedLawId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedLawId])

  async function submitProposal(lawId: string, useNpcAbility?: 'senate_leader' | 'speaker', whipAnswers?: WhipAnswer[]) {
    setSubmitting(true)
    setError(null)

    const lawTitle = lawsWithOdds.find(l => l.law.id === lawId)?.law.title ?? lawId

    try {
      const res = await fetch(`/api/game/${game.id}/law`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lawId, useNpcAbility, whipAnswers }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'The bill could not be processed.')
      }

      const data = await res.json()
      playSfx(data.passageResult.passed ? '/audio/stings/law-passed.mp3' : '/audio/composites/law-failed.mp3')
      setResult({
        passed: data.passageResult.passed,
        probability: data.passageResult.probability,
        usedAbility: data.passageResult.usedAbility,
        headline: data.headline,
        cascadeHeadlines: data.cascadeHeadlines ?? [],
        lawTitle,
        newAchievements: data.newAchievements ?? [],
        npcReactions: data.npcReactions ?? [],
        specialCovers: data.specialCovers ?? [],
        month: data.game.currentMonth,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
      setPendingProposal(null)
      setWhip(null)
    }
  }

  function handlePropose(lawId: string, useNpcAbility?: 'senate_leader' | 'speaker') {
    if (submitting) return

    // First click on a law when a briefing is still pending just arms the
    // confirmation instead of submitting — proposing a law advances the
    // month exactly like answering the briefing would, silently skipping it.
    const isConfirmed = pendingProposal?.lawId === lawId && pendingProposal?.useNpcAbility === useNpcAbility
    if (pendingBriefingTitle && !isConfirmed) {
      setPendingProposal({ lawId, useNpcAbility })
      return
    }
    setPendingProposal(null)

    // A guaranteed-passage ability makes the whip mini-game pointless —
    // resolve immediately, same as before. Only a plain Propose enters
    // the whip sequence.
    if (useNpcAbility) {
      submitProposal(lawId, useNpcAbility)
      return
    }

    setError(null)
    setWhip({ stage: 'asking', lawId, leaderIndex: 0, answers: [] })
  }

  async function handleWhipAnswer(styleIndex: 0 | 1 | 2) {
    if (!whip || whip.stage !== 'asking') return
    const leaderId = WHIP_ORDER[whip.leaderIndex]
    const option = WHIP_TARGETS[leaderId].options[styleIndex]
    const answers = [...whip.answers, { npcId: leaderId, styleIndex }]

    setWhip({ stage: 'followup', lawId: whip.lawId, leaderIndex: whip.leaderIndex, answers, followUpText: option.followUp })
    await new Promise(resolve => window.setTimeout(resolve, WHIP_FOLLOWUP_PAUSE_MS))

    if (whip.leaderIndex + 1 < WHIP_ORDER.length) {
      setWhip({ stage: 'asking', lawId: whip.lawId, leaderIndex: whip.leaderIndex + 1, answers })
      return
    }

    submitProposal(whip.lawId, undefined, answers)
  }

  if (whip) {
    const leaderId = WHIP_ORDER[whip.leaderIndex]
    const leader = whipTargets.find(n => n.id === leaderId)
    const target = WHIP_TARGETS[leaderId]
    const lawTitle = lawsWithOdds.find(l => l.law.id === whip.lawId)?.law.title ?? ''

    return (
      <main className="mx-auto max-w-3xl px-6 py-12" style={roomAccentStyle('var(--color-cat-congress)')}>
        <RoomBackground
          image={roomImage}
          color="var(--color-cat-congress)"
          backgroundPosition={treatment.backgroundPosition}
          foreground={{ style: treatment.foregroundStyle, color: treatment.foregroundColor }}
        />
        <RoomAmbience src={roomAmbience} />
        <div className="rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-paper-faint)]">
              Whipping Votes — {lawTitle}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--color-brass)]">
              Pass Odds
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-paper-faint)]">
              Leader {whip.leaderIndex + 1} of {WHIP_ORDER.length}
            </span>
            <span className="font-mono text-sm font-medium text-[var(--color-brass)]">
              {displayWhipProbability}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
            <div
              className="h-full rounded-full bg-[var(--color-brass)] transition-[width] duration-300"
              style={{ width: `${displayWhipProbability}%` }}
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)] font-mono text-[12px] font-medium text-[var(--color-brass)] backdrop-blur-sm">
              {(leader?.shortName ?? '??').split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--color-paper)]">{leader?.shortName ?? 'Leadership'}</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--color-paper-faint)]">{leader?.role}</div>
            </div>
          </div>

          <p className="mt-3 text-sm italic leading-snug text-[var(--color-paper)]">
            {target.prompt}
          </p>

          {whip.stage === 'followup' ? (
            <p className="mt-4 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[13px] leading-snug text-[var(--color-paper-dim)]">
              {whip.followUpText}
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {target.options.map((option, i) => (
                <button
                  key={option.style}
                  onClick={() => handleWhipAnswer(i as 0 | 1 | 2)}
                  className="group w-full rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-3 py-2.5 text-left backdrop-blur-sm transition-colors hover:border-[var(--color-brass-dim)] hover:bg-[#202B3D]"
                >
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-brass-dim)] font-mono text-[11px] font-medium text-[var(--color-brass)]">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-paper-faint)]">
                        {WHIP_STYLE_LABEL[option.style]}
                      </div>
                      <p className="mt-0.5 text-sm leading-snug text-[var(--color-paper)]">{option.askText}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    )
  }

  if (result) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12" style={roomAccentStyle('var(--color-cat-congress)')}>
        <RoomBackground
          image={roomImage}
          color="var(--color-cat-congress)"
          backgroundPosition={treatment.backgroundPosition}
          foreground={{ style: treatment.foregroundStyle, color: treatment.foregroundColor }}
        />
        <RoomAmbience src={roomAmbience} />
        <div className="rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] backdrop-blur-sm">
          <div className="brief-rule" />
          <div className="p-6 text-center">
            <span
              className={cn(
                'font-mono text-[10px] uppercase tracking-[0.12em]',
                result.passed ? 'text-[var(--color-good)]' : 'text-[var(--color-bad)]'
              )}
            >
              {result.passed ? 'Bill Passed' : 'Bill Failed'}
            </span>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-paper)]">
              {result.lawTitle}
            </h2>
            {result.usedAbility && (
              <p className="mt-1 font-mono text-xs text-[var(--color-brass)]">
                Passed via {result.usedAbility}
              </p>
            )}
            <p className="mt-3 text-sm text-[var(--color-paper-dim)]">
              {result.passed ? 'Congress voted yes' : 'Congress voted no'} — {result.probability}% odds going in
            </p>

            <div className="mt-5">
              <HeadlineTicker headlines={[result.headline, ...result.cascadeHeadlines]} />
            </div>

            <NpcReactionList reactions={result.npcReactions} />

            {(result.newAchievements.length > 0 || result.specialCovers.length > 0) && (
              <div className="mt-5 text-left">
                <AchievementUnlockToast
                  achievements={result.newAchievements}
                  specialCovers={result.specialCovers}
                  month={result.month}
                />
              </div>
            )}

            <Link
              href={`/game/${game.id}`}
              className="mt-6 block w-full rounded-sm border border-[var(--color-brass-dim)] bg-[var(--color-brass)] py-3 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-90"
            >
              Return to the Oval Office
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const suggestedOdds = opportunity?.suggested
    ? lawsWithOdds.find(l => l.law.id === opportunity.suggested!.id)
    : undefined

  return (
    <main className="mx-auto max-w-6xl px-6 py-10" style={roomAccentStyle('var(--color-cat-congress)')}>
      <RoomBackground
        image={roomImage}
        color="var(--color-cat-congress)"
        backgroundPosition={treatment.backgroundPosition}
        foreground={{ style: treatment.foregroundStyle, color: treatment.foregroundColor }}
      />
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-cat-congress)]">
          Congress
        </div>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-paper)]">
          Propose Legislation
        </h1>
      </div>

      {error && (
        <p className="mt-4 rounded-sm bg-[var(--color-bad-dim)] px-3.5 py-2.5 text-sm text-[var(--color-bad)]">
          {error}
        </p>
      )}

      <div className="mt-6">
        <RoomLayout
          left={
            <div className="flex flex-wrap gap-2 lg:flex-col lg:flex-nowrap lg:items-stretch">
              {SECTOR_FILTERS.map(f => {
                const counts = f.value === 'all' ? null : sectorCounts[f.value]
                return (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={cn(
                      'rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.05em] transition-colors lg:rounded-sm lg:text-left',
                      filter === f.value
                        ? 'bg-[var(--color-brass)] text-[var(--color-ink)]'
                        : 'bg-[var(--color-surface)] text-[var(--color-paper-faint)] backdrop-blur-sm hover:text-[var(--color-paper)]'
                    )}
                  >
                    {f.label}
                    {counts && <span className="ml-1 opacity-70">{counts.passed}/{counts.total}</span>}
                  </button>
                )
              })}
            </div>
          }
          center={
            <div className="space-y-3">
              {filtered.map(({ law, probability, alreadyPassed, blocked, locked, contentLocked }) => (
                <div
                  key={law.id}
                  ref={law.id === highlightedLawId ? highlightRef : undefined}
                  className={cn(
                    law.id === highlightedLawId &&
                      'rounded-sm ring-2 ring-[var(--color-brass)] ring-offset-2 ring-offset-[var(--color-ink)]'
                  )}
                >
                  <LawCard
                    law={law}
                    probability={probability}
                    alreadyPassed={alreadyPassed}
                    blocked={blocked}
                    locked={locked}
                    contentLocked={contentLocked}
                    canUseSenateAbility={canUseSenateAbility && !alreadyPassed && !blocked && !locked && !contentLocked}
                    canUseSpeakerAbility={canUseSpeakerAbility && !alreadyPassed && !blocked && !locked && !contentLocked}
                    onPropose={handlePropose}
                    disabled={submitting}
                    pendingProposal={pendingProposal}
                    pendingBriefingTitle={pendingBriefingTitle}
                  />
                </div>
              ))}
            </div>
          }
          right={
            opportunity && suggestedOdds ? (
              <div className="rounded-sm border border-[var(--color-brass)]/30 bg-[var(--color-brass)]/5 p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-brass)]">
                  Recommended
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--color-paper)]">{suggestedOdds.law.title}</p>
                <p className="mt-1 text-xs text-[var(--color-paper-dim)]">{opportunity.message}</p>
                <p className="mt-2 font-mono text-[11px] text-[var(--color-paper-faint)]">
                  {Math.round(suggestedOdds.probability)}% chance of passage
                </p>
              </div>
            ) : undefined
          }
        />
      </div>
    </main>
  )
}
