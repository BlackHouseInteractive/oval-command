import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ActionCardTag = 'Required' | 'Recommended' | 'Optional'

const TAG_CLASSES: Record<ActionCardTag, string> = {
  Required:    'text-[var(--color-bad)] bg-[var(--color-bad-dim)]',
  Recommended: 'text-[var(--color-good)] bg-[var(--color-good-dim)]',
  Optional:    'text-[var(--color-paper-faint)] bg-[var(--color-surface-2)]',
}

interface ActionCardProps {
  icon: LucideIcon
  title: string
  label: string
  detail?: string
  tag?: ActionCardTag
  href: string
}

/**
 * One of the three monthly-action shortcut cards on the Oval Office —
 * deliberately distinct from the bottom nav's free room navigation:
 * these cards represent the thing that consumes this month's turn.
 * Each shows a one-line status (what's pending, and how urgent/likely it
 * is) pulled from data already computed on the page, not new engine logic.
 */
export function ActionCard({ icon: Icon, title, label, detail, tag, href }: ActionCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 backdrop-blur-sm transition-colors hover:border-[var(--color-brass-dim)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Icon size={18} className="text-[var(--color-brass)]" strokeWidth={1.75} />
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--color-paper)]">
            {title}
          </span>
        </div>
        {tag && (
          <span className={cn('shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.05em]', TAG_CLASSES[tag])}>
            {tag}
          </span>
        )}
      </div>
      <p className="mt-1.5 pl-[26px] text-sm text-[var(--color-paper-dim)]">{label}</p>
      {detail && (
        <p className="mt-0.5 pl-[26px] font-mono text-[11px] text-[var(--color-paper-faint)]">{detail}</p>
      )}
    </Link>
  )
}
