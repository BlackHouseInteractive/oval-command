// Content pool for the Congress whip-count mini-game — same plain-.ts-export
// convention as lib/press-questions.ts. Keyed by role id (speaker/
// senate_leader/opposition_leader), not by name, so it reads correctly
// against whichever era's actual NPC (Dunmore vs. Ashby, Briggs vs.
// Whitmore, Garrett vs. Cole) the roster resolves. Content is grounded in
// each leader's authored personality in data/npcs.json: the Speaker is
// transactional, the Senate Leader is a patient institutionalist, the
// Opposition Leader responds to competitive/political stakes, not favors
// or policy argument — so each of the 3 fixed approach styles is strongest
// for exactly one leader, weakest for another, no always-correct answer.

export type WhipLeaderId = "speaker" | "senate_leader" | "opposition_leader"
export type WhipStyle = "deal" | "case" | "pressure"

export const WHIP_STYLE_LABEL: Record<WhipStyle, string> = {
  deal: "Make the Deal",
  case: "Make the Case",
  pressure: "Apply Pressure",
}

export const WHIP_ORDER: WhipLeaderId[] = ["speaker", "senate_leader", "opposition_leader"]

export interface WhipOption {
  style: WhipStyle
  askText: string          // what the President's ask sounds like
  probabilityDelta: number // hand-tuned per leader; never rendered
  relationshipDelta: number
  followUp: string         // leader's one-line reaction — no numeric spoiler
}

export interface WhipTargetContent {
  npcId: WhipLeaderId
  prompt: string
  options: [WhipOption, WhipOption, WhipOption] // fixed order: deal, case, pressure
}

export const WHIP_TARGETS: Record<WhipLeaderId, WhipTargetContent> = {
  speaker: {
    npcId: "speaker",
    prompt: "The Speaker wants to know what this is worth to her before she brings it to the floor.",
    options: [
      {
        style: "deal",
        askText: "Name what she needs — committee assignments, project funding, whatever moves her members — and put it on the table.",
        probabilityDelta: 6,
        relationshipDelta: 2,
        followUp: "Now we're talking. I can find you the votes.",
      },
      {
        style: "case",
        askText: "Walk her through why this bill is good policy and good politics for her caucus.",
        probabilityDelta: 2,
        relationshipDelta: 1,
        followUp: "The policy's fine. Policy's never really the question with her, though.",
      },
      {
        style: "pressure",
        askText: "Remind her this is a priority and you expect her full support.",
        probabilityDelta: -5,
        relationshipDelta: -3,
        followUp: "Careful. I don't respond well to being told what to do.",
      },
    ],
  },
  senate_leader: {
    npcId: "senate_leader",
    prompt: "The Senate Leader wants to understand this bill before he commits anything.",
    options: [
      {
        style: "deal",
        askText: "Offer him something concrete in exchange for moving it quickly.",
        probabilityDelta: 2,
        relationshipDelta: 0,
        followUp: "I'm not in the market for trades on this one.",
      },
      {
        style: "case",
        askText: "Make the substantive case — why this is right for the institution, not just this administration.",
        probabilityDelta: 6,
        relationshipDelta: 2,
        followUp: "That's the kind of argument I can work with. Give me some time.",
      },
      {
        style: "pressure",
        askText: "Push hard — tell him the timeline doesn't allow for deliberation.",
        probabilityDelta: -5,
        relationshipDelta: -3,
        followUp: "Pushing me isn't going to make the Senate move faster. It might make it move slower.",
      },
    ],
  },
  opposition_leader: {
    npcId: "opposition_leader",
    prompt: "The Opposition Leader isn't inclined to help — but he's not immune to an angle.",
    options: [
      {
        style: "deal",
        askText: "Appeal to him personally — ask him to do this as a favor, for the good of the country.",
        probabilityDelta: -5,
        relationshipDelta: -2,
        followUp: "This isn't friendship. Don't ask me for one.",
      },
      {
        style: "case",
        askText: "Lay out the policy merits and hope they land.",
        probabilityDelta: 2,
        relationshipDelta: 0,
        followUp: "I've heard the arguments. I still think you're wrong.",
      },
      {
        style: "pressure",
        askText: "Frame it as a fight he can't afford to lose in front of his own voters.",
        probabilityDelta: 6,
        relationshipDelta: 2,
        followUp: "Now that's a version of this I can actually use.",
      },
    ],
  },
}

export interface WhipAnswer {
  npcId: WhipLeaderId
  styleIndex: 0 | 1 | 2
}

// Below this relationship level with a given leader, that leader's chosen
// delta (bonus or penalty) is halved — a neglected relationship blunts
// even a well-chosen approach, a well-cultivated one gets full value.
export const RELATIONSHIP_FLOOR = 35

/** Server- and client-shared: total probability bonus from a validated
 *  answer set, read against a single relationships snapshot (never mutated
 *  mid-calculation) so leader order can't affect the result. */
export function scoreWhipBonus(answers: WhipAnswer[], npcRelationships: Record<string, number>): number {
  let total = 0
  for (const a of answers) {
    const opt = WHIP_TARGETS[a.npcId]?.options[a.styleIndex]
    if (!opt) continue
    const relationship = npcRelationships[a.npcId] ?? 50
    total += opt.probabilityDelta * (relationship < RELATIONSHIP_FLOOR ? 0.5 : 1)
  }
  return Math.round(total)
}
