const CATEGORY_BACKGROUNDS: Record<string, string> = {
  military:  '/situation-room-bg.png',
  security:  '/situation-room-bg.png',
  disaster:  '/situation-room-bg.png',
  economy:   '/cabinet-room-bg.png',
  social:    '/cabinet-room-bg.png',
  scandal:   '/press-room-bg.png',
  media:     '/press-room-bg.png',
  congress:  '/congress-bg.png',
  diplomacy: '/diplomatic-office-bg.png',
  international: '/diplomatic-office-bg.png',
}

const DEFAULT_BACKGROUND = '/oval-office-bg.png'

export function getEventBackground(category: string): string {
  return CATEGORY_BACKGROUNDS[category] ?? DEFAULT_BACKGROUND
}
