import { cn } from '@/lib/utils'
import type { SocialPost } from '@/lib/social-feed'

function toneColor(tone: SocialPost['tone']): string {
  if (tone === 'positive') return 'text-[var(--color-good)]'
  if (tone === 'negative') return 'text-[var(--color-bad)]'
  return 'text-[var(--color-paper-faint)]'
}

export function SocialFeed({ posts }: { posts: SocialPost[] }) {
  if (posts.length === 0) return null

  return (
    <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 backdrop-blur-sm">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-paper-faint)]">
        Public Sentiment
      </div>
      <div className="mt-3 space-y-3">
        {posts.map((post, i) => (
          <div key={i} className="flex items-start gap-2.5 border-t border-[var(--color-border)] pt-3 first:border-t-0 first:pt-0">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-[var(--color-paper)]">{post.handle}</span>
                <span className={cn('font-mono text-[9px] uppercase tracking-[0.05em]', toneColor(post.tone))}>
                  {post.voice}
                </span>
              </div>
              <p className="mt-0.5 text-[13px] leading-snug text-[var(--color-paper-dim)]">{post.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
