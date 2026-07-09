/**
 * Cabinet roster resolution — "stable slot id, swappable occupant."
 *
 * Each era's content source (see lib/content-sources.ts) defines its own 5
 * appointable positions (vice_president, chief_of_staff, sec_defense,
 * treasury_secretary, attorney_general) as CabinetSlots with 3+
 * CabinetCandidates each (base game gives 3; Cabinet Expansion Packs add
 * more via the extraCandidates merge), rather than a single fixed Npc. The
 * slot id itself never changes across eras — that's what keeps
 * data/laws.json's npc_reactions entries, advisor-engine.ts's rules, and
 * npc-milestones.ts's flavor text working unmodified regardless of which
 * era or which candidate is actually resolved behind a given slot.
 *
 * Ownership gating (see lib/entitlements.ts) only ever applies at the
 * moment a NEW candidate is being selected — getCandidatesForSlot's default
 * is the free Modern roster, and callers pass a real ownedContent Set to
 * widen that for a specific user. Once a candidate is already persisted in
 * game.cabinetSelections, resolving it (resolveRoster) NEVER re-checks
 * ownership — a save stays valid even if the entitlement behind an
 * already-selected pack candidate is later revoked (refund, manual
 * toggle). See the monetization plan's content-id lifecycle principle.
 *
 * era is threaded the same way throughout: every function that resolves
 * something ALREADY DECIDED for a specific game (resolveRoster, hireCandidate)
 * reads `game.campaignEra` directly rather than taking a separate param, so
 * every one of resolveRoster's ~15 call sites needed zero changes when
 * Premium Campaigns landed — they already pass a full Game object. Functions
 * used before a Game row exists (getDefaultCabinetSelections,
 * validateCabinetSelections, sumStartingBonuses, seedRosterState, at
 * new-game creation) take an explicit `era` parameter instead, defaulting
 * to 'modern' so any not-yet-migrated caller keeps today's exact behavior.
 *
 * Deliberately has NO dependency on game-engine.ts's EVENTS/LAWS exports —
 * only `applyDelta`, which is pure stat math. Every game-engine.ts function
 * that used to read a module-level NPCS constant instead takes a
 * `roster: Npc[]` parameter, computed by the caller via resolveRoster(game).
 * That keeps the dependency one-directional (cabinet.ts -> game-engine.ts)
 * and avoids a circular import.
 *
 * Deliberately NOT computed once at module load and cached: unlike
 * game-engine.ts's EVENTS/LAWS (which only ever needed a free-vs-owned
 * split), a per-game roster also varies by era, so every lookup here calls
 * getEligibleNpcEntries fresh with that game's actual era. It's a handful
 * of array filters over ~15-30 entries — cheap enough that caching isn't
 * worth the complexity of a per-era cache.
 */

import { applyDelta } from '@/lib/game-engine'
import { getEligibleNpcEntries } from '@/lib/content-sources'
import { FREE_CONTENT_IDS } from '@/lib/content-catalog'
import {
  SELECTABLE_SLOT_IDS,
  type Npc,
  type NpcEntry,
  type CabinetSlot,
  type CabinetCandidate,
  type Game,
  type SelectableSlotId,
  type NpcTraits,
  type StatDelta,
} from '@/types/game'

/** Real Set = only that user's owned content is eligible (the gate for a NEW selection). 'all' = every content id treated as owned, used only to resolve something already persisted — never to decide what's newly selectable. */
type OwnedContent = Set<string> | 'all'

function isCabinetSlot(entry: NpcEntry): entry is CabinetSlot {
  return (entry as CabinetSlot).selectable === true
}

/**
 * Candidates for one slot in a given era. Defaults to the free Modern
 * roster (today's 3 base candidates); pass a specific user's owned-content
 * Set to widen that with any Cabinet Packs they own, or 'all' to ignore
 * ownership entirely (only appropriate for resolving an already-persisted
 * selection — see the OwnedContent doc comment above).
 */
export function getCandidatesForSlot(
  slotId: SelectableSlotId,
  ownedContent: OwnedContent = new Set(FREE_CONTENT_IDS),
  era = 'modern',
): CabinetCandidate[] {
  const entries = getEligibleNpcEntries(ownedContent, era)
  const slot = entries.find(e => e.id === slotId)
  return slot && isCabinetSlot(slot) ? slot.candidates : []
}

/** The job title for a selectable slot (e.g. "Secretary of the Treasury") — shared across the assembly picker and the Legacy Intelligence Report so both use the same label. Slot metadata (not candidates) is base-content only within an era, so this doesn't need ownership awareness, only an era. */
export function getSlotRole(slotId: SelectableSlotId, era = 'modern'): string {
  const entries = getEligibleNpcEntries(new Set(FREE_CONTENT_IDS), era)
  const slot = entries.find(e => e.id === slotId)
  return slot && isCabinetSlot(slot) ? slot.role : slotId
}

function candidateToNpc(slot: CabinetSlot, candidate: CabinetCandidate): Npc {
  return {
    id:                 slot.id,
    name:               candidate.name,
    shortName:          candidate.shortName,
    role:               slot.role,
    faction:            slot.faction,
    avatar:             candidate.avatar,
    avatarColor:        candidate.avatarColor,
    image:              candidate.image,
    personality:        candidate.personality,
    relationship:       candidate.relationship,
    triggers:           candidate.triggers,
    relationshipDeltas: candidate.relationshipDeltas,
    monthlyDialogue:    candidate.monthlyDialogue,
    specialAbility:     candidate.specialAbility,
  }
}

/**
 * The full per-game roster — replaces every direct NPCS import. Pure
 * function of game.cabinetSelections and game.campaignEra. Resolves against
 * getEligibleNpcEntries('all', game.campaignEra) — ownership is never
 * re-checked here (a previously-selected pack candidate must keep
 * resolving even if the pack is no longer owned, see the content-id
 * lifecycle principle above) — but era IS strictly scoped to this specific
 * game, unlike ownership: a Modern game must never see Cold War NPCs just
 * because they exist somewhere in the catalog, so this can't reuse a
 * single cross-era module constant the way game-engine.ts's ALL_EVENTS/
 * ALL_LAWS safely can (those are `.find(id)` lookups into a flat pool;
 * this is an enumeration of "everything in this game's roster").
 */
export function resolveRoster(game: Pick<Game, 'cabinetSelections' | 'campaignEra'>): Npc[] {
  const entries = getEligibleNpcEntries('all', game.campaignEra)
  return entries
    .map(entry => {
      if (!isCabinetSlot(entry)) return entry
      const selectedId = game.cabinetSelections[entry.id as SelectableSlotId]
      const candidate = entry.candidates.find(c => c.candidateId === selectedId) ?? entry.candidates[0]
      return candidateToNpc(entry, candidate)
    })
    .filter((n): n is Npc => n !== undefined)
}

/** Sensible defaults when nothing was submitted — deliberately always the free roster for that era (a non-paying player should never get auto-defaulted into a locked candidate). */
export function getDefaultCabinetSelections(era = 'modern'): Record<SelectableSlotId, string> {
  const defaults = {} as Record<SelectableSlotId, string>
  for (const slotId of SELECTABLE_SLOT_IDS) {
    defaults[slotId] = getCandidatesForSlot(slotId, new Set(FREE_CONTENT_IDS), era)[0]?.candidateId ?? ''
  }
  return defaults
}

/** Validate a client-submitted selections map against what this specific user actually owns for the given era, falling back to defaults for anything missing/invalid/locked — same "never trust client ids" posture as perkId/campaignChoiceIds in app/api/game/route.ts. */
export function validateCabinetSelections(
  submitted: Partial<Record<string, string>> | undefined,
  ownedContent: Set<string>,
  era = 'modern',
): Record<SelectableSlotId, string> {
  const resolved = getDefaultCabinetSelections(era)
  if (!submitted) return resolved
  for (const slotId of SELECTABLE_SLOT_IDS) {
    const candidateId = submitted[slotId]
    if (candidateId && getCandidatesForSlot(slotId, ownedContent, era).some(c => c.candidateId === candidateId)) {
      resolved[slotId] = candidateId
    }
  }
  return resolved
}

/** Sum of every selected candidate's startingBonus — folded into the same combinedBonus pipeline as perk/campaign bonuses before the one applyDelta call in createInitialGame. Runs on selections already validated by validateCabinetSelections, so it resolves via 'all' rather than re-checking ownership. */
export function sumStartingBonuses(selections: Record<SelectableSlotId, string>, era = 'modern'): StatDelta {
  const bonus: StatDelta = {}
  for (const slotId of SELECTABLE_SLOT_IDS) {
    const candidate = getCandidatesForSlot(slotId, 'all', era).find(c => c.candidateId === selections[slotId])
    if (!candidate?.startingBonus) continue
    for (const [key, value] of Object.entries(candidate.startingBonus) as [keyof StatDelta, number][]) {
      bonus[key] = ((bonus[key] ?? 0) as number) + value
    }
  }
  return bonus
}

/** Seed npcRelationships/npcTraits for the full roster at game creation. Same 'all' reasoning as sumStartingBonuses — selections are already trusted by this point. */
export function seedRosterState(selections: Record<SelectableSlotId, string>, era = 'modern'): {
  npcRelationships: Record<string, number>
  npcTraits: Record<string, NpcTraits>
} {
  const npcRelationships: Record<string, number> = {}
  const npcTraits: Record<string, NpcTraits> = {}

  for (const entry of getEligibleNpcEntries('all', era)) {
    if (isCabinetSlot(entry)) {
      const candidate = entry.candidates.find(c => c.candidateId === selections[entry.id as SelectableSlotId]) ?? entry.candidates[0]
      npcRelationships[entry.id] = candidate.relationship.start
      npcTraits[entry.id] = candidate.traits
    } else {
      npcRelationships[entry.id] = entry.relationship.start
    }
  }

  return { npcRelationships, npcTraits }
}

/**
 * Mid-term fire/hire: swap the active candidate for a selectable slot,
 * reseeding that slot's relationship/traits from the new candidate and
 * applying their startingBonus through the same clamped pipeline as every
 * other stat modifier. Pure mechanical swap — does NOT compute the firing
 * consequence (headline/ripple/severity-scaled penalty); that's
 * lib/cabinet-narrative.ts's applyCabinetChange(), which calls this.
 *
 * ownedContent gates this exactly like a new-game selection — a player
 * can't fire-and-rehire into a locked candidate they don't own. The
 * "Unknown candidate" error below already covers both "invalid id" and
 * "valid id but locked," since a locked candidate simply isn't in the
 * filtered list. era comes from game.campaignEra directly (not a separate
 * param) since a real, persisted Game is always the caller's starting point.
 */
export function hireCandidate(game: Game, slotId: SelectableSlotId, candidateId: string, ownedContent: Set<string>): Game {
  const candidate = getCandidatesForSlot(slotId, ownedContent, game.campaignEra).find(c => c.candidateId === candidateId)
  if (!candidate) throw new Error(`Unknown candidate ${candidateId} for slot ${slotId}`)

  const stats = candidate.startingBonus ? applyDelta(game.stats, candidate.startingBonus) : game.stats

  return {
    ...game,
    stats,
    cabinetSelections: { ...game.cabinetSelections, [slotId]: candidateId },
    npcRelationships:  { ...game.npcRelationships, [slotId]: candidate.relationship.start },
    npcTraits:         { ...game.npcTraits, [slotId]: candidate.traits },
  }
}
