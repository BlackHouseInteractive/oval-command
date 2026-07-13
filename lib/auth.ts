import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { expireStaleGuests } from '@/lib/guest-cleanup'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { verifyPassword } from '@/lib/password'

// Guest accounts have zero signup friction by design (no email/OAuth), so
// without this, nothing stops a script from looping this endpoint to
// mass-create User rows.
const GUEST_SIGNUP_LIMIT = 8
const GUEST_SIGNUP_WINDOW_SECONDS = 15 * 60

// Login attempts, not signups — a brute-force loop against one email or a
// credential-stuffing sweep across many is the risk here, not account
// creation (that's app/api/auth/signup/route.ts's own limit).
const PASSWORD_LOGIN_LIMIT = 10
const PASSWORD_LOGIN_WINDOW_SECONDS = 15 * 60
// A verifyPassword-shaped hash with no matching password — run on every
// "no such user" / "no password set" path so a login attempt costs the same
// wall-clock time whether or not the email exists, closing the timing side
// channel that would otherwise let an attacker enumerate registered emails.
// Lengths match hashPassword's actual output: 16-byte salt / 64-byte key, hex-encoded.
const DUMMY_HASH = `${'0'.repeat(32)}:${'0'.repeat(128)}`

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
  id: 'password',
  name: 'Password',
  credentials: {
    email:    { label: 'Email',    type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials, request) {
    const email = typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : ''
    const password = typeof credentials?.password === 'string' ? credentials.password : ''
    if (!email || !password) return null

    try {
      const ip = getClientIp(request.headers)
      // Keyed by IP + email together — an IP-only key would let one
      // attacker's login attempts against account A also lock out a
      // legitimate user at the same IP (e.g. shared office network) trying
      // to log into their own account B.
      const allowed = await checkRateLimit(`password-login:${ip}:${email}`, PASSWORD_LOGIN_LIMIT, PASSWORD_LOGIN_WINDOW_SECONDS)
      if (!allowed) return null

      const user = await prisma.user.findUnique({ where: { email } })
      const validPassword = await verifyPassword(password, user?.hashedPassword ?? DUMMY_HASH)
      if (!user?.hashedPassword || !validPassword) return null

      return { id: user.id, name: user.name, email: user.email }
    } catch {
      return null
    }
  },
}))

providers.push(Credentials({
  id: 'guest',
  name: 'Guest',
  credentials: {},
  async authorize(_credentials, request) {
    try {
      const ip = getClientIp(request.headers)
      const allowed = await checkRateLimit(`guest-signup:${ip}`, GUEST_SIGNUP_LIMIT, GUEST_SIGNUP_WINDOW_SECONDS)
      if (!allowed) return null

      // Opportunistic cleanup on top of the daily cron sweep (see
      // app/api/cron/expire-guests/route.ts) — catches expired accounts
      // immediately whenever anyone signs in as a new guest, rather than
      // waiting for the next scheduled run.
      await expireStaleGuests()
      const user = await prisma.user.create({ data: { name: 'Guest' } })
      return { id: user.id, name: user.name }
    } catch {
      // Returning null is Auth.js's documented "sign-in failed" signal —
      // a DB blip here should surface as a normal failed sign-in attempt,
      // not an unhandled crash.
      return null
    }
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
      try {
        const user = await prisma.user.findUnique({ where: { id: token.sub }, select: { id: true } })
        if (!user) return null
      } catch {
        // This callback runs on every auth() call across the whole app —
        // failing closed on a transient DB error would sign out every
        // active session at once. Let the session through instead; if the
        // account really is gone, the next successful check (or any
        // DB-touching page) still catches it.
      }
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
