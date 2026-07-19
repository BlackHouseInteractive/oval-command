'use client'

import { useState, useEffect } from 'react'
import { cn, formatDelta, isDeltaGood, getStatLabel } from '@/lib/utils'
import { isBreakingEvent, getEventCallback } from '@/lib/game-engine'
import { getEventBackground, getEventAccentColor, getRoomTreatment, getRoomImage } from '@/lib/event-backgrounds'
import { getRoomAmbience } from '@/lib/room-audio'
import { useAudio } from '@/components/AudioProvider'
import { RoomBackground, roomAccentStyle } from './RoomBackground'
import { RoomAmbience } from './RoomAmbience'
import { CategoryTag } from './CategoryTag'
import { IntelligenceBriefing } from './IntelligenceBriefing'
import type { CrisisEvent, EventChoice, StatDelta, GameStats, Npc } from '@/types/game'

interface CrisisCardProps {
  event: CrisisEvent
  month: number
  gameId: string
  flags: Record<string, boolean>
  onChoose: (choiceIndex: number) => void
  disabled?: boolean
  /** Whether the room backdrop should show its tense/crisis variant — see lib/event-backgrounds.ts's isTenseMood. */
  tense?: boolean
  /** Resolved roster, only needed to label speaker names on event.dialogueSequence (personnel scenes) — every other event type ignores this. */
  roster?: Npc[]
  /** SecDef's Military Option — a 5th, exclusive choice on military-category events, only present when unlocked. See lib/military-option.ts. */
  militaryOptionChoice?: EventChoice | null
  /** Resolves the era-correct ambience track for this event's backdrop — see lib/room-audio.ts. */
  campaignEra?: string
}

function EffectPreview({ effects }: { effects: StatDelta }) {
  const entries = Object.entries(effects).filter(([, v]) => v !== 0) as [keyof GameStats, number][]
  if (entries.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
      {entries.map(([key, value]) => {
        const good = isDeltaGood(key, value)
        return (
          <span
            key={key}
            className={cn(
              'font-mono text-[11px]',
              good ? 'text-[var(--color-good)]' : 'text-[var(--color-bad)]'
            )}
          >
            {getStatLabel(key)} {formatDelta(key, value)}
          </span>
        )
      })}
    </div>
  )
}

export function CrisisCard({ event, month, gameId, flags, onChoose, disabled, tense, roster, militaryOptionChoice, campaignEra }: CrisisCardProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const breaking = isBreakingEvent(event)
  const callback = getEventCallback(event, flags)
  const { playSfx, duckAmbient, unduckAmbient } = useAudio()
  const hasDialogue = Boolean(event.dialogueSequence && event.dialogueSequence.length > 0)

  // Ducks room ambience ~6dB for the length of a personnel scene's
  // dialogue exchange — not a mute, just enough that the lines read as
  // the focus rather than competing with the room. key={event.id} means
  // this mounts/unmounts once per event, so unduck always fires on the
  // way out (choice made or event replaced), never left stuck ducked.
  useEffect(() => {
    if (!hasDialogue) return
    duckAmbient()
    return () => unduckAmbient()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // key={event.id} on this component (see GameClient) means it remounts per
  // event, so this fires exactly once when a fresh briefing appears.
  // Breaking events get the phone-buzz notification immediately, then the
  // bigger camera/newsroom/TV moment right behind it — the notification
  // is what pulls attention, the "major" cue is the story actually
  // breaking. The crisis pulse is reserved for 'security' events only
  // (not the broader scandal/security "High Priority" heuristic used
  // elsewhere) — CrisisEvent has no explicit severity field, and security
  // crises are the closest proxy to "severe" without firing on every
  // routine scandal. Deliberately rare: it should lose meaning if the
  // player starts expecting it.
  useEffect(() => {
    if (breaking) {
      playSfx('/audio/ui/notification.mp3')
      window.setTimeout(() => playSfx('/audio/composites/breaking-news-major.mp3'), 250)
    } else if (event.category === 'security') {
      playSfx('/audio/stings/crisis-pulse.mp3')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChoose = (index: number) => {
    if (disabled) return
    setSelected(index)
    onChoose(index)
  }

  const backgroundImage = getRoomImage(getEventBackground(event.category), Boolean(tense))
  const accentColor = getEventAccentColor(event.category)
  const treatment = getRoomTreatment(backgroundImage)

  return (
    <>
      <RoomBackground
        image={backgroundImage}
        color={accentColor}
        backgroundPosition={treatment.backgroundPosition}
        foreground={{ style: treatment.foregroundStyle, color: treatment.foregroundColor }}
      />
      <RoomAmbience src={getRoomAmbience(getEventBackground(event.category), campaignEra)} />

      <div
        style={{
          ...roomAccentStyle(accentColor),
          boxShadow: breaking ? '0 0 24px color-mix(in srgb, var(--color-bad) 35%, transparent)' : undefined,
        }}
        className={cn(
          'rounded-sm border bg-[var(--color-surface)] backdrop-blur-sm',
          breaking ? 'border-[var(--color-bad)]' : 'border-[var(--color-border-strong)]'
        )}
      >
      <div className={breaking ? undefined : 'brief-rule'} style={breaking ? { height: 2, background: 'var(--color-bad)' } : undefined} />
      <div className="p-6">
        <div className="flex items-center justify-between">
          <CategoryTag category={event.category} />
          {breaking ? (
            <span className="animate-pulse rounded-sm bg-[var(--color-bad)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-paper)]">
              Breaking News
            </span>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-paper-faint)]">
              {`Month ${month} Briefing`}
            </span>
          )}
        </div>

        <h2 className={cn(
          'mt-3 font-[family-name:var(--font-display)] text-xl font-semibold leading-snug text-[var(--color-paper)]',
          breaking && 'animate-breaking-title'
        )}>
          {event.title}
        </h2>

        {event.isHistorical && event.historicalContext && (
          <div className="mt-3 flex items-start gap-2 rounded-sm border border-[var(--color-brass-dim)]/40 bg-[var(--color-brass)]/[0.06] px-3 py-2">
            <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--color-brass)] whitespace-nowrap">
              Based on history
            </span>
            <p className="text-[12px] leading-snug text-[var(--color-paper-dim)]">
              {event.historicalContext}
            </p>
          </div>
        )}

        <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-paper-dim)]">
          {event.description}
        </p>

        {callback && (
          <p className="mt-2 text-[13px] italic leading-snug text-[var(--color-paper-faint)]">
            {callback}
          </p>
        )}

        {event.dialogueSequence && event.dialogueSequence.length > 0 && (
          <div className="mt-4 space-y-2.5 border-l-2 border-[var(--color-border)] pl-3">
            {event.dialogueSequence.map((line, i) => {
              const speaker = roster?.find(n => n.id === line.npcId)
              return (
                <p key={i} className="text-[14px] leading-snug text-[var(--color-paper-dim)]">
                  <span className="font-medium text-[var(--color-paper)]">{speaker?.shortName ?? line.npcId}:</span>{' '}
                  <span className="italic">&ldquo;{line.line}&rdquo;</span>
                </p>
              )
            })}
          </div>
        )}

        <IntelligenceBriefing gameId={gameId} event={event} />

        <div className="mt-6 space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-paper-faint)]">
            Your Decision
          </div>
          {event.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => handleChoose(i)}
              disabled={disabled}
              className={cn(
                'group w-full rounded-sm border px-4 py-3.5 text-left transition-colors',
                'border-[var(--color-border)] bg-[var(--color-surface-2)] backdrop-blur-sm',
                !disabled && 'hover:border-[var(--color-brass-dim)] hover:bg-[#202B3D]',
                disabled && selected === i && 'border-[var(--color-brass)]',
                disabled && selected !== i && 'opacity-40',
                disabled && 'cursor-default'
              )}
            >
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-brass-dim)] font-mono text-[11px] font-medium text-[var(--color-brass)]">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm leading-snug text-[var(--color-paper)]">{choice.text}</p>
                  <EffectPreview effects={choice.effects} />
                </div>
              </div>
            </button>
          ))}
          {militaryOptionChoice && (
            <button
              onClick={() => handleChoose(militaryOptionChoice.index)}
              disabled={disabled}
              className={cn(
                'group w-full rounded-sm border-2 border-dashed px-4 py-3.5 text-left transition-colors',
                'border-[var(--color-bad)]/50 bg-[var(--color-bad)]/[0.06] backdrop-blur-sm',
                !disabled && 'hover:border-[var(--color-bad)] hover:bg-[var(--color-bad)]/[0.12]',
                disabled && selected === militaryOptionChoice.index && 'border-[var(--color-bad)]',
                disabled && selected !== militaryOptionChoice.index && 'opacity-40',
                disabled && 'cursor-default'
              )}
            >
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-bad)]/60 font-mono text-[11px] font-medium text-[var(--color-bad)]">
                  ⚔
                </span>
                <div className="flex-1">
                  <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-bad)]">
                    Military Option — Secretary of Defense
                  </div>
                  <p className="mt-1 text-sm leading-snug text-[var(--color-paper)]">{militaryOptionChoice.text}</p>
                  <EffectPreview effects={militaryOptionChoice.effects} />
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
      </div>
    </>
  )
}
