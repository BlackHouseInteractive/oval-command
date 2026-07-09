import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dbToGame, dbToGameLog } from '@/lib/db-helpers'
import { checkGameOver, computeLegacyScore } from '@/lib/game-engine'
import { computePresidentialArchetype } from '@/lib/archetype-engine'
import { computeSectorBreakdown } from '@/lib/law-sectors'
import { getPresidentialQuote } from '@/lib/presidential-quote'
import { hasEntitlement } from '@/lib/entitlements'
import { monthToDate } from '@/lib/utils'
import { PresidencyReport } from '@/lib/pdf/presidency-report'
import type { GameLog } from '@/types/game'

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const row = await prisma.game.findUnique({ where: { id } })
  if (!row) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (row.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!(await hasEntitlement(session.user.id, 'feature.chronicles'))) {
    return NextResponse.json({ error: 'Chronicles has not been unlocked' }, { status: 400 })
  }

  const game = dbToGame(row)
  const logRows = await prisma.gameLog.findMany({ where: { gameId: id }, orderBy: { month: 'asc' } })
  const logs: GameLog[] = logRows.map(dbToGameLog)

  const legacy = computeLegacyScore(game)
  const archetype = computePresidentialArchetype(game, logs)
  const sectorBreakdown = computeSectorBreakdown(game.passedLaws)
  const quote = getPresidentialQuote(archetype)
  const endedReason = game.status === 'ACTIVE' ? null : (checkGameOver(game) ?? 'TERM_COMPLETE')

  const startYear = Number(monthToDate(1).split(' ')[1])
  const endYear = Number(monthToDate(game.currentMonth).split(' ')[1])
  const yearRange = game.status === 'ACTIVE' ? `${startYear}–Present` : `${startYear}–${endYear}`

  const crisesResolved = logs.filter(l => l.actionType === 'CRISIS').length
  const approvalPeak = Math.round(Math.max(...game.approvalHistory))
  const approvalLow  = Math.round(Math.min(...game.approvalHistory))

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderToBuffer(
      PresidencyReport({
        presidentName:   game.presidentName,
        yearRange,
        party:           game.party,
        campaignEra:     game.campaignEra,
        archetype,
        legacy,
        endedReason,
        approvalPeak,
        approvalLow,
        lawsPassed:      game.passedLaws.length,
        crisesResolved,
        sectorBreakdown,
        quote,
      })
    )
  } catch {
    return NextResponse.json({ error: 'Could not generate PDF' }, { status: 500 })
  }

  const filename = `${game.presidentName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-presidency-report.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
