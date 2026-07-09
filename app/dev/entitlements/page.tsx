import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getOwnedContent } from '@/lib/entitlements'
import { CONTENT_CATALOG, FREE_CONTENT_IDS } from '@/lib/content-catalog'
import { DevEntitlementToggle } from '@/components/DevEntitlementToggle'

// Dead route in production — no build-time strip needed, this check alone
// is enough since it 404s before rendering anything.
export default async function DevEntitlementsPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const owned = await getOwnedContent(session.user.id)
  const toggleable = CONTENT_CATALOG.filter(
    entry => !(FREE_CONTENT_IDS as readonly string[]).includes(entry.contentId)
  )

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-brass)]">
          Dev Only — Not Available in Production
        </div>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-paper)]">
          Owned Content
        </h1>
        <p className="mt-2 text-sm text-[var(--color-paper-dim)]">
          Toggle content ids for this account without going through Stripe. Each toggle writes or deletes a
          synthetic zero-dollar Purchase row, so it exercises the exact same entitlement-read path a real
          purchase does — no special-casing anywhere else in the app.
        </p>
      </div>

      <div className="space-y-2">
        {toggleable.map(entry => (
          <DevEntitlementToggle
            key={entry.contentId}
            contentId={entry.contentId}
            displayName={entry.displayName}
            category={entry.category}
            initialOwned={owned.has(entry.contentId)}
          />
        ))}
      </div>
    </main>
  )
}
