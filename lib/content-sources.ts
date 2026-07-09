/**
 * Unified content-source registry — the single place base game content and
 * every DLC pack/campaign era gets merged and filtered from, replacing what
 * used to be an ad hoc `[...eventsRaw, ...personnelEventsRaw]`-style spread
 * inside lib/game-engine.ts.
 *
 * Deliberately a leaf module (only imports raw JSON + types from
 * types/game.ts) so both lib/game-engine.ts and lib/cabinet.ts can depend on
 * it without a circular import between them.
 *
 * This is what lets Story Packs and Premium Campaigns share one mechanism
 * instead of two: a story pack is a ContentSource gated by contentId with no
 * `eras` restriction (works in every presidency); a campaign era's content is
 * a ContentSource gated by both contentId AND `eras`. It's also what makes
 * eventual Community Scenarios (not built yet) cheap later — a
 * community-authored pack is just one more entry with origin: 'mod'.
 */

import eventsRaw           from '@/data/events.json'
import personnelEventsRaw  from '@/data/personnel-events.json'
import lawsRaw              from '@/data/laws.json'
import npcsRaw               from '@/data/npcs.json'
import economicExpertsRaw   from '@/data/cabinet-packs/economic-experts-candidates.json'
import shutdownEventsRaw    from '@/data/story-packs/government-shutdown-events.json'
import shutdownLawsRaw      from '@/data/story-packs/government-shutdown-laws.json'
import coldWarNpcsRaw       from '@/data/eras/cold-war-npcs.json'
import coldWarEventsRaw     from '@/data/eras/cold-war-events.json'
import coldWarLawsRaw       from '@/data/eras/cold-war-laws.json'
import type { CrisisEvent, Law, NpcEntry, CabinetSlot, CabinetCandidate } from '@/types/game'

/** A DLC cabinet pack adds candidates to an EXISTING slot — it can't be a flat NpcEntry[] like base content, since a CabinetCandidate only makes sense nested inside its slot's `candidates` array. */
export interface ExtraCandidates {
  slotId:     string
  candidates: CabinetCandidate[]
}

export interface ContentSource {
  /** null = always included, no entitlement needed (today's base content). Otherwise must be owned (see lib/entitlements.ts) for this source's content to be eligible. */
  contentId: string | null
  /**
   * undefined = era-agnostic, included regardless of Game.campaignEra (most
   * story/cabinet packs — "plugs into any presidency"). A list restricts
   * this source to only those eras. Base/Modern content is deliberately
   * ALWAYS given an explicit `eras: ['modern']` rather than left undefined,
   * so it never leaks into a non-Modern era by accident — DLC defaults the
   * other way (opt INTO an era restriction, not opt out of leaking).
   */
  eras?:  string[]
  /** 'mod' reserved for the deferred Community Scenarios feature — not used yet, but the type anticipates it so that feature is additive, not a redesign. */
  origin: 'base' | 'dlc' | 'mod'
  events?:          CrisisEvent[]
  laws?:            Law[]
  /** Full NpcEntry objects — only for base content or a whole new era's roster, never for a cabinet pack (see extraCandidates). */
  npcEntries?:      NpcEntry[]
  /** Candidates a cabinet pack adds to an existing slot from another eligible source. */
  extraCandidates?: ExtraCandidates[]
}

export const CONTENT_SOURCES: ContentSource[] = [
  {
    contentId: null,
    eras: ['modern'],
    origin: 'base',
    events:     eventsRaw as unknown as CrisisEvent[],
    laws:       lawsRaw   as unknown as Law[],
    npcEntries: npcsRaw   as unknown as NpcEntry[],
  },
  {
    contentId: null,
    eras: ['modern'],
    origin: 'base',
    events: personnelEventsRaw as unknown as CrisisEvent[],
  },
  {
    contentId: 'cabinet.economic_experts',
    origin: 'dlc',
    extraCandidates: economicExpertsRaw as unknown as ExtraCandidates[],
  },
  {
    // No `eras` restriction — a story pack "plugs into any presidency"
    // (see the eras?: string[] design decision above).
    contentId: 'story.government_shutdown',
    origin: 'dlc',
    events: shutdownEventsRaw as unknown as CrisisEvent[],
    laws:   shutdownLawsRaw   as unknown as Law[],
  },
  {
    // A Premium Campaign era is gated by BOTH contentId (ownership) AND
    // eras (only ever eligible when Game.campaignEra === 'cold_war') —
    // unlike a Story Pack, its content isn't meant to leak into other eras.
    contentId: 'campaign.cold_war',
    eras: ['cold_war'],
    origin: 'dlc',
    events:     coldWarEventsRaw as unknown as CrisisEvent[],
    laws:       coldWarLawsRaw   as unknown as Law[],
    npcEntries: coldWarNpcsRaw   as unknown as NpcEntry[],
  },
]

function isCabinetSlot(entry: NpcEntry): entry is CabinetSlot {
  return (entry as CabinetSlot).selectable === true
}

/**
 * ownedContent is either a real Set (only content the requesting user
 * actually owns is eligible — the gate for NEW selections: new-game
 * creation, era pick, mid-game hire) or the literal 'all' (every content id
 * is treated as owned — used only for resolving something ALREADY
 * persisted on a Game row, e.g. resolveNpc/resolveRoster reading back a
 * cabinetSelections entry, so a save never breaks if the entitlement behind
 * an already-selected choice is later revoked — see the monetization plan's
 * content-id lifecycle/save-compatibility principle).
 */
export type OwnedContent = Set<string> | 'all'

/**
 * era is either a real era id (only sources matching that specific era, or
 * era-agnostic sources, are eligible — the gate for what a specific GAME
 * can draw from) or the literal 'all' (every era's content is eligible —
 * used only for resolving something already persisted, e.g. ALL_EVENTS/
 * ALL_LAWS's cross-era id lookups, never for deciding a game's actual
 * content pool — see lib/cabinet.ts's resolveRoster for why NPC entries in
 * particular must NEVER be resolved this way, only individual event/law ids).
 */
function isEligible(source: ContentSource, ownedContent: OwnedContent, era: string): boolean {
  const ownsContent = ownedContent === 'all' || !source.contentId || ownedContent.has(source.contentId)
  const matchesEra  = era === 'all' || !source.eras || source.eras.includes(era)
  return ownsContent && matchesEra
}

// Stamps each event/law with the content id it came from (undefined for
// base content) — lets locked-content UI (Congress room, pending-briefing
// banners) tell a Story Pack item apart from base content without a
// separate lookup, same pattern as the cabinet-candidate merge below.
export function getEligibleEvents(ownedContent: OwnedContent, era: string): CrisisEvent[] {
  return CONTENT_SOURCES.filter(s => isEligible(s, ownedContent, era))
    .flatMap(s => (s.events ?? []).map(e => (s.contentId ? { ...e, contentId: e.contentId ?? s.contentId } : e)))
}

export function getEligibleLaws(ownedContent: OwnedContent, era: string): Law[] {
  return CONTENT_SOURCES.filter(s => isEligible(s, ownedContent, era))
    .flatMap(s => (s.laws ?? []).map(l => (s.contentId ? { ...l, contentId: l.contentId ?? s.contentId } : l)))
}

/** Merges any eligible extraCandidates into their target slot's `candidates` array — the one place cabinet-pack merging happens, so every caller (resolveRoster, getCandidatesForSlot, cabinet-assembly UI) sees a consistent, already-merged roster. */
export function getEligibleNpcEntries(ownedContent: OwnedContent, era: string): NpcEntry[] {
  const eligible = CONTENT_SOURCES.filter(s => isEligible(s, ownedContent, era))
  const baseEntries = eligible.flatMap(s => s.npcEntries ?? [])
  // Stamp each added candidate with the content id it came from — lets the
  // cabinet-assembly UI show a locked candidate (visible, dimmed, "Unlock"
  // CTA) instead of just omitting it from the list.
  const extraCandidateSources = eligible.flatMap(s =>
    (s.extraCandidates ?? []).map(x => ({
      slotId:     x.slotId,
      candidates: x.candidates.map(c => ({ ...c, contentId: c.contentId ?? s.contentId ?? undefined })),
    }))
  )

  if (extraCandidateSources.length === 0) return baseEntries

  return baseEntries.map(entry => {
    if (!isCabinetSlot(entry)) return entry
    const additions = extraCandidateSources.filter(x => x.slotId === entry.id).flatMap(x => x.candidates)
    return additions.length === 0 ? entry : { ...entry, candidates: [...entry.candidates, ...additions] }
  })
}
