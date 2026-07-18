/**
 * Resolves which stylized briefing-board region a crisis belongs on, for
 * the Situation Room / Diplomatic Office map. Most events carry a static
 * `region` tag in data/events.json (see RegionTag's doc comment in
 * types/game.ts for what each bucket means and why). A couple of chain
 * events don't — their region depends on which of several possible root
 * events actually fired earlier in this specific game, not on the event
 * itself, so tagging them statically would just be wrong roughly half the
 * time. Those are resolved here instead, off Game.usedEvents (already
 * persisted — no schema change needed).
 */

import type { CrisisEvent, Game, RegionTag } from '@/types/game'

/** Only these categories are ever shown on the map — everything else (economy, disaster, scandal, congress, social, personnel) has no geopolitical "where" to point at. */
export const MAP_ELIGIBLE_CATEGORIES = ['military', 'diplomacy', 'security'] as const

// The six war-aftermath events (see lib/game-engine.ts's isChainedEvent) all
// gate on the same `at_war` flag, but that flag has two possible sources —
// a NATO ally being attacked (Europe) or an Iran nuclear crisis (Middle
// East) — so which one actually started THIS game's war can't be known
// without checking which root event is in the history.
const WAR_CHAIN_EVENT_IDS = new Set([
  'war_casualties_report',
  'war_fatigue_protests',
  'war_peace_opportunity',
  'war_congressional_defunding',
  'war_allied_withdrawal',
  'war_victory_moment',
])

const WAR_ROOT_REGIONS: Record<string, RegionTag> = {
  nato_ally_attacked: 'europe',
  nuclear_iran: 'middle_east',
}

// Personnel-relationship scenes that happen to carry a military/diplomacy
// category and pass the milestone_* NPC-relationship gate (see
// lib/npc-milestones.ts) — these are about your relationship with an
// official, not a place, so they're excluded from the map entirely rather
// than forced into 'classified'.
const MAP_INELIGIBLE_EVENT_IDS = new Set([
  'sec_defense_public_backing',
  'foreign_ally_emergency_summit',
])

/** Null means "don't show this on the map" — either the category isn't map-eligible, the event is explicitly excluded, or (defensively) a war-chain event fired without either root event on record. */
export function resolveEventRegion(event: CrisisEvent, game: Game): RegionTag | null {
  if (!(MAP_ELIGIBLE_CATEGORIES as readonly string[]).includes(event.category)) return null
  if (MAP_INELIGIBLE_EVENT_IDS.has(event.id)) return null

  if (WAR_CHAIN_EVENT_IDS.has(event.id)) {
    for (const [rootId, region] of Object.entries(WAR_ROOT_REGIONS)) {
      if (game.usedEvents.includes(rootId)) return region
    }
    return 'classified' // shouldn't happen — at_war can only be set by one of the two roots above
  }

  return event.region ?? null
}

export const REGION_LABELS: Record<RegionTag, string> = {
  north_america: 'North America',
  europe:        'Europe',
  east_asia:     'East Asia & Pacific',
  middle_east:   'Middle East',
  latin_america: 'Latin America',
  africa:        'Africa',
  domestic:      'Homeland',
  classified:    'Classified',
}
