/**
 * One first-person aphorism per Presidential Archetype (lib/archetype-engine.ts)
 * — generated from the archetype the administration actually earned, not
 * randomized, so replaying the same governing pattern always surfaces the
 * same quote.
 */

import type { PresidentialArchetype } from '@/lib/archetype-engine'

const QUOTES: Record<string, string> = {
  'The Crisis Manager': "I didn't get to choose the crises. I only got to choose how we answered them.",
  'The Diplomat': 'A treaty signed is worth more than a war won.',
  'The Hawk': 'Peace through strength was never a slogan in this administration — it was the whole plan.',
  'The Progressive Reformer': "The country doesn't remember caution. It remembers what got built.",
  'The Fiscal Conservative': 'Every dollar we didn\'t borrow is a promise we didn\'t break.',
  'The Populist': 'I governed for the people watching at home, not the people in the room.',
  'The Bipartisan Dealmaker': 'The bill that passes with both parties\' names on it outlives the ones that don\'t.',
  'The Steady Hand': 'History will call it unremarkable. I call it a country that got to sleep at night.',
  'The Iron President': 'Order isn\'t popular while you\'re building it. It only looks obvious afterward.',
  'The Economic Modernizer': 'Growth was never the easy path. It was just the right one.',
}

const DEFAULT_QUOTE = 'History will decide what these four years meant. I already have.'

export function getPresidentialQuote(archetype: PresidentialArchetype): string {
  return QUOTES[archetype.title] ?? DEFAULT_QUOTE
}
