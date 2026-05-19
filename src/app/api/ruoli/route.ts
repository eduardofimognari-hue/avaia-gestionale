import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const ruoli = await prisma.ruoli.findMany({
      where: { attivo: true, aziendaId },
      orderBy: { nome: 'asc' },
    })
    return NextResponse.json(ruoli)
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero dei ruoli' }, { status: 500 })
  }
}
