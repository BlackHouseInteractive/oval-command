import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SiteNav } from '@/components/SiteNav'
import { MagazineCover } from '@/components/MagazineCover'
import { ACHIEVEMENTS, computeAchievementProgress } from '@/lib/achievements'
import { dbToGame, toUnlockedAchievements } from '@/lib/db-helpers'
import type { UnlockedAchievement } from '@/types/game'

export default async function AchievementsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { unlockedAchievements: true },
  })

  const unlocked = toUnlockedAchievements(user?.unlockedAchievements)
  const unlockedById = new Map(unlocked.map(u => [u.id, u]))

  const unlockedList: { a: (typeof ACHIEVEMENTS)[number]; earned: UnlockedAchievement }[] = []
  const lockedList: (typeof ACHIEVEMENTS)[number][] = []
  for (const a of ACHIEVEMENTS) {
    const earned = unlockedById.get(a.id)
    if (earned) unlockedList.push({ a, earned })
    else lockedList.push(a)
  }

  // Progress bars reflect whichever ACTIVE game the player touched most
  // recently — if they have several in progress, that's the one they're
  // actually mid-decision on right now.
  const activeGameRow = await prisma.game.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { updatedAt: 'desc' },
  })
  const progress = activeGameRow ? computeAchievementProgress(dbToGame(activeGameRow)) : null

  return (
    <>
      <SiteNav userName={session.user.name} userImage={session.user.image} />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-brass)]">
            Oval Command
          </div>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-paper)]">
            Achievements
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-paper-faint)]">
            {unlocked.length} of {ACHIEVEMENTS.length} unlocked. Each achievement grants a starting perk for future terms.
          </p>
        </div>

        {unlockedList.length > 0 && (
          <div className="mb-8">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-brass)]">
              Magazine Covers
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {unlockedList.map(({ a, earned }) => (
                <div key={a.id}>
                  <MagazineCover
                    icon={a.icon}
                    headline={a.title}
                    subhead={a.description}
                    issueDate={new Date(earned.earnedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  />
                  {a.perk && (
                    <p className="mt-1.5 text-[11px] text-[var(--color-brass)]">
                      Perk: {a.perk.label} — {a.perk.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {lockedList.length > 0 && (
          <div className="space-y-3">
            {unlockedList.length > 0 && (
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-paper-faint)]">
                Locked
              </div>
            )}
            {lockedList.map(a => {
              const prog = progress?.[a.id]
              return (
                <div
                  key={a.id}
                  className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 opacity-50 backdrop-blur-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{a.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--color-paper-dim)]">{a.title}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-paper-faint)]">
                          Locked
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-paper-faint)]">{a.description}</p>
                      {prog && (
                        <div className="mt-2">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                            <div
                              className="h-full rounded-full bg-[var(--color-brass)]"
                              style={{ width: `${Math.min(100, (prog.current / prog.target) * 100)}%` }}
                            />
                          </div>
                          <p className="mt-1 font-mono text-[10px] text-[var(--color-paper-faint)]">
                            {prog.current} / {prog.target}
                          </p>
                        </div>
                      )}
                      {a.perk && (
                        <p className="mt-2 text-[11px] text-[var(--color-brass)]">
                          Perk: {a.perk.label} — {a.perk.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
