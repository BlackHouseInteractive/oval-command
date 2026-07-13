import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { SiteNav } from '@/components/SiteNav'
import { PurchaseButton } from '@/components/PurchaseButton'
import { getOwnedContent } from '@/lib/entitlements'
import { PRODUCT_CATALOG, getContentEntry } from '@/lib/content-catalog'

/**
 * The one place every product in PRODUCT_CATALOG is actually discoverable —
 * previously each item was only reachable from its own locked-content CTA
 * (Cabinet picker, New Game era card, Congress law card, Chronicles panel),
 * and the two bundles had no CTA anywhere at all.
 */
export default async function StorePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const owned = await getOwnedContent(session.user.id)
  const isOwned = (grantsContentIds: string[]) => grantsContentIds.every(id => owned.has(id))

  const bundles = PRODUCT_CATALOG.filter(p => p.grantsContentIds.length > 1)
  const individual = PRODUCT_CATALOG.filter(p => p.grantsContentIds.length === 1)

  return (
    <>
      <SiteNav userName={session.user.name} userImage={session.user.image} />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-brass)]">
            Oval Command
          </div>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-paper)]">
            Store
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-paper-faint)]">
            Expansions, cabinet packs, and features for your administration.
          </p>
        </div>

        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-paper-faint)]">
          Bundles
        </div>
        <div className="mb-8 space-y-3">
          {bundles.map(product => {
            const owns = isOwned(product.grantsContentIds)
            const includedNames = product.grantsContentIds
              .map(id => getContentEntry(id)?.displayName)
              .filter((n): n is string => Boolean(n))
            return (
              <div
                key={product.productId}
                className="rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-4 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-[var(--color-paper)]">{product.displayName}</div>
                    <p className="mt-1 text-xs text-[var(--color-paper-faint)]">{product.description}</p>
                    {includedNames.length > 0 && (
                      <p className="mt-1.5 text-[11px] text-[var(--color-paper-faint)]">
                        Includes: {includedNames.join(', ')}
                        {product.grantsFounderAllFuture && ' · every future expansion'}
                      </p>
                    )}
                  </div>
                  {owns ? (
                    <span className="whitespace-nowrap rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.05em] text-[var(--color-paper-faint)]">
                      Owned
                    </span>
                  ) : (
                    <PurchaseButton
                      productId={product.productId}
                      label={`$${(product.priceCents / 100).toFixed(2)}`}
                      returnTo="/store"
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-paper-faint)]">
          Individual Items
        </div>
        <div className="space-y-3">
          {individual.map(product => {
            const owns = isOwned(product.grantsContentIds)
            return (
              <div
                key={product.productId}
                className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-[var(--color-paper)]">{product.displayName}</div>
                    <p className="mt-1 text-xs text-[var(--color-paper-faint)]">{product.description}</p>
                  </div>
                  {owns ? (
                    <span className="whitespace-nowrap rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.05em] text-[var(--color-paper-faint)]">
                      Owned
                    </span>
                  ) : (
                    <PurchaseButton
                      productId={product.productId}
                      label={`$${(product.priceCents / 100).toFixed(2)}`}
                      returnTo="/store"
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </>
  )
}
