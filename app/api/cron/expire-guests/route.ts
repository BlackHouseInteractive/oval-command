import { NextRequest, NextResponse } from 'next/server'
import { expireStaleGuests } from '@/lib/guest-cleanup'

// Vercel Cron Job (see vercel.json) — runs daily so guest-account expiration
// doesn't depend on someone else happening to sign in as a new guest.
// Secured per Vercel's documented pattern: fails closed until CRON_SECRET
// is set as an env var in the project.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const deletedCount = await expireStaleGuests()
  return NextResponse.json({ success: true, deletedCount })
}
