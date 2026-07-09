import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripeClient } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { toJson } from '@/lib/db-helpers'
import { getProduct, CONTENT_CATALOG_VERSION } from '@/lib/content-catalog'

// First bearer-less, signature-secured route in this app — same fail-closed
// posture as app/api/cron/expire-guests/route.ts's secret check, just via
// Stripe's HMAC signature instead of a raw compare. App Router route
// handlers hand back raw request bytes via req.text() with no special
// config needed (unlike the old Pages Router's api.bodyParser: false),
// which is exactly what constructEvent needs to verify the signature.
export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch {
    // Covers both an invalid/mismatched signature and STRIPE_SECRET_KEY
    // being unset (getStripeClient() throws) — either way this request
    // isn't a verifiable Stripe event, so treat it the same as a bad
    // signature rather than leaking which one it was.
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Only mode: 'payment' Checkout Sessions are created anywhere in this app
  // (see app/api/checkout/route.ts) — one-time purchases only, no
  // subscriptions, so checkout.session.completed is the only event that
  // ever needs to grant anything. Every other event type is a 200 no-op so
  // Stripe stops retrying it.
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.client_reference_id
    const productId = session.metadata?.productId

    // Re-look-up the product server-side rather than trusting metadata as
    // authoritative for WHAT to grant — same "never trust client-supplied
    // ids" posture used everywhere else in this codebase, just applied to
    // a value that round-tripped through Stripe instead of a request body.
    const product = productId ? getProduct(productId) : undefined

    if (userId && product) {
      // upsert on the unique stripeSessionId makes this idempotent against
      // Stripe's documented at-least-once webhook redelivery.
      await prisma.purchase.upsert({
        where: { stripeSessionId: session.id },
        update: {},
        create: {
          userId,
          productId: product.productId,
          contentIds: toJson(product.grantsContentIds),
          catalogVersion: CONTENT_CATALOG_VERSION,
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
          amountCents: session.amount_total ?? 0,
          currency: session.currency ?? 'usd',
        },
      })

      if (product.grantsFounderAllFuture) {
        await prisma.user.update({ where: { id: userId }, data: { founderAllFuture: true } })
      }
    }
  }

  return NextResponse.json({ received: true })
}
