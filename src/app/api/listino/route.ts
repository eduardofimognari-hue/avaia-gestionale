import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const listino = await prisma.listinoPrezzi.findMany({
      where: { aziendaId },
      orderBy: { anno: 'desc' },
      include: { prodotto: true },
    })
    return NextResponse.json(listino)
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero del listino' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const body = await request.json()
    const { anno, prodottoId, tipoCliente, formato, unitaMisura, prezzoBase, dataInizio, dataFine, note } = body

    if (!anno || !prodottoId || !tipoCliente || !formato || !unitaMisura || prezzoBase === undefined) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti: anno, prodottoId, tipoCliente, formato, unitaMisura, prezzoBase' }, { status: 400 })
    }

    const entry = await prisma.listinoPrezzi.create({
      data: {
        anno, prodottoId, tipoCliente, formato, unitaMisura, prezzoBase, aziendaId,
        dataInizio: dataInizio ? new Date(dataInizio) : null,
        dataFine: dataFine ? new Date(dataFine) : null,
        note: note ?? null,
      },
      include: { prodotto: true },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Errore nella creazione del listino' }, { status: 500 })
  }
}
