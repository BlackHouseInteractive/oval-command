/**
 * Shared between lib/account-link.ts (sets it) and
 * app/api/auth/complete-link/route.ts (reads it) — kept in its own file
 * since a 'use server' file may only export async functions, so the
 * constant can't live alongside the server actions in lib/account-link.ts.
 */
export const LINK_COOKIE_NAME = 'link-guest-id'
