// Full-viewport photo backdrop for a room, with a flat uniform scrim so
// RoomNav/DashboardHeader/StatCards — which have no opaque background of
// their own and can end up anywhere in the viewport as the player scrolls —
// stay readable regardless of scroll position (a radial vignette leaves the
// edges too bright; see CrisisCard's original fix for this exact issue).
export function RoomBackground({ image }: { image: string }) {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage: `url(${image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: 'rgba(6,8,14,0.78)' }}
      />
    </>
  )
}
