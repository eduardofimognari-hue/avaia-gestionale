import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const data = await prisma.movimentiSoci.findMany({
      where: { aziendaId },
      orderBy: { data: 'desc' },
      include: { socio: true, liquidazione: { select: { id: true, importoNetto: true, stato: true } } },
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Errore nel recupero movimenti soci' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const body = await request.json()
    const { data, socioId, tipo, importo, categoria, descrizione } = body

    if (!socioId || !tipo || importo === undefined) {
      return NextResponse.json({ error: 'Campi obbligatori: socioId, tipo, importo' }, { status: 400 })
    }

    if (!['credito', 'debito'].includes(tipo)) {
      return NextResponse.json({ error: 'Il tipo deve essere credito o debito' }, { status: 400 })
    }

    const movimento = await prisma.movimentiSoci.create({
      data: {
        data: data ? new Date(data) : new Date(), socioId, tipo, importo, aziendaId,
        categoria: categoria ?? null,
        descrizione: descrizione ?? null,
      },
      include: { socio: true },
    })

    return NextResponse.json(movimento, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Errore nella creazione movimento socio' }, { status: 500 })
  }
}
