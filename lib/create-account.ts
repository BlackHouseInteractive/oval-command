import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { checkRateLimit } from '@/lib/rate-limit'

export const SIGNUP_LIMIT = 5
export const SIGNUP_WINDOW_SECONDS = 15 * 60
const MIN_PASSWORD_LENGTH = 8

// Deliberately permissive — RFC 5322 is a much deeper rabbit hole than this
// needs; this is just "does it look like an email" before hitting the DB.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface CreateAccountParams {
  ip:       string
  email:    string
  password: string
  name?:    string
}

export type CreateAccountResult =
  | { ok: true; email: string }
  | { ok: false; error: string }

/**
 * Shared by app/api/auth/signup/route.ts (fetch-based signup) and
 * app/login/page.tsx's create-account Server Action — one place for
 * validation, rate limiting, and the actual User row creation so the two
 * call sites can't drift on password rules or limits.
 */
export async function createAccountWithPassword({ ip, email: rawEmail, password, name: rawName }: CreateAccountParams): Promise<CreateAccountResult> {
  const allowed = await checkRateLimit(`signup:${ip}`, SIGNUP_LIMIT, SIGNUP_WINDOW_SECONDS)
  if (!allowed) {
    return { ok: false, error: 'Too many signup attempts. Please wait a moment and try again.' }
  }

  const email = rawEmail.trim().toLowerCase()
  const name = rawName?.trim() ? rawName.trim().slice(0, 60) : email.split('@')[0]

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: 'Enter a valid email address.' }
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` }
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    return { ok: false, error: 'An account with this email already exists.' }
  }

  const hashedPassword = await hashPassword(password)
  await prisma.user.create({ data: { email, name, hashedPassword } })

  return { ok: true, email }
}
