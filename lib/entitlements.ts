/**
 * Entitlement reads — kept separate from lib/db-helpers.ts since this pulls
 * in the content catalog. Deliberately NOT React cache()-wrapped (unlike
 * lib/db-helpers.ts's getGameRow): entitlements must read fresh on every
 * call so a purchase is reflected immediately, matching lib/auth.ts's own
 * posture of never trusting cached identity data for business-logic
 * decisions.
 */
import { prisma } from '@/lib/prisma'
import { toContentIds } from '@/lib/db-helpers'
import { CONTENT_CATALOG, FREE_CONTENT_IDS } from '@/lib/content-catalog'

/** Every content id this user currently owns — free ids, purchased ids, and (if they bought Founder Edition) everything in the catalog. */
export async function getOwnedContent(userId: string): Promise<Set<string>> {
  const [purchases, user] = await Promise.all([
    prisma.purchase.findMany({
      where: { userId, status: 'COMPLETED' },
      select: { contentIds: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { founderAllFuture: true },
    }),
  ])

  const owned = new Set<string>(FREE_CONTENT_IDS)
  for (const purchase of purchases) {
    for (const contentId of toContentIds(purchase.contentIds)) owned.add(contentId)
  }
  if (user?.founderAllFuture) {
    for (const entry of CONTENT_CATALOG) owned.add(entry.contentId)
  }
  return owned
}

/** Cheaper single-id check for a narrow gate point — avoids loading every purchase row when only one content id needs verifying. */
export async function hasEntitlement(userId: string, contentId: string): Promise<boolean> {
  if ((FREE_CONTENT_IDS as readonly string[]).includes(contentId)) return true

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { founderAllFuture: true },
  })
  if (user?.founderAllFuture) return true

  const purchases = await prisma.purchase.findMany({
    where: { userId, status: 'COMPLETED' },
    select: { contentIds: true },
  })
  return purchases.some(p => toContentIds(p.contentIds).includes(contentId))
}
