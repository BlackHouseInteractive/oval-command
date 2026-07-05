/**
 * Which OAuth providers are actually usable — mirrors the exact env-var
 * check lib/auth.ts uses to decide whether to register each provider.
 * Shared so the login page, dashboard, and in-game account-linking prompts
 * never offer a button for a provider that isn't configured.
 */
export function getEnabledOAuthProviders() {
  const githubEnabled = Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET)
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  return { githubEnabled, googleEnabled }
}
