'use server'

import { headers } from 'next/headers'
import { AuthError } from 'next-auth'
import { signIn } from '@/lib/auth'
import { createAccountWithPassword } from '@/lib/create-account'
import { getClientIp } from '@/lib/rate-limit'

export interface AuthFormState {
  error?: string
}

/**
 * signIn() redirects internally on success by throwing Next's special
 * redirect error — that must propagate, not be swallowed as a failure. Only
 * an actual AuthError (bad credentials, rate limited, etc.) becomes a
 * user-facing message; anything else re-throws.
 */
export async function signInWithPasswordAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  try {
    await signIn('password', formData)
    return {}
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Incorrect email or password.' }
    }
    throw error
  }
}

export async function signUpWithPasswordAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = formData.get('email')
  const password = formData.get('password')
  const name = formData.get('name')

  if (typeof email !== 'string' || typeof password !== 'string') {
    return { error: 'Email and password are required.' }
  }

  const result = await createAccountWithPassword({
    ip: getClientIp(await headers()),
    email,
    password,
    name: typeof name === 'string' ? name : undefined,
  })

  if (!result.ok) {
    return { error: result.error }
  }

  try {
    await signIn('password', formData)
    return {}
  } catch (error) {
    if (error instanceof AuthError) {
      // Account creation succeeded but the immediate sign-in somehow
      // didn't — extremely unlikely (same credentials just written), but
      // send them to sign in manually rather than silently stalling here.
      return { error: 'Account created — sign in below to continue.' }
    }
    throw error
  }
}
