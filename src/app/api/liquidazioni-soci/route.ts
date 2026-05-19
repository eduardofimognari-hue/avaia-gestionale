import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const data = await prisma.liquidazioniSoci.findMany({
      where: { aziendaId },
      orderBy: { data: 'desc' },
      include: {
        socio: true,
        movimenti: { select: { id: true, tipo: true, importo: true, categoria: true, descrizione: true } },
      },
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Errore nel recupero liquidazioni' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const body = await request.json()
    const { data, socioId, periodoDa, periodoA, note } = body

    if (!socioId) {
      return NextResponse.json({ error: 'Il campo socioId è obbligatorio' }, { status: 400 })
    }

    const startDate = periodoDa ? new Date(periodoDa) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const endDate = periodoA ? new Date(periodoA) : new Date()

    const movimenti = await prisma.movimentiSoci.findMany({
      where: { socioId, liquidato: false, data: { gte: startDate, lte: endDate }, aziendaId },
    })

    const totaleCrediti = movimenti.filter(m => m.tipo === 'credito').reduce((a, m) => a + m.importo, 0)
    const totaleDebiti = movimenti.filter(m => m.tipo === 'debito').reduce((a, m) => a + m.importo, 0)
    const importoNetto = totaleCrediti - totaleDebiti

    const liquidazione = await prisma.liquidazioniSoci.create({
      data: {
        data: data ? new Date(data) : new Date(), socioId, aziendaId,
        totaleCrediti, totaleDebiti, importoNetto,
        periodoDa: startDate, periodoA: endDate,
        note: note ?? null,
      },
      include: { socio: true },
    })

    await prisma.movimentiSoci.updateMany({
      where: { socioId, liquidato: false, data: { gte: startDate, lte: endDate }, aziendaId },
      data: { liquidato: true, liquidazioneId: liquidazione.id },
    })

    return NextResponse.json(liquidazione, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Errore nella creazione liquidazione' }, { status: 500 })
  }
}
