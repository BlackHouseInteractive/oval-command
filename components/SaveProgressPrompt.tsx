import { linkWithGithub, linkWithGoogle } from '@/lib/account-link'

interface SaveProgressPromptProps {
  githubEnabled: boolean
  googleEnabled: boolean
}

/**
 * Proactive version of GuestExpiryWarning — shown to any guest on the
 * dashboard, not just once their account is close to being removed for
 * inactivity, so a player who wants to save their progress doesn't have
 * to wait until it's nearly too late.
 */
export function SaveProgressPrompt({ githubEnabled, googleEnabled }: SaveProgressPromptProps) {
  const anyOAuthEnabled = githubEnabled || googleEnabled
  if (!anyOAuthEnabled) return null

  return (
    <div className="mb-6 rounded-sm border border-[var(--color-brass)]/30 bg-[var(--color-brass)]/5 px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-brass)]">
        Playing as Guest
      </div>
      <p className="mt-1 text-sm text-[var(--color-paper-dim)]">
        Guest administrations are removed after 14 days of inactivity. Save your progress permanently:
      </p>
      <div className="mt-2 flex gap-2">
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
    </div>
  )
}
