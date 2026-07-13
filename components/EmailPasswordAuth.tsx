'use client'

import { useActionState, useState } from 'react'
import { signInWithPasswordAction, signUpWithPasswordAction, type AuthFormState } from '@/app/login/actions'
import { cn } from '@/lib/utils'

const initialState: AuthFormState = {}

/** Email/password sign-in and account creation — the "native login" alternative to Guest/GitHub/Google, all on one toggle so /login doesn't need a second route. */
export function EmailPasswordAuth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [signInState, signInFormAction, signInPending] = useActionState(signInWithPasswordAction, initialState)
  const [signUpState, signUpFormAction, signUpPending] = useActionState(signUpWithPasswordAction, initialState)

  const state = mode === 'signin' ? signInState : signUpState
  const pending = mode === 'signin' ? signInPending : signUpPending

  return (
    <div>
      <div className="flex rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-0.5">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={cn(
            'flex-1 rounded-sm py-1.5 font-mono text-[10px] uppercase tracking-[0.05em] transition-colors',
            mode === 'signin' ? 'bg-[var(--color-brass)] text-[var(--color-ink)]' : 'text-[var(--color-paper-faint)]'
          )}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={cn(
            'flex-1 rounded-sm py-1.5 font-mono text-[10px] uppercase tracking-[0.05em] transition-colors',
            mode === 'signup' ? 'bg-[var(--color-brass)] text-[var(--color-ink)]' : 'text-[var(--color-paper-faint)]'
          )}
        >
          Create Account
        </button>
      </div>

      {mode === 'signin' ? (
        <form key="signin" action={signInFormAction} className="mt-3 space-y-2.5">
          <input type="hidden" name="redirectTo" value="/dashboard" />
          <input
            type="email"
            name="email"
            required
            placeholder="Email"
            className="w-full rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-paper)] placeholder:text-[var(--color-paper-faint)] focus:border-[var(--color-brass-dim)] focus:outline-none"
          />
          <input
            type="password"
            name="password"
            required
            placeholder="Password"
            className="w-full rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-paper)] placeholder:text-[var(--color-paper-faint)] focus:border-[var(--color-brass-dim)] focus:outline-none"
          />
          {state.error && <p className="text-[11px] text-[var(--color-bad)]">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] py-3 text-sm font-medium text-[var(--color-paper)] transition-colors hover:bg-[var(--color-surface-2)] disabled:opacity-60"
          >
            {pending ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      ) : (
        <form key="signup" action={signUpFormAction} className="mt-3 space-y-2.5">
          <input type="hidden" name="redirectTo" value="/dashboard" />
          <input
            type="text"
            name="name"
            placeholder="Display name (optional)"
            className="w-full rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-paper)] placeholder:text-[var(--color-paper-faint)] focus:border-[var(--color-brass-dim)] focus:outline-none"
          />
          <input
            type="email"
            name="email"
            required
            placeholder="Email"
            className="w-full rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-paper)] placeholder:text-[var(--color-paper-faint)] focus:border-[var(--color-brass-dim)] focus:outline-none"
          />
          <input
            type="password"
            name="password"
            required
            minLength={8}
            placeholder="Password (8+ characters)"
            className="w-full rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-paper)] placeholder:text-[var(--color-paper-faint)] focus:border-[var(--color-brass-dim)] focus:outline-none"
          />
          {state.error && <p className="text-[11px] text-[var(--color-bad)]">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] py-3 text-sm font-medium text-[var(--color-paper)] transition-colors hover:bg-[var(--color-surface-2)] disabled:opacity-60"
          >
            {pending ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
      )}
    </div>
  )
}
