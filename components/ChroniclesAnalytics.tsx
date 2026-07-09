'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ApprovalChart } from '@/components/game/ApprovalChart'

interface SectorDatum {
  label:  string
  passed: number
  total:  number
  color:  string
}

interface ChroniclesAnalyticsProps {
  approvalHistory:  number[]
  sectorBreakdown:  SectorDatum[]
}

/** Chronicles' advanced-analytics section — approval-over-time (reusing the same chart mid-game already uses) plus a laws-passed-per-sector bar chart. Read-only, no actions, so it's kept separate from ChroniclesPanel. Takes a pre-flattened sectorBreakdown (label/passed/total/color only) rather than the full SectorBreakdownEntry[] — that type's `meta.icon` is a lucide component reference, which can't cross the Server->Client prop boundary. */
export function ChroniclesAnalytics({ approvalHistory, sectorBreakdown }: ChroniclesAnalyticsProps) {
  const sectorData = sectorBreakdown
    .filter(s => s.total > 0)
    .map(s => ({ label: s.label, passed: s.passed, color: s.color }))

  return (
    <div className="space-y-4">
      <ApprovalChart approvalHistory={approvalHistory} />

      {sectorData.length > 0 && (
        <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 backdrop-blur-sm">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-paper-faint)]">
            Laws Passed by Sector
          </span>
          <div className="mt-2 h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: 'var(--color-paper-faint)' }}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--color-paper-faint)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border-strong)',
                    borderRadius: 2,
                    fontSize: 11,
                    fontFamily: 'var(--font-jetbrains)',
                  }}
                  formatter={(value) => [`${value}`, 'Passed']}
                />
                <Bar dataKey="passed" radius={[2, 2, 0, 0]}>
                  {sectorData.map(entry => (
                    <Cell key={entry.label} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
