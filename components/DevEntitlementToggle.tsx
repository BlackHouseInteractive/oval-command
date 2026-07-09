'use client'

import { useState, useTransition } from 'react'
import { toggleDevEntitlement } from '@/lib/dev-entitlements'

interface DevEntitlementToggleProps {
  contentId: string
  displayName: string
  category: string
  initialOwned: boolean
}

export function DevEntitlementToggle({ contentId, displayName, category, initialOwned }: DevEntitlementToggleProps) {
  const [owned, setOwned] = useState(initialOwned)
  const [pending, startTransition] = useTransition()

  function handleToggle() {
    const next = !owned
    setOwned(next)
    startTransition(async () => {
      try {
        await toggleDevEntitlement(contentId, next)
      } catch {
        setOwned(!next) // revert on failure
      }
    })
  }

  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <span>
        <span className="block text-sm font-medium text-[var(--color-paper)]">{displayName}</span>
        <span className="block font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--color-paper-faint)]">
          {category} · {contentId}
        </span>
      </span>
      <input
        type="checkbox"
        checked={owned}
        disabled={pending}
        onChange={handleToggle}
        className="h-4 w-4 accent-[var(--color-brass)]"
      />
    </label>
  )
}
