import { linkWithGithub, linkWithGoogle } from '@/lib/account-link'
import type { InactivityWarning } from '@/lib/guest-cleanup'

interface GuestExpiryWarningProps {
  warning: InactivityWarning
  githubEnabled: boolean
  googleEnabled: boolean
}

/**
 * Shown to guest players whose administration is within a few days of
 * being deleted for inactivity (lib/guest-cleanup.ts). Offers a real way
 * out now: linking to a permanent GitHub/Google account moves this exact
 * game over (see lib/account-link.ts), it isn't just "play more to buy
 * time."
 */
export function GuestExpiryWarning({ warning, githubEnabled, googleEnabled }: GuestExpiryWarningProps) {
  const anyOAuthEnabled = githubEnabled || googleEnabled

  return (
    <div className="rounded-sm border border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-warn)]">
        Administration At Risk
      </div>
      <p className="mt-1 text-sm leading-snug text-[var(--color-paper-dim)]">
        This term hasn&rsquo;t been touched in {warning.daysInactive} days. Guest
        administrations are removed after 14 days of inactivity — playing now
        keeps it alive for another two weeks{anyOAuthEnabled ? ', or save it permanently below.' : '.'}
      </p>

      {anyOAuthEnabled && (
        <div className="mt-3 flex gap-2">
          {githubEnabled && (
            <form action={linkWithGithub} className="flex-1">
              <button
                type="submit"
                className="w-full rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] py-2 text-[13px] font-medium text-[var(--color-paper)] transition-colors hover:bg-[var(--color-surface-2)]"
              >
                Save with GitHub
              </button>
            </form>
          )}
          {googleEnabled && (
            <form action={linkWithGoogle} className="flex-1">
              <button
                type="submit"
                className="w-full rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] py-2 text-[13px] font-medium text-[var(--color-paper)] transition-colors hover:bg-[var(--color-surface-2)]"
              >
                Save with Google
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
