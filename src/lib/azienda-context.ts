import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions, getCurrentUser } from './auth'
import { prisma } from './db'

export async function getCurrentAziendaId(): Promise<number | null> {
  const cookieStore = await cookies()
  const id = cookieStore.get('aziendaId')?.value
  if (id) {
    const aziendaId = parseInt(id)
    const utente = await getCurrentUser()
    if (utente && utente.aziendaId !== aziendaId) {
      return utente.aziendaId
    }
    return aziendaId
  }

  const session = await getServerSession(authOptions)
  if (session?.aziendaId) return session.aziendaId

  return null
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
