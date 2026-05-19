import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const movimenti = await prisma.movimentiInput.findMany({
      where: { aziendaId },
      orderBy: { data: 'desc' },
      include: { prodotto: true },
    })
    return NextResponse.json(movimenti)
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero dei movimenti di magazzino' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const body = await request.json()
    const { data, prodottoId, tipo, quantita, unitaMisura, note } = body

    if (!data || !prodottoId || !tipo || quantita === undefined || !unitaMisura) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti: data, prodottoId, tipo, quantita, unitaMisura' }, { status: 400 })
    }

    if (!['carico', 'scarico', 'vendita', 'reso'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo non valido. Valori ammessi: carico, scarico, vendita, reso' }, { status: 400 })
    }

    const movimento = await prisma.movimentiInput.create({
      data: {
        data: new Date(data), prodottoId, tipo, quantita, unitaMisura, aziendaId,
        note: note ?? null,
      },
      include: { prodotto: true },
    })

    return NextResponse.json(movimento, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Errore nella creazione del movimento' }, { status: 500 })
  }
}
