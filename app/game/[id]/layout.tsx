import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RoomNav } from '@/components/game/RoomNav'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function GameLayout({ children, params }: LayoutProps) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const row = await prisma.game.findUnique({
    where: { id },
    select: { id: true, userId: true },
  })
  if (!row) notFound()
  if (row.userId !== session.user.id) redirect('/dashboard')

  return (
    <>
      <RoomNav gameId={id} />
      {children}
    </>
  )
}
