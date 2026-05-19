import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const debiti = await prisma.debitiAperti.findMany({
      where: { aziendaId },
      orderBy: { data: 'desc' },
      include: { cliente: true, vendita: { select: { id: true, importoTotale: true, nota: true } } },
    })
    return NextResponse.json(debiti)
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero dei debiti' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const body = await request.json()
    const { data, clienteId, importo, descrizione, scadenza, venditaId, note } = body

    if (!importo) {
      return NextResponse.json({ error: 'Il campo importo è obbligatorio' }, { status: 400 })
    }

    const debito = await prisma.debitiAperti.create({
      data: {
        data: data ? new Date(data) : new Date(), aziendaId,
        clienteId: clienteId ?? null,
        importo,
        descrizione: descrizione ?? null,
        scadenza: scadenza ? new Date(scadenza) : null,
        venditaId: venditaId ?? null,
        note: note ?? null,
      },
      include: { cliente: true, vendita: { select: { id: true, importoTotale: true } } },
    })

    return NextResponse.json(debito, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Errore nella creazione del debito' }, { status: 500 })
  }
}
