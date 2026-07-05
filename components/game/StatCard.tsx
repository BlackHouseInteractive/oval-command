import { cn, formatStat, getStatLabel, getStatBarPercent, formatDelta, isDeltaGood } from '@/lib/utils'
import type { GameStats } from '@/types/game'

interface StatCardProps {
  statKey: keyof GameStats
  value: number
  /** Optional month-over-month delta (see lib/stat-trends.ts). Omit for no arrow. */
  trendDelta?: number
}

/**
 * Determines bar/text color by stat semantics — debt/unrest/unemployment/inflation
 * are "lower is better", everything else is "higher is better".
 */
export function getStatTone(statKey: keyof GameStats, value: number): 'good' | 'warn' | 'bad' {
  if (statKey === 'debt') {
    if (value > 48) return 'bad'
    if (value > 40) return 'warn'
    return 'good'
  }
  if (statKey === 'unrest') {
    if (value > 65) return 'bad'
    if (value > 35) return 'warn'
    return 'good'
  }
  if (statKey === 'unemployment' || statKey === 'inflation') {
    if (value > 7) return 'bad'
    if (value > 4) return 'warn'
    return 'good'
  }
  if (statKey === 'mediaScore') {
    if (value < -1) return 'bad'
    if (value < 0.5) return 'warn'
    return 'good'
  }

  if (value >= 60) return 'good'
  if (value >= 38) return 'warn'
  return 'bad'
}

export const TONE_CLASSES = {
  good: { text: 'text-[var(--color-good)]', bar: 'bg-[var(--color-good)]' },
  warn: { text: 'text-[var(--color-warn)]', bar: 'bg-[var(--color-warn)]' },
  bad:  { text: 'text-[var(--color-bad)]',  bar: 'bg-[var(--color-bad)]'  },
} as const

export function StatCard({ statKey, value, trendDelta }: StatCardProps) {
  const tone = getStatTone(statKey, value)
  const toneClass = TONE_CLASSES[tone]
  const barPercent = Math.max(2, Math.min(100, getStatBarPercent(statKey, value)))
  const hasTrend = typeof trendDelta === 'number' && Math.abs(trendDelta) > 0.05
  const trendGood = hasTrend && isDeltaGood(statKey, trendDelta)

  return (
    <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 backdrop-blur-sm">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-paper-faint)]">
          {getStatLabel(statKey)}
        </span>
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={cn('font-mono text-xl font-medium tabular-nums', toneClass.text)}>
          {formatStat(statKey, value)}
        </span>
        {hasTrend && (
          <span className={cn('font-mono text-[11px]', trendGood ? 'text-[var(--color-good)]' : 'text-[var(--color-bad)]')}>
            {trendDelta! > 0 ? '▲' : '▼'} {formatDelta(statKey, trendDelta!)}
          </span>
        )}
      </div>
      <div className="mt-2 h-[3px] w-full rounded-full bg-[var(--color-border)]">
        <div
          className={cn('h-full rounded-full transition-all duration-500', toneClass.bar)}
          style={{ width: `${barPercent}%` }}
        />
      </div>
    </div>
  )
}
