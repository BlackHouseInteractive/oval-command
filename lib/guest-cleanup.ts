import { prisma } from '@/lib/prisma'

// Guest play is explicitly "no sign-in required" — ephemeral by design, not
// a persistence guarantee. 14 days is long enough that a normal
// multi-session player never loses progress, short enough to actually
// bound the User table's growth over time.
const EXPIRY_DAYS = 14

/**
 * Deletes Guest accounts that have been inactive for EXPIRY_DAYS — either
 * never started a game (createdAt is stale) or every game on the account
 * hasn't been touched since the cutoff (updatedAt is stale on all of them).
 * Cascades to delete their games too (Game.userId has onDelete: Cascade).
 *
 * The OR is required: Prisma's `every` is vacuously true on an empty
 * relation, so a brand-new zero-game account would otherwise incorrectly
 * match the "every game is stale" branch immediately.
 *
 * Called both opportunistically (every new guest sign-in, lib/auth.ts) and
 * on a daily schedule (app/api/cron/expire-guests/route.ts) so expiration
 * doesn't depend on someone else happening to sign in.
 */
export async function expireStaleGuests(): Promise<number> {
  const cutoff = new Date(Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  const { count } = await prisma.user.deleteMany({
    where: {
      name: 'Guest',
      email: null,
      OR: [
        { games: { none: {} }, createdAt: { lt: cutoff } },
        { AND: [{ games: { some: {} } }, { games: { every: { updatedAt: { lt: cutoff } } } }] },
      ],
    },
  })

  return count
}
