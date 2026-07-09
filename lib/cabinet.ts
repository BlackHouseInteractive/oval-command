/**
 * Cabinet roster resolution — "stable slot id, swappable occupant."
 *
 * data/npcs.json's 5 appointable positions (vice_president, chief_of_staff,
 * sec_defense, treasury_secretary, attorney_general) are CabinetSlots with
 * 3+ CabinetCandidates each (base game gives 3; Cabinet Expansion Packs add
 * more via lib/content-sources.ts's extraCandidates merge), rather than a
 * single fixed Npc. The slot id itself never changes — that's what keeps
 * data/laws.json's 71 npc_reactions entries, advisor-engine.ts's rules, and
 * npc-milestones.ts's flavor text working unmodified, since they're all
 * keyed by slot id and tolerant of whichever candidate is actually resolved
 * behind it.
 *
 * Ownership gating (see lib/entitlements.ts) only ever applies at the
 * moment a NEW candidate is being selected — getCandidatesForSlot's default
 * is the free roster, and callers pass a real ownedContent Set to widen
 * that for a specific user. Once a candidate is already persisted in
 * game.cabinetSelections, resolving it (resolveNpc/resolveRoster) NEVER
 * re-checks ownership — a save stays valid even if the entitlement behind
 * an already-selected pack candidate is later revoked (refund, manual
 * toggle). See the monetization plan's content-id lifecycle principle.
 *
 * Deliberately has NO dependency on game-engine.ts's EVENTS/LAWS exports —
 * only `applyDelta`, which is pure stat math. Every game-engine.ts function
 * that used to read a module-level NPCS constant now takes a `roster: Npc[]`
 * parameter instead, computed by the caller via resolveRoster(game). That
 * keeps the dependency one-directional (cabinet.ts -> game-engine.ts) and
 * avoids a circular import.
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

// Back-compat alias over lib/content-sources.ts's registry, scoped to the
// free Modern era with no extra entitlements — i.e. exactly today's base
// roster. Everything below that needs the FULL roster regardless of
// ownership (resolving an already-persisted selection) uses ALL_NPC_ENTRIES
// instead.
export const NPC_ENTRIES = getEligibleNpcEntries(new Set(FREE_CONTENT_IDS), 'modern')

/** Every candidate that could ever be selected, across every pack, ignoring ownership — see the OwnedContent doc comment above. */
const ALL_NPC_ENTRIES = getEligibleNpcEntries('all', 'modern')

function isCabinetSlot(entry: NpcEntry): entry is CabinetSlot {
  return (entry as CabinetSlot).selectable === true
}

/** The 7 fixed (non-selectable) NPCs — identical every game, never swapped. */
export const FIXED_NPCS: Npc[] = NPC_ENTRIES.filter((e): e is Npc => !isCabinetSlot(e))

/**
 * Candidates for one slot. Defaults to the free roster (today's 3 base
 * candidates); pass a specific user's owned-content Set to widen that with
 * any Cabinet Packs they own, or 'all' to ignore ownership entirely (only
 * appropriate for resolving an already-persisted selection — see the
 * OwnedContent doc comment above).
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

/** The job title for a selectable slot (e.g. "Secretary of the Treasury") — shared across the assembly picker and the Legacy Intelligence Report so both use the same label. Slot metadata (not candidates) is base-content only, so this doesn't need ownership awareness. */
export function getSlotRole(slotId: SelectableSlotId): string {
  const slot = NPC_ENTRIES.find(e => e.id === slotId)
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

/** Resolve one entry id to its currently-active Npc for this game. Fixed NPCs pass through unchanged; an unrecognized/missing selection falls back to that slot's first (free) candidate. Searches ALL_NPC_ENTRIES, not the free-only NPC_ENTRIES — a previously-selected pack candidate must keep resolving even if the pack is no longer owned (save compatibility). */
export function resolveNpc(entryId: string, cabinetSelections: Game['cabinetSelections']): Npc | undefined {
  const entry = ALL_NPC_ENTRIES.find(e => e.id === entryId)
  if (!entry) return undefined
  if (!isCabinetSlot(entry)) return entry

  const selectedId = cabinetSelections[entry.id as SelectableSlotId]
  const candidate = entry.candidates.find(c => c.candidateId === selectedId) ?? entry.candidates[0]
  return candidateToNpc(entry, candidate)
}

/** The full per-game roster — replaces every direct NPCS import. Pure function of game.cabinetSelections. */
export function resolveRoster(game: Pick<Game, 'cabinetSelections'>): Npc[] {
  return ALL_NPC_ENTRIES
    .map(entry => resolveNpc(entry.id, game.cabinetSelections))
    .filter((n): n is Npc => n !== undefined)
}

/** Sensible defaults when nothing was submitted — deliberately always the free roster (a non-paying player should never get auto-defaulted into a locked candidate). */
export function getDefaultCabinetSelections(): Record<SelectableSlotId, string> {
  const defaults = {} as Record<SelectableSlotId, string>
  for (const slotId of SELECTABLE_SLOT_IDS) {
    defaults[slotId] = getCandidatesForSlot(slotId)[0]?.candidateId ?? ''
  }
  return defaults
}

/** Validate a client-submitted selections map against what this specific user actually owns, falling back to defaults for anything missing/invalid/locked — same "never trust client ids" posture as perkId/campaignChoiceIds in app/api/game/route.ts. */
export function validateCabinetSelections(
  submitted: Partial<Record<string, string>> | undefined,
  ownedContent: Set<string>,
): Record<SelectableSlotId, string> {
  const resolved = getDefaultCabinetSelections()
  if (!submitted) return resolved
  for (const slotId of SELECTABLE_SLOT_IDS) {
    const candidateId = submitted[slotId]
    if (candidateId && getCandidatesForSlot(slotId, ownedContent).some(c => c.candidateId === candidateId)) {
      resolved[slotId] = candidateId
    }
  }
  return resolved
}

/** Sum of every selected candidate's startingBonus — folded into the same combinedBonus pipeline as perk/campaign bonuses before the one applyDelta call in createInitialGame. Runs on selections already validated by validateCabinetSelections, so it resolves via 'all' rather than re-checking ownership. */
export function sumStartingBonuses(selections: Record<SelectableSlotId, string>): StatDelta {
  const bonus: StatDelta = {}
  for (const slotId of SELECTABLE_SLOT_IDS) {
    const candidate = getCandidatesForSlot(slotId, 'all').find(c => c.candidateId === selections[slotId])
    if (!candidate?.startingBonus) continue
    for (const [key, value] of Object.entries(candidate.startingBonus) as [keyof StatDelta, number][]) {
      bonus[key] = ((bonus[key] ?? 0) as number) + value
    }
  }
  return bonus
}

/** Seed npcRelationships/npcTraits for the full roster at game creation. Same 'all' reasoning as sumStartingBonuses — selections are already trusted by this point. */
export function seedRosterState(selections: Record<SelectableSlotId, string>): {
  npcRelationships: Record<string, number>
  npcTraits: Record<string, NpcTraits>
} {
  const npcRelationships: Record<string, number> = {}
  const npcTraits: Record<string, NpcTraits> = {}

  for (const entry of ALL_NPC_ENTRIES) {
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
 * filtered list.
 */
export function hireCandidate(game: Game, slotId: SelectableSlotId, candidateId: string, ownedContent: Set<string>): Game {
  const candidate = getCandidatesForSlot(slotId, ownedContent).find(c => c.candidateId === candidateId)
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
