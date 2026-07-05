'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth, signIn } from '@/lib/auth'
import { LINK_COOKIE_NAME } from '@/lib/link-cookie'

/**
 * Lets a guest convert their in-progress administration to a permanent
 * GitHub/Google account instead of racing the 14-day expiration clock
 * (lib/guest-cleanup.ts). Auth.js's OAuth flow has no built-in way to
 * "link this sign-in to my currently-authenticated user" — a normal
 * signIn('github') always creates a brand-new, separate User, orphaning
 * the guest's games. So the merge happens as an explicit second step
 * (app/api/auth/complete-link/route.ts) after OAuth completes normally,
 * not by hijacking the adapter's user-creation flow.
 *
 * The cookie below carries the guest's user id across the OAuth
 * redirect round-trip. It's safe against cross-user forgery because its
 * value is always read from the server-verified session at the moment
 * linking starts — never from client-suppliable input — so a browser can
 * only ever end up with its own guest id in this cookie, not someone
 * else's.
 */
const LINK_COOKIE_MAX_AGE = 600 // 10 minutes — long enough for an OAuth round-trip, short enough to limit replay

async function startLink(provider: 'github' | 'google') {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Only a currently-guest session has anything worth migrating — this
  // isn't a general "link a second provider" flow for permanent accounts.
  if (session.user.name !== 'Guest') redirect('/dashboard')

  const cookieStore = await cookies()
  cookieStore.set(LINK_COOKIE_NAME, session.user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: LINK_COOKIE_MAX_AGE,
    path: '/',
  })

  await signIn(provider, { redirectTo: '/api/auth/complete-link' })
}

export async function linkWithGithub() {
  await startLink('github')
}

export async function linkWithGoogle() {
  await startLink('google')
}
