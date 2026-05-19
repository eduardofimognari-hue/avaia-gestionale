import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const movimenti = await prisma.movimentiCassa.findMany({
      where: { aziendaId },
      include: {
        cassa: { select: { nome: true } },
        luogo: { select: { id: true, nome: true, tipo: true } },
      },
      orderBy: { data: 'desc' },
      take: 100,
    })
    return NextResponse.json(movimenti)
  } catch {
    return NextResponse.json({ error: 'Errore nel recupero movimenti' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const body = await request.json()
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
      include: {
        cassa: { select: { nome: true } },
        luogo: { select: { id: true, nome: true, tipo: true } },
      },
    })
    return NextResponse.json(movimento, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Errore nella creazione movimento' }, { status: 500 })
  }
}
