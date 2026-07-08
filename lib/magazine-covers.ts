/**
 * Magazine Covers — a stylized "issue cover" moment on big accomplishments,
 * collectible on the National Archives. Achievement-based covers reuse the
 * existing Achievement objects directly (see AchievementUnlockToast); this
 * module covers the handful of *special editions* that aren't tied to the
 * achievement checklist, plus the one cover every administration is
 * guaranteed to end with.
 */

import type { Game, GameOverReason, LegacyScore } from '@/types/game'

export interface CoverContent {
  id:       string
  icon:     string
  headline: string
  subhead:  string
}

const LEGENDARY_LEGACY_THRESHOLD = 95
const APPROVAL_MILESTONE = 90

/**
 * Evaluated once, at the moment a game ends — reuses data already on the
 * final Game object (approvalHistory, legacy score) rather than needing
 * turn-by-turn before/after detection.
 */
export function computeSpecialEditionCovers(game: Game, reason: GameOverReason, legacy: LegacyScore): CoverContent[] {
  const covers: CoverContent[] = []

  if (reason === 'IMPEACHMENT') {
    covers.push({
      id:       'special_impeachment',
      icon:     '⚖️',
      headline: 'Removed from Office',
      subhead:  'A presidency ends in impeachment — a rare, unmistakable headline.',
    })
  }

  if (Math.max(0, ...game.approvalHistory) >= APPROVAL_MILESTONE) {
    covers.push({
      id:       'special_approval_90',
      icon:     '📈',
      headline: 'Approval Soars Past 90%',
      subhead:  'A rare show of national unity behind the administration.',
    })
  }

  // Gated to a completed term — a legacy score this high is reachable even
  // on a DEBT_COLLAPSE ending (debt itself isn't a term in the score
  // formula), which would otherwise print "one for the ages" on a
  // presidency that just collapsed. "Legendary" is a verdict on a full
  // term, not a stat snapshot.
  if (reason === 'TERM_COMPLETE' && legacy.total >= LEGENDARY_LEGACY_THRESHOLD) {
    covers.push({
      id:       'special_legacy_95',
      icon:     '🏆',
      headline: 'A Legendary Presidency',
      subhead:  `Historians already call it one for the ages — Legacy Score ${legacy.total}.`,
    })
  }

  // Guaranteed Final Edition — every administration gets a closing cover,
  // even a quiet term with no achievements or specials earned. Duration
  // reflects how the term actually ended — "Four Years" would be wrong for
  // any of the early-exit reasons, which end before month 48.
  const duration = reason === 'TERM_COMPLETE' ? 'Four Years' : `${game.currentMonth} Month${game.currentMonth === 1 ? '' : 's'}`
  covers.push({
    id:       'final_edition',
    icon:     '🏛️',
    headline: `${game.presidentName}: ${duration} in Review`,
    subhead:  'Legacy Edition',
  })

  return covers
}
