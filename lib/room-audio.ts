/**
 * Ambient room loop selection — same era-override shape as
 * lib/event-backgrounds.ts's getRoomImage(), kept as a separate module
 * (rather than folded into that file) since audio and image assets are
 * versioned/sourced independently and may not land in lockstep.
 */

const ROOM_KEY: Record<string, string> = {
  '/oval-office-bg.webp':       'oval-office',
  '/cabinet-room-bg.webp':      'cabinet-room',
  '/situation-room-bg.webp':    'situation-room',
  '/diplomatic-office-bg.webp': 'diplomatic-office',
  '/congress-bg.webp':          'congress',
  '/press-room-bg.webp':        'press-room',
}

// Every other backdrop in the game (per-category crisis art, the campaign
// flow's scenario/hangar/rally/hall photos) has no ambience track of its
// own — only six loops exist, one per West Wing room, per era. Rather than
// let getRoomAmbience() fall through to undefined for these (which
// playAmbient() treats as "fade whatever's playing to silence" — exactly
// the bug that made crisis briefings and the inauguration screen go
// silent despite a fully-dressed backdrop), each one is mapped to
// whichever existing room loop reads closest in mood. This is a stopgap
// tied to lib/event-backgrounds.ts's CATEGORY_BACKGROUNDS and
// components/NewGameForm.tsx's SCENARIO_BACKGROUNDS — a dedicated track
// for any of these should replace its entry here, not add a new lookup.
const FALLBACK_ROOM_KEY: Record<string, string> = {
  // Crisis-category backdrops (lib/event-backgrounds.ts CATEGORY_BACKGROUNDS)
  '/military-ops-bg.webp':          'situation-room',
  '/cyber-ops-bg.webp':             'situation-room',
  '/disaster-response-bg.webp':     'situation-room',
  '/economic-command-bg.webp':      'situation-room',
  '/domestic-unrest-bg.webp':       'situation-room',
  '/scandal-leak-bg.webp':          'press-room',
  '/media-coverage-bg.webp':        'press-room',
  '/diplomatic-summit-bg.webp':     'diplomatic-office',
  '/international-affairs-bg.webp':'diplomatic-office',
  '/personnel-matter-bg.webp':      'cabinet-room',
  // Campaign flow (components/NewGameForm.tsx)
  '/campaign-hangar-bg.webp':  'cabinet-room',
  '/press-scrum-bg.webp':      'press-room',
  '/debate-podium-bg.webp':    'press-room',
  '/campaign-rally-bg.webp':   'congress',
  '/field-office-bg.webp':     'situation-room',
  '/inauguration-bg.webp':     'oval-office',
  // victory-night-bg.webp / concession-night-bg.webp are ALSO the backdrop
  // for the real election-night reveal phase, which deliberately doesn't
  // look ambience up this way — it starts its own dedicated broadcast-bed
  // track directly (see NewGameForm's playAmbient('/audio/ambience/
  // election-night.mp3') effect) and renders no RoomAmbience of its own.
  // This mapping only ever applies to the campaign flow's 'victory_speech'
  // scenario, which reuses the same image earlier in the flow.
  '/victory-night-bg.webp':    'congress',
  '/concession-night-bg.webp':'press-room',
}

const ERAS_WITH_OWN_AMBIENCE = new Set(['cold_war'])

/**
 * `baseImage` is the same Modern-era image path callers already pass to
 * getRoomImage() (e.g. '/oval-office-bg.webp') — resolving ambience off
 * that shared key means a room page never needs to know both an image
 * path and a separate audio identifier for the same room. Files live at
 * /audio/ambience/modern/<room>.mp3 or /audio/ambience/cold-war/<room>.mp3.
 */
export function getRoomAmbience(baseImage: string, era?: string): string | undefined {
  const room = ROOM_KEY[baseImage] ?? FALLBACK_ROOM_KEY[baseImage]
  if (!room) return undefined
  const eraDir = era && ERAS_WITH_OWN_AMBIENCE.has(era) ? 'cold-war' : 'modern'
  return `/audio/ambience/${eraDir}/${room}.mp3`
}
