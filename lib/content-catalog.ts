/**
 * Single source of truth for "what premium content exists and what does it
 * cost" — every entitlement check in the app reads a content id from
 * CONTENT_CATALOG, and every checkout reads a Stripe Price from
 * PRODUCT_CATALOG. Bundles are not their own namespace: they're purely a
 * ProductDefinition.grantsContentIds mapping, so game logic never checks a
 * bundle/tier name — only individual content ids (see lib/entitlements.ts).
 *
 * Content-id format: "{namespace}.{slug}" — namespaces are 'campaign',
 * 'story', 'cabinet', 'feature'. A content id, once released, is never
 * removed or renamed, only added to — see lib/content-sources.ts for why
 * that's what makes free content updates and save compatibility both work
 * automatically, with no version-gating logic needed anywhere.
 */

export interface ContentCatalogEntry {
  contentId:    string
  category:     'campaign' | 'story' | 'cabinet' | 'feature'
  displayName:  string
  description:  string
  /** Other content ids this one assumes the player already owns (e.g. an era-specific story pack depending on its campaign). Informational/tooling only — not enforced at purchase time yet. */
  dependencies: string[]
  /** Catalog version tag this id first appeared in — documentation/support only, never read for gating. */
  introducedIn: string
}

export interface ProductDefinition {
  productId:    string
  displayName:  string
  description:  string
  /** Display only — the Stripe Price (below) is the source of truth for the actual charge. */
  priceCents:   number
  /** Name of the env var holding this product's Stripe Price id — resolved lazily via getStripePriceId(), not at module load, so importing this catalog never requires Stripe to be configured (only actually checking out a given product does). */
  stripePriceEnvVar: string
  grantsContentIds:  string[]
  /** Founder Edition only — also flips User.founderAllFuture, which auto-grants every content id that exists now or ever will. */
  grantsFounderAllFuture?: boolean
}

/** Bump when the catalog's shape/available ids change meaningfully. Stamped onto Purchase.catalogVersion as a support/audit trail — never read for entitlement gating (see lib/content-sources.ts's content-id lifecycle rule). */
export const CONTENT_CATALOG_VERSION = 1

/** Owned by every account, always — never a Purchase row. */
export const FREE_CONTENT_IDS = ['campaign.modern'] as const

export const CONTENT_CATALOG: ContentCatalogEntry[] = [
  {
    contentId: 'campaign.modern',
    category: 'campaign',
    displayName: 'The Modern Presidency',
    description: 'The default term, set in the present day. Free for every administration.',
    dependencies: [],
    introducedIn: '1.0',
  },
  {
    contentId: 'campaign.cold_war',
    category: 'campaign',
    displayName: 'Cold War',
    description: 'An entirely different presidency — its own starting conditions, cabinet, crises, and laws.',
    dependencies: [],
    introducedIn: '1.0',
  },
  {
    contentId: 'story.government_shutdown',
    category: 'story',
    displayName: 'Government Shutdown',
    description: 'A story pack of crises and legislation that plugs into any presidency.',
    dependencies: [],
    introducedIn: '1.0',
  },
  {
    contentId: 'cabinet.economic_experts',
    category: 'cabinet',
    displayName: 'The Economic Experts',
    description: 'Additional Treasury Secretary candidates with their own personalities, goals, and story interactions.',
    dependencies: [],
    introducedIn: '1.0',
  },
  {
    contentId: 'feature.chronicles',
    category: 'feature',
    displayName: 'Chronicles',
    description: 'Export your presidency as a PDF, share it publicly, view advanced analytics, and compare presidencies.',
    dependencies: [],
    introducedIn: '1.0',
  },
]

export const PRODUCT_CATALOG: ProductDefinition[] = [
  {
    productId: 'product.story.government_shutdown',
    displayName: 'Government Shutdown',
    description: 'Story Pack',
    priceCents: 499,
    stripePriceEnvVar: 'STRIPE_PRICE_STORY_GOVERNMENT_SHUTDOWN',
    grantsContentIds: ['story.government_shutdown'],
  },
  {
    productId: 'product.cabinet.economic_experts',
    displayName: 'The Economic Experts',
    description: 'Cabinet Pack',
    priceCents: 299,
    stripePriceEnvVar: 'STRIPE_PRICE_CABINET_ECONOMIC_EXPERTS',
    grantsContentIds: ['cabinet.economic_experts'],
  },
  {
    productId: 'product.campaign.cold_war',
    displayName: 'Cold War',
    description: 'Campaign Expansion',
    priceCents: 1299,
    stripePriceEnvVar: 'STRIPE_PRICE_CAMPAIGN_COLD_WAR',
    grantsContentIds: ['campaign.cold_war'],
  },
  {
    productId: 'product.feature.chronicles',
    displayName: 'Chronicles',
    description: 'PDF export, public sharing, advanced analytics, and comparison',
    priceCents: 499,
    stripePriceEnvVar: 'STRIPE_PRICE_FEATURE_CHRONICLES',
    grantsContentIds: ['feature.chronicles'],
  },
  {
    productId: 'product.bundle.complete_collection',
    displayName: 'Complete Collection',
    description: 'Every expansion released so far',
    // Was 4999 — priced *above* the $25.96 sum of its 4 parts (499 + 299 +
    // 1299 + 499), which meant no rational buyer would ever choose the
    // bundle over buying items individually. Repriced to a genuine ~15%
    // discount off that sum.
    priceCents: 2199,
    stripePriceEnvVar: 'STRIPE_PRICE_BUNDLE_COMPLETE_COLLECTION',
    grantsContentIds: [
      'campaign.cold_war',
      'story.government_shutdown',
      'cabinet.economic_experts',
      'feature.chronicles',
    ],
  },
  {
    productId: 'product.bundle.founder_edition',
    displayName: 'Founder Edition',
    description: 'Every current and future expansion, plus a Founder badge',
    priceCents: 5999,
    stripePriceEnvVar: 'STRIPE_PRICE_BUNDLE_FOUNDER_EDITION',
    // grantsContentIds still lists everything current at the time of
    // purchase (so Purchase.contentIds is a meaningful snapshot even for
    // a Founder buyer) — grantsFounderAllFuture is what actually makes
    // "and future" true, via User.founderAllFuture.
    grantsContentIds: [
      'campaign.cold_war',
      'story.government_shutdown',
      'cabinet.economic_experts',
      'feature.chronicles',
    ],
    grantsFounderAllFuture: true,
  },
]

export function getProduct(productId: string): ProductDefinition | undefined {
  return PRODUCT_CATALOG.find(p => p.productId === productId)
}

/**
 * Every known Premium Campaign era id ('modern', 'cold_war', ...), derived
 * from CONTENT_CATALOG's 'campaign' entries rather than duplicated as a
 * separate list — a new era only needs one CONTENT_CATALOG entry to become
 * both purchasable AND a valid Game.campaignEra value.
 */
export const KNOWN_CAMPAIGN_ERAS = CONTENT_CATALOG
  .filter(c => c.category === 'campaign')
  .map(c => c.contentId.slice('campaign.'.length))

/** The content id gating a given campaign era — 'cold_war' -> 'campaign.cold_war'. Undefined for an unknown era id. */
export function getCampaignEraContentId(era: string): string | undefined {
  return KNOWN_CAMPAIGN_ERAS.includes(era) ? `campaign.${era}` : undefined
}

export function getContentEntry(contentId: string): ContentCatalogEntry | undefined {
  return CONTENT_CATALOG.find(c => c.contentId === contentId)
}

/** The single-item product that unlocks exactly this content id (never a bundle) — used by locked-content UI (e.g. CabinetSlotPicker) to point a purchase CTA at the cheapest relevant product. */
export function getProductForContentId(contentId: string): ProductDefinition | undefined {
  return PRODUCT_CATALOG.find(p => p.grantsContentIds.length === 1 && p.grantsContentIds[0] === contentId)
}

/**
 * Resolves a product's Stripe Price id from its env var — lazily, only
 * when actually needed (creating a Checkout Session), so every other part
 * of the app can import PRODUCT_CATALOG freely without Stripe configured.
 */
export function getStripePriceId(product: ProductDefinition): string {
  const value = process.env[product.stripePriceEnvVar]
  if (!value) {
    throw new Error(
      `Stripe price id for "${product.productId}" is not configured — set ${product.stripePriceEnvVar} before this product can be purchased.`
    )
  }
  return value
}
