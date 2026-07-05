'use client'

import { useState } from 'react'
import { cn, getStatLabel, formatStat } from '@/lib/utils'
import { StatCard, getStatTone, TONE_CLASSES } from '@/components/game/StatCard'
import { StatIcon } from '@/components/game/StatIcon'
import { MiniSparkline } from '@/components/game/MiniSparkline'
import type { GameStats } from '@/types/game'
import type { StatTrend } from '@/lib/stat-trends'

const ALL_STAT_KEYS: (keyof GameStats)[] = [
  'approval', 'economy', 'security', 'congressSupport',
  'debt', 'unrest', 'globalReputation', 'unemployment',
  'baseSupport', 'partyUnity', 'militaryReadiness', 'inflation', 'mediaScore',
]

interface GovernmentOverviewViewProps {
  stats: GameStats
  trends: Record<keyof GameStats, StatTrend>
}

export function GovernmentOverviewView({ stats, trends }: GovernmentOverviewViewProps) {
  const [tab, setTab] = useState<'stats' | 'trends'>('stats')

  return (
    <div>
      <div className="flex gap-2">
        {(['stats', 'trends'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.05em] transition-colors',
              tab === t
                ? 'bg-[var(--color-brass)] text-[var(--color-ink)]'
                : 'bg-[var(--color-surface)] text-[var(--color-paper-faint)] backdrop-blur-sm hover:text-[var(--color-paper)]'
            )}
          >
            {t === 'stats' ? 'Stats' : 'Trends'}
          </button>
        ))}
      </div>

      {tab === 'stats' && (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {ALL_STAT_KEYS.map(key => (
            <StatCard key={key} statKey={key} value={stats[key]} trendDelta={trends[key].deltaFromLastMonth} />
          ))}
        </div>
      )}

      {tab === 'trends' && (
        <div className="mt-4 space-y-2.5">
          {ALL_STAT_KEYS.map(key => {
            const tone = getStatTone(key, stats[key])
            const toneClass = TONE_CLASSES[tone]
            return (
              <div key={key} className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <StatIcon statKey={key} size={14} className="text-[var(--color-paper-faint)]" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-paper-faint)]">
                      {getStatLabel(key)}
                    </span>
                  </div>
                  <span className={cn('font-mono text-sm font-medium tabular-nums', toneClass.text)}>
                    {formatStat(key, stats[key])}
                  </span>
                </div>
                <div className="mt-1">
                  <MiniSparkline points={trends[key].points} color={`var(--color-${tone})`} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
