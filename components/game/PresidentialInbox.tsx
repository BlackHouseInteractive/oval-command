import Link from 'next/link'

interface PresidentialInboxProps {
  gameId: string
  hasPendingCrisis: boolean
  advisorMemoCount: number
  hasCongressionalUpdate: boolean
  showElectionCountdown: boolean
}

interface InboxItem {
  text: string
  href: string
}

/**
 * Read-only "Inbox Summary" — reflects current standing state (a pending
 * crisis exists, N advisor memos, etc.), not strictly "what's new since
 * last month": the engine doesn't timestamp NPC milestone crossings or
 * scandal-arc progress, so a true "new this month" digest isn't
 * accurately derivable without new tracking. Every bullet below reuses
 * data already computed elsewhere on the Oval Office page.
 */
export function PresidentialInbox({
  gameId,
  hasPendingCrisis,
  advisorMemoCount,
  hasCongressionalUpdate,
  showElectionCountdown,
}: PresidentialInboxProps) {
  const items: InboxItem[] = []

  if (hasPendingCrisis) {
    items.push({ text: '1 crisis briefing awaiting your response', href: `/game/${gameId}` })
  }
  if (advisorMemoCount > 0) {
    items.push({
      text: `${advisorMemoCount} advisor memo${advisorMemoCount > 1 ? 's' : ''} on your desk`,
      href: `/game/${gameId}/cabinet`,
    })
  }
  if (hasCongressionalUpdate) {
    items.push({ text: 'A congressional update is available', href: `/game/${gameId}/congress` })
  }
  if (showElectionCountdown) {
    items.push({ text: 'Election Day is approaching', href: `/game/${gameId}` })
  }

  if (items.length === 0) return null

  return (
    <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 backdrop-blur-sm">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-paper-faint)]">
        Inbox Summary
      </div>
      <ul className="mt-2 space-y-1.5">
        {items.map(item => (
          <li key={item.text}>
            <Link
              href={item.href}
              className="flex items-center justify-between text-sm text-[var(--color-paper-dim)] hover:text-[var(--color-paper)]"
            >
              <span>{item.text}</span>
              <span className="text-[var(--color-brass)]">→</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={`/game/${gameId}/schedule`}
        className="mt-2 block text-right font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-paper-faint)] hover:text-[var(--color-brass)]"
      >
        View Full Schedule →
      </Link>
    </div>
  )
}
