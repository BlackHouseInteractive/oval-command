import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getStripeClient } from '@/lib/stripe'
import { getProduct, getStripePriceId } from '@/lib/content-catalog'
import { getOwnedContent } from '@/lib/entitlements'
import { safeErrorMessage } from '@/lib/db-helpers'
import { checkRateLimit } from '@/lib/rate-limit'

interface CheckoutRequest {
  productId: string
  /** Path to return to after checkout — validated below, never passed through to Stripe unchecked. */
  returnTo?: string
}

const DEFAULT_RETURN_TO = '/dashboard'

// Keyed by user id, not IP — this route already requires a signed-in,
// non-guest session, so the account itself is the more precise identity to
// throttle. Generous enough for legitimate retries after a declined card,
// tight enough to stop a scripted loop of Checkout Session creation.
const CHECKOUT_LIMIT = 10
const CHECKOUT_WINDOW_SECONDS = 60 * 60

/** Only allow returning to a same-app relative path — blocks an open redirect via a crafted returnTo. */
function sanitizeReturnTo(returnTo: string | undefined): string {
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) return DEFAULT_RETURN_TO
  return returnTo
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // A purchase tied to an auto-expiring guest account would strand the
  // entitlement the moment the guest account is cleaned up — same reasoning
  // as why guests are steered toward linking a real account elsewhere in
  // the app (see components/SaveProgressPrompt.tsx).
  if (session.user.name === 'Guest') {
    return NextResponse.json(
      { error: 'Save your progress to a real account before purchasing — guest accounts expire.' },
      { status: 403 }
    )
  }

  const allowed = await checkRateLimit(`checkout:${session.user.id}`, CHECKOUT_LIMIT, CHECKOUT_WINDOW_SECONDS)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many checkout attempts. Please wait a moment and try again.' }, { status: 429 })
  }

  let body: CheckoutRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const product = getProduct(body.productId)
  if (!product) {
    return NextResponse.json({ error: 'Unknown product' }, { status: 400 })
  }

  const owned = await getOwnedContent(session.user.id)
  if (product.grantsContentIds.every(id => owned.has(id))) {
    return NextResponse.json({ error: 'You already own this.' }, { status: 400 })
  }

  const returnTo = sanitizeReturnTo(body.returnTo)
  const origin = req.nextUrl.origin

  let checkoutSession
  try {
    checkoutSession = await getStripeClient().checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: getStripePriceId(product), quantity: 1 }],
      client_reference_id: session.user.id,
      metadata: { productId: product.productId },
      success_url: `${origin}${returnTo}?purchased=${encodeURIComponent(product.productId)}`,
      cancel_url: `${origin}${returnTo}`,
    })
  } catch (err) {
    return NextResponse.json(
      { error: safeErrorMessage(err, 'Could not start checkout — try again in a moment.') },
      { status: 400 }
    )
  }

  if (!checkoutSession.url) {
    return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 })
  }

  return NextResponse.json({ url: checkoutSession.url })
}
