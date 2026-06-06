import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function GET() {
  try {
    const aziende = await prisma.azienda.findMany({ where: { attivo: true }, orderBy: { nome: 'asc' } })
    const currentId = await getCurrentAziendaId()
    const current = currentId ? aziende.find(a => a.id === currentId) || aziende[0] : aziende[0]
    return NextResponse.json({ aziende, current: current || null })
  } catch {
    return NextResponse.json({ error: 'Errore nel recupero delle aziende' }, { status: 500 })
  }
}
