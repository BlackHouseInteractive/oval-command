import { Seal } from '@/components/Seal'

interface MagazineCoverProps {
  icon: string
  headline: string
  subhead: string
  issueDate: string
}

/**
 * A stylized "issue cover" moment — fictional weekly newsmagazine,
 * matching lib/headlines.ts's OUTLETS convention (not a real trademarked
 * name like TIME). Pure data-driven card, no per-cover art asset.
 */
export function MagazineCover({ icon, headline, subhead, issueDate }: MagazineCoverProps) {
  return (
    <div className="overflow-hidden rounded-sm border border-[var(--color-brass-dim)] bg-[var(--color-surface-2)] backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-[var(--color-brass-dim)] px-3 py-1.5">
        <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-[0.08em] text-[var(--color-brass)]">
          THE REPUBLIC
        </span>
        <Seal size={14} className="text-[var(--color-brass)]" />
      </div>
      <div className="px-4 py-5 text-center">
        <div className="text-3xl">{icon}</div>
        <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold leading-tight text-[var(--color-paper)]">
          {headline}
        </h3>
        <p className="mt-1.5 text-xs italic text-[var(--color-paper-faint)]">{subhead}</p>
      </div>
      <div className="border-t border-[var(--color-border)] px-3 py-1 text-right font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--color-paper-faint)]">
        {issueDate}
      </div>
    </div>
  )
}
