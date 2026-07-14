import { isBreakingEvent } from '@/lib/game-engine'
import type { Game, CrisisEvent } from '@/types/game'

const CATEGORY_BACKGROUNDS: Record<string, string> = {
  military:  '/military-ops-bg.webp',
  security:  '/cyber-ops-bg.webp',
  disaster:  '/disaster-response-bg.webp',
  economy:   '/economic-command-bg.webp',
  social:    '/domestic-unrest-bg.webp',
  scandal:   '/scandal-leak-bg.webp',
  media:     '/media-coverage-bg.webp',
  congress:  '/congress-bg.webp',
  diplomacy: '/diplomatic-summit-bg.webp',
  international: '/international-affairs-bg.webp',
  personnel: '/personnel-matter-bg.webp',
}

const DEFAULT_BACKGROUND = '/oval-office-bg.webp'

export function getEventBackground(category: string): string {
  return CATEGORY_BACKGROUNDS[category] ?? DEFAULT_BACKGROUND
}

// Same category -> accent-color mapping CategoryTag.tsx uses, so the crisis
// card's backdrop tint and border always match that event's own category
// color instead of a fixed neutral tone.
const CATEGORY_ACCENTS: Record<string, string> = {
  security:  'var(--color-cat-security)',
  economy:   'var(--color-cat-economy)',
  disaster:  'var(--color-cat-disaster)',
  military:  'var(--color-cat-military)',
  scandal:   'var(--color-cat-scandal)',
  congress:  'var(--color-cat-congress)',
  social:    'var(--color-cat-social)',
  diplomacy: 'var(--color-cat-diplomacy)',
}

export function getEventAccentColor(category: string): string {
  return CATEGORY_ACCENTS[category] ?? 'var(--color-brass)'
}

export interface RoomTreatment {
  backgroundPosition: string
  foregroundStyle: 'desk' | 'chairs' | 'columns'
  foregroundColor: string
}

// Per-photo composition treatment — keyed by the image path itself (not
// category) so both the fixed room pages and CrisisCard's dynamic
// per-category background share one definition. All six room photos are now
// first-person POV shots (seated at the desk/table, or standing at a podium)
// with a blurred foreground object — a nameplate, folder, teacup, or the
// presidential seal — sitting at the bottom of frame, same "desk edge"
// composition the campaign/debate photos already use.
const ROOM_TREATMENTS: Record<string, RoomTreatment> = {
  '/oval-office-bg.webp':      { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#1c130c' },
  '/cabinet-room-bg.webp':     { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#1f150d' },
  '/situation-room-bg.webp':   { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#12141a' },
  '/diplomatic-office-bg.webp':{ backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#3d2417' },
  '/congress-bg.webp':         { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#3d2b18' },
  '/press-room-bg.webp':       { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#12141a' },
  // The podium's own curved top edge (with the presidential seal) already
  // sits at the very bottom of frame, same composition as the desk-edge
  // rooms — foregroundColor sampled from the podium's dark navy body so
  // the added gradient blends into the photo rather than tinting it.
  '/debate-podium-bg.webp':    { backgroundPosition: 'center center', foregroundStyle: 'desk',    foregroundColor: '#12141a' },
  // Same podium-edge composition, one per campaign-flow beat.
  '/campaign-rally-bg.webp':   { backgroundPosition: 'center center', foregroundStyle: 'desk',    foregroundColor: '#3d2b18' },
  // The swearing-in itself — shown on the dashboard's empty-state hero
  // and during cabinet assembly, both of which sit in the same
  // pre-governing transition window.
  '/inauguration-bg.webp':     { backgroundPosition: 'center center', foregroundStyle: 'desk',    foregroundColor: '#241a10' },
  '/victory-night-bg.webp':    { backgroundPosition: 'center center', foregroundStyle: 'desk',    foregroundColor: '#151824' },
  '/concession-night-bg.webp': { backgroundPosition: 'center center', foregroundStyle: 'desk',    foregroundColor: '#0d0f14' },
  // Tense-mood counterparts — same composition/foreground object as their
  // calm version (an "URGENT"-stamped folder standing in for the usual
  // blotter/nameplate/teacup), just darker and redder.
  '/oval-office-bg-tense.webp':      { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#170f07' },
  '/cabinet-room-bg-tense.webp':     { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#170f08' },
  '/situation-room-bg-tense.webp':   { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#150a0a' },
  '/diplomatic-office-bg-tense.webp':{ backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#241a10' },
  '/congress-bg-tense.webp':         { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#1c140c' },
  '/press-room-bg-tense.webp':       { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#0e0e12' },
  // Per-category crisis backdrops — distinct from the six West Wing room
  // photos above, since these render on CrisisCard specifically and are
  // already crisis-flavored (stamped folders, alert dashboards) regardless
  // of the broader isTenseMood() signal, so they have no separate tense
  // variant of their own.
  '/military-ops-bg.webp':      { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#1a1108' },
  '/cyber-ops-bg.webp':         { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#0a0e14' },
  '/disaster-response-bg.webp': { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#171008' },
  '/economic-command-bg.webp':  { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#1a130a' },
  '/domestic-unrest-bg.webp':   { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#1a140c' },
  '/scandal-leak-bg.webp':      { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#170f08' },
  '/diplomatic-summit-bg.webp': { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#241a10' },
  '/media-coverage-bg.webp':        { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#0a0e14' },
  '/international-affairs-bg.webp': { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#0d1218' },
  '/personnel-matter-bg.webp':      { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#1c130c' },
  // Cold War room art — same composition/framing as their Modern
  // counterparts above, redressed for the era.
  '/oval-office-bg-cw.webp':       { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#1c130c' },
  '/cabinet-room-bg-cw.webp':      { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#1f150d' },
  '/situation-room-bg-cw.webp':    { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#12141a' },
  '/diplomatic-office-bg-cw.webp': { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#3d2417' },
  '/congress-bg-cw.webp':          { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#3d2b18' },
  '/press-room-bg-cw.webp':        { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#12141a' },
  '/oval-office-bg-cw-tense.webp':       { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#170f07' },
  '/cabinet-room-bg-cw-tense.webp':      { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#170f08' },
  '/situation-room-bg-cw-tense.webp':    { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#150a0a' },
  '/diplomatic-office-bg-cw-tense.webp': { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#241a10' },
  '/congress-bg-cw-tense.webp':          { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#1c140c' },
  '/press-room-bg-cw-tense.webp':        { backgroundPosition: 'center center', foregroundStyle: 'desk', foregroundColor: '#0e0e12' },
}

export function getRoomTreatment(image: string): RoomTreatment {
  return ROOM_TREATMENTS[image] ?? ROOM_TREATMENTS['/oval-office-bg.webp']
}

// Cold War-specific room art — same six rooms, redressed for the era (rotary
// phones, analog wall maps, vintage TV cameras) rather than a generic reuse
// of the Modern era's photos. Keyed by the Modern base path so callers don't
// need two different image constants depending on era.
const ERA_ROOM_OVERRIDES: Record<string, Record<string, string>> = {
  cold_war: {
    '/oval-office-bg.webp':       '/oval-office-bg-cw.webp',
    '/cabinet-room-bg.webp':      '/cabinet-room-bg-cw.webp',
    '/situation-room-bg.webp':    '/situation-room-bg-cw.webp',
    '/diplomatic-office-bg.webp': '/diplomatic-office-bg-cw.webp',
    '/congress-bg.webp':          '/congress-bg-cw.webp',
    '/press-room-bg.webp':        '/press-room-bg-cw.webp',
  },
}

// Calm -> tense counterpart for each room photo. Any base image not listed
// here (campaign/debate/election-night backdrops) has no tense variant and
// getRoomImage() below just returns it unchanged.
const TENSE_VARIANTS: Record<string, string> = {
  '/oval-office-bg.webp':       '/oval-office-bg-tense.webp',
  '/cabinet-room-bg.webp':      '/cabinet-room-bg-tense.webp',
  '/situation-room-bg.webp':    '/situation-room-bg-tense.webp',
  '/diplomatic-office-bg.webp': '/diplomatic-office-bg-tense.webp',
  '/congress-bg.webp':          '/congress-bg-tense.webp',
  '/press-room-bg.webp':        '/press-room-bg-tense.webp',
  '/oval-office-bg-cw.webp':       '/oval-office-bg-cw-tense.webp',
  '/cabinet-room-bg-cw.webp':      '/cabinet-room-bg-cw-tense.webp',
  '/situation-room-bg-cw.webp':    '/situation-room-bg-cw-tense.webp',
  '/diplomatic-office-bg-cw.webp': '/diplomatic-office-bg-cw-tense.webp',
  '/congress-bg-cw.webp':          '/congress-bg-cw-tense.webp',
  '/press-room-bg-cw.webp':        '/press-room-bg-cw-tense.webp',
}

/**
 * A room reads as "tense" — swapping its calm photo for the matching
 * URGENT-folder/red-alert variant — the moment any one of three signals is
 * true: an active conflict is ongoing, the currently-pending event is a
 * Breaking News-tier event, or approval has fallen below 30. `event` is
 * optional: pages that don't already have the specific pending CrisisEvent
 * object on hand (e.g. CongressClient, which only carries its title) just
 * omit it and fall back to the other two signals.
 */
export function isTenseMood(game: Game, event?: CrisisEvent | null): boolean {
  return (
    game.activeConflicts.length > 0 ||
    Boolean(event && isBreakingEvent(event)) ||
    game.stats.approval < 30
  )
}

/**
 * Resolves the actual room image to render: swaps in the era-specific art
 * (currently only Cold War has its own set — other eras/no era fall back to
 * the Modern photos unchanged), then picks the tense variant of THAT image
 * when `tense` is true.
 */
export function getRoomImage(baseImage: string, tense: boolean, era?: string): string {
  const eraImage = (era && ERA_ROOM_OVERRIDES[era]?.[baseImage]) || baseImage
  return tense ? (TENSE_VARIANTS[eraImage] ?? eraImage) : eraImage
}
