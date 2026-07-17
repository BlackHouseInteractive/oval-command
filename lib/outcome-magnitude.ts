import { isDeltaGood } from '@/lib/utils'
import type { StatDelta } from '@/types/game'

export type OutcomeMagnitude = 'minor' | 'notable' | 'major'

// Only the six 0-100-point stats compete for "biggest mover" — debt,
// unemployment, and inflation move in tenths of a point per turn and would
// never meaningfully register against these on a shared scale.
const SAME_SCALE_STATS = ['approval', 'economy', 'security', 'congressSupport', 'unrest', 'globalReputation'] as const

// Calibrated against the actual distribution of event-choice deltas in
// data/events.json: median swing is 4 points, p90 is 8, p95 is 10 — so
// "major" is deliberately rare (roughly the top 5% of outcomes), not a
// coin flip that would cheapen the escalation by firing every other turn.
const MAJOR_THRESHOLD = 10
const NOTABLE_THRESHOLD = 6

export interface OutcomeSeverity {
  level: OutcomeMagnitude
  /** Whether the single biggest-moving stat swung the bad direction — decides whether a 'major' outcome gets the alarm treatment or a purely visual one. */
  negative: boolean
}

export function getOutcomeSeverity(effects: StatDelta): OutcomeSeverity {
  let maxAbs = 0
  let maxKey: (typeof SAME_SCALE_STATS)[number] | null = null
  let maxValue = 0
  for (const key of SAME_SCALE_STATS) {
    const v = effects[key] ?? 0
    if (Math.abs(v) > maxAbs) {
      maxAbs = Math.abs(v)
      maxKey = key
      maxValue = v
    }
  }
  const level: OutcomeMagnitude = maxAbs >= MAJOR_THRESHOLD ? 'major' : maxAbs >= NOTABLE_THRESHOLD ? 'notable' : 'minor'
  return { level, negative: maxKey !== null && !isDeltaGood(maxKey, maxValue) }
}

/** Per-stat-pill magnitude — same thresholds as getOutcomeSeverity, but keyed to one entry rather than the whole outcome, so only the pill(s) that actually swung hard get the bigger treatment. */
export function getStatMagnitude(key: string, value: number): OutcomeMagnitude {
  if (!(SAME_SCALE_STATS as readonly string[]).includes(key)) return 'minor'
  const abs = Math.abs(value)
  if (abs >= MAJOR_THRESHOLD) return 'major'
  if (abs >= NOTABLE_THRESHOLD) return 'notable'
  return 'minor'
}
