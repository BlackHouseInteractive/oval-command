import Stripe from 'stripe'

// Lazily-instantiated singleton — mirrors lib/prisma.ts's pattern, but
// deferred rather than created at module load. `next build` statically
// evaluates route handler modules while collecting page data, so a
// top-level `new Stripe(...)` throws and fails the whole production build
// the moment STRIPE_SECRET_KEY isn't set (confirmed the hard way). Deferring
// construction to first actual use means the checkout/webhook routes are
// only broken at request time if genuinely invoked without Stripe
// configured — everything else (build, every other route, every page)
// stays unaffected.
let client: Stripe | undefined

export function getStripeClient(): Stripe {
  if (client) return client
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set')
  }
  client = new Stripe(secretKey)
  return client
}
