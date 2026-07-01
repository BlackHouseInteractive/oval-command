import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { monthToDate } from '@/lib/utils'
import { SiteNav } from '@/components/SiteNav'
import { PartyIcon } from '@/components/game/PartyIcon'
import type { Party } from '@/types/game'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const games = await prisma.game.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      presidentName: true,
      party: true,
      difficulty: true,
      currentMonth: true,
      status: true,
      legacyScore: true,
      updatedAt: true,
    },
  })

  type GameSummary = (typeof games)[number]
  const hasGames = games.length > 0

  return (
    <>
      <SiteNav userName={session.user.name} userImage={session.user.image} />
      <main className="mx-auto max-w-2xl px-6 py-12">

        {hasGames ? (
          <>
            <div className="mb-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-brass)]">
                Oval Command
              </div>
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-paper)]">
                Your Administrations
              </h1>
            </div>

            <div className="space-y-3">
              {games.map((game: GameSummary) => (
                <Link
                  key={game.id}
                  href={`/game/${game.id}`}
                  className="block rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 transition-colors hover:border-[var(--color-border-strong)]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-[var(--color-paper)]">
                        President {game.presidentName}
                      </span>
                      <PartyIcon party={game.party as Party} size={16} showLabel className="ml-2" />
                    </div>
                    <StatusPill status={game.status} legacyScore={game.legacyScore} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-paper-faint)]">
                    {game.status === 'ACTIVE'
                      ? `${monthToDate(game.currentMonth)} · Month ${game.currentMonth} of 48`
                      : `Term ended at month ${game.currentMonth}`}
                    {game.difficulty && game.difficulty !== 'normal' && (
                      <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--color-warn)]">
                        · {game.difficulty}
                      </span>
                    )}
                  </p>
                </Link>
              ))}

              {/* Start a new term at the bottom of the list */}
              <Link
                href="/new-game"
                className="block rounded-sm border border-dashed border-[var(--color-border-strong)] px-5 py-4 text-center text-sm text-[var(--color-paper-faint)] transition-colors hover:border-[var(--color-brass-dim)] hover:text-[var(--color-brass)]"
              >
                + Begin a New Term
              </Link>
            </div>
          </>
        ) : (
          /* First-time experience — immersive Oval Office entry */
          <div className="flex flex-col items-center">

            {/* Oval Office SVG illustration */}
            <div className="w-full max-w-lg">
              <OvalOfficeSVG />
            </div>

            <div className="mt-10 text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-brass)]">
                January 20th · Inauguration Day
              </div>
              <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight text-[var(--color-paper)]">
                Welcome to the Oval Office,<br />Mr. President.
              </h1>
              <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-[var(--color-paper-dim)]">
                The world is watching. Your cabinet is assembled. The first crisis briefing is already on your desk.
                Every decision you make will shape your legacy — and the nation.
              </p>

              <Link
                href="/new-game"
                className="mt-8 inline-block rounded-sm border border-[var(--color-brass-dim)] bg-[var(--color-brass)] px-8 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-opacity hover:opacity-90"
              >
                Take the Oath of Office
              </Link>

              <p className="mt-4 font-mono text-[10px] text-[var(--color-paper-faint)]">
                48 months. Infinite consequences.
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

function OvalOfficeSVG() {
  return (
    <svg viewBox="0 0 600 340" xmlns="http://www.w3.org/2000/svg" className="w-full">
      <rect width="600" height="340" fill="#0B0E14" />
      <ellipse cx="300" cy="310" rx="280" ry="60" fill="#131825" />
      <ellipse cx="300" cy="295" rx="140" ry="35" fill="#1A2332" stroke="#B8915A" strokeWidth="1.5" opacity="0.8" />
      <ellipse cx="300" cy="295" rx="110" ry="28" fill="none" stroke="#B8915A" strokeWidth="0.5" opacity="0.5" />
      <text x="300" y="299" textAnchor="middle" fill="#B8915A" fontSize="8" fontFamily="serif" opacity="0.6">★ ★ ★</text>
      <path d="M60 240 Q300 160 540 240" fill="none" stroke="#2A3344" strokeWidth="1" />
      <rect x="70" y="100" width="80" height="130" rx="40" fill="#0d1520" stroke="#2A3344" strokeWidth="1.5" />
      <rect x="80" y="110" width="60" height="110" rx="30" fill="#0a1018" stroke="#1a2332" strokeWidth="1" />
      <rect x="80" y="110" width="60" height="110" rx="30" fill="url(#windowGlow)" opacity="0.3" />
      <path d="M70 100 Q85 160 78 230" stroke="#2A3344" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M150 100 Q135 160 142 230" stroke="#2A3344" strokeWidth="8" fill="none" strokeLinecap="round" />
      <rect x="450" y="100" width="80" height="130" rx="40" fill="#0d1520" stroke="#2A3344" strokeWidth="1.5" />
      <rect x="460" y="110" width="60" height="110" rx="30" fill="#0a1018" stroke="#1a2332" strokeWidth="1" />
      <rect x="460" y="110" width="60" height="110" rx="30" fill="url(#windowGlow)" opacity="0.3" />
      <path d="M450 100 Q465 160 458 230" stroke="#2A3344" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M530 100 Q515 160 522 230" stroke="#2A3344" strokeWidth="8" fill="none" strokeLinecap="round" />
      <rect x="210" y="230" width="180" height="60" rx="4" fill="#1e2c3e" stroke="#2A3344" strokeWidth="1.5" />
      <rect x="215" y="225" width="170" height="12" rx="2" fill="#243040" stroke="#3D4A5C" strokeWidth="1" />
      <rect x="240" y="215" width="28" height="14" rx="2" fill="#131825" stroke="#3D4A5C" strokeWidth="1" />
      <rect x="290" y="212" width="35" height="18" rx="1" fill="#0d1520" stroke="#2A3344" strokeWidth="1" />
      <rect x="293" y="215" width="29" height="2" fill="#2A3344" opacity="0.6" />
      <rect x="293" y="219" width="22" height="2" fill="#2A3344" opacity="0.4" />
      <rect x="293" y="223" width="25" height="2" fill="#2A3344" opacity="0.4" />
      <rect x="345" y="210" width="4" height="18" fill="#3D4A5C" />
      <ellipse cx="347" cy="210" rx="10" ry="5" fill="#B8915A" opacity="0.4" />
      <ellipse cx="347" cy="225" rx="20" ry="8" fill="#B8915A" opacity="0.06" />
      <rect x="265" y="195" width="70" height="38" rx="4" fill="#1A2332" stroke="#2A3344" strokeWidth="1.5" />
      <rect x="260" y="228" width="80" height="8" rx="2" fill="#243040" stroke="#2A3344" strokeWidth="1" />
      <rect x="272" y="175" width="56" height="24" rx="8" fill="#1A2332" stroke="#2A3344" strokeWidth="1.5" />
      <rect x="195" y="155" width="3" height="90" fill="#3D4A5C" />
      <rect x="198" y="155" width="35" height="22" fill="#1a2a4a" />
      <rect x="198" y="158" width="35" height="3" fill="#9B3D3D" opacity="0.8" />
      <rect x="198" y="163" width="35" height="3" fill="#9B3D3D" opacity="0.8" />
      <rect x="198" y="168" width="35" height="3" fill="#9B3D3D" opacity="0.8" />
      <rect x="402" y="155" width="3" height="90" fill="#3D4A5C" />
      <rect x="405" y="155" width="35" height="22" fill="#1e2d4a" />
      <text x="422" y="170" textAnchor="middle" fill="#B8915A" fontSize="7" opacity="0.6">★</text>
      <rect x="30" y="130" width="40" height="110" rx="2" fill="#0d1520" stroke="#1a2332" strokeWidth="1" />
      <rect x="35" y="138" width="30" height="6" rx="1" fill="#1a2332" />
      <rect x="35" y="147" width="30" height="6" rx="1" fill="#1e2a38" />
      <rect x="35" y="156" width="30" height="6" rx="1" fill="#162030" />
      <rect x="35" y="165" width="30" height="6" rx="1" fill="#1a2332" />
      <rect x="35" y="174" width="30" height="6" rx="1" fill="#243040" />
      <rect x="35" y="183" width="30" height="6" rx="1" fill="#1e2a38" />
      <rect x="35" y="192" width="30" height="6" rx="1" fill="#162030" />
      <rect x="35" y="201" width="30" height="6" rx="1" fill="#1a2332" />
      <rect x="35" y="210" width="30" height="6" rx="1" fill="#243040" />
      <rect x="530" y="130" width="40" height="110" rx="2" fill="#0d1520" stroke="#1a2332" strokeWidth="1" />
      <rect x="535" y="138" width="30" height="6" rx="1" fill="#243040" />
      <rect x="535" y="147" width="30" height="6" rx="1" fill="#1a2332" />
      <rect x="535" y="156" width="30" height="6" rx="1" fill="#1e2a38" />
      <rect x="535" y="165" width="30" height="6" rx="1" fill="#162030" />
      <rect x="535" y="174" width="30" height="6" rx="1" fill="#1a2332" />
      <rect x="535" y="183" width="30" height="6" rx="1" fill="#243040" />
      <rect x="535" y="192" width="30" height="6" rx="1" fill="#1e2a38" />
      <rect x="535" y="201" width="30" height="6" rx="1" fill="#1a2332" />
      <rect x="535" y="210" width="30" height="6" rx="1" fill="#162030" />
      <ellipse cx="300" cy="60" rx="40" ry="8" fill="#1A2332" stroke="#2A3344" strokeWidth="1" />
      <ellipse cx="300" cy="65" rx="25" ry="5" fill="#B8915A" opacity="0.15" />
      <ellipse cx="300" cy="150" rx="120" ry="80" fill="#B8915A" opacity="0.025" />
      <path d="M30 240 Q300 180 570 240" stroke="#2A3344" strokeWidth="1" fill="none" opacity="0.5" />
      <defs>
        <radialGradient id="windowGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4A6FA5" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0B0E14" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  )
}

function StatusPill({ status, legacyScore }: { status: string; legacyScore: number | null }) {
  if (status === 'ACTIVE') {
    return (
      <span className="rounded-full bg-[var(--color-good-dim)] px-2.5 py-0.5 font-mono text-[10px] text-[var(--color-good)]">
        In Progress
      </span>
    )
  }
  return (
    <span className="rounded-full bg-[var(--color-surface-2)] px-2.5 py-0.5 font-mono text-[10px] text-[var(--color-paper-dim)]">
      {status === 'COMPLETE' ? `Legacy: ${legacyScore ?? '—'}` : 'Ended'}
    </span>
  )
}
