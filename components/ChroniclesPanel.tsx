'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PurchaseButton } from '@/components/PurchaseButton'

interface ChroniclesPanelProps {
  gameId:           string
  initialIsPublic:  boolean
  initialShareSlug: string | null
  locked:           boolean
  product?:         { productId: string; priceCents: number; displayName: string }
}

/**
 * Chronicles' two "act on this presidency" capabilities — public sharing
 * and PDF export — grouped in one panel since both are gated behind the
 * same feature.chronicles entitlement. Advanced analytics (charts) render
 * separately below this, since they're read-only rather than an action.
 */
export function ChroniclesPanel({ gameId, initialIsPublic, initialShareSlug, locked, product }: ChroniclesPanelProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [shareSlug, setShareSlug] = useState(initialShareSlug)
  const [toggling, setToggling] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleToggle() {
    setToggling(true)
    setError(null)
    const next = !isPublic
    try {
      const res = await fetch(`/api/game/${gameId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not update sharing.')
      setIsPublic(data.isPublic)
      setShareSlug(data.shareSlug)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setToggling(false)
    }
  }

  async function handleCopyLink() {
    if (!shareSlug) return
    const url = `${window.location.origin}/chronicles/${shareSlug}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDownloadPdf() {
    setDownloading(true)
    setError(null)
    try {
      const res = await fetch(`/api/game/${gameId}/export-pdf`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Could not generate PDF.')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'presidency-report.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setDownloading(false)
    }
  }

  if (locked) {
    return (
      <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-5 opacity-60 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-paper-faint)]">
              Chronicles
            </span>
            <Lock className="h-3 w-3 text-[var(--color-paper-faint)]" />
          </div>
          {product && (
            <PurchaseButton
              productId={product.productId}
              label={`Unlock — $${(product.priceCents / 100).toFixed(2)}`}
            />
          )}
        </div>
        <p className="mt-2 text-xs text-[var(--color-paper-faint)]">
          Export this presidency as a PDF, share it publicly, and compare it against your other administrations.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-5 backdrop-blur-sm">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-paper-faint)]">
        Chronicles
      </div>

      {error && (
        <p className="mt-2 rounded-sm bg-[var(--color-bad-dim)] px-3 py-2 text-xs text-[var(--color-bad)]">{error}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          className={cn(
            'rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.05em] transition-colors disabled:opacity-50',
            isPublic
              ? 'border-[var(--color-good)]/40 text-[var(--color-good)] hover:bg-[var(--color-surface-2)]'
              : 'border-[var(--color-border-strong)] text-[var(--color-paper)] hover:border-[var(--color-brass-dim)]'
          )}
        >
          {toggling ? 'Updating…' : isPublic ? 'Public — Make Private' : 'Make Public'}
        </button>

        {isPublic && shareSlug && (
          <button
            type="button"
            onClick={handleCopyLink}
            className="rounded-sm border border-[var(--color-border-strong)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-paper)] transition-colors hover:border-[var(--color-brass-dim)]"
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        )}

        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="rounded-sm border border-[var(--color-brass-dim)] bg-[var(--color-brass)] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--color-ink)] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {downloading ? 'Preparing…' : 'Download PDF'}
        </button>
      </div>

      {isPublic && shareSlug && (
        <p className="mt-3 truncate font-mono text-[11px] text-[var(--color-paper-faint)]">
          /chronicles/{shareSlug}
        </p>
      )}
    </div>
  )
}
