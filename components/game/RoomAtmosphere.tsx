// Subtle full-viewport tint + decorative columns behind a room's content,
// keyed to that room's accent color. No new image assets — same motif as
// the login page's background treatment, generalized per room.
export function RoomAtmosphere({ color }: { color: string }) {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 15%, color-mix(in srgb, ${color} 16%, transparent) 0%, transparent 65%)`,
        }}
      />
      <div className="pointer-events-none fixed inset-y-0 left-8 -z-10 hidden w-px bg-gradient-to-b from-transparent via-[var(--color-border)] to-transparent opacity-30 md:block" />
      <div className="pointer-events-none fixed inset-y-0 right-8 -z-10 hidden w-px bg-gradient-to-b from-transparent via-[var(--color-border)] to-transparent opacity-30 md:block" />
    </>
  )
}
