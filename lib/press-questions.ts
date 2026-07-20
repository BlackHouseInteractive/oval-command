// Content pool for the Address the Nation press-conference mini-game —
// same "small hand-authored pool" convention as SPEECH_THEMES
// (lib/address-nation.ts), SPEECH_TEMPLATES (lib/headlines.ts), and
// REGION_FLAVOR/pickOne (components/game/SituationMap.tsx). Deliberately a
// plain .ts export rather than data/*.json — that path is reserved for
// era/ownership-gated ContentSource content (events, laws, npcs), which
// this theme-agnostic flavor pool doesn't need.

export type PressResponseStyle = 'stay_on_message' | 'pivot' | 'push_back'

export const STYLE_LABEL: Record<PressResponseStyle, string> = {
  stay_on_message: 'Stay on Message',
  pivot: 'Pivot',
  push_back: 'Push Back',
}

export interface PressResponseOption {
  style: PressResponseStyle
  responseText: string   // what the President actually says
  composureDelta: number // hand-tuned per question; never rendered
  followUp: string       // reporter's one-line reaction — no numeric spoiler
}

export interface PressQuestion {
  id: string
  reporterPrompt: string
  options: [PressResponseOption, PressResponseOption, PressResponseOption]
}

// Baseline the client's live meter and the server's resolution both start
// from — single source of truth so display and scoring can never drift.
export const COMPOSURE_BASELINE = 50

// 8 questions x 3 options. Which style carries the strongest delta is
// deliberately varied per question (roughly 3 stay_on_message / 2 pivot /
// 3 push_back win) so there's no single always-correct answer — reading
// the question is the actual skill, not memorizing a pattern.
export const PRESS_QUESTIONS: PressQuestion[] = [
  {
    id: "aide_subpoena",
    reporterPrompt: "A senior aide was seen shredding documents the night before a subpoena arrived. Was that a coincidence, Mr. President?",
    options: [
      {
        style: "stay_on_message",
        responseText: "I'm not going to get ahead of a review that's already underway. What I can tell you is this administration will cooperate fully with any legitimate inquiry.",
        composureDelta: 12,
        followUp: "A few reporters exchange glances — that landed steadier than expected.",
      },
      {
        style: "pivot",
        responseText: "What I'd rather talk about is the work this administration has actually delivered for the people who sent me here.",
        composureDelta: 3,
        followUp: "A ripple of muttering — the dodge is noted, if not dwelled on.",
      },
      {
        style: "push_back",
        responseText: "That's a loaded question and you know it. Ask me something real.",
        composureDelta: -8,
        followUp: "Pens move fast. That answer is the headline now.",
      },
    ],
  },
  {
    id: "grocery_prices",
    reporterPrompt: "Grocery prices are up double digits this year. What do you say to a family that can barely afford dinner?",
    options: [
      {
        style: "pivot",
        responseText: "I hear that, and it's exactly why we've moved on lowering costs where the federal government actually has leverage — starting with what's on that family's table.",
        composureDelta: 13,
        followUp: "A few notebooks pause mid-scribble — that answer had somewhere to go.",
      },
      {
        style: "stay_on_message",
        responseText: "Prices are a top priority for this administration, and we are working on it every day.",
        composureDelta: 4,
        followUp: "Fine, forgettable. The next hand goes up immediately.",
      },
      {
        style: "push_back",
        responseText: "Prices are up everywhere in the world right now — that's not a story about my administration.",
        composureDelta: -7,
        followUp: "A groan somewhere in the back row. That one will get clipped.",
      },
    ],
  },
  {
    id: "broken_promise",
    reporterPrompt: "You promised to get this done in your first hundred days. It's been a year. Why should anyone still trust your word?",
    options: [
      {
        style: "push_back",
        responseText: "Because I'll put my record next to anyone's. We moved faster on this than the last three administrations combined, and I'll stand behind every part of it.",
        composureDelta: 12,
        followUp: "That landed with some force — a few nodding pens in the second row.",
      },
      {
        style: "stay_on_message",
        responseText: "We've made real progress, and I understand the frustration with the pace. We're not done.",
        composureDelta: 4,
        followUp: "Measured, unremarkable. The room moves on.",
      },
      {
        style: "pivot",
        responseText: "There are a lot of things on the agenda right now — let me tell you about the parts that are working.",
        composureDelta: -6,
        followUp: "That reads as an admission dressed up as a segue. Someone says so, out loud.",
      },
    ],
  },
  {
    id: "followup_pileup",
    reporterPrompt: "You still haven't actually answered the question — will you commit to that timeline, yes or no?",
    options: [
      {
        style: "stay_on_message",
        responseText: "I've given you my answer, and I'll give it to you again: we act when the facts support it, not on someone else's calendar.",
        composureDelta: 11,
        followUp: "Repeating it, calmly, took the air out of the follow-up. It works.",
      },
      {
        style: "pivot",
        responseText: "Let's take a question from someone who hasn't gone twice already.",
        composureDelta: 3,
        followUp: "A little cold, but it moves the room along without incident.",
      },
      {
        style: "push_back",
        responseText: "I already answered that. Are you not listening, or just not writing it down?",
        composureDelta: -9,
        followUp: "That's going in the story now — not the policy, the tone.",
      },
    ],
  },
  {
    id: "gaffe_walkback",
    reporterPrompt: "Yesterday you told a crowd the unemployment rate was the lowest in a century — it isn't, and your own numbers show it. Care to correct the record?",
    options: [
      {
        style: "pivot",
        responseText: "I misspoke — the actual figure is still strong, and here's what it actually shows.",
        composureDelta: 12,
        followUp: "Owning it quickly and moving on reads as confident, not rattled.",
      },
      {
        style: "stay_on_message",
        responseText: "The broader point stands: this economy is moving in the right direction.",
        composureDelta: 3,
        followUp: "Technically true, pointedly evasive. A few reporters note the gap.",
      },
      {
        style: "push_back",
        responseText: "I said what I said. People know what I meant.",
        composureDelta: -10,
        followUp: "That's not going to age well by the evening broadcast.",
      },
    ],
  },
  {
    id: "policy_flip",
    reporterPrompt: "On the campaign trail you swore you'd never sign a bill like this. Now your signature's on it. What changed?",
    options: [
      {
        style: "push_back",
        responseText: "What changed is I sat in this office and saw the actual choice in front of me, not the one from a debate stage. I'd make the same call again.",
        composureDelta: 13,
        followUp: "Blunt and unbothered — it plays as conviction, not damage control.",
      },
      {
        style: "stay_on_message",
        responseText: "Governing means adjusting to the facts on the ground. I stand by this decision.",
        composureDelta: 4,
        followUp: "A standard answer to a pointed question. Nobody's mind changes either way.",
      },
      {
        style: "pivot",
        responseText: "Let's not relitigate the campaign — let's talk about what the bill actually does.",
        composureDelta: -6,
        followUp: "The dodge is obvious enough that it becomes its own follow-up question.",
      },
    ],
  },
  {
    id: "predecessor_jab",
    reporterPrompt: "Your predecessor handled a crisis like this in half the time. Why has your administration been so much slower?",
    options: [
      {
        style: "push_back",
        responseText: "Because we're not solving for a headline, we're solving for the outcome — and I'd put our results up against theirs any day.",
        composureDelta: 12,
        followUp: "Confident, and it lands — a couple of reporters actually smile at the swing.",
      },
      {
        style: "stay_on_message",
        responseText: "Every situation is different, and I'm focused on getting this one right.",
        composureDelta: 4,
        followUp: "Safe and a little flat. The room waits for something sharper that doesn't come.",
      },
      {
        style: "pivot",
        responseText: "I'm not going to spend this briefing comparing myself to the last guy.",
        composureDelta: -6,
        followUp: "That reads as ducking the comparison rather than answering it.",
      },
    ],
  },
  {
    id: "leaked_memo",
    reporterPrompt: "We've seen an internal memo that directly contradicts what you told the public last month. Want to explain the discrepancy?",
    options: [
      {
        style: "stay_on_message",
        responseText: "I'm not going to confirm or characterize the contents of a document I haven't verified in this room. What I've told the public stands.",
        composureDelta: 11,
        followUp: "Controlled. It doesn't fully settle the question, but it doesn't hand them a second story either.",
      },
      {
        style: "pivot",
        responseText: "Internal deliberations happen before a decision is final — that's how any White House works.",
        composureDelta: 3,
        followUp: "A reasonable point, delivered a little too fast to fully land.",
      },
      {
        style: "push_back",
        responseText: "I'd be careful reporting on a document you won't even show me.",
        composureDelta: -8,
        followUp: "That plays as an attack on the press, not an answer — and it's noted as exactly that.",
      },
    ],
  },
]

export function sampleQuestions(count = 3): PressQuestion[] {
  const pool = [...PRESS_QUESTIONS]
  const picked: PressQuestion[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(idx, 1)[0])
  }
  return picked
}

export interface PressAnswer {
  questionId: string
  optionIndex: 0 | 1 | 2
}

/** Server- and client-shared: resolves a validated set of answers to a 0-100
 *  composure score. Callers are responsible for validating questionId/
 *  optionIndex before calling this (see address-nation route). */
export function scoreAnswers(answers: PressAnswer[]): number {
  let score = COMPOSURE_BASELINE
  for (const a of answers) {
    const q = PRESS_QUESTIONS.find(q => q.id === a.questionId)
    const opt = q?.options[a.optionIndex]
    if (opt) score += opt.composureDelta
  }
  return Math.max(0, Math.min(100, score))
}
