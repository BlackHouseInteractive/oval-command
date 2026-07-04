import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { expireStaleGuests } from '@/lib/guest-cleanup'

const providers = []

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }))
}

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(GitHub({
    clientId: process.env.GITHUB_ID,
    clientSecret: process.env.GITHUB_SECRET,
  }))
}

providers.push(Credentials({
  id: 'guest',
  name: 'Guest',
  credentials: {},
  async authorize() {
    // Opportunistic cleanup on top of the daily cron sweep (see
    // app/api/cron/expire-guests/route.ts) — catches expired accounts
    // immediately whenever anyone signs in as a new guest, rather than
    // waiting for the next scheduled run.
    await expireStaleGuests()
    const user = await prisma.user.create({ data: { name: 'Guest' } })
    return { id: user.id, name: user.name }
  },
}))

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Credentials sign-in can't create a database session record, so the
  // whole app uses JWT sessions once a credentials provider is registered
  // (Auth.js requirement — see @auth/core/lib/utils/assert.js).
  session: {
    strategy: 'jwt',
  },
  providers,
  callbacks: {
    // Runs on every auth() call across the whole app. A JWT session stays
    // cryptographically "valid" even after its underlying User row is gone
    // (guest expiration, or any other account deletion) — without this
    // check, every one of the ~15 call sites that gate on `session?.user?.id`
    // would treat a phantom account as signed in, only to fail confusingly
    // the moment they touch the database. Returning null here is Auth.js's
    // documented way to invalidate a session: it clears the cookie and every
    // caller of auth() simply sees "not signed in", which the app already
    // knows how to handle (redirect to /login, or 401 Unauthorized).
    async jwt({ token }) {
      if (!token.sub) return token
      const user = await prisma.user.findUnique({ where: { id: token.sub }, select: { id: true } })
      if (!user) return null
      return token
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
