'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface CompareApprovalChartProps {
  chartData: Record<string, number | undefined>[]
  seriesNames: string[]
  colors: string[]
}

export function CompareApprovalChart({ chartData, seriesNames, colors }: CompareApprovalChartProps) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: -20 }}>
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-paper-faint)' }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-paper-faint)' }} />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 2,
              fontSize: 11,
              fontFamily: 'var(--font-jetbrains)',
            }}
            labelFormatter={(m) => `Month ${m}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {seriesNames.map((name, i) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={colors[i % colors.length]}
              strokeWidth={1.75}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
