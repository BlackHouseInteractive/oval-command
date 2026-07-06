import { cn } from '@/lib/utils'
import type { SecretFile } from '@/lib/secret-files'

interface SecretFileCardProps {
  file: SecretFile
  unlocked: boolean
}

export function SecretFileCard({ file, unlocked }: SecretFileCardProps) {
  if (!unlocked) {
    return (
      <div className="rounded-sm border border-dashed border-[var(--color-border-strong)] px-4 py-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-paper-faint)]">
          ██████████████
        </div>
        <p className="mt-2 text-sm font-medium tracking-[0.15em] text-[var(--color-paper-faint)]">
          REDACTED
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-paper-faint)]">
          {file.letterhead}
        </div>
        <span
          className={cn(
            'animate-stamp inline-block flex-shrink-0 rounded-sm border-2 border-[var(--color-bad)] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--color-bad)]'
          )}
        >
          {file.classification}
        </span>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-paper-dim)]">{file.body}</p>
      <div className="mt-3 border-t border-[var(--color-border)] pt-2 text-right font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-good)]">
        Declassified
      </div>
    </div>
  )
}
