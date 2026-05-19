import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const data = await prisma.regoleRipartizione.findMany({
      where: { attivo: true, aziendaId },
      include: {
        luogoSorgente: { select: { id: true, nome: true } },
        luogoDestinazione: { select: { id: true, nome: true } },
      },
      orderBy: { anno: 'desc' },
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Errore nel recupero regole ripartizione' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const body = await request.json()
    const { luogoSorgenteId, luogoDestinazioneId, percentuale, anno } = body

    if (!luogoSorgenteId || !luogoDestinazioneId || percentuale === undefined || !anno) {
      return NextResponse.json({ error: 'Campi obbligatori: luogoSorgenteId, luogoDestinazioneId, percentuale, anno' }, { status: 400 })
    }

    const regola = await prisma.regoleRipartizione.create({
      data: { luogoSorgenteId, luogoDestinazioneId, percentuale, anno, aziendaId },
      include: {
        luogoSorgente: { select: { id: true, nome: true } },
        luogoDestinazione: { select: { id: true, nome: true } },
      },
    })

    return NextResponse.json(regola, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Errore nella creazione regola ripartizione' }, { status: 500 })
  }
}
