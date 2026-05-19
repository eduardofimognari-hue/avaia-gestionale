import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const casse = await prisma.casseInterne.findMany({
      where: { aziendaId },
      include: {
        movimenti: { select: { tipo: true, importo: true, luogoId: true } },
      },
    })
    return NextResponse.json(casse)
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero delle casse' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const body = await request.json()

    if (body.nome) {
      const cassa = await prisma.casseInterne.create({
        data: {
          nome: body.nome, aziendaId,
          saldoIniziale: body.saldoIniziale ?? 0,
          note: body.note ?? null,
        },
        include: {
          movimenti: { select: { tipo: true, importo: true, luogoId: true } },
        },
      })
      return NextResponse.json(cassa, { status: 201 })
    }

    if (body.cassaId && body.tipo && body.importo !== undefined) {
      const movimento = await prisma.movimentiCassa.create({
        data: {
          data: body.data ? new Date(body.data) : new Date(),
          cassaId: body.cassaId, aziendaId,
          luogoId: body.luogoId ?? null,
          tipo: body.tipo,
          importo: body.importo,
          categoria: body.categoria ?? null,
          descrizione: body.descrizione ?? null,
          riferimento: body.riferimento ?? null,
        },
        include: { cassa: true, luogo: true },
      })
      return NextResponse.json(movimento, { status: 201 })
    }

    return NextResponse.json({ error: 'Dati non validi. Inviare nome per creare cassa, oppure cassaId, tipo, importo per movimento' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Errore nella creazione' }, { status: 500 })
  }
}
