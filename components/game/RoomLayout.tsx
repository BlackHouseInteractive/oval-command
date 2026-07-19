import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface RoomLayoutProps {
  /** Context/status panel — stats, progress, standing instruments. Renders second on mobile, first (left) on desktop. Omit entirely for a room with no natural "status" content rather than leaving it visually empty. */
  left?: ReactNode
  /** The room's primary content — always first in reading order, at every width. */
  center: ReactNode
  /** Secondary spotlight — a featured relationship, a recommendation, supplementary detail. Renders last at every width. */
  right?: ReactNode
}

// Tailwind can't JIT a column template built from string concatenation, so
// each combination gets its own complete, static class — not just the ones
// with content, since a track with no item still reserves its width and
// leaves a visible gap. Only give a room both rails if it actually has two
// different kinds of supporting content; a room with just one gets a
// 2-column split, and a room with neither stays single-column even on a
// wide screen rather than stretching one block across the full width.
const GRID_COLS = {
  both: 'lg:grid-cols-[260px_minmax(0,1fr)_260px]',
  leftOnly: 'lg:grid-cols-[260px_minmax(0,1fr)]',
  rightOnly: 'lg:grid-cols-[minmax(0,1fr)_260px]',
  neither: 'lg:grid-cols-[minmax(0,1fr)]',
}

/**
 * Shared shell for a room page's readable content: a wide desktop layout
 * (context panel + center stage + spotlight panel) that collapses to a
 * single column below the lg breakpoint — the game is mobile-first, and a
 * multi-column layout only makes sense once there's room for it, and once
 * the room actually has that many distinct kinds of content. Center content
 * always renders first on mobile regardless of the left/right props'
 * position in the DOM, so the room's actual point is never pushed below
 * secondary panels on a phone.
 *
 * Sits inside a room page's own <main> (which still owns that room's
 * max-width, background, and ambience) — this component only arranges the
 * grid, nothing else.
 */
export function RoomLayout({ left, center, right }: RoomLayoutProps) {
  const gridCols = left && right ? GRID_COLS.both : left ? GRID_COLS.leftOnly : right ? GRID_COLS.rightOnly : GRID_COLS.neither

  return (
    <div className={cn('grid grid-cols-1 gap-6 lg:items-start lg:gap-8', gridCols)}>
      {left && <div className="order-2 space-y-4 lg:order-1">{left}</div>}
      <div className="order-1 min-w-0 space-y-4 lg:order-2">{center}</div>
      {right && <div className="order-3 space-y-4">{right}</div>}
    </div>
  )
}
