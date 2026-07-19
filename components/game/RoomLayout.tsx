import type { ReactNode } from 'react'

interface RoomLayoutProps {
  /** Context/status panel — stats, progress, standing instruments. Renders second on mobile, first (left) on desktop. */
  left?: ReactNode
  /** The room's primary content — always first in reading order, at every width. */
  center: ReactNode
  /** Secondary spotlight — a featured relationship, a recommendation, supplementary detail. Renders last at every width. */
  right?: ReactNode
}

/**
 * Shared shell for a room page's readable content: a wide desktop layout
 * (context panel + center stage + spotlight panel) that collapses to a
 * single column below the lg breakpoint — the game is mobile-first, and a
 * three-column layout only makes sense once there's room for it. Center
 * content always renders first on mobile regardless of the left/right
 * props' position in the DOM, so the room's actual point is never pushed
 * below secondary panels on a phone.
 *
 * Sits inside a room page's own <main> (which still owns that room's
 * max-width, background, and ambience) — this component only arranges the
 * grid, nothing else.
 */
export function RoomLayout({ left, center, right }: RoomLayoutProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)_260px] lg:items-start lg:gap-8">
      {left && <div className="order-2 space-y-4 lg:order-1">{left}</div>}
      <div className="order-1 min-w-0 space-y-4 lg:order-2">{center}</div>
      {right && <div className="order-3 space-y-4">{right}</div>}
    </div>
  )
}
