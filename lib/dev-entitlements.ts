'use server'

/**
 * Dev-only entitlement toggling — writes/deletes a synthetic zero-dollar
 * Purchase row keyed by a deterministic (user, contentId) stripeSessionId,
 * so toggling is a clean upsert-or-delete with no orphaned rows and no
 * Stripe/webhook involvement. Deliberately reuses the exact same
 * Purchase/getOwnedContent read path a real purchase uses, so testing
 * exercises real gating logic everywhere else in the app with zero
 * special-casing.
 */
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toJson } from '@/lib/db-helpers'
import { CONTENT_CATALOG_VERSION } from '@/lib/content-catalog'

function devSessionId(userId: string, contentId: string): string {
  return `dev_${userId}_${contentId}`
}

export async function toggleDevEntitlement(contentId: string, nextOwned: boolean): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Dev entitlement console is not available in production')
  }

  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const stripeSessionId = devSessionId(session.user.id, contentId)

  if (nextOwned) {
    await prisma.purchase.upsert({
      where: { stripeSessionId },
      update: {},
      create: {
        userId: session.user.id,
        productId: `dev.${contentId}`,
        contentIds: toJson([contentId]),
        catalogVersion: CONTENT_CATALOG_VERSION,
        stripeSessionId,
        amountCents: 0,
        currency: 'usd',
      },
    })
  } else {
    await prisma.purchase.deleteMany({ where: { stripeSessionId } })
  }

  revalidatePath('/dev/entitlements')
}
