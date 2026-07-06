/**
 * Declassified Documents — pure narrative texture unlocked by flags the
 * engine already sets and fires during normal play (crisis-event choices,
 * law passage). No stat effects, no new tracking: reading these is a
 * reward for having lived through the moment, not a mechanic of its own.
 *
 * Letterheads and classifications are varied per document — different
 * agencies, different sensitivity levels — so the collection reads as a
 * real cross-section of the government's paper trail rather than one
 * template repeated eight times.
 */

export type Classification = 'TOP SECRET' | 'SECRET' | 'CONFIDENTIAL' | 'CLASSIFIED' | 'FOR INTERNAL USE'

export interface SecretFile {
  id: string
  letterhead: string
  classification: Classification
  requiresFlag: string
  body: string
}

export const SECRET_FILES: SecretFile[] = [
  {
    id: 'vaccine_program_review',
    letterhead: 'HHS Internal Memorandum',
    classification: 'FOR INTERNAL USE',
    requiresFlag: 'vaccine_program',
    body: 'The fast-tracked vaccine program met its distribution targets two months ahead of schedule. Manufacturing partners report the emergency authorization pathway cut normal review time by roughly 60% — a precedent the Department recommends studying, not repeating without cause.',
  },
  {
    id: 'nsa_grid_counter_op',
    letterhead: 'NSA Signals Report',
    classification: 'SECRET',
    requiresFlag: 'cyber_retaliation',
    body: 'The authorized counter-cyber operation succeeded in disrupting the originating infrastructure. Signals traffic in the following weeks suggests the targeted group has not fully reconstituted its capabilities — though attribution to a state sponsor remains assessed with only moderate confidence.',
  },
  {
    id: 'joint_chiefs_deployment_memo',
    letterhead: 'Joint Chiefs of Staff Memo',
    classification: 'TOP SECRET',
    requiresFlag: 'troops_deployed',
    body: 'Deployment strength and rules of engagement exceeded what was disclosed in the public briefing. The Joint Chiefs assess the posture as defensive in intent but note that regional partners have privately requested clarification on the mission’s actual scope.',
  },
  {
    id: 'ai_safety_board_briefing',
    letterhead: 'National AI Safety Board Briefing',
    classification: 'CONFIDENTIAL',
    requiresFlag: 'ai_regulated',
    body: 'Early compliance audits under the new framework found three frontier labs operating models that had not completed mandatory safety testing. All three have since submitted for review. The Board recommends this fact remain undisclosed pending completion of those audits.',
  },
  {
    id: 'fbi_data_broker_assessment',
    letterhead: 'FBI Assessment',
    classification: 'CLASSIFIED',
    requiresFlag: 'passed_data_privacy',
    body: 'The data-broker provisions in the new privacy law have already produced two active investigations into firms that continued selling location data after the opt-in requirement took effect. Neither company has been publicly named.',
  },
  {
    id: 'ag_scotus_memo',
    letterhead: 'Attorney General Memorandum',
    classification: 'FOR INTERNAL USE',
    requiresFlag: 'scotus_confirmed',
    body: 'The Department’s internal read on the newly confirmed justice’s likely posture on pending federal cases is more favorable than the confirmation hearings suggested. Solicitor General staff have been advised to adjust argument strategy on two cases currently in the pipeline.',
  },
  {
    id: 'cia_meddling_operation_brief',
    letterhead: 'CIA Brief',
    classification: 'TOP SECRET',
    requiresFlag: 'meddling_exposed',
    body: 'The operation that surfaced the foreign influence campaign relied on a human source inside the network’s outer structure. That source’s continued safety is assessed as at risk; exposure of operational details beyond what was already made public could be fatal to the individual.',
  },
  {
    id: 'grid_intrusion_diplomatic_cable',
    letterhead: 'Diplomatic Cable',
    classification: 'SECRET',
    requiresFlag: 'grid_intrusion_attributed',
    body: 'Through back-channel contacts, the attributed government has privately denied involvement in the grid intrusion while declining to explain the technical indicators linking the operation to state infrastructure. The Ambassador characterizes the denial as "expected, and not believed."',
  },
]
