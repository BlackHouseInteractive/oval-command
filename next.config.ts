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
}

export default config
