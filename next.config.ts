import type { NextConfig } from 'next'

const config: NextConfig = {
  // Strict mode catches double-render bugs in development
  reactStrictMode: true,

  // Allow Prisma + game-engine to stay server-side only
  serverExternalPackages: ['@prisma/client'],

  experimental: {
    // Crossfade room content on navigation (see app/game/[id]/layout.tsx) —
    // https://nextjs.org/docs/app/guides/view-transitions
    viewTransition: true,
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // frame-ancestors is the modern clickjacking defense; X-Frame-Options
          // is kept alongside it for browsers that predate CSP support.
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // None of these browser features are used anywhere in the app.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default config
