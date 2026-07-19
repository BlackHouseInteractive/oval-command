import { useEffect, useRef, useState } from 'react'
import { cn, getStatLabel, formatDelta, isDeltaGood } from '@/lib/utils'
import { TONE_CLASSES } from '@/components/game/StatCard'
import type { TopMover } from '@/lib/stat-trends'

interface ApprovalGaugeProps {
  approval: number
  deltaFromLastMonth: number
  topMovers: TopMover[]
}

// A speedometer-style semicircle, not the old full ring: the colored track
// is a FIXED red->amber->green gradient across the whole 0-100 range (it
// doesn't fill in as approval rises — the whole gauge face is always
// visible), and a single marker rides along it to show where the current
// value actually sits. Matches a real gauge dial rather than a progress
// ring.
const WIDTH = 240
const HEIGHT = 142
const CX = WIDTH / 2
const CY = 128
const RADIUS = 96
const STROKE = 15

/** Point on the arc for a given 0-100 value — 0 sits at the left end (180deg), 100 at the right end (0deg), sweeping up over the top. */
function pointOnArc(percent: number, radius: number) {
  const angleDeg = 180 * (1 - percent / 100)
  const angleRad = (angleDeg * Math.PI) / 180
  return {
    x: CX + radius * Math.cos(angleRad),
    y: CY - radius * Math.sin(angleRad),
  }
}

const ARC_START = pointOnArc(0, RADIUS)
const ARC_END = pointOnArc(100, RADIUS)
const ARC_PATH = `M ${ARC_START.x},${ARC_START.y} A ${RADIUS},${RADIUS} 0 0 1 ${ARC_END.x},${ARC_END.y}`

/**
 * Animates the displayed number from wherever it last landed to `target`
 * over `ms`. Also drives the marker's position (see JSX below) off this
 * same tweened value, rather than the raw prop, so the marker and the
 * number move in lockstep off one animation loop instead of two.
 * Skips the animation entirely on first mount — nothing to count up from.
 */
function useCountUp(target: number, ms = 700): number {
  const [display, setDisplay] = useState(target)
  const displayRef = useRef(target)

  useEffect(() => {
    const from = displayRef.current
    const to = target
    if (from === to) return
    const start = performance.now()
    let frame: number
    function step(now: number) {
      const t = Math.min(1, (now - start) / ms)
      const value = from + (to - from) * t
      displayRef.current = value
      setDisplay(value)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, ms])

  return display
}

/** A qualitative read on the month-over-month move, not just the raw number. */
function getApprovalDescriptor(delta: number): string {
  if (delta > 3) return 'Rising'
  if (delta < -3) return 'Falling'
  if (delta > 0.5) return 'Improving'
  if (delta < -0.5) return 'Slipping'
  return 'Stable'
}

/**
 * The Oval Office's focal element — a speedometer-style gauge dial. Shows
 * the approval arc, a qualitative descriptor, the month-over-month delta,
 * and a short "why did this change" list of the stats that moved the most
 * this month.
 */
export function ApprovalGauge({ approval, deltaFromLastMonth, topMovers }: ApprovalGaugeProps) {
  const percent = Math.max(0, Math.min(100, approval))
  const displayPercent = useCountUp(percent)
  const marker = pointOnArc(displayPercent, RADIUS)

  const deltaGood = deltaFromLastMonth > 0
  const hasDelta = deltaFromLastMonth !== 0
  const deltaTone = !hasDelta ? null : deltaGood ? 'good' : 'bad'
  const descriptor = getApprovalDescriptor(deltaFromLastMonth)

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative"
        style={{
          width: WIDTH,
          height: HEIGHT,
          filter: 'drop-shadow(0 10px 24px color-mix(in srgb, var(--color-brass) 25%, transparent))',
        }}
      >
        <svg width={WIDTH} height={HEIGHT}>
          <defs>
            <linearGradient id="approval-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-bad)" />
              <stop offset="50%" stopColor="var(--color-warn)" />
              <stop offset="100%" stopColor="var(--color-good)" />
            </linearGradient>
          </defs>
          <path
            d={ARC_PATH}
            fill="none"
            stroke="url(#approval-gauge-gradient)"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          {/* Marker — rides the gradient track at the current (animated) value, like a needle tip resting on the dial face. */}
          <circle
            cx={marker.x}
            cy={marker.y}
            r={STROKE * 0.62}
            fill="var(--color-ink)"
            stroke="var(--color-paper)"
            strokeWidth={2.5}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-2 flex flex-col items-center">
          <span className="font-mono text-4xl font-semibold tabular-nums text-[var(--color-paper)]">
            {Math.round(displayPercent)}%
          </span>
          <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-paper-faint)]">
            Public Approval
          </span>
        </div>
      </div>

      <p className={cn('mt-2 font-[family-name:var(--font-display)] text-base font-semibold', deltaTone ? TONE_CLASSES[deltaTone].text : 'text-[var(--color-paper-dim)]')}>
        {descriptor}
      </p>

      {hasDelta && (
        <p className={cn('mt-0.5 font-mono text-sm', TONE_CLASSES[deltaTone!].text)}>
          {deltaGood ? '↑' : '↓'} {formatDelta('approval', deltaFromLastMonth)} this month
        </p>
      )}

      {topMovers.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
          {topMovers.map(mover => {
            const good = isDeltaGood(mover.key, mover.delta)
            return (
              <span
                key={mover.key}
                className={cn('font-mono text-[11px]', good ? 'text-[var(--color-good)]' : 'text-[var(--color-bad)]')}
              >
                {getStatLabel(mover.key)} {mover.delta > 0 ? '▲' : '▼'}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
