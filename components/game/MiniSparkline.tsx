'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface MiniSparklineProps {
  points: number[]
  color: string
  height?: number
}

/**
 * Small trendline, generalized from ApprovalChart's recharts setup so any
 * stat's derived history (lib/stat-trends.ts) can render one, not just
 * approval.
 */
export function MiniSparkline({ points, color, height = 32 }: MiniSparklineProps) {
  if (points.length < 2) return <div style={{ height }} />

  const data = points.map((value, i) => ({ i, value }))

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
