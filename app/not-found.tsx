import Link from 'next/link'
import { Seal } from '@/components/Seal'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Seal size={44} className="text-[var(--color-brass)]" />
      <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-brass)]">
        Oval Command
      </div>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-paper)]">
        This page doesn&rsquo;t exist
      </h1>
      <p className="mt-2 max-w-sm text-sm text-[var(--color-paper-dim)]">
        The link you followed may be broken, or the page may have been moved.
      </p>
      <Link
        href="/"
        className="mt-7 rounded-sm border border-[var(--color-brass-dim)] bg-[var(--color-brass)] px-5 py-3 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-90"
      >
        Return to Oval Command
      </Link>
    </main>
  )
}
