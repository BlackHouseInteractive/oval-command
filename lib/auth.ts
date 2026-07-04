import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'

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
    // Opportunistic cleanup: a guest account that never started a game and
    // is more than a day old is abandoned (the player either closed the tab
    // or came back later and got a fresh one here anyway). Deleting them on
    // every new guest sign-in keeps the User table from growing unbounded —
    // one permanent row per "Play Now" click — without needing any
    // scheduled/cron job. Never touches guest accounts with real game data.
    await prisma.user.deleteMany({
      where: {
        name: 'Guest',
        email: null,
        createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        games: { none: {} },
      },
    })
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
