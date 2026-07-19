'use client'

import { useState } from 'react'
import type { RegionTag } from '@/types/game'
import { REGION_LABELS } from '@/lib/situation-map'
import { cn } from '@/lib/utils'

// Percentage-based positions on the board — a stylized layout, not real
// coordinates (see RegionTag's doc comment for why this is a briefing
// board, not an atlas). 'domestic' shares North America's position since
// it IS North America, just rendered with distinct "homeland" styling
// rather than a plain dot — no event currently resolves to plain
// 'north_america', but the slot is here for when one does.
const NODE_POSITIONS: Partial<Record<RegionTag, { x: number; y: number }>> = {
  north_america: { x: 18, y: 34 },
  domestic:      { x: 18, y: 34 },
  europe:        { x: 47, y: 24 },
  middle_east:   { x: 56, y: 46 },
  east_asia:     { x: 81, y: 38 },
  africa:        { x: 46, y: 66 },
  latin_america: { x: 24, y: 70 },
}

// Short, reusable scene-setting lines — not per-event content. Just enough
// texture that a region reads as a real place with its own life once
// declassified, not just a label. Picked once per reveal (see useState
// initializer below), not re-rolled on every render.
const REGION_FLAVOR: Partial<Record<RegionTag, string[]>> = {
  europe:        ['NATO liaison channels are active.', 'Allied capitals are watching Washington closely tonight.', 'Embassy traffic has picked up since the story broke.'],
  east_asia:     ['Regional partners are requesting clarity on US posture.', 'Pacific Command is monitoring the situation directly.', 'Local markets are already pricing in the news.'],
  middle_east:   ['Regional back-channels have gone unusually quiet.', 'Allied intelligence services are sharing what they have.', 'Energy markets are already reacting.'],
  latin_america: ['Cross-border coordination channels are open.', 'Regional governments are watching for a US signal.', 'Local press is already running ahead of the official line.'],
  africa:        ['Regional partners have requested a joint statement.', 'The situation is still developing on the ground.', 'Allied governments are seeking a coordinated response.'],
  domestic:      ['Federal agencies are coordinating a joint response.', 'State and local officials are requesting guidance.', "This one's ours to handle."],
}

const CLASSIFIED_FLAVOR = [
  'Source and location remain undisclosed at this classification level.',
  "The briefing doesn't name names — not to you, not yet.",
  'Attribution is being withheld pending further confirmation.',
]

function pickOne(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)]
}

interface SituationMapProps {
  region: RegionTag
}

/**
 * The Situation Room / Diplomatic Office's map — deliberately a stylized
 * intelligence board (a radar-grid backdrop with labeled nodes), not an
 * attempt at real cartography. Starts redacted: the active region shows
 * only a pulsing, unlabeled marker until clicked, at which point it
 * "declassifies" — revealing the name and a short flavor line. Purely
 * presentational: doesn't touch the choice/effect pipeline at all, and
 * deliberately doesn't repeat IntelligenceBriefing's confidence-percentage
 * framing (that's about how sure we are; this is about where).
 */
export function SituationMap({ region }: SituationMapProps) {
  const [revealed, setRevealed] = useState(false)
  const [flavor] = useState(() =>
    pickOne(region === 'classified' ? CLASSIFIED_FLAVOR : (REGION_FLAVOR[region] ?? CLASSIFIED_FLAVOR))
  )

  const label = REGION_LABELS[region]
  const isClassified = region === 'classified'
  const pos = NODE_POSITIONS[region]

  return (
    <div className="mt-3 overflow-hidden rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-paper-faint)]">
          Situation Board
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--color-brass)]">
          {revealed ? label : 'Tap marker to declassify'}
        </span>
      </div>

      <div
        className="relative h-40 w-full"
        style={{
          backgroundImage:
            'radial-gradient(circle, color-mix(in srgb, var(--color-border) 60%, transparent) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      >
        {/* Real world coastlines, recolored via CSS mask so the shape stays
            themeable (paper-faint fill, low opacity) instead of baking in a
            fixed color. Stretched non-uniformly (mask-size 100% 100%) across
            the exact same 0-100 coordinate space NODE_POSITIONS uses, so a
            region's marker lands on its own landmass. */}
        <div
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{
            backgroundColor: 'var(--color-paper-faint)',
            opacity: 0.5,
            WebkitMaskImage: 'url(/situation-board-world.png)',
            maskImage: 'url(/situation-board-world.png)',
            WebkitMaskSize: '100% 100%',
            maskSize: '100% 100%',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          }}
          aria-hidden="true"
        />

        {isClassified ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            aria-label="Declassify location"
          >
            <span className={cn(
              'rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em]',
              revealed
                ? 'border-[var(--color-border-strong)] text-[var(--color-paper-faint)]'
                : 'animate-pulse border-[var(--color-bad)]/60 text-[var(--color-bad)]'
            )}>
              {revealed ? 'Source Withheld' : '??? Redacted'}
            </span>
          </button>
        ) : (
          <>
            {Object.entries(NODE_POSITIONS).map(([tag, p]) => {
              if (tag === region || (tag === 'north_america' && region === 'domestic')) return null
              return (
                <span
                  key={tag}
                  className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-paper-faint)]/25"
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                />
              )
            })}
            {pos && (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                aria-label={`Declassify location — ${label}`}
              >
                <span className="relative flex h-3.5 w-3.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brass)] opacity-60" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full border border-[var(--color-brass-dim)] bg-[var(--color-brass)]" />
                </span>
              </button>
            )}
          </>
        )}
      </div>

      {revealed && (
        <p className="border-t border-[var(--color-border)] px-3 py-2 text-[12px] italic leading-snug text-[var(--color-paper-dim)]">
          {flavor}
        </p>
      )}
    </div>
  )
}
