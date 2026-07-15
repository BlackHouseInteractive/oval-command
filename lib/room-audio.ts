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

const ERAS_WITH_OWN_AMBIENCE = new Set(['cold_war'])

/**
 * `baseImage` is the same Modern-era image path callers already pass to
 * getRoomImage() (e.g. '/oval-office-bg.webp') — resolving ambience off
 * that shared key means a room page never needs to know both an image
 * path and a separate audio identifier for the same room. Files live at
 * /audio/ambience/modern/<room>.mp3 or /audio/ambience/cold-war/<room>.mp3.
 */
export function getRoomAmbience(baseImage: string, era?: string): string | undefined {
  const room = ROOM_KEY[baseImage]
  if (!room) return undefined
  const eraDir = era && ERAS_WITH_OWN_AMBIENCE.has(era) ? 'cold-war' : 'modern'
  return `/audio/ambience/${eraDir}/${room}.mp3`
}
