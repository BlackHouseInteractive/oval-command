/**
 * Per-stat trend derivation for the Oval Office redesign.
 *
 * Only `Game.approvalHistory` has a persisted history array. Rather than
 * add a new persisted history field for every other stat (a schema change
 * hits real friction on this project — Supabase's pooled DATABASE_URL
 * can't run `db push`), trends are derived on read from GameLog.statDeltas,
 * which already records every turn's effect on every stat. Real historical
 * data, not randomized/fake — just reconstructed rather than stored twice.
 */

import type { GameLog, GameStats } from '@/types/game'

export interface StatTrend {
  /** Chronological (oldest first), ending at the current value. */
  points: number[]
  deltaFromLastMonth: number
  direction: 'up' | 'down' | 'flat'
}

/**
 * @param recentLogsDesc GameLog rows for this game, most-recent-month first.
 */
export function computeStatTrend(
  currentValue: number,
  recentLogsDesc: GameLog[],
  statKey: keyof GameStats
): StatTrend {
  const values: number[] = [currentValue]
  let running = currentValue
  for (const log of recentLogsDesc) {
    const delta = (log.statDeltas as Partial<Record<string, number>>)[statKey] ?? 0
    running -= delta
    values.push(running)
  }
  values.reverse()

  const deltaFromLastMonth = values.length >= 2
    ? values[values.length - 1] - values[values.length - 2]
    : 0
  const direction = deltaFromLastMonth > 0.4 ? 'up' : deltaFromLastMonth < -0.4 ? 'down' : 'flat'

  return { points: values, deltaFromLastMonth, direction }
}

export interface TopMover {
  key: keyof GameStats
  delta: number
}

/**
 * The N stats that moved the most (by absolute magnitude) in the most
 * recent month's log(s) — "why did approval change" at a glance.
 */
export function getTopMovers(recentLogsDesc: GameLog[], n = 3): TopMover[] {
  if (recentLogsDesc.length === 0) return []

  const latestMonth = recentLogsDesc[0].month
  const relevant = recentLogsDesc.filter(l => l.month === latestMonth)

  const totals: Partial<Record<keyof GameStats, number>> = {}
  for (const log of relevant) {
    for (const [key, value] of Object.entries(log.statDeltas)) {
      if (!value) continue
      const k = key as keyof GameStats
      totals[k] = (totals[k] ?? 0) + (value as number)
    }
  }

  return (Object.entries(totals) as [keyof GameStats, number][])
    .filter(([, v]) => v !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, n)
    .map(([key, delta]) => ({ key, delta }))
}
