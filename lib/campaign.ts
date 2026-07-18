/**
 * The campaign, election night, and inauguration — the beat before a term
 * starts. Six short campaign-trail beats, in rough chronological order
 * (running mate through victory speech), feed a small starting-stat bonus
 * (same clamping pipeline as difficulty mods and perks), then an
 * election-night result is revealed before the oath of office.
 *
 * Each beat has two variants — pickCampaignScenarios() rolls one per beat
 * per new-game session, so the campaign doesn't play out identically every
 * single presidency. Variant selection is unseeded client-side randomness
 * (there's nothing to trust yet — no game exists until "Take the Oath of
 * Office"); resolveCampaignChoices() only needs a catalog of option id ->
 * effects to re-derive the real bonus server-side, so it doesn't matter
 * which variant text actually produced a given choice id.
 *
 * The player wins the overwhelming majority of the time — computeElectionResult
 * mostly varies HOW big the win was — but there's a ~0.5% easter-egg chance
 * of a genuine loss, surfaced via its own concession-night screen with a
 * reroll rather than a real game-over (see NewGameForm's "Try Again").
 */

import type { StatDelta, Difficulty, GameStats, Party } from '@/types/game'
import { hashSeed, getStatLabel } from '@/lib/utils'

export interface CampaignOption {
  id: string
  label: string
  effects: StatDelta
}

/** Either fixed text, or text that reads differently depending on the campaign's party — resolved via resolveCampaignText(). */
export type PartyText = string | Record<Party, string>

export interface CampaignScenario {
  /** Shared across every variant of the same beat — used for background art (SCENARIO_BACKGROUNDS) and ordering, NOT for uniqueness (see variant ids on options for that). */
  id: string
  prompt: string
  flavor: PartyText
  options: CampaignOption[]
}

export function resolveCampaignText(value: PartyText, party: Party): string {
  return typeof value === 'string' ? value : value[party]
}

// Two variants per beat, indexed [0] and [1] — pickCampaignScenarios()
// rolls one per beat per session. Keep new variants balanced against their
// sibling: same rough effect magnitude (mostly +-1 to +-3 per stat,
// occasional stat-for-stat tradeoffs), same 3-option shape, distinct
// scenario rather than a reword of the existing one.
const CAMPAIGN_BEATS: CampaignScenario[][] = [
  [
    {
      id: 'running_mate',
      prompt: 'The Running Mate Announcement',
      flavor: "Every name on the shortlist says something different about the campaign you're about to run.",
      options: [
        { id: 'mate_loyalist', label: 'Pick the loyalist — steady hands, zero surprises', effects: { partyUnity: 3, congressSupport: 1 } },
        { id: 'mate_swing_state', label: 'Pick the swing-state governor — an electoral gamble with a real payoff', effects: { baseSupport: 2, approval: 1 } },
        { id: 'mate_outsider', label: 'Pick the outsider — energizes the base, unsettles the establishment', effects: { baseSupport: 3, partyUnity: -2 } },
      ],
    },
    {
      id: 'running_mate',
      prompt: 'The Vetting Leak',
      flavor: {
        DEMOCRAT: "A rival campaign leaks an old opposition-research file on your presumptive pick, days before the announcement was supposed to land — right as the labor coalition was expecting a name.",
        REPUBLICAN: "A rival campaign leaks an old opposition-research file on your presumptive pick, days before the announcement was supposed to land — right as the party's base was expecting a name.",
        INDEPENDENT: "A rival campaign leaks an old opposition-research file on your presumptive pick, days before the announcement was supposed to land — with no party machine to absorb the hit for you.",
      },
      options: [
        { id: 'vet_stand_by', label: 'Stand by your pick — announce as planned, leak and all', effects: { baseSupport: 3, partyUnity: -1 } },
        { id: 'vet_swap', label: 'Quietly swap in your backup choice', effects: { partyUnity: 2, approval: -1 } },
        { id: 'vet_preempt', label: 'Get ahead of it — release the file yourselves, on your own terms', effects: { globalReputation: 1, congressSupport: 2 } },
      ],
    },
  ],
  [
    {
      id: 'october_surprise',
      prompt: 'The October Surprise',
      flavor: 'Three weeks out, a leaked memo lands in every newsroom in the country. How you respond in the next 48 hours will define the final stretch.',
      options: [
        { id: 'surprise_confront', label: 'Address it head-on in a press conference', effects: { approval: 2, globalReputation: 1 } },
        { id: 'surprise_deflect', label: "Deflect — pivot every question back to your opponent's record", effects: { baseSupport: 2, partyUnity: -1 } },
        { id: 'surprise_silence', label: 'Say nothing and let surrogates handle it', effects: { congressSupport: 1, approval: -1 } },
      ],
    },
    {
      id: 'october_surprise',
      prompt: 'The Foreign Interference Story',
      flavor: "A credible intelligence report claims a foreign government is quietly trying to help your campaign. The story breaks before you've even seen the report yourself.",
      options: [
        { id: 'interference_reject', label: 'Call it out publicly and reject any help, unequivocally', effects: { globalReputation: 2, baseSupport: -1 } },
        { id: 'interference_dismiss', label: 'Dismiss it as opposition noise, keep campaigning', effects: { baseSupport: 2, globalReputation: -1 } },
        { id: 'interference_briefing', label: 'Request an intelligence briefing before saying anything at all', effects: { congressSupport: 1, approval: 1 } },
      ],
    },
  ],
  [
    {
      id: 'final_debate',
      prompt: 'The Final Debate',
      flavor: 'Three nights before the vote, sixty million people are watching. Whatever happens here is the last impression most of them get.',
      options: [
        { id: 'debate_attack', label: "Go on the attack — hit your opponent's record hard", effects: { approval: 3, partyUnity: -2, baseSupport: 2 } },
        { id: 'debate_policy', label: 'Stay disciplined — pivot every answer back to your plan', effects: { congressSupport: 2, partyUnity: 2 } },
        { id: 'debate_trust', label: 'Make it personal — tell them this election is about trust', effects: { approval: 1, baseSupport: 3, globalReputation: -1 } },
      ],
    },
    {
      id: 'final_debate',
      prompt: 'The Gaffe Recovery',
      flavor: "You misspeak on a policy number live, mid-answer. The moderator catches it in real time and presses you on it, on camera, with sixty million people watching you decide what to do next.",
      options: [
        { id: 'gaffe_own', label: 'Own the mistake immediately, correct the record on the spot', effects: { approval: 2, globalReputation: 1 } },
        { id: 'gaffe_push_through', label: 'Bulldoze past it — change the subject with conviction', effects: { baseSupport: 3, partyUnity: -1 } },
        { id: 'gaffe_reframe', label: "Turn it back on the moderator's framing of the question", effects: { partyUnity: 2, approval: -1 } },
      ],
    },
  ],
  [
    {
      id: 'last_stop',
      prompt: 'The Last Campaign Stop',
      flavor: 'One day left. The plane can only go one place before the polls open.',
      options: [
        { id: 'stop_base', label: 'Barnstorm the industrial Midwest — shore up the base', effects: { baseSupport: 3, partyUnity: 1 } },
        { id: 'stop_suburbs', label: 'Court the suburbs with a message of unity', effects: { approval: 2, congressSupport: 1 } },
        { id: 'stop_congress', label: 'Skip the rally — lock in commitments from wavering members of Congress', effects: { congressSupport: 3 } },
      ],
    },
    {
      id: 'last_stop',
      prompt: 'The Storm Warning',
      flavor: "A major storm is bearing down on a swing state, due to make landfall the night before the vote. The rally there is still on the schedule, for now.",
      options: [
        { id: 'storm_fly_in', label: 'Fly in anyway — show up for the state', effects: { baseSupport: 2, approval: -1 } },
        { id: 'storm_redirect', label: 'Cancel the rally, redirect the campaign toward relief coordination', effects: { approval: 3, baseSupport: -1 } },
        { id: 'storm_split', label: 'A short, storm-safe event, paired with visible relief coordination', effects: { congressSupport: 1, approval: 1 } },
      ],
    },
  ],
  [
    {
      id: 'election_day_ground_game',
      prompt: 'Election Day Ground Game',
      flavor: "Polls are open. The campaign's last lever is turnout — and where you spend the final hours of organizing money says everything about your theory of the race.",
      options: [
        { id: 'ground_base_turnout', label: 'Pour resources into base turnout operations', effects: { baseSupport: 3 } },
        { id: 'ground_persuasion', label: 'Fund last-minute persuasion ads in swing districts', effects: { approval: 2, congressSupport: 1 } },
        { id: 'ground_legal', label: 'Deploy legal teams to monitor polling places', effects: { globalReputation: 1, partyUnity: 1 } },
      ],
    },
    {
      id: 'election_day_ground_game',
      prompt: 'The Legal Challenge',
      flavor: {
        DEMOCRAT: "The opposing campaign files an emergency suit over polling hours in a contested county — while your coalition's turnout operation is still running.",
        REPUBLICAN: "The opposing campaign files an emergency suit over polling hours in a contested county — while your base's turnout operation is still running.",
        INDEPENDENT: "The opposing campaign files an emergency suit over polling hours in a contested county — with no party machine's legal team already staffed and ready.",
      },
      options: [
        { id: 'legal_fight', label: 'Fight it in court immediately', effects: { globalReputation: 1, partyUnity: 1 } },
        { id: 'legal_quiet', label: "Let the party's legal team handle it quietly, stay focused on turnout", effects: { baseSupport: 2 } },
        { id: 'legal_public', label: 'Make a public statement calling it what it is — voter suppression', effects: { baseSupport: 3, globalReputation: -1 } },
      ],
    },
  ],
  [
    {
      id: 'victory_speech',
      prompt: 'The Victory Speech',
      flavor: 'The networks have called it. The crowd is waiting for you to walk out and say something that will outlive the night.',
      options: [
        { id: 'speech_mandate', label: 'Declare a mandate for bold, sweeping change', effects: { approval: 3, partyUnity: -1 } },
        { id: 'speech_unity', label: 'Promise to be a president for every American, not just those who voted for you', effects: { globalReputation: 2, baseSupport: -1 } },
        { id: 'speech_brief', label: 'Keep it brief — thank the country, promise to get to work', effects: { congressSupport: 1, approval: 1 } },
      ],
    },
    {
      id: 'victory_speech',
      prompt: 'The Gracious Opponent',
      flavor: 'Your opponent calls to concede sooner than expected, before final results are even certified. The cameras are already rolling for your own remarks.',
      options: [
        { id: 'gracious_praise', label: 'Praise them generously, set a unifying tone', effects: { globalReputation: 2, baseSupport: -1 } },
        { id: 'gracious_pivot', label: 'Acknowledge it briefly, pivot straight to your agenda', effects: { congressSupport: 2 } },
        { id: 'gracious_wait', label: 'Hold your remarks until results are fully certified', effects: { partyUnity: 1, approval: -1 } },
      ],
    },
  ],
]

/** Rolls one variant per beat, in beat order — called once per new-game session (see NewGameForm's useState initializer), not re-rolled on re-render. */
export function pickCampaignScenarios(): CampaignScenario[] {
  return CAMPAIGN_BEATS.map(variants => variants[Math.floor(Math.random() * variants.length)])
}

/**
 * Resolve a set of client-chosen option ids into the real StatDelta bonus
 * — always re-derived server-side from the full variant catalog, never
 * trusting a raw delta from the client. Searches every variant of every
 * beat (not just whichever ones a given session happened to roll) since
 * the server has no record of which variant the player actually saw —
 * every option id is unique across the whole catalog, so this is
 * unambiguous regardless. Unrecognized ids are silently ignored; if more
 * than one option from the same scenario is submitted, the first match
 * wins. Both are safe no-ops, not validation failures — this is a small
 * flavor bonus, not a security boundary worth hard-rejecting over.
 */
export function resolveCampaignChoices(choiceIds: string[]): StatDelta {
  const bonus: StatDelta = {}
  for (const variants of CAMPAIGN_BEATS) {
    for (const scenario of variants) {
      const option = scenario.options.find(o => choiceIds.includes(o.id))
      if (!option) continue
      for (const [key, value] of Object.entries(option.effects) as [keyof StatDelta, number][]) {
        bonus[key] = ((bonus[key] ?? 0) as number) + value
      }
      break
    }
  }
  return bonus
}

export interface ElectionResult {
  won:               boolean
  votePercent:       number
  marginLabel:       string
  narrative:         string
  // Deterministic flavor for the election-night reveal — same precedent as
  // votePercent/marginLabel: not a real statistical simulation, just a
  // richer read on the same underlying roll.
  popularVoteMargin: string
  electoralVotes:    number
  keyIssue:          string | null
}

// Harder modes start from a slimmer mandate — same "headwinds from day
// one" idea difficulty mods already apply to starting stats.
const DIFFICULTY_MARGIN_PENALTY: Record<Difficulty, number> = {
  easy: 4, normal: 0, hard: -4, expert: -8,
}

// Easter egg, not a real difficulty lever — deliberately independent of
// difficulty/campaign choices so it can't be farmed or avoided, just an
// occasional surprise. 1-in-200 (0.5%).
const LOSS_CHANCE_DENOMINATOR = 200

/** "+6.2 pts" style margin over the opponent, with a hash-derived decimal for texture. */
function formatPopularVoteMargin(seed: string, votePercent: number): string {
  const wholeMargin = 2 * votePercent - 100
  const decimal = (hashSeed(seed, 'margin-decimal') % 10) / 10
  const margin = wholeMargin + (wholeMargin >= 0 ? decimal : -decimal)
  return `${margin >= 0 ? '+' : ''}${margin.toFixed(1)} pts`
}

/**
 * A decorative electoral-vote count scaled to votePercent — NOT a real
 * state-by-state simulation (the engine has no concept of states). Wins
 * scale across the real 270–538 range; losses scale across a
 * below-270 range so the number itself communicates the outcome.
 */
function computeElectoralVotes(won: boolean, votePercent: number): number {
  if (won) {
    return Math.round(270 + ((votePercent - 50) / 18) * 268)
  }
  return Math.round(180 + ((votePercent - 44) / 4) * 89)
}

/** The single largest-magnitude stat from the campaign bonus, as a human label — or null if no campaign was run. */
function computeKeyIssue(campaignBonus: StatDelta): string | null {
  const entries = Object.entries(campaignBonus).filter(([, v]) => v !== undefined && v !== 0) as [keyof GameStats, number][]
  if (entries.length === 0) return null
  const top = entries.reduce((a, b) => (Math.abs(b[1]) > Math.abs(a[1]) ? b : a))
  return getStatLabel(top[0])
}

/**
 * A deterministic-but-flavorful vote share for election night — same
 * precedent as IntelligenceBriefing's confidence %: seeded pseudo-
 * randomness via hashSeed(), not a real statistical simulation. Almost
 * always a win (floors at 50%); the rare loss branch uses its own hash
 * bucket (a different salt) so it's an independent roll from the win
 * margin, not correlated with how well the campaign went.
 */
export function computeElectionResult(seed: string, difficulty: Difficulty, campaignBonus: StatDelta): ElectionResult {
  if (hashSeed(seed, 'loss-roll') % LOSS_CHANCE_DENOMINATOR === 0) {
    const votePercent = 44 + (hashSeed(seed, 'loss-margin') % 5) // 44–48%, a real if narrow loss
    return {
      won: false,
      votePercent,
      marginLabel: 'Conceded the Race',
      narrative: "The math never got there. Not every campaign ends in the Oval Office — this one ends in a ballroom that's already half empty.",
      popularVoteMargin: formatPopularVoteMargin(seed, votePercent),
      electoralVotes: computeElectoralVotes(false, votePercent),
      keyIssue: computeKeyIssue(campaignBonus),
    }
  }

  const base = 50 + (hashSeed(seed) % 13) // 50–62 deterministic base spread
  const campaignSwing = Math.round(
    Object.values(campaignBonus).reduce((sum: number, v) => sum + (v ?? 0), 0) * 0.4
  )
  const votePercent = Math.max(50, Math.min(68, base + DIFFICULTY_MARGIN_PENALTY[difficulty] + campaignSwing))
  const flavorFields = {
    popularVoteMargin: formatPopularVoteMargin(seed, votePercent),
    electoralVotes: computeElectoralVotes(true, votePercent),
    keyIssue: computeKeyIssue(campaignBonus),
  }

  if (votePercent >= 60) {
    return {
      won: true,
      votePercent,
      marginLabel: 'Landslide Victory',
      narrative: 'The networks called it before midnight. A mandate, unmistakably.',
      ...flavorFields,
    }
  }
  if (votePercent >= 54) {
    return {
      won: true,
      votePercent,
      marginLabel: 'Comfortable Majority',
      narrative: 'A clear win — enough to govern, not enough to silence the opposition.',
      ...flavorFields,
    }
  }
  return {
    won: true,
    votePercent,
    marginLabel: 'Razor-Thin Mandate',
    narrative: 'It came down to the final precincts. You won — barely. Everyone remembers that.',
    ...flavorFields,
  }
}
