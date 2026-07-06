import { MagazineCover } from '@/components/MagazineCover'
import { monthToDate } from '@/lib/utils'
import type { Achievement } from '@/types/game'
import type { CoverContent } from '@/lib/magazine-covers'

interface AchievementUnlockToastProps {
  achievements: Achievement[]
  specialCovers?: CoverContent[]
  month?: number
}

export function AchievementUnlockToast({ achievements, specialCovers = [], month }: AchievementUnlockToastProps) {
  if (achievements.length === 0 && specialCovers.length === 0) return null

  const issueDate = month ? monthToDate(month) : ''

  return (
    <div className="space-y-3">
      {achievements.length > 0 && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-brass)]">
            Achievement Unlocked
          </div>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {achievements.map(a => (
              <div key={a.id}>
                <MagazineCover icon={a.icon} headline={a.title} subhead={a.description} issueDate={issueDate} />
                {a.perk && (
                  <p className="mt-1.5 text-[11px] text-[var(--color-brass)]">
                    Unlocked starting perk: {a.perk.label} — {a.perk.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {specialCovers.length > 0 && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-brass)]">
            Special Edition
          </div>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {specialCovers.map(c => (
              <MagazineCover key={c.id} icon={c.icon} headline={c.headline} subhead={c.subhead} issueDate={issueDate} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
