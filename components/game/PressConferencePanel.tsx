'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAudio } from '@/components/AudioProvider'
import { SPEECH_THEMES } from '@/lib/address-nation'
import { AchievementUnlockToast } from '@/components/game/AchievementUnlockToast'
import { HeadlineTicker } from '@/components/game/HeadlineTicker'
import { NpcReactionList } from '@/components/game/NpcReactionList'
import { useCountUp } from '@/components/game/ApprovalGauge'
import { STYLE_LABEL, sampleQuestions, scoreAnswers, COMPOSURE_BASELINE } from '@/lib/press-questions'
import type { PressQuestion, PressAnswer } from '@/lib/press-questions'
import type { SpeechTheme, Headline } from '@/lib/headlines'
import type { Achievement, NpcReactionResult } from '@/types/game'
import type { CoverContent } from '@/lib/magazine-covers'

interface PressConferencePanelProps {
  gameId: string
  pendingBriefingTitle: string | null
}

interface SpeechResult {
  effective: boolean
  composureTier: 'strong' | 'steady' | 'shaky'
  npcReactions: NpcReactionResult[]
  narrative: string
  headline: Headline
  cascadeHeadlines: Headline[]
  newAchievements: Achievement[]
  specialCovers: CoverContent[]
  month: number
}

// Same "minor" pause value GameClient.handleChoice uses for its own
// suspense beat — a brief pause to let the reporter's reaction register
// before the next question, not a new timing constant.
const FOLLOWUP_PAUSE_MS = 650

type PressPhase =
  | { phase: 'theme_select' }
  | { phase: 'podium'; theme: SpeechTheme; questions: PressQuestion[]; qIndex: number; answers: PressAnswer[] }
  | { phase: 'followup'; theme: SpeechTheme; questions: PressQuestion[]; qIndex: number; answers: PressAnswer[]; followUpText: string }
  | { phase: 'submitting' }
  | { phase: 'result'; result: SpeechResult }

export function PressConferencePanel({ gameId, pendingBriefingTitle }: PressConferencePanelProps) {
  const router = useRouter()
  const { playSfx } = useAudio()
  const [view, setView] = useState<PressPhase>({ phase: 'theme_select' })
  const [armedTheme, setArmedTheme] = useState<SpeechTheme | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Hooks must run unconditionally on every render (several branches below
  // return early), so this is computed here even on phases that don't
  // render the meter — scoreAnswers on an empty/irrelevant answers array
  // just resolves to the baseline, which is harmless to compute.
  const liveComposureScore =
    view.phase === 'podium' || view.phase === 'followup' ? scoreAnswers(view.answers) : COMPOSURE_BASELINE
  const displayComposureScore = Math.round(useCountUp(liveComposureScore))

  function handleThemeSelect(theme: SpeechTheme) {
    // Same "arm, then confirm" gate CongressClient/LawCard already use —
    // stepping to the podium (like the old immediate submit) also silently
    // advances the month, skipping any pending briefing without a response.
    if (pendingBriefingTitle && armedTheme !== theme) {
      setArmedTheme(theme)
      return
    }
    setArmedTheme(null)
    setError(null)
    playSfx('/audio/stings/address-camera.mp3')
    setView({ phase: 'podium', theme, questions: sampleQuestions(3), qIndex: 0, answers: [] })
  }

  async function handleAnswer(optionIndex: 0 | 1 | 2) {
    if (view.phase !== 'podium') return
    const question = view.questions[view.qIndex]
    const answers = [...view.answers, { questionId: question.id, optionIndex }]
    const followUpText = question.options[optionIndex].followUp

    setView({ phase: 'followup', theme: view.theme, questions: view.questions, qIndex: view.qIndex, answers, followUpText })
    await new Promise(resolve => window.setTimeout(resolve, FOLLOWUP_PAUSE_MS))

    if (view.qIndex + 1 < view.questions.length) {
      setView({ phase: 'podium', theme: view.theme, questions: view.questions, qIndex: view.qIndex + 1, answers })
      return
    }

    setView({ phase: 'submitting' })
    try {
      const res = await fetch(`/api/game/${gameId}/address-nation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: view.theme, pressAnswers: answers }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'The speech could not be delivered.')
      }

      const data = await res.json()
      setView({
        phase: 'result',
        result: {
          effective: data.effective,
          composureTier: data.composureTier,
          npcReactions: data.npcReactions ?? [],
          narrative: data.narrative,
          headline: data.headline,
          cascadeHeadlines: data.cascadeHeadlines ?? [],
          newAchievements: data.newAchievements ?? [],
          specialCovers: data.specialCovers ?? [],
          month: data.game.currentMonth,
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setView({ phase: 'theme_select' })
    }
  }

  if (view.phase === 'result') {
    const { result } = view
    return (
      <div className="rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-4 backdrop-blur-sm">
        <span
          className={cn(
            'font-mono text-[10px] uppercase tracking-[0.12em]',
            result.effective ? 'text-[var(--color-good)]' : 'text-[var(--color-bad)]'
          )}
        >
          {result.effective ? 'Speech Landed' : 'Speech Fell Flat'}
        </span>
        <p className="mt-1.5 text-sm text-[var(--color-paper-dim)]">{result.narrative}</p>
        <div className="mt-3">
          <HeadlineTicker headlines={[result.headline, ...result.cascadeHeadlines]} />
        </div>
        <NpcReactionList reactions={result.npcReactions} />
        {(result.newAchievements.length > 0 || result.specialCovers.length > 0) && (
          <div className="mt-3">
            <AchievementUnlockToast
              achievements={result.newAchievements}
              specialCovers={result.specialCovers}
              month={result.month}
            />
          </div>
        )}
        <button
          onClick={() => router.push(`/game/${gameId}`)}
          className="mt-3 w-full rounded-sm border border-[var(--color-brass-dim)] bg-[var(--color-brass)] py-2.5 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-90"
        >
          Return to the Oval Office
        </button>
      </div>
    )
  }

  if (view.phase === 'submitting') {
    return (
      <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-center backdrop-blur-sm">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-paper-faint)]">
          Filing the story…
        </span>
      </div>
    )
  }

  if (view.phase === 'podium' || view.phase === 'followup') {
    const question = view.questions[view.qIndex]

    return (
      <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-paper-faint)]">
            Question {view.qIndex + 1} of {view.questions.length}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--color-brass)]">
            Composure
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
          <div
            className="h-full rounded-full bg-[var(--color-brass)] transition-[width] duration-300"
            style={{ width: `${displayComposureScore}%` }}
          />
        </div>

        <p className="mt-4 text-sm italic leading-snug text-[var(--color-paper)]">
          &ldquo;{question.reporterPrompt}&rdquo;
        </p>

        {view.phase === 'followup' ? (
          <p className="mt-4 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[13px] leading-snug text-[var(--color-paper-dim)]">
            {view.followUpText}
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {question.options.map((option, i) => (
              <button
                key={option.style}
                onClick={() => handleAnswer(i as 0 | 1 | 2)}
                className="group w-full rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-3 py-2.5 text-left backdrop-blur-sm transition-colors hover:border-[var(--color-brass-dim)] hover:bg-[#202B3D]"
              >
                <div className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-brass-dim)] font-mono text-[11px] font-medium text-[var(--color-brass)]">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-paper-faint)]">
                      {STYLE_LABEL[option.style]}
                    </div>
                    <p className="mt-0.5 text-sm leading-snug text-[var(--color-paper)]">{option.responseText}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 backdrop-blur-sm">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-paper-faint)]">
        Address the Nation
      </div>
      <p className="mt-1.5 text-[12px] text-[var(--color-paper-faint)]">
        Take to the podium. Taking this action advances to next month.
      </p>

      {error && (
        <p className="mt-2 rounded-sm bg-[var(--color-bad-dim)] px-3 py-2 text-[12px] text-[var(--color-bad)]">
          {error}
        </p>
      )}

      <div className="mt-3 space-y-2">
        {SPEECH_THEMES.map(theme => {
          const armed = armedTheme === theme.id
          return (
            <button
              key={theme.id}
              onClick={() => handleThemeSelect(theme.id)}
              className={cn(
                'w-full rounded-sm border px-3 py-2.5 text-left transition-colors',
                armed
                  ? 'border-[var(--color-warn)] bg-[var(--color-surface-2)]'
                  : 'border-[var(--color-border-strong)] hover:border-[var(--color-brass-dim)]'
              )}
            >
              <div className={cn('text-sm font-medium', armed ? 'text-[var(--color-warn)]' : 'text-[var(--color-paper)]')}>
                {armed ? `Confirm — Skip "${pendingBriefingTitle}"` : theme.label}
              </div>
              {!armed && (
                <p className="mt-0.5 text-[12px] text-[var(--color-paper-faint)]">{theme.description}</p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
