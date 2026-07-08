/**
 * Presidential Archetype System.
 *
 * Analyzes the player's governing patterns across a full term — which
 * events they faced and how they handled them, which laws they passed,
 * their final stat profile — and assigns a presidential archetype that
 * reflects how they actually governed, not just their final score.
 *
 * This gives players an identity to compare and share:
 * "I got The Crisis Manager" vs "I ended up as The Peacemaker."
 */

import type { Game, GameLog, GameOverReason } from '@/types/game'
import { resolveRoster } from '@/lib/cabinet'
import { checkGameOver } from '@/lib/game-engine'

export interface PresidentialArchetype {
  title:                string   // "The Crisis Manager"
  subtitle:             string   // "Steady hand in turbulent times"
  description:          string   // 2-3 sentences on what defined this presidency
  traits:               string[] // 3 short trait labels
  icon:                 string   // emoji for sharing
  accomplishments:      string[] // concrete things derived from actual game data
  biggestCriticism:     string   // one-line honest critique
  historicalComparison: string   // "Historians will view this presidency as..."
  relationshipLegacy:   string   // how the term's closest and most strained relationships ended
}

interface GoverningPattern {
  militaryInterventions: number   // times chose military/security escalation
  diplomaticChoices:     number   // times chose diplomacy over force
  spendingChoices:       number   // times chose spending/investment
  austerityChoices:      number   // times chose cutting costs
  progressiveLaws:       number
  conservativeLaws:      number
  bipartisanLaws:        number
  crisisEventCount:      number   // total turns played
  finalApproval:         number
  finalDebt:             number
  finalGlobalRep:        number
  finalSecurity:         number
  scandals:              number
}

function scorePattern(game: Game, logs: GameLog[]): GoverningPattern {
  const p: GoverningPattern = {
    militaryInterventions: 0, diplomaticChoices: 0,
    spendingChoices: 0, austerityChoices: 0,
    progressiveLaws: 0, conservativeLaws: 0, bipartisanLaws: 0,
    crisisEventCount: logs.filter(l => l.actionType === 'CRISIS').length,
    finalApproval: game.stats.approval,
    finalDebt: game.stats.debt,
    finalGlobalRep: game.stats.globalReputation,
    finalSecurity: game.stats.security,
    scandals: game.activeScandals,
  }

  // Analyze stat deltas from logs to infer governing style
  logs.filter(l => l.actionType === 'CRISIS').forEach(l => {
    const d = l.statDeltas as Record<string, number>
    if ((d.security ?? 0) > 5 || (d.militaryReadiness ?? 0) > 0) p.militaryInterventions++
    if ((d.globalReputation ?? 0) > 4) p.diplomaticChoices++
    if ((d.debt ?? 0) > 0.5) p.spendingChoices++
    if ((d.debt ?? 0) < -0.2) p.austerityChoices++
  })

  // Law categories
  game.passedLaws.forEach(id => {
    // Import LAWS would create a circular dep — use naming conventions instead
    if (id.includes('universal') || id.includes('healthcare') || id.includes('climate') ||
        id.includes('student') || id.includes('housing') || id.includes('police_reform') ||
        id.includes('voting') || id.includes('drug_pricing') || id.includes('public_option')) {
      p.progressiveLaws++
    } else if (id.includes('tax_cut') || id.includes('deregulation') || id.includes('welfare_reform') ||
               id.includes('border') || id.includes('school_choice') || id.includes('military_spending') ||
               id.includes('fentanyl')) {
      p.conservativeLaws++
    } else {
      p.bipartisanLaws++
    }
  })

  return p
}

const ARCHETYPES: Array<{
  title: string; subtitle: string; description: string; traits: string[]; icon: string
  match: (p: GoverningPattern) => number  // higher score = better match
}> = [
  {
    title: 'The Crisis Manager',
    subtitle: 'Steady hand in turbulent times',
    description: 'This presidency was defined not by grand policy vision but by competent crisis response. When things went wrong — and they often did — the administration showed up. History may not remember the inspiration, but it will remember the stability.',
    traits: ['Pragmatist', 'Reactive', 'Reliable'],
    icon: '🛡️',
    match: p => p.crisisEventCount * 2 - p.diplomaticChoices - p.progressiveLaws - p.conservativeLaws,
  },
  {
    title: 'The Diplomat',
    subtitle: 'Built bridges the world over',
    description: 'When others reached for hard power, this President reached for a phone. A historic commitment to multilateral engagement redefined America\'s role in the world — sometimes at the cost of domestic political capital.',
    traits: ['Multilateralist', 'Patient', 'Global Thinker'],
    icon: '🌐',
    match: p => p.diplomaticChoices * 3 + (p.finalGlobalRep > 70 ? 10 : 0) - p.militaryInterventions * 2,
  },
  {
    title: 'The Hawk',
    subtitle: 'Strength through resolve',
    description: 'Adversaries learned quickly that this administration did not bluff. Military readiness, security investment, and decisive action in international crises defined the term. Critics called it reckless; supporters called it necessary.',
    traits: ['Decisive', 'Security-Focused', 'Uncompromising'],
    icon: '🦅',
    match: p => p.militaryInterventions * 3 + (p.finalSecurity > 70 ? 8 : 0) - p.diplomaticChoices * 2,
  },
  {
    title: 'The Progressive Reformer',
    subtitle: 'Rewrote the social contract',
    description: 'An ambitious domestic agenda transformed the relationship between citizen and state. Not all of it survived contact with Congress — but what passed will outlast the administration.',
    traits: ['Ambitious', 'Idealistic', 'Transformative'],
    icon: '✊',
    match: p => p.progressiveLaws * 5 + p.spendingChoices - p.conservativeLaws * 2,
  },
  {
    title: 'The Fiscal Conservative',
    subtitle: 'Kept the books honest',
    description: 'In an era of easy spending, this President chose discipline. Debt reduction, regulatory reform, and budget restraint weren\'t popular — but they were deliberate. The economic foundation built here may prove durable.',
    traits: ['Disciplined', 'Long-term Thinker', 'Budget Hawk'],
    icon: '📊',
    match: p => p.austerityChoices * 3 + p.conservativeLaws * 4 + (p.finalDebt < 42 ? 10 : 0) - p.spendingChoices * 2,
  },
  {
    title: 'The Populist',
    subtitle: 'Spoke directly to the people',
    description: 'Approval ratings were the north star. Popular programs, visible responses to visible problems, and a talent for reading the room — this presidency was always calibrated to what voters wanted to see. Whether that was leadership or performance is a question historians will debate.',
    traits: ['People-Pleaser', 'Instinctive', 'Popular'],
    icon: '📣',
    match: p => (p.finalApproval > 65 ? 15 : 0) + p.spendingChoices * 2 - p.austerityChoices * 2 - p.conservativeLaws,
  },
  {
    title: 'The Bipartisan Dealmaker',
    subtitle: 'Found common ground others couldn\'t',
    description: 'In a polarized era, this President chose cooperation over purity. The legislative record is shorter than idealists hoped, but the bills that passed had the kind of durable cross-party support that survives future administrations.',
    traits: ['Pragmatic', 'Consensus-Builder', 'Centrist'],
    icon: '🤝',
    match: p => p.bipartisanLaws * 5 - Math.abs(p.progressiveLaws - p.conservativeLaws) * 2,
  },
  {
    title: 'The Steady Hand',
    subtitle: 'No drama, no disasters, no legacy',
    description: 'Not every presidency reshapes history. This one kept the lights on, avoided catastrophe, and handed off a country roughly as stable as the one it inherited. There\'s more value in that than the history books often acknowledge.',
    traits: ['Cautious', 'Competent', 'Unmemorable'],
    icon: '⚖️',
    match: p => {
      const balanced = 10 - Math.abs(p.militaryInterventions - p.diplomaticChoices) * 2
      const stable = (p.finalApproval > 40 && p.finalApproval < 70 ? 8 : 0)
      return balanced + stable - (p.scandals * 5)
    },
  },
  {
    title: 'The Iron President',
    subtitle: 'Ruled with strength, governed through fear',
    description: 'Security, order, and control — the three pillars of this administration. Critics called it authoritarian. Supporters called it necessary. The country is safer, the institutions are strained, and the debate continues.',
    traits: ['Authoritarian', 'Order-Focused', 'Divisive'],
    icon: '⚔️',
    match: p => p.militaryInterventions * 2 + p.austerityChoices + (p.finalSecurity > 80 ? 10 : 0) + (p.scandals * 3),
  },
  {
    title: 'The Economic Modernizer',
    subtitle: 'Bet on growth, won on growth',
    description: 'A clear economic vision — growth over redistribution, investment over austerity, the private sector as the primary engine — defined every major decision. The numbers vindicated the bet. The people who were left behind are less certain.',
    traits: ['Growth-Oriented', 'Market-Friendly', 'Visionary'],
    icon: '📈',
    match: p => (p.finalApproval > 55 ? 5 : 0) + p.conservativeLaws * 3 + p.austerityChoices * 2,
  },
]

// ── Failure Archetypes ────────────────────────────────────────────────────
// The ARCHETYPES above are scored purely on governing style (military vs.
// diplomatic, spending vs. austerity, etc.) using whatever the final stat
// snapshot happens to be. That scoring has no idea the term ended abruptly —
// a presidency that got impeached, ran the debt into collapse, let national
// security fail outright, or lost the country to a constitutional crisis can
// still land on a flattering style-based archetype ("The Diplomat") and a
// score-bracket verdict ("historic presidency") if its other stats happened
// to look fine at the moment everything fell apart. That directly
// contradicts the REASON_LABEL badge shown right above it on the Legacy
// screen. These four dedicated archetypes replace the style-based pick
// whenever the term ended in one of these ways, so the identity, criticism,
// and historical framing always agree with how the presidency actually
// ended.
type FailureReason = Exclude<GameOverReason, 'TERM_COMPLETE'>

const FAILURE_ARCHETYPES: Record<FailureReason, Pick<PresidentialArchetype, 'title' | 'subtitle' | 'description' | 'traits' | 'icon'>> = {
  IMPEACHMENT: {
    title: 'The Disgraced',
    subtitle: 'Removed before the work was done',
    description: 'This presidency did not end on its own terms. Congress ended it. Whatever this administration accomplished along the way, it will forever be a footnote to how the term actually concluded.',
    traits: ['Scandal-Plagued', 'Distrusted', 'Removed'],
    icon: '🔨',
  },
  DEBT_COLLAPSE: {
    title: 'The Bankrupt',
    subtitle: 'Spent what the country didn’t have',
    description: 'The bill came due before the term did. Debt spiraled past what the economy could sustain, and the administration ran out of runway. Every other line on this report now sits in the shadow of how it ended.',
    traits: ['Overextended', 'Fiscally Reckless', 'Short-Sighted'],
    icon: '💸',
  },
  SECURITY_FAILURE: {
    title: 'The Besieged',
    subtitle: 'Overwhelmed when it mattered most',
    description: 'National security cannot be a secondary concern, and this administration learned that the hardest way possible. Whatever else defined this term, it will be remembered for the moment the country’s defenses gave way.',
    traits: ['Exposed', 'Reactive', 'Overrun'],
    icon: '🚨',
  },
  CONSTITUTIONAL_CRISIS: {
    title: 'The Unraveling',
    subtitle: 'Lost the room, then lost the country',
    description: 'Civil unrest doesn’t reach a breaking point by accident. Something in how this administration governed — or failed to govern — pushed the country past the point its institutions could hold, ending the term in crisis rather than at the ballot box.',
    traits: ['Polarizing', 'Overwhelmed', 'Destabilizing'],
    icon: '🔥',
  },
}

const FAILURE_CRITICISM: Record<FailureReason, string> = {
  IMPEACHMENT: 'Removed from office before the term’s end — no accomplishment on this list survives that headline.',
  DEBT_COLLAPSE: 'The national debt collapsed the term outright — the one failure no legislative record can offset.',
  SECURITY_FAILURE: 'A catastrophic breakdown in national security ended this presidency — the one failure a Commander-in-Chief cannot recover from.',
  CONSTITUTIONAL_CRISIS: 'Civil unrest spiraled beyond any institution’s ability to contain it, ending the term in crisis outright.',
}

const FAILURE_HISTORICAL_COMPARISON: Record<FailureReason, string> = {
  IMPEACHMENT: 'History remembers removals from office above almost everything else a presidency does. This term will be taught primarily as a cautionary tale, regardless of what else it accomplished.',
  DEBT_COLLAPSE: 'An economic collapse on this scale overshadows the rest of the record. Historians will treat the debt crisis as the defining — and disqualifying — feature of this term.',
  SECURITY_FAILURE: 'A security failure at this scale reshapes how a presidency is remembered. This term will be studied primarily for the moment its defenses failed, not for what came before it.',
  CONSTITUTIONAL_CRISIS: 'A term that ends in constitutional crisis is remembered for the crisis, not the record that preceded it. History will ask what could have been done differently long before it reached this point.',
}

// ── Relationship Legacy ──────────────────────────────────────────────────
// Normalizes each NPC's final relationship into their own min/max range
// (same 0-1 calculation CabinetCard.tsx's relationshipTone() uses) so the
// comparison is fair across NPCs with very different starting positions
// (e.g. opposition_leader's 5-70 range vs. chief_of_staff's 15-100).
function buildRelationshipLegacy(game: Game): string {
  const scored = resolveRoster(game).map(npc => {
    const value = game.npcRelationships[npc.id] ?? npc.relationship.start
    const { min, max } = npc.relationship
    return { name: npc.shortName, pct: (value - min) / (max - min) }
  }).sort((a, b) => b.pct - a.pct)

  const closest = scored[0]
  const weakest = scored[scored.length - 1]

  const closestLine = closest.pct >= 0.7
    ? `No one in the administration stood by you more than ${closest.name} — that bond held through everything this term threw at it.`
    : `${closest.name} was, in the end, the closest thing to a true ally you had — though even that relationship never became what it could have.`

  const weakestLine = weakest.pct < 0.25
    ? `${weakest.name} never came around — by the end, that relationship was beyond repair.`
    : `${weakest.name} kept a professional distance throughout — not hostile, but never quite trusting either.`

  return `${closestLine} ${weakestLine}`
}

export function computePresidentialArchetype(game: Game, logs: GameLog[]): PresidentialArchetype {
  const pattern = scorePattern(game, logs)

  // checkGameOver is a pure function of the final persisted stats, so
  // re-running it here reliably reconstructs the original ending reason
  // (same reasoning app/presidencies/page.tsx and app/archive/[id]/page.tsx
  // already rely on) without needing every call site to thread it through.
  const reason: GameOverReason = checkGameOver(game) ?? 'TERM_COMPLETE'
  const failureReason = reason === 'TERM_COMPLETE' ? null : (reason as FailureReason)

  const scored = ARCHETYPES.map(a => ({ archetype: a, score: a.match(pattern) }))
  scored.sort((a, b) => b.score - a.score)

  const best = failureReason ? FAILURE_ARCHETYPES[failureReason] : scored[0].archetype

  // ── Accomplishments ─────────────────────────────────────────────────────
  // Derived entirely from actual game data — what really happened this term.
  const accomplishments: string[] = []

  if (game.passedLaws.length >= 6) {
    accomplishments.push(`Signed ${game.passedLaws.length} laws into effect — a substantial legislative record`)
  } else if (game.passedLaws.length >= 3) {
    accomplishments.push(`Passed ${game.passedLaws.length} pieces of legislation through Congress`)
  } else if (game.passedLaws.length === 0) {
    accomplishments.push('No major legislation passed — the 48-month term produced no new law')
  }

  if (game.stats.approval >= 60) {
    accomplishments.push(`Left office with ${Math.round(game.stats.approval)}% approval — above the historical average`)
  }

  if (game.stats.debt < 40) {
    accomplishments.push('Reduced the national debt to its lowest level in decades')
  } else if (game.stats.debt < 44) {
    accomplishments.push('Held debt growth to a minimum through deliberate fiscal discipline')
  }

  if (game.stats.globalReputation >= 70) {
    accomplishments.push('Restored American standing on the world stage after years of tension')
  }

  if (game.stats.security >= 70) {
    accomplishments.push('Strengthened national security through sustained investment and posture')
  }

  if (game.stats.unemployment <= 3.5) {
    accomplishments.push(`Drove unemployment to ${game.stats.unemployment.toFixed(1)}% — a multi-decade low`)
  }

  if (game.activeConflicts.length === 0 && pattern.militaryInterventions > 0) {
    accomplishments.push('Began military actions abroad and saw them through to resolution')
  }

  if (game.stats.unrest <= 15) {
    accomplishments.push('Maintained domestic stability throughout a turbulent political era')
  }

  if (pattern.diplomaticChoices >= 4) {
    accomplishments.push('Prioritized diplomacy over force across multiple international crises')
  }

  if (accomplishments.length === 0) {
    accomplishments.push('Completed a full four-year term without triggering a constitutional crisis')
  }

  // ── Biggest Criticism ────────────────────────────────────────────────────
  // Every presidency has a criticism — even good ones. The question is
  // whether the criticism is a real indictment or a minor caveat. For a
  // term that ended in failure, the ending itself always is the criticism —
  // the stat-based branches below exist to find a real indictment in a
  // term that otherwise ran its full course, and shouldn't be second-guessed
  // by (for example) a security collapse that happened to leave approval
  // and the legislative record untouched.
  let biggestCriticism = ''

  if (failureReason) {
    biggestCriticism = FAILURE_CRITICISM[failureReason]
  } else if (game.passedLaws.length === 0) {
    biggestCriticism = 'A four-year term with no major legislation — critics called it a wasted mandate.'
  } else if (game.stats.debt >= 58) {
    biggestCriticism = `The national debt rose to $${game.stats.debt.toFixed(1)}T — future generations will inherit the bill.`
  } else if (game.stats.globalReputation < 40) {
    biggestCriticism = "America's standing abroad declined significantly — allies kept their distance by the end."
  } else if (game.stats.unrest >= 50) {
    biggestCriticism = 'Domestic unrest remained elevated throughout the term — the country felt divided.'
  } else if (pattern.militaryInterventions >= 3) {
    biggestCriticism = 'Critics argued the administration was too quick to reach for military solutions.'
  } else if (game.stats.approval < 40) {
    biggestCriticism = 'Approval ratings told the story — the public never fully warmed to this administration.'
  } else if (pattern.austerityChoices >= 4) {
    biggestCriticism = 'The relentless focus on fiscal discipline left social programs underfunded.'
  } else if (game.stats.approval >= 65 && game.passedLaws.length >= 4) {
    // Strong on both counts — criticism is a caveat, not an indictment
    biggestCriticism = 'Success can breed its own complacency. Some historians will ask what more could have been accomplished with a stronger mandate.'
  } else if (game.stats.approval >= 55 && game.passedLaws.length >= 2) {
    biggestCriticism = 'A solid record — but one that left some core promises unfulfilled. The opportunity was there for more.'
  } else if (pattern.spendingChoices >= 4) {
    biggestCriticism = 'The administration spent freely — the programs were popular, but the long-term fiscal math is harder to defend.'
  } else {
    // True generic fallback — only reached for genuinely ambiguous cases
    biggestCriticism = 'The administration played it safe — ambition was always tempered by caution.'
  }

  // ── Historical Comparison ────────────────────────────────────────────────
  // Note this formula has no security term — deliberately excluded below
  // via failureReason, since a SECURITY_FAILURE ending can otherwise score
  // very high here (security is capped at 15% of the *legacy* score and
  // isn't in this formula at all) despite being the reason the term ended.
  const totalScore =
    game.stats.approval * 0.3 +
    game.stats.economy * 0.2 +
    game.stats.globalReputation * 0.15 +
    (100 - game.stats.debt) * 0.15 +
    (100 - game.stats.unrest) * 0.1 +
    game.passedLaws.length * 3

  let historicalComparison = ''
  if (failureReason) {
    historicalComparison = FAILURE_HISTORICAL_COMPARISON[failureReason]
  } else if (totalScore >= 80) {
    historicalComparison = 'Historians will likely rank this among the strongest presidencies of the modern era — steady governance, meaningful legislation, and a country left better than it was found.'
  } else if (totalScore >= 65) {
    historicalComparison = 'A solid, competent term that will age well in the history books — not transformative, but effective when it mattered.'
  } else if (totalScore >= 48) {
    historicalComparison = 'A mixed legacy. Real accomplishments are offset by missed opportunities and unresolved tensions. History will be ambivalent.'
  } else if (totalScore >= 32) {
    historicalComparison = 'Future historians will struggle to find the defining achievement. The administration managed crises but rarely shaped events.'
  } else {
    historicalComparison = 'History will not be kind. The term will be studied as a cautionary example of what happens when leadership fails to meet the moment.'
  }

  return {
    title:                best.title,
    subtitle:             best.subtitle,
    description:          best.description,
    traits:               best.traits,
    icon:                 best.icon,
    accomplishments:      accomplishments.slice(0, 4), // cap at 4 for readability
    biggestCriticism,
    historicalComparison,
    relationshipLegacy:   buildRelationshipLegacy(game),
  }
}
