import {
  Heart, TrendingUp, Shield, Landmark, CreditCard, Flame,
  Globe2, Briefcase, Percent, Users, HeartHandshake, ShieldCheck, Newspaper,
} from 'lucide-react'
import type { GameStats } from '@/types/game'

/**
 * Uniform lucide-react icon per stat — replaces the previous partial PNG
 * icon set (only 5 of 13 stats had a dedicated icon file) so every stat
 * row across SecondaryStats and the Government Overview page reads
 * consistently.
 */
export const STAT_ICONS: Record<keyof GameStats, typeof Heart> = {
  approval: Heart,
  economy: TrendingUp,
  security: Shield,
  congressSupport: Landmark,
  debt: CreditCard,
  unrest: Flame,
  globalReputation: Globe2,
  unemployment: Briefcase,
  inflation: Percent,
  baseSupport: Users,
  partyUnity: HeartHandshake,
  militaryReadiness: ShieldCheck,
  mediaScore: Newspaper,
}

export function StatIcon({ statKey, size = 14, className }: { statKey: keyof GameStats; size?: number; className?: string }) {
  const Icon = STAT_ICONS[statKey]
  return <Icon size={size} className={className} strokeWidth={1.75} />
}
