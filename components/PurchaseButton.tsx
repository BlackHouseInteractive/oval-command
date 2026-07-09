'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface PurchaseButtonProps {
  productId: string
  label: string
  /** Path to return to after checkout — defaults to the current page. */
  returnTo?: string
  className?: string
}

/** Reusable "buy this" primitive — POSTs to /api/checkout, then redirects to Stripe. Imported by Cabinet Packs (locked-candidate CTA), Premium Campaigns (locked-era CTA), and Chronicles' unlock prompt. */
export function PurchaseButton({ productId, label, returnTo, className }: PurchaseButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          returnTo: returnTo ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not start checkout.')
        setLoading(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Could not start checkout — check your connection and try again.')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={cn(
          'rounded-sm border border-[var(--color-brass-dim)] bg-[var(--color-brass)] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--color-ink)] transition-opacity hover:opacity-90 disabled:opacity-60',
          className
        )}
      >
        {loading ? 'Starting checkout…' : label}
      </button>
      {error && <p className="mt-1.5 text-[11px] text-[var(--color-bad)]">{error}</p>}
    </div>
  )
}
