/**
 * Social media feed — "Public Sentiment" panel in the Press Room.
 *
 * Pure templated text, same discipline as lib/headlines.ts — no AI calls.
 * Posts are picked from voice-specific pools based on which current stats
 * are notably strong or weak, interpolating real numbers where natural
 * (same pattern lib/advisor-conversation.ts already uses). Deterministic
 * per (gameId, currentMonth) via hashSeed, so the feed is stable across
 * reloads within a month and only changes once the month actually advances
 * — the same discipline IntelligenceBriefing's confidence score already
 * follows.
 */

import { hashSeed } from '@/lib/utils'
import type { GameStats } from '@/types/game'

export interface SocialPost {
  handle: string
  voice: string
  body: string
  tone: 'positive' | 'negative' | 'neutral'
}

interface PostTemplate {
  handle: string
  voice: string
  body: string
  tone: SocialPost['tone']
}

function seededPick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

// ── Condition-keyed template pools ──────────────────────────
// Each function returns [] if the condition doesn't apply this turn.

function approvalPosts(stats: GameStats): PostTemplate[] {
  if (stats.approval >= 65) {
    return [
      { handle: '@libertybelle_76', voice: 'Supporter', tone: 'positive', body: `${Math.round(stats.approval)}% approval and climbing — this is what real leadership looks like.` },
      { handle: '@MainStreetTribune', voice: 'Local Reporter', tone: 'positive', body: `Poll numbers out today show the President at ${Math.round(stats.approval)}% approval, a high point for the term so far.` },
    ]
  }
  if (stats.approval < 35) {
    return [
      { handle: '@resistnow_2025', voice: 'Critic', tone: 'negative', body: `${Math.round(stats.approval)}% approval. Even the President's own party is starting to distance themselves.` },
      { handle: '@BeltwayNumbers', voice: 'Independent Analyst', tone: 'negative', body: `At ${Math.round(stats.approval)}% approval, this administration is entering historically dangerous territory for a sitting president.` },
    ]
  }
  return []
}

function unrestPosts(stats: GameStats): PostTemplate[] {
  if (stats.unrest >= 55) {
    return [
      { handle: '@wakeupamerica_', voice: 'Critic', tone: 'negative', body: 'Streets are boiling over and the White House still doesn’t have a real answer. How much longer?' },
      { handle: '@RegionalWireDesk', voice: 'Local Reporter', tone: 'negative', body: 'Reporting live from downtown as another night of demonstrations stretches into the early hours.' },
    ]
  }
  if (stats.unrest <= 15) {
    return [
      { handle: '@homegrown_patriot', voice: 'Supporter', tone: 'positive', body: 'Say what you want about the President, but the country actually feels calm right now. That matters.' },
    ]
  }
  return []
}

function economyPosts(stats: GameStats): PostTemplate[] {
  if (stats.economy >= 70) {
    return [
      { handle: '@CapitalAnalyst', voice: 'Independent Analyst', tone: 'positive', body: 'Every leading indicator we track is pointing the same direction right now. Hard to argue with the numbers.' },
      { handle: '@libertybelle_76', voice: 'Supporter', tone: 'positive', body: 'My 401k hasn’t looked this good in years. Just saying.' },
    ]
  }
  if (stats.economy < 40) {
    return [
      { handle: '@notmypresident_', voice: 'Critic', tone: 'negative', body: 'The economy is cratering and all we get is another photo op. People are struggling out here.' },
      { handle: '@PolicyDeepDive', voice: 'Independent Analyst', tone: 'negative', body: `Economic composite index sitting at ${Math.round(stats.economy)} — this is not a number an incumbent wants to run on.` },
    ]
  }
  return []
}

function debtPosts(stats: GameStats): PostTemplate[] {
  if (stats.debt >= 55) {
    return [
      { handle: '@constitution_dave', voice: 'Supporter', tone: 'neutral', body: `$${stats.debt.toFixed(1)}T in debt is a real number and someone eventually has to answer for it. I trust this President to figure it out.` },
      { handle: '@BeltwayNumbers', voice: 'Independent Analyst', tone: 'negative', body: `National debt just crossed $${stats.debt.toFixed(1)}T. Credit markets are starting to ask questions.` },
    ]
  }
  return []
}

function mediaScorePosts(stats: GameStats): PostTemplate[] {
  if (stats.mediaScore <= -1) {
    return [
      { handle: '@homegrown_patriot', voice: 'Supporter', tone: 'negative', body: 'The press has been openly hostile to this administration for weeks now. Nobody’s even pretending to be fair anymore.' },
    ]
  }
  if (stats.mediaScore >= 1) {
    return [
      { handle: '@resistnow_2025', voice: 'Critic', tone: 'negative', body: 'Watching the press fall over itself to cover this presidency favorably is genuinely embarrassing.' },
    ]
  }
  return []
}

const FALLBACK_POSTS: PostTemplate[] = [
  { handle: '@MainStreetTribune', voice: 'Local Reporter', tone: 'neutral', body: 'Quiet news day out of Washington. Sometimes that’s the best kind.' },
  { handle: '@PolicyWonkDC', voice: 'Independent Analyst', tone: 'neutral', body: 'Nothing dramatic to report this month — steady as it goes for this administration.' },
  { handle: '@libertybelle_76', voice: 'Supporter', tone: 'neutral', body: 'Not every month needs to be a headline. Let the President do the job.' },
]

/**
 * Returns a stable set of ~5 posts for the current game state. Same
 * (gameId, currentMonth) pair always returns the same feed.
 */
export function generateSocialFeed(gameId: string, currentMonth: number, stats: GameStats): SocialPost[] {
  const pools = [approvalPosts(stats), unrestPosts(stats), economyPosts(stats), debtPosts(stats), mediaScorePosts(stats)]
    .filter(pool => pool.length > 0)

  const seed = hashSeed(gameId, String(currentMonth))
  const posts: PostTemplate[] = []

  pools.forEach((pool, i) => {
    posts.push(seededPick(pool, seed + i))
  })

  // Always have something to show, and pad toward ~5 posts with neutral
  // filler once the notable conditions run out.
  let fillerIndex = 0
  while (posts.length < Math.min(5, pools.length + FALLBACK_POSTS.length)) {
    posts.push(seededPick(FALLBACK_POSTS, seed + fillerIndex))
    fillerIndex++
    if (fillerIndex > FALLBACK_POSTS.length) break
  }

  return posts
}
