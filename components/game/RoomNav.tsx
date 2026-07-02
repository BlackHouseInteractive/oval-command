'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

// Shell-only room nav. No new game logic — just a persistent way to move
// between the existing screens, framed as rooms in the White House.
interface RoomDef {
  id: string
  label: string
  href: (gameId: string) => string
}

const ROOMS: RoomDef[] = [
  { id: 'oval-office', label: 'Oval Office', href: (id) => `/game/${id}` },
  { id: 'situation-room', label: 'Situation Room', href: (id) => `/game/${id}/situation-room` },
  { id: 'cabinet', label: 'Cabinet Room', href: (id) => `/game/${id}/cabinet` },
  { id: 'press-room', label: 'Press Room', href: (id) => `/game/${id}/history` },
  { id: 'congress', label: 'Congress', href: (id) => `/game/${id}/congress` },
  { id: 'diplomatic-office', label: 'Diplomatic Office', href: (id) => `/game/${id}/diplomatic-office` },
]

interface BreakingEvent {
  id: string
  title: string
}

export function RoomNav({ gameId, breakingEvent }: { gameId: string; breakingEvent?: BreakingEvent | null }) {
  const pathname = usePathname()
  const ovalOfficeHref = `/game/${gameId}`
  const isOvalOffice = pathname === ovalOfficeHref

  return (
    <nav className="mx-auto max-w-2xl px-6 pt-6">
      <div className="flex flex-wrap gap-1.5 border-b border-[var(--color-border)] pb-4">
        {ROOMS.map(room => {
          const href = room.href(gameId)
          const isActive = room.id === 'oval-office'
            ? isOvalOffice
            : pathname.startsWith(href)

          return (
            <Link
              key={room.id}
              href={href}
              className={cn(
                'whitespace-nowrap rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.05em] transition-colors',
                isActive
                  ? 'border-[var(--color-brass)] bg-[var(--color-brass)] text-[var(--color-ink)]'
                  : 'border-[var(--color-border-strong)] text-[var(--color-paper-dim)] hover:border-[var(--color-brass-dim)] hover:text-[var(--color-paper)]'
              )}
            >
              {room.label}
            </Link>
          )
        })}
      </div>

      {breakingEvent && !isOvalOffice && (
        <Link
          href={ovalOfficeHref}
          className="mt-3 flex animate-pulse items-center justify-between rounded-sm border border-[var(--color-bad)] bg-[var(--color-bad-dim)]/30 px-3 py-2 transition-opacity hover:opacity-90"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--color-bad)]">
            🚨 Breaking: {breakingEvent.title}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-bad)]">
            Respond in the Oval Office →
          </span>
        </Link>
      )}
    </nav>
  )
}
