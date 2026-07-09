import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasEntitlement } from '@/lib/entitlements'

interface Params { params: Promise<{ id: string }> }

interface ShareBody {
  isPublic: boolean
}

/**
 * Toggles a completed presidency's public visibility at /chronicles/[slug].
 * shareSlug is generated once, lazily, on the first time isPublic flips to
 * true — never regenerated after, so revoking and re-enabling keeps the
 * same link stable (matches the plan's "isPublic toggles independently"
 * design). A slug is never removed once assigned, even if isPublic is
 * later set back to false — the public page's own 404-if-!isPublic check
 * (see app/chronicles/[slug]/page.tsx) is what actually gates visibility.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ShareBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.isPublic !== 'boolean') {
    return NextResponse.json({ error: 'isPublic must be a boolean' }, { status: 400 })
  }

  const row = await prisma.game.findUnique({ where: { id } })
  if (!row) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (row.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!(await hasEntitlement(session.user.id, 'feature.chronicles'))) {
    return NextResponse.json({ error: 'Chronicles has not been unlocked' }, { status: 400 })
  }

  const shareSlug = row.shareSlug ?? randomBytes(9).toString('base64url')

  const updated = await prisma.game.update({
    where: { id },
    data: { isPublic: body.isPublic, shareSlug },
    select: { shareSlug: true, isPublic: true },
  })

  return NextResponse.json(updated)
}
