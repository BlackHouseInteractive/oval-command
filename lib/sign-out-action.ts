'use server'

import { signOut } from '@/lib/auth'

// A Client Component can't import signOut from lib/auth.ts directly — that
// module pulls in the full NextAuth/Prisma server config, which isn't
// valid to bundle into client code. This is the same "export a thin
// 'use server' wrapper" pattern lib/account-link.ts already uses for the
// same reason.
export async function signOutAction() {
  await signOut({ redirectTo: '/login' })
}
