'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { signOutAction } from '@/lib/sign-out-action'

// Deliberately separate from RoomNav's bottom bar — that bar is room-to-
// room navigation (never costs a turn, but stays "inside" the term). This
// is the way OUT: back to the dashboard, the meta-progression pages, or
// signing out entirely. Keeping the two visually distinct avoids blurring
// "switch rooms" with "leave this term."
interface GameMenuButtonProps {
  gameId: string
}

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: (id: string) => `/game/${id}/overview`, label: 'Government Overview' },
  { href: (id: string) => `/game/${id}/schedule`, label: 'Full Schedule' },
  { href: '/achievements', label: 'Achievements' },
  { href: '/presidencies', label: 'Your Presidencies' },
  { href: '/leaderboard', label: 'Leaderboard' },
] as const

export function GameMenuButton({ gameId }: GameMenuButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="fixed right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)]/95 text-[var(--color-paper-faint)] backdrop-blur-md transition-colors hover:text-[var(--color-brass)]"
      >
        <Menu size={16} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-xs rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-brass)]">
                Oval Command
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="text-[var(--color-paper-faint)] hover:text-[var(--color-paper)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-2">
              {LINKS.map(link => (
                <Link
                  key={link.label}
                  href={typeof link.href === 'function' ? link.href(gameId) : link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-sm px-3.5 py-2.5 text-sm text-[var(--color-paper)] transition-colors hover:bg-[var(--color-surface-2)]"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="border-t border-[var(--color-border)] p-2">
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full rounded-sm px-3.5 py-2.5 text-left text-sm text-[var(--color-bad)] transition-colors hover:bg-[var(--color-bad-dim)]"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
