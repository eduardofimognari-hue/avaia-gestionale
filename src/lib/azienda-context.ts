import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { prisma } from './db'

export async function getCurrentAziendaId(): Promise<number | null> {
  const cookieStore = await cookies()
  const id = cookieStore.get('aziendaId')?.value
  if (id) return parseInt(id)

  const session = await getServerSession(authOptions)
  const sessionAziendaId = (session as any)?.aziendaId
  if (sessionAziendaId) return sessionAziendaId

  const first = await prisma.azienda.findFirst({ where: { attivo: true }, orderBy: { id: 'asc' } })
  return first?.id ?? null
}

export async function getCurrentAzienda() {
  const aziendaId = await getCurrentAziendaId()
  if (!aziendaId) return null
  return prisma.azienda.findUnique({ where: { id: aziendaId } })
}

export async function requireAziendaId(): Promise<number> {
  const id = await getCurrentAziendaId()
  if (!id) throw new Error('Nessuna azienda selezionata')
  return id
}
